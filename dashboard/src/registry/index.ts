import { registryMeta } from "./meta";
import type { Category, ItemModule, RegistryEntry } from "./types";

const modules = import.meta.glob<{ default: ItemModule }>("./items/*.tsx");

/** Registry metadata plus lazy item loaders (design 10.2). */
export const registry: RegistryEntry[] = registryMeta.map((meta) => {
  const load = modules[`./items/${meta.slug}.tsx`];
  if (!load) throw new Error(`registry: missing dashboard/src/registry/items/${meta.slug}.tsx`);
  return { ...meta, load };
});

export function getItem(category: Category, slug: string): RegistryEntry | undefined {
  return registry.find((item) => item.category === category && item.slug === slug);
}
