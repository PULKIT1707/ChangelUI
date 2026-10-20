// Minimal force-directed layout (original): velocity Verlet integration with link springs, O(n^2)
// charge, centering and collision. Deterministic: unplaced nodes start at seeded positions derived
// from the node ids, so the same graph always settles the same way (and SSR matches the client).
import { mulberry32 } from "../../lib/random";

export interface ForceNodeInput {
  id: string;
  x?: number;
  y?: number;
  /** Pins the node (drag); null releases it. */
  fx?: number | null;
  fy?: number | null;
  /** Collision radius. Default: options.radius. */
  radius?: number;
}

export interface ForceLinkInput {
  source: string;
  target: string;
  /** Rest length override for this link. */
  distance?: number;
  /** Spring stiffness override (0..1). */
  strength?: number;
}

export interface SimNode {
  id: string;
  index: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
}

export interface SimLink {
  source: SimNode;
  target: SimNode;
  distance: number;
  strength: number;
  /** Share of the correction applied to the target (by degree, so hubs move less). */
  bias: number;
}

export interface ForceOptions {
  /** Where the layout centers. Default [0, 0]. */
  center?: readonly [number, number];
  /** Charge per node; negative repels. Default -30. */
  charge?: number;
  /** Default spring rest length. Default 30. */
  linkDistance?: number;
  /** Default collision radius (and node size). Default 5. */
  radius?: number;
  /** Collision push strength 0..1; 0 disables collision. Default 0.7. */
  collide?: number;
  /** Seed for unplaced nodes. Default: a hash of the node ids. */
  seed?: number;
  alpha?: number;
  alphaMin?: number;
  /** Per-tick alpha cooling. Default 1 - 0.001^(1/300) (about 0.0228, 300 ticks to settle). */
  alphaDecay?: number;
  alphaTarget?: number;
  /** Fraction of velocity lost per tick (friction). Default 0.4. */
  velocityDecay?: number;
}

export interface ForceSimulation {
  readonly nodes: readonly SimNode[];
  readonly links: readonly SimLink[];
  alpha(): number;
  /** Advances `n` ticks (default 1). */
  tick(n?: number): ForceSimulation;
  /** Ticks until settled (alpha < alphaMin) or maxTicks; returns the ticks run. */
  run(maxTicks?: number): number;
  settled(): boolean;
  /** Re-energizes the layout (after a drag or data change). */
  reheat(alpha?: number, target?: number): ForceSimulation;
  /** Pins (or with null, releases) a node. */
  pin(id: string, x: number | null, y?: number | null): ForceSimulation;
}

