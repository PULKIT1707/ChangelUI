// Minimal declaration so src/ does not need @types/node. Consumer bundlers define process.env.NODE_ENV.
declare const process: { env: { NODE_ENV?: string } };

const warned = new Set<string>();

function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

/** Development-only console.warn, once per key, with the [changelui] prefix. Never logs in production. */
export function devWarn(key: string, message: string): void {
  if (!isDev() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[changelui] ${message}`);
}
