/** ULIDs: 26 Crockford-base32 chars, time-ordered, generated offline. */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now: number = Date.now()): string {
  let time = "";
  let rest = Math.floor(now);
  for (let i = 0; i < 10; i += 1) {
    time = ALPHABET[rest % 32] + time;
    rest = Math.floor(rest / 32);
  }

  let random = "";
  for (let i = 0; i < 16; i += 1) {
    random += ALPHABET[crypto.randomInt(0, 32)];
  }
  return time + random;
}

/** A short id for local-only rows (journal lines, invoice items). */
export function rowId(prefix: string): string {
  return prefix + "_" + ulid().slice(-12);
}

/** ISO-8601 UTC, as the sync contract expects. */
export function isoNow(now: number = Date.now()): string {
  return new Date(now).toISOString();
}
