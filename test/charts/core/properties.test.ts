// Seeded property tests (charts-roadmap 5.1): 200 generated cases per property, deterministic via
// mulberry32. Sankey has no oracle at all (d3-sankey is deliberately not a dependency), so its
// invariants are checked here.
import { describe, expect, it } from "vitest";
import { lttb, minMaxPerPixel } from "../../../src/charts/core/decimate";
import { dodge } from "../../../src/charts/core/dodge";
import { createForceSimulation } from "../../../src/charts/core/force";
import { fromNested, leaves, sortHierarchy, sumHierarchy, treemap } from "../../../src/charts/core/hierarchy";
import { linePath, type Point } from "../../../src/charts/core/path";
import { sankeyLayout } from "../../../src/charts/core/sankey";
import { stack, stackTotals } from "../../../src/charts/core/stack";
import { summarizeChart } from "../../../src/charts/core/summary";
import { ticks } from "../../../src/charts/core/ticks";
import { mulberry32 } from "../../../src/lib/random";

const CASES = 200;

function cases<T>(seed: number, make: (rnd: () => number, i: number) => T): T[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: CASES }, (_, i) => make(rnd, i));
}

describe("ticks", () => {
  it("lie inside the domain, are evenly spaced and ascend with the domain", () => {
    for (const [a, b, count] of cases(1, (rnd) => {
      const scale = 10 ** Math.floor(rnd() * 16 - 8);
      const a = (rnd() - 0.5) * 100 * scale;
      return [a, a + (rnd() - 0.3) * 100 * scale, 1 + Math.floor(rnd() * 15)] as const;
    })) {
      const t = ticks(a, b, count);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (const v of t) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
      }
      if (t.length > 2) {
        const step = (t[1] as number) - (t[0] as number);
        for (let i = 2; i < t.length; i++) expect(Math.abs((t[i] as number) - (t[i - 1] as number) - step)).toBeLessThan(Math.abs(step) * 1e-9);
        expect(Math.sign(step)).toBe(Math.sign(b - a));
      }
      // never wildly more ticks than asked for
      expect(t.length).toBeLessThanOrEqual(count * 2.5 + 2);
    }
  });
});

/** Parses "M x,y C ... " path output (absolute M/L/C only) into segments of control points. */
function cubicSegments(d: string): Array<[Point, Point, Point, Point]> {
  const tokens = d.match(/[MLCZ]|-?[\d.]+(?:e[-+]?\d+)?/g) ?? [];
  const out: Array<[Point, Point, Point, Point]> = [];
  let cur: Point = [0, 0];
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++];
    const num = () => Number(tokens[i++]);
    if (cmd === "M" || cmd === "L") cur = [num(), num()];
    else if (cmd === "C") {
      const c1: Point = [num(), num()];
      const c2: Point = [num(), num()];
      const end: Point = [num(), num()];
      out.push([cur, c1, c2, end]);
      cur = end;
    }
  }
  return out;
}

describe("monotone curve", () => {
  it("never leaves [min(y_i, y_i+1), max(y_i, y_i+1)] on any segment (16 samples each)", () => {
    for (const pts of cases(2, (rnd) => {
      const n = 3 + Math.floor(rnd() * 40);
      let x = 0;
      return Array.from({ length: n }, (): Point => {
        x += 0.5 + rnd() * 20;
        return [x, rnd() < 0.2 ? 50 : rnd() * 100];
      });
    })) {
      const segs = cubicSegments(linePath(pts, { curve: "monotone", digits: null }));
      expect(segs).toHaveLength(pts.length - 1);
      segs.forEach(([p0, p1, p2, p3]) => {
        const lo = Math.min(p0[1], p3[1]) - 1e-9;
        const hi = Math.max(p0[1], p3[1]) + 1e-9;
        for (let k = 0; k <= 16; k++) {
          const t = k / 16;
          const u = 1 - t;
          const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
          expect(y).toBeGreaterThanOrEqual(lo);
          expect(y).toBeLessThanOrEqual(hi);
        }
      });
    }
  });
});

