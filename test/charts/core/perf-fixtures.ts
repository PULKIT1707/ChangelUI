// Shared inputs for the chart core perf test and benchmarks (charts-roadmap 5.5 scenarios).
import { fromNested, sortHierarchy, sumHierarchy, type HierarchyNode } from "../../../src/charts/core/hierarchy";
import type { Point } from "../../../src/charts/core/path";
import { mulberry32 } from "../../../src/lib/random";

const rnd = mulberry32(5150);

export const LINE_10K: Point[] = Array.from({ length: 10_000 }, (_, i): Point => [i * 0.1, Math.sin(i / 50) * 100 + i * 0.01]);
export const XS_10K = Float64Array.from(LINE_10K, (p) => p[0]);
export const YS_10K = Float64Array.from(LINE_10K, (p) => p[1]);
export const XS_100K = Float64Array.from({ length: 100_000 }, (_, i) => i);
export const YS_100K = Float64Array.from({ length: 100_000 }, (_, i) => Math.sin(i / 300) * 50 + rnd() * 10);

interface Leafy {
  value?: number;
  children?: Leafy[];
}

/** About 2,000 leaves in 40 groups of 50. */
export const TREE_2K: Leafy = {
  children: Array.from({ length: 40 }, () => ({ children: Array.from({ length: 50 }, () => ({ value: 1 + Math.floor(rnd() * 1000) })) })),
};

export function freshTree(): HierarchyNode<Leafy> {
  return sortHierarchy(sumHierarchy(fromNested(TREE_2K, (d) => d.children), (d) => d.value));
}

/** 60 nodes in 6 columns, 150 forward links. */
export const SANKEY_NODES = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}` }));
export const SANKEY_LINKS = (() => {
  const links: Array<{ source: string; target: string; value: number }> = [];
  const seen = new Set<string>();
  while (links.length < 150) {
    const s = Math.floor(rnd() * 50);
    const col = Math.floor(s / 10);
    const t = (col + 1) * 10 + Math.floor(rnd() * 10);
    const key = `${s}-${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source: `n${s}`, target: `n${t}`, value: 1 + Math.floor(rnd() * 40) });
  }
  return links;
})();

/** 300 nodes, a random spanning tree plus extra links. */
export const NETWORK_NODES = Array.from({ length: 300 }, (_, i) => ({ id: `v${i}` }));
export const NETWORK_LINKS = [
  ...NETWORK_NODES.slice(1).map((n, i) => ({ source: `v${Math.floor(rnd() * (i + 1))}`, target: n.id })),
  ...Array.from({ length: 100 }, () => ({ source: `v${Math.floor(rnd() * 300)}`, target: `v${Math.floor(rnd() * 300)}` })).filter((l) => l.source !== l.target),
];

export const STACK_5x10K = Array.from({ length: 5 }, (_, s) => Array.from({ length: 10_000 }, (_, i) => 10 + Math.sin(i / 40 + s) * 8));

export const BEESWARM_2K = Array.from({ length: 2000 }, () => (rnd() + rnd() + rnd()) * 200);
