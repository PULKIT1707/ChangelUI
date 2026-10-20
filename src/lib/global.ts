/**
 * Lazily created singleton shared across ESM/CJS copies and subpath bundles (design 5.9).
 * Lives on globalThis[Symbol.for("changelui/<name>@1")]; never created at import time.
 */
export function getGlobal<T>(name: string, create: () => T): T {
  const key = Symbol.for(`changelui/${name}@1`);
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  let value = store[key];
  if (value === undefined) {
    value = create();
    store[key] = value;
  }
  return value;
}