/** FNV-1a over the ids: a stable seed per graph. */
export function hashIds(ids: readonly string[]): number {
  let h = 0x811c9dc5;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x2c; // separator so ["ab"] and ["a", "b"] differ
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createForceSimulation(nodesIn: readonly ForceNodeInput[], linksIn: readonly ForceLinkInput[], options: ForceOptions = {}): ForceSimulation {
  const [cx, cy] = options.center ?? [0, 0];
  const charge = options.charge ?? -30;
  const defaultRadius = options.radius ?? 5;
  const collide = Math.max(0, Math.min(1, options.collide ?? 0.7));
  const alphaMin = options.alphaMin ?? 0.001;
  const alphaDecay = options.alphaDecay ?? 1 - alphaMin ** (1 / 300);
  let alphaTarget = options.alphaTarget ?? 0;
  const friction = 1 - (options.velocityDecay ?? 0.4);
  let alpha = options.alpha ?? 1;
  const rng = mulberry32(options.seed ?? hashIds(nodesIn.map((n) => n.id)));
  const spread = 10 * Math.sqrt(nodesIn.length + 1);

  const nodes: SimNode[] = nodesIn.map((n, index) => {
    const r = spread * Math.sqrt(rng());
    const a = 2 * Math.PI * rng();
    return {
      id: n.id,
      index,
      x: n.fx ?? n.x ?? cx + r * Math.cos(a),
      y: n.fy ?? n.y ?? cy + r * Math.sin(a),
      vx: 0,
      vy: 0,
      fx: n.fx ?? null,
      fy: n.fy ?? null,
      radius: n.radius ?? defaultRadius,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const degree = new Map<SimNode, number>();
  const resolved = linksIn.map((l, i) => {
    const source = byId.get(l.source);
    const target = byId.get(l.target);
    if (!source || !target) throw new Error(`[changelui] createForceSimulation: link ${i} references an unknown node`);
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
    return { l, source, target };
  });
  const links: SimLink[] = resolved.map(({ l, source, target }) => {
    const ds = degree.get(source) as number;
    const dt = degree.get(target) as number;
    return {
      source,
      target,
      distance: l.distance ?? options.linkDistance ?? 30,
      strength: l.strength ?? 1 / Math.min(ds, dt),
      bias: ds / (ds + dt),
    };
  });

  const n = nodes.length;
  const ax = new Float64Array(n);
  const ay = new Float64Array(n);

  /** Accelerations at the current positions, scaled by alpha. */
  function accelerate(out: { x: Float64Array; y: Float64Array }): void {
    out.x.fill(0);
    out.y.fill(0);
    for (const link of links) {
      const s = link.source;
      const t = link.target;
      let dx = t.x - s.x;
      let dy = t.y - s.y;
      if (!dx && !dy) {
        dx = (rng() - 0.5) * 1e-6;
        dy = (rng() - 0.5) * 1e-6;
      }
      const len = Math.sqrt(dx * dx + dy * dy);
      const k = ((len - link.distance) / len) * alpha * link.strength;
      out.x[t.index] = (out.x[t.index] as number) - dx * k * link.bias;
      out.y[t.index] = (out.y[t.index] as number) - dy * k * link.bias;
      out.x[s.index] = (out.x[s.index] as number) + dx * k * (1 - link.bias);
      out.y[s.index] = (out.y[s.index] as number) + dy * k * (1 - link.bias);
    }
    if (charge) {
      for (let i = 0; i < n; i++) {
        const a = nodes[i] as SimNode;
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j] as SimNode;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 === 0) {
            dx = (rng() - 0.5) * 1e-6;
            dy = (rng() - 0.5) * 1e-6;
            d2 = dx * dx + dy * dy;
          }
          // Force falls off with 1/distance; distances under 1px are treated as 1px.
          const w = (charge * alpha) / Math.max(d2, 1);
          out.x[i] = (out.x[i] as number) + dx * w;
          out.y[i] = (out.y[i] as number) + dy * w;
          out.x[j] = (out.x[j] as number) - dx * w;
          out.y[j] = (out.y[j] as number) - dy * w;
        }
      }
    }
  }

  const next = { x: new Float64Array(n), y: new Float64Array(n) };
  let primed = false;

  function step(): void {
    alpha += (alphaTarget - alpha) * alphaDecay;
    if (!primed) {
      accelerate({ x: ax, y: ay });
      primed = true;
    }
    // Velocity Verlet: x += v + a/2, then v += (a + a')/2 with the accelerations at the new positions.
    for (const node of nodes) {
      if (node.fx !== null) node.x = node.fx;
      else node.x += node.vx + 0.5 * (ax[node.index] as number);
      if (node.fy !== null) node.y = node.fy;
      else node.y += node.vy + 0.5 * (ay[node.index] as number);
    }
    if (collide > 0) {
      for (let i = 0; i < n; i++) {
        const a = nodes[i] as SimNode;
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j] as SimNode;
          const min = a.radius + b.radius;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 1e-6;
          const push = ((min - d) / d) * 0.5 * collide;
          const ux = (dx || 1e-6) * push;
          const uy = dy * push;
          if (a.fx === null) a.x -= ux;
          if (a.fy === null) a.y -= uy;
          if (b.fx === null) b.x += ux;
          if (b.fy === null) b.y += uy;
        }
      }
    }
    // Keep the centroid of free nodes on the center point.
    let mx = 0;
    let my = 0;
    let free = 0;
    for (const node of nodes) {
      if (node.fx !== null || node.fy !== null) continue;
      mx += node.x;
      my += node.y;
      free++;
    }
    if (free) {
      mx = mx / free - cx;
      my = my / free - cy;
      for (const node of nodes) {
        if (node.fx !== null || node.fy !== null) continue;
        node.x -= mx;
        node.y -= my;
      }
    }
    accelerate(next);
    for (const node of nodes) {
      const i = node.index;
      if (node.fx !== null) node.vx = 0;
      else node.vx = (node.vx + 0.5 * ((ax[i] as number) + (next.x[i] as number))) * friction;
      if (node.fy !== null) node.vy = 0;
      else node.vy = (node.vy + 0.5 * ((ay[i] as number) + (next.y[i] as number))) * friction;
    }
    ax.set(next.x);
    ay.set(next.y);
  }

  const sim: ForceSimulation = {
    nodes,
    links,
    alpha: () => alpha,
    tick(count = 1) {
      for (let k = 0; k < count; k++) step();
      return sim;
    },
    run(maxTicks = 300) {
      let ticks = 0;
      while (alpha >= alphaMin && ticks < maxTicks) {
        step();
        ticks++;
      }
      return ticks;
    },
    settled: () => alpha < alphaMin,
    reheat(value = 1, target = 0) {
      alpha = value;
      alphaTarget = target;
      primed = false;
      return sim;
    },
    pin(id, x, y = x) {
      const node = byId.get(id);
      if (node) {
        node.fx = x;
        node.fy = y;
        if (x !== null) node.x = x;
        if (y !== null) node.y = y;
        primed = false;
      }
      return sim;
    },
  };
  return sim;
}