describe("stack", () => {
  it("top of the stack equals the column total; bands are contiguous", () => {
    for (const values of cases(3, (rnd) => {
      const m = 1 + Math.floor(rnd() * 6);
      const n = 1 + Math.floor(rnd() * 20);
      return Array.from({ length: m }, () => Array.from({ length: n }, () => Math.round(rnd() * 100)));
    })) {
      const { bands, order } = stack(values, { order: "insideOut" });
      const totals = stackTotals(values);
      totals.forEach((total, j) => {
        const top = bands[order[order.length - 1] as number]?.[j]?.[1] as number;
        expect(top).toBeCloseTo(total, 9);
        for (let k = 1; k < order.length; k++) {
          expect(bands[order[k] as number]?.[j]?.[0]).toBeCloseTo(bands[order[k - 1] as number]?.[j]?.[1] as number, 9);
        }
      });
      // expand: every column sums to 1 (or 0 when empty)
      const expanded = stack(values, { offset: "expand" });
      totals.forEach((total, j) => {
        const top = Math.max(...expanded.bands.map((s) => s[j]?.[1] as number));
        expect(top).toBeCloseTo(total ? 1 : 0, 9);
      });
    }
  });

  it("diverging keeps positive bands above 0 and negative bands below", () => {
    for (const values of cases(4, (rnd) => Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => Math.round((rnd() - 0.5) * 100))))) {
      const { bands } = stack(values, { offset: "diverging" });
      values.forEach((series, i) =>
        series.forEach((v, j) => {
          const [y0, y1] = bands[i]?.[j] as [number, number];
          expect(y1 - y0).toBeCloseTo(Math.abs(v), 9);
          if (v > 0) expect(y0).toBeGreaterThanOrEqual(0);
          if (v < 0) expect(y1).toBeLessThanOrEqual(0);
        }),
      );
    }
  });
});

interface T {
  value?: number;
  children?: T[];
}

describe("treemap", () => {
  it("leaf areas are proportional to value, leaves don't overlap, and they fill the container", () => {
    for (const data of cases(5, (rnd) => {
      const grow = (depth: number): T =>
        depth === 0 || rnd() < 0.25 ? { value: 1 + Math.floor(rnd() * 100) } : { children: Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => grow(depth - 1)) };
      return { children: Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => grow(2)) } as T;
    })) {
      const root = treemap(sortHierarchy(sumHierarchy(fromNested(data, (d) => d.children), (d) => d.value)), { width: 500, height: 320 });
      const cells = leaves(root);
      const k = (500 * 320) / root.value;
      let area = 0;
      for (const c of cells) {
        const a = (c.x1 - c.x0) * (c.y1 - c.y0);
        area += a;
        expect(a).toBeCloseTo(c.value * k, 6);
        expect(c.x0).toBeGreaterThanOrEqual(-1e-9);
        expect(c.y0).toBeGreaterThanOrEqual(-1e-9);
        expect(c.x1).toBeLessThanOrEqual(500 + 1e-9);
        expect(c.y1).toBeLessThanOrEqual(320 + 1e-9);
      }
      expect(area).toBeCloseTo(500 * 320, 6);
      let overlapping = 0;
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i] as (typeof cells)[number];
          const b = cells[j] as (typeof cells)[number];
          const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
          const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
          if (ox > 1e-6 && oy > 1e-6) overlapping++;
        }
      }
      expect(overlapping).toBe(0);
    }
  });
});

