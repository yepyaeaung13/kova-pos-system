import {
  applyEvents,
  cursorMap,
  getConfig,
  markAcked,
  markConflict,
  markInFlight,
  markRetry,
  pendingBatch,
  refreshCounts,
} from "../db/repo";
import { isoNow } from "../db/ulid";
import { patchSync, syncState } from "./state";

const PUSH_BATCH = 50;
const INTERVAL_MS = 15_000;

let timer: number | null = null;
let running = false;

export function setOnline(online: boolean): void {
  patchSync({ online });
  if (online) void syncOnce();
}

export function startSync(): void {
  if (timer !== null) return;
  timer = setInterval(() => void syncOnce(), INTERVAL_MS);
  void syncOnce();
}

export function stopSync(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function backoffSeconds(attempts: number): number {
  return Math.min(300, 5 * Math.pow(2, Math.max(0, attempts)));
}

async function headers(): Promise<Record<string, string>> {
  const token = (await getConfig("auth_token")) ?? "demo-token";
  const tenant = (await getConfig("tenant_id")) ?? "tenant_gulberg";
  const terminal = (await getConfig("terminal_id")) ?? "term_gul_01";
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
    "X-Tenant-Id": tenant,
    "X-Device-Id": terminal,
  };
}

/**
 * One push → pull → checkpoint cycle. Never throws: failures land in
 * `syncState` so the shell can show the queue and its last error.
 */
export async function syncNow(): Promise<void> {
  return syncOnce();
}

export async function syncOnce(): Promise<void> {
  if (running) return;
  if (!syncState().online) {
    patchSync({ busy: false, reachable: false });
    return;
  }
  running = true;
  patchSync({ busy: true });

  const gateway = syncState().gateway.replace(/\/+$/, "");
  let failed = false;

  try {
    await push(gateway);
    await pull(gateway);
    patchSync({
      reachable: true,
      lastError: null,
      lastSyncedAt: isoNow(),
    });
  } catch (error) {
    failed = true;
    patchSync({
      reachable: false,
      lastError: messageOf(error),
    });
  } finally {
    running = false;
    patchSync({ busy: false });
    await refreshCounts();
    if (failed) {
      // Keep the queue visible; retries are scheduled per row by `push`.
    }
  }
}

async function push(gateway: string): Promise<void> {
  const rows = await pendingBatch(PUSH_BATCH);
  if (rows.length === 0) return;

  const ids = rows.map((row) => row.id);
  await markInFlight(ids);

  const branch = (await getConfig("branch_id")) ?? "branch_gulberg";
  const terminal = (await getConfig("terminal_id")) ?? "term_gul_01";

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await withTimeout(
      fetch(gateway + "/api/v1/sync/push", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          branch_id: branch,
          terminal_id: terminal,
          mutations: rows.map((row) => ({
            outbox_id: row.id,
            idempotency_key: row.idempotency_key,
            service_name: row.service_name,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            operation: row.operation,
            created_at: row.created_at,
            payload: safeParse(row.payload_json),
          })),
        }),
      }),
      8_000,
    );
  } catch (error) {
    const message = "Gateway unreachable: " + messageOf(error);
    await markRetry(ids, message, backoffSeconds(Math.max(...rows.map((row) => row.attempts))));
    throw new Error(message);
  }

  if (!response.ok) {
    const message = "Push failed: HTTP " + response.status;
    await markRetry(ids, message, backoffSeconds(Math.max(...rows.map((row) => row.attempts))));
    throw new Error(message);
  }

  const body = (await response.json()) as {
    results?: {
      outbox_id: string;
      status: string;
      server_seq?: number;
      reason?: string;
      server_snapshot?: unknown;
    }[];
    ackedIds?: string[];
    conflicts?: { id: string; entityType: string; entityId: string; resolution: string }[];
  };

  const acked = new Set<string>(body.ackedIds ?? []);
  const retry: string[] = [];

  for (const result of body.results ?? []) {
    const row = rows.find((candidate) => candidate.id === result.outbox_id);
    if (!row) continue;
    if (result.status === "acked" || result.status === "duplicate") {
      acked.add(row.id);
      continue;
    }
    if (result.status === "conflict") {
      await markConflict(row, result.reason ?? "Server conflict", result.server_snapshot ?? null);
      continue;
    }
    retry.push(row.id);
  }

  if (acked.size > 0) await markAcked([...acked]);
  if (retry.length > 0) {
    await markRetry(retry, "Retryable error", backoffSeconds(1));
  }
}

async function pull(gateway: string): Promise<void> {
  const cursors = await cursorMap();
  const branch = (await getConfig("branch_id")) ?? "branch_gulberg";

  const url =
    gateway +
    "/api/v1/sync/pull?branch_id=" +
    encodeURIComponent(branch) +
    "&sale_seq=" +
    cursors.sale +
    "&inv_seq=" +
    cursors.inventory +
    "&acc_seq=" +
    cursors.accounting +
    "&limit=100";

  const response = await withTimeout(
    fetch(url, { headers: await headers() }),
    8_000,
  );
  if (!response.ok) throw new Error("Pull failed: HTTP " + response.status);

  const body = (await response.json()) as {
    events?: {
      service_name: string;
      seq: number;
      entity_type: string;
      entity_id: string;
      operation: string;
      data: Record<string, unknown>;
    }[];
    next_cursors?: { sale?: number; inventory?: number; accounting?: number };
    has_more?: boolean;
  };

  await applyEvents(body.events ?? [], body.next_cursors ?? {});
  patchSync({ lastSeq: Math.max(syncState().lastSeq, body.next_cursors?.sale ?? 0) });
}

/** Rejects after `ms` so a dead gateway cannot hold the worker. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timed out after " + ms + "ms")), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
