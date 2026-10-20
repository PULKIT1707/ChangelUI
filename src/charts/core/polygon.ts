// Shape morphing: every mark becomes a closed polygon with the same number of points, aligned so
// point i of one shape flows into point i of the next (bar -> slice -> cell morphs, morph-chart).
import { PathBuilder, type Point } from "./path";

export type Polygon = Point[];

/** Signed area (shoelace): positive when clockwise on screen (y down). */
export function polygonArea(points: readonly Point[]): number {
  let s = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i] as Point;
    const [x1, y1] = points[(i + 1) % n] as Point;
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

export function polygonCentroid(points: readonly Point[]): Point {
  const n = points.length || 1;
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / n, y / n];
}

/** Perimeter of the closed polygon. */
export function polygonLength(points: readonly Point[]): number {
  let len = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i] as Point;
    const b = points[(i + 1) % n] as Point;
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

export interface ResampleOptions {
  /**
   * Keep every original vertex (when there are at most n of them) and spread the remaining points
   * over the edges by length, so rectangles keep exact square corners. Default false: n points
   * evenly spaced along the outline, which can cut corners off.
   */
  keepVertices?: boolean;
}
/** n points along the closed outline starting at the first vertex: evenly spaced, or vertex-preserving. */
export function resamplePolygon(points: readonly Point[], n: number, options: ResampleOptions = {}): Polygon {
  const count = Math.max(3, Math.floor(n));
  if (!points.length) return [];
  if (points.length === 1) return Array.from({ length: count }, () => points[0] as Point);
  const total = polygonLength(points);
  if (!total) return Array.from({ length: count }, () => points[0] as Point);
  if (options.keepVertices && points.length <= count) return resampleKeepingVertices(points, count, total);
  const out: Polygon = [];
  const step = total / count;
  let seg = 0;
  let segStart = 0;
  const m = points.length;
  for (let k = 0; k < count; k++) {
    const target = k * step;
    for (;;) {
      const a = points[seg % m] as Point;
      const b = points[(seg + 1) % m] as Point;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (segStart + len >= target || seg >= m - 1) {
        const t = len ? Math.min(1, Math.max(0, (target - segStart) / len)) : 0;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        break;
      }
      segStart += len;
      seg++;
    }
  }
  return out;
}

/** Every vertex plus count - m extra points, apportioned to edges by length (largest remainder). */
function resampleKeepingVertices(points: readonly Point[], count: number, total: number): Polygon {
  const m = points.length;
  const lengths = points.map((a, i) => {
    const b = points[(i + 1) % m] as Point;
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  const spare = count - m;
  const raw = lengths.map((len) => (len / total) * spare);
  const extra = raw.map(Math.floor);
  let left = spare - extra.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) {
    const i = (order[k] as readonly [number, number])[1];
    extra[i] = (extra[i] as number) + 1;
  }
  const out: Polygon = [];
  points.forEach((a, i) => {
    const b = points[(i + 1) % m] as Point;
    const k = extra[i] as number;
    for (let s = 0; s <= k; s++) {
      const t = s / (k + 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}
/**
 * Rotates (and if needed reverses) `to` so it matches `from` point for point with the least total
 * squared travel. Both must have the same length (resample first).
 */
export function alignPolygon(from: readonly Point[], to: readonly Point[]): Polygon {
  const n = to.length;
  if (n !== from.length || n === 0) return [...to];
  const base = Math.sign(polygonArea(from)) !== Math.sign(polygonArea(to)) && polygonArea(to) !== 0 ? [...to].reverse() : [...to];
  let best = 0;
  let bestCost = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let cost = 0;
    for (let i = 0; i < n && cost < bestCost; i++) {
      const a = from[i] as Point;
      const b = base[(i + shift) % n] as Point;
      cost += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = shift;
    }
  }
  return base.map((_, i) => base[(i + best) % n] as Point);
}

/** Point-wise interpolation between equal-length polygons. */
export function interpolatePolygon(from: readonly Point[], to: readonly Point[], t: number): Polygon {
  return from.map((a, i) => {
    const b = to[i] ?? a;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
}

/** Resamples both shapes to n points and aligns the target: the input to interpolatePolygon. */
export function morphPair(from: readonly Point[], to: readonly Point[], n = 64): [Polygon, Polygon] {
  const a = resamplePolygon(from, n);
  return [a, alignPolygon(a, resamplePolygon(to, n))];
}

/** Rectangle outline, clockwise from the top-left corner. */
export function rectPolygon(x: number, y: number, width: number, height: number): Polygon {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}

/** Circle outline with n vertices, clockwise from 12 o'clock. */
export function circlePolygon(cx: number, cy: number, r: number, n = 64): Polygon {
  return Array.from({ length: Math.max(3, n) }, (_, i): Point => {
    const a = (i / Math.max(3, n)) * 2 * Math.PI;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  });
}

/** Annular sector outline: outer arc clockwise, inner arc back (a wedge when innerRadius is 0). */
export function arcPolygon(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, n = 64): Polygon {
  const steps = Math.max(2, Math.floor(n / 2));
  const out: Polygon = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / steps;
    out.push([cx + outerRadius * Math.sin(a), cy - outerRadius * Math.cos(a)]);
  }
  if (innerRadius > 0) {
    for (let i = steps; i >= 0; i--) {
      const a = startAngle + ((endAngle - startAngle) * i) / steps;
      out.push([cx + innerRadius * Math.sin(a), cy - innerRadius * Math.cos(a)]);
    }
  } else out.push([cx, cy]);
  return out;
}

/** Closed SVG path through the polygon. */
export function polygonPath(points: readonly Point[], digits: number | null = 3): string {
  if (!points.length) return "";
  const b = new PathBuilder(digits);
  points.forEach((p, i) => (i ? b.line(p[0], p[1]) : b.move(p[0], p[1])));
  b.close();
  return b.d;
}
