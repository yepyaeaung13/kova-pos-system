import { signal } from "nsh";
import { dbPath } from "../db/sqlite";

/** What the header, settings and sync screen read. */
export interface SyncState {
  /** The user's switch (the "offline preview" toggle). */
  online: boolean;
  /** Whether the last push/pull actually reached the gateway. */
  reachable: boolean;
  busy: boolean;
  pending: number;
  conflicts: number;
  lastSyncedAt: string | null;
  lastSeq: number;
  lastError: string | null;
  dbReady: boolean;
  dbPath: string;
  dbVersion: string | null;
  gateway: string;
  writeCount: number;
}

export const syncState = signal<SyncState>({
  online: true,
  reachable: true,
  busy: false,
  pending: 0,
  conflicts: 0,
  lastSyncedAt: null,
  lastSeq: 0,
  lastError: null,
  dbReady: false,
  dbPath: dbPath(),
  dbVersion: null,
  gateway: "http://127.0.0.1:8080",
  writeCount: 0,
});

export function patchSync(patch: Partial<SyncState>): void {
  syncState.update((state) => ({ ...state, ...patch }));
}