describe("sankey", () => {
  /** Random DAG: nodes in layers, links only go to later layers; every inner node conserves flow. */
  function graph(rnd: () => number) {
    const layers = 2 + Math.floor(rnd() * 4);
    const ids: string[][] = Array.from({ length: layers }, (_, l) => Array.from({ length: 1 + Math.floor(rnd() * 5) }, (_, i) => `n${l}-${i}`));
    const links: Array<{ source: string; target: string; value: number }> = [];
    for (let l = 0; l < layers - 1; l++) {
      for (const s of ids[l] as string[]) {
        const count = 1 + Math.floor(rnd() * 3);
        for (let c = 0; c < count; c++) {
          const nextLayer = ids[l + 1 + Math.floor(rnd() * Math.min(2, layers - l - 1))] as string[];
          links.push({ source: s, target: nextLayer[Math.floor(rnd() * nextLayer.length)] as string, value: 1 + Math.floor(rnd() * 50) });
        }
      }
    }
    return { nodes: ids.flat().map((id) => ({ id })), links };
  }

  it("keeps nodes in bounds, columns overlap-free, link widths consistent with node heights", () => {
    for (const g of cases(6, (rnd) => graph(rnd))) {
      const { nodes, links } = sankeyLayout(g.nodes, g.links, { width: 800, height: 400, nodePadding: 10, nodeWidth: 14 });
      for (const n of nodes) {
        expect(n.x0).toBeGreaterThanOrEqual(-1e-9);
        expect(n.x1).toBeLessThanOrEqual(800 + 1e-9);
        expect(n.y0).toBeGreaterThanOrEqual(-1e-6);
        expect(n.y1).toBeLessThanOrEqual(400 + 1e-6);
        // links leaving/entering a node fit inside its height
        const out = n.sourceLinks.reduce((a, l) => a + l.width, 0);
        const inn = n.targetLinks.reduce((a, l) => a + l.width, 0);
        expect(Math.max(out, inn)).toBeCloseTo(n.y1 - n.y0, 6);
      }
      const columns = new Map<number, typeof nodes>();
      for (const n of nodes) columns.set(n.layer, [...(columns.get(n.layer) ?? []), n]);
      for (const col of columns.values()) {
        const sorted = [...col].sort((a, b) => a.y0 - b.y0);
        for (let i = 1; i < sorted.length; i++) expect((sorted[i] as (typeof nodes)[number]).y0).toBeGreaterThanOrEqual((sorted[i - 1] as (typeof nodes)[number]).y1 + 10 - 1e-6);
      }
      for (const l of links) {
        expect(l.source.layer).toBeLessThan(l.target.layer);
        expect(l.y0 - l.width / 2).toBeGreaterThanOrEqual(l.source.y0 - 1e-6);
        expect(l.y0 + l.width / 2).toBeLessThanOrEqual(l.source.y1 + 1e-6);
        expect(l.y1 - l.width / 2).toBeGreaterThanOrEqual(l.target.y0 - 1e-6);
        expect(l.y1 + l.width / 2).toBeLessThanOrEqual(l.target.y1 + 1e-6);
      }
    }
  });

  it("conserves flow through inner nodes (in = out)", () => {
    const nodes = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    const links = [
      { source: "a", target: "c", value: 30 },
      { source: "b", target: "c", value: 20 },
      { source: "c", target: "d", value: 35 },
      { source: "c", target: "e", value: 15 },
    ];
    for (const align of ["justify", "left", "right", "center"] as const) {
      const g = sankeyLayout(nodes, links, { width: 600, height: 300, align });
      const c = g.nodes.find((n) => n.id === "c");
      const inn = c?.targetLinks.reduce((s, l) => s + l.width, 0) ?? 0;
      const out = c?.sourceLinks.reduce((s, l) => s + l.width, 0) ?? 0;
      expect(inn).toBeCloseTo(out, 9);
      expect((c?.y1 ?? 0) - (c?.y0 ?? 0)).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    const g = graph(mulberry32(77));
    const a = sankeyLayout(g.nodes, g.links, { width: 700, height: 350 });
    const b = sankeyLayout(g.nodes, g.links, { width: 700, height: 350 });
    expect(a.nodes.map((n) => [n.x0, n.y0, n.y1])).toEqual(b.nodes.map((n) => [n.x0, n.y0, n.y1]));
  });
});

describe("force simulation", () => {
  it("is deterministic per seed and settles without NaN", () => {
    for (const [n, seed] of cases(7, (rnd) => [2 + Math.floor(rnd() * 25), Math.floor(rnd() * 1e6)] as const).slice(0, 40)) {
      const nodes = Array.from({ length: n }, (_, i) => ({ id: `v${i}` }));
      const links = nodes.slice(1).map((node, i) => ({ source: `v${Math.floor(i / 2)}`, target: node.id }));
      const run = () => {
        const sim = createForceSimulation(nodes, links, { seed, radius: 4 });
        sim.run();
        return sim.nodes.map((v) => [v.x, v.y]);
      };
      const a = run();
      expect(a).toEqual(run());
      for (const [x, y] of a) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
  });
});

describe("beeswarm dodge", () => {
  it("never overlaps circles", () => {
    for (const [xs, r, side] of cases(8, (rnd) => {
      const n = 5 + Math.floor(rnd() * 120);
      const cluster = rnd() * 50;
      return [Array.from({ length: n }, () => cluster + rnd() * 200 * rnd()), 2 + rnd() * 6, (["both", "positive", "negative"] as const)[Math.floor(rnd() * 3)]] as const;
    })) {
      const ys = dodge(xs, { radius: r, padding: 1, side });
      // One assertion per case: the closest pair, and the side constraint.
      let closest = Infinity;
      for (let i = 0; i < xs.length; i++) {
        for (let j = i + 1; j < xs.length; j++) {
          closest = Math.min(closest, Math.hypot((xs[i] as number) - (xs[j] as number), (ys[i] as number) - (ys[j] as number)));
        }
      }
      expect(closest).toBeGreaterThanOrEqual(2 * r + 1 - 1e-6);
      if (side === "positive") expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      if (side === "negative") expect(Math.max(...ys)).toBeLessThanOrEqual(0);
    }
  });
});

describe("decimation", () => {
  it("LTTB keeps first and last, returns the threshold count, ascending, and keeps isolated spikes", () => {
    for (const [n, threshold, spikes] of cases(9, (rnd) => [100 + Math.floor(rnd() * 5000), 10 + Math.floor(rnd() * 300), Math.floor(rnd() * 4)] as const)) {
      const rnd = mulberry32(n * 31 + threshold);
      const xs = Float64Array.from({ length: n }, (_, i) => i);
      const ys = Float64Array.from({ length: n }, () => rnd());
      const spikeAt: number[] = [];
      for (let s = 0; s < spikes; s++) {
        const at = 1 + Math.floor(((s + 0.5) / spikes) * (n - 2));
        ys[at] = s % 2 ? -50 : 50;
        spikeAt.push(at);
      }
      const keep = lttb(xs, ys, threshold);
      expect(keep[0]).toBe(0);
      expect(keep[keep.length - 1]).toBe(n - 1);
      expect(keep).toHaveLength(Math.min(threshold, n));
      for (let i = 1; i < keep.length; i++) expect(keep[i] as number).toBeGreaterThan(keep[i - 1] as number);
      for (const at of spikeAt) expect(keep).toContain(at);
    }
  });

  it("min-max per pixel always keeps the global extremes and the ends", () => {
    for (const [n, pixels] of cases(10, (rnd) => [10 + Math.floor(rnd() * 5000), 5 + Math.floor(rnd() * 400)] as const)) {
      const rnd = mulberry32(n + pixels);
      const xs = Float64Array.from({ length: n }, (_, i) => i * 0.5);
      const ys = Float64Array.from({ length: n }, () => rnd() * 100);
      const keep = minMaxPerPixel(xs, ys, pixels);
      let iMax = 0;
      let iMin = 0;
      ys.forEach((v, i) => {
        if (v > (ys[iMax] as number)) iMax = i;
        if (v < (ys[iMin] as number)) iMin = i;
      });
      expect(keep).toContain(0);
      expect(keep).toContain(n - 1);
      expect(keep).toContain(iMax);
      expect(keep).toContain(iMin);
      expect(keep.length).toBeLessThanOrEqual(4 * (pixels + 1));
    }
  });
});

describe("summary", () => {
  it("is stable per locale", () => {
    const series = [{ label: "Revenue", xs: ["Jan", "Feb", "Mar", "Apr"], ys: [39000, 52000, 31000, 48000], format: { style: "currency", currency: "USD", notation: "compact" } as const }];
    const en = summarizeChart(series, { locale: "en-US" });
    expect(en).toBe("Revenue rises 23% from $39K (Jan) to $48K (Apr). Peak $52K in Feb; low $31K in Mar.");
    expect(summarizeChart(series, { locale: "en-US" })).toBe(en);
    const de = summarizeChart(series, { locale: "de-DE" });
    expect(de).not.toBe(en);
    expect(de).toContain("23");
    expect(summarizeChart(series, { locale: "de-DE" })).toBe(de);
  });
});
