import process, { run } from "process";

const dataDir = process.dataDir;

/**
 * One SQLite database per app install, opened through the `sqlite3` shell.
 *
 * NSH has no in-process SQLite binding, so the local database is driven by the
 * `sqlite3` CLI (granted by `capabilities.process.execute` in nsh.json). The
 * child starts in the app's data directory, where the file lives, and each call
 * runs one statement batch in its own connection — SQLite's WAL mode keeps
 * readers from blocking the UI and the outbox.
 */
export const DB_FILE = "kova-pos.db";

let probed: string | null = null;

export function dbPath(): string {
  return dataDir ? dataDir + "\\" + DB_FILE : DB_FILE;
}

/**
 * A SQL string literal. ASCII goes through as a quoted literal; anything else
 * is passed as a hex blob cast to TEXT, so names like "Café Latte" survive the
 * trip through the shell's command line (which is not UTF-8 on Windows).
 */
export function sqlText(value: string): string {
  if (!/[^\x00-\x7f]/.test(value)) {
    return "'" + value.replace(/'/g, "''") + "'";
  }
  return "CAST(X'" + Buffer.from(value, "utf8").toString("hex") + "' AS TEXT)";
}

/** A JSON payload as a SQL string literal. */
export function sqlJson(value: unknown): string {
  return sqlText(JSON.stringify(value));
}

/** Runs a statement batch; rejects with the shell's message on failure. */
export async function exec(sql: string): Promise<void> {
  const out = await run("sqlite3", ["-bail", DB_FILE, sql], {
    timeoutMs: 15_000,
  });
  if (out.code !== 0) {
    throw new Error((out.stderr || out.stdout || "sqlite3 failed").trim());
  }
}

/** Runs a query and parses the shell's JSON output. */
export async function query<T>(sql: string): Promise<T[]> {
  const out = await run("sqlite3", ["-json", DB_FILE, sql], {
    timeoutMs: 15_000,
  });
  if (out.code !== 0) {
    throw new Error((out.stderr || out.stdout || "sqlite3 failed").trim());
  }
  const text = out.stdout.trim();
  if (text === "") return [];
  return JSON.parse(text) as T[];
}

/** Probes the shell once and reports what the app is running against. */
export async function probe(): Promise<string> {
  if (probed) return probed;
  const rows = await query<{ version: string }>("select sqlite_version() as version;");
  probed = "sqlite " + (rows[0]?.version ?? "?") + " · " + dbPath();
  return probed;
}
