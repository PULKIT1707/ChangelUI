/** djb2 string hash as an unsigned 32-bit integer. */
export function djb2(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Turns an arbitrary value into an id-safe part. Safe values pass through unchanged; others have
 * every unsafe character replaced with "-" plus a base-36 djb2 suffix, so "a b" and "a-b" never collide.
 */
export function toIdPart(value: string): string {
  if (SAFE_ID.test(value)) return value;
  return `${value.replace(/[^A-Za-z0-9_-]/g, "-")}-${djb2(value).toString(36)}`;
}
