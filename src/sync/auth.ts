import { signal } from "nsh";
import { getConfig, setConfig } from "../db/repo";
import { syncState } from "./state";

export type BackendAuthState = "idle" | "connected" | "local";

/** Shows whether this shift has a server token or is running from cache. */
export const backendAuth = signal<BackendAuthState>("idle");

interface LoginResponse {
  accessToken?: string;
  tenantId?: string;
  branchId?: string;
  terminalId?: string;
}

/**
 * Signs in to the gateway and stores the identity the sync worker needs.
 * Never rejects: a failed or unavailable backend leaves the cached shift
 * usable, which is what the login screen promises offline.
 */
export async function signInWithBackend(email: string, password: string): Promise<void> {
  try {
    const gateway = syncState().gateway.replace(/\/+$/, "");
    const deviceId = (await getConfig("terminal_id")) ?? "term_gul_01";

    const response = await withTimeout(
      fetch(gateway + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceId }),
      }),
      5_000,
    );
    if (!response.ok) {
      backendAuth.set("local");
      return;
    }

    const body = (await response.json()) as LoginResponse;
    if (!body.accessToken || !body.tenantId || !body.branchId) {
      backendAuth.set("local");
      return;
    }

    await setConfig("auth_token", body.accessToken);
    await setConfig("tenant_id", body.tenantId);
    await setConfig("branch_id", body.branchId);
    await setConfig("terminal_id", body.terminalId ?? deviceId);
    backendAuth.set("connected");
  } catch {
    backendAuth.set("local");
  }
}

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
