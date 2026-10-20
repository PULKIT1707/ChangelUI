// SVG path generators. Pure string builders: no DOM, so they run in RSC, Node and workers.
// Coordinates are rounded to 3 decimals by default (sub-pixel exact, and much shorter strings).

export type Point = readonly [number, number];
export type Curve = "linear" | "monotone" | "step" | "stepBefore" | "stepAfter" | "natural" | "bump" | "bumpY";

export interface PathOptions {
  /** Interpolation between points. Default "linear" here; chart presets default to "monotone". */
  curve?: Curve;
  /** Decimal places kept in the output (default 3). `null` keeps full precision. */
  digits?: number | null;
  /** Bridge missing points instead of breaking the line into segments. Default false. */
  connectNulls?: boolean;
}

/** Accumulates path commands with fixed rounding. */
export class PathBuilder {
  d = "";
  private readonly k: number | null;

  constructor(digits: number | null = 3) {
    this.k = digits === null ? null : 10 ** Math.max(0, Math.min(15, Math.floor(digits)));
  }

  n(v: number): string {
    return String(this.k === null ? v : Math.round(v * this.k) / this.k);
  }

  move(x: number, y: number): void {
    this.d += `M${this.n(x)},${this.n(y)}`;
  }

  line(x: number, y: number): void {
    this.d += `L${this.n(x)},${this.n(y)}`;
  }

  /** moveTo for the first point of a line; lineTo when continuing (an area's return edge). */
  start(x: number, y: number, join: boolean): void {
    if (join) this.line(x, y);
    else this.move(x, y);
  }

  cubic(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    this.d += `C${this.n(x1)},${this.n(y1)},${this.n(x2)},${this.n(y2)},${this.n(x)},${this.n(y)}`;
  }

  arc(r: number, large: boolean, sweep: boolean, x: number, y: number): void {
    const rr = this.n(r);
    this.d += `A${rr},${rr},0,${large ? 1 : 0},${sweep ? 1 : 0},${this.n(x)},${this.n(y)}`;
  }

  close(): void {
    this.d += "Z";
  }
}

/**
 * Draws one gap-free run; returns the number of distinct points drawn (1 means "a dot").
 * `back` is true for an area's return edge (drawn right to left).
 */
type CurveWriter = (b: PathBuilder, xs: readonly number[], ys: readonly number[], join: boolean, back?: boolean) => number;

const writeLinear: CurveWriter = (b, xs, ys, join) => {
  const n = xs.length;
  for (let i = 0; i < n; i++) {
    if (i === 0) b.start(xs[0] as number, ys[0] as number, join);
    else b.line(xs[i] as number, ys[i] as number);
  }
  return n;
};

/** t = 0: vertical first (stepBefore); 1: horizontal first (stepAfter); 0.5: step at the midpoint. */
function stepWriter(step: number): CurveWriter {
  return (b, xs, ys, join, back = false) => {
    // Walking an area's baseline backwards mirrors the step, so both edges change at the same x.
    const t = back ? 1 - step : step;
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = xs[i] as number;
      const y = ys[i] as number;
      if (i === 0) {
        b.start(x, y, join);
        continue;
      }
      const px = xs[i - 1] as number;
      const py = ys[i - 1] as number;
      if (t <= 0) {
        b.line(px, y);
        b.line(x, y);
      } else {
        const mx = px * (1 - t) + x * t;
        b.line(mx, py);
        b.line(mx, y);
      }
    }
    if (0 < t && t < 1 && n >= 2) b.line(xs[n - 1] as number, ys[n - 1] as number);
    return n;
  };
}

const sign = (x: number) => (x < 0 ? -1 : 1);

/** Tangent at the middle of three points (Steffen 1990): bounded so the curve never overshoots. */
function slope3(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
  const h0 = x1 - x0;
  const h1 = x2 - x1;
  const s0 = (y1 - y0) / (h0 || (h1 < 0 ? -0 : 0));
  const s1 = (y2 - y1) / (h1 || (h0 < 0 ? -0 : 0));
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

/** One-sided tangent at an end point from the secant and the neighbor's tangent. */
function slope2(x0: number, y0: number, x1: number, y1: number, t: number): number {
  const h = x1 - x0;
  return h ? ((3 * (y1 - y0)) / h - t) / 2 : t;
}

/** Monotone cubic interpolation in x: smooth, and never leaves the range of neighboring points. */
const writeMonotone: CurveWriter = (b, rawX, rawY, join) => {
  // Coincident consecutive points carry no direction; drop them.
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < rawX.length; i++) {
    const x = rawX[i] as number;
    const y = rawY[i] as number;
    if (i > 0 && x === xs[xs.length - 1] && y === ys[ys.length - 1]) continue;
    xs.push(x);
    ys.push(y);
  }
  const n = xs.length;
  if (n === 0) return 0;
  b.start(xs[0] as number, ys[0] as number, join);
  if (n === 1) return 1;
  if (n === 2) {
    b.line(xs[1] as number, ys[1] as number);
    return 2;
  }
  const m = new Array<number>(n);
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope3(xs[i - 1] as number, ys[i - 1] as number, xs[i] as number, ys[i] as number, xs[i + 1] as number, ys[i + 1] as number);
  }
  m[0] = slope2(xs[0] as number, ys[0] as number, xs[1] as number, ys[1] as number, m[1] as number);
  m[n - 1] = slope2(xs[n - 2] as number, ys[n - 2] as number, xs[n - 1] as number, ys[n - 1] as number, m[n - 2] as number);
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[i] as number;
    const y0 = ys[i] as number;
    const x1 = xs[i + 1] as number;
    const y1 = ys[i + 1] as number;
    const dx = (x1 - x0) / 3;
    b.cubic(x0 + dx, y0 + dx * (m[i] as number), x1 - dx, y1 - dx * (m[i + 1] as number), x1, y1);
  }
  return n;
};

/** Control points of the natural cubic spline through v (tridiagonal solve, Thomas algorithm). */
function naturalControls(v: readonly number[]): [number[], number[]] {
  const n = v.length - 1;
  const a = new Array<number>(n);
  const b = new Array<number>(n);
  const r = new Array<number>(n);
  a[0] = 0;
  b[0] = 2;
  r[0] = (v[0] as number) + 2 * (v[1] as number);
  for (let i = 1; i < n - 1; i++) {
    a[i] = 1;
    b[i] = 4;
    r[i] = 4 * (v[i] as number) + 2 * (v[i + 1] as number);
  }
  a[n - 1] = 2;
  b[n - 1] = 7;
  r[n - 1] = 8 * (v[n - 1] as number) + (v[n] as number);
  for (let i = 1; i < n; i++) {
    const w = (a[i] as number) / (b[i - 1] as number);
    b[i] = (b[i] as number) - w;
    r[i] = (r[i] as number) - w * (r[i - 1] as number);
  }
  a[n - 1] = (r[n - 1] as number) / (b[n - 1] as number);
  for (let i = n - 2; i >= 0; i--) a[i] = ((r[i] as number) - (a[i + 1] as number)) / (b[i] as number);
  b[n - 1] = ((v[n] as number) + (a[n - 1] as number)) / 2;
  for (let i = 0; i < n - 1; i++) b[i] = 2 * (v[i + 1] as number) - (a[i + 1] as number);
  return [a, b];
}

/** Natural cubic spline: the smoothest curve through every point. It can overshoot the data. */
const writeNatural: CurveWriter = (b, xs, ys, join) => {
  const n = xs.length;
  if (n === 0) return 0;
  b.start(xs[0] as number, ys[0] as number, join);
  if (n === 2) b.line(xs[1] as number, ys[1] as number);
  else if (n > 2) {
    const [px0, px1] = naturalControls(xs);
    const [py0, py1] = naturalControls(ys);
    for (let i = 0; i < n - 1; i++) {
      b.cubic(px0[i] as number, py0[i] as number, px1[i] as number, py1[i] as number, xs[i + 1] as number, ys[i + 1] as number);
    }
  }
  return n;
};

/** Sigmoid links between consecutive points, horizontal tangents (bump charts, sankey-like flows). */
function bumpWriter(horizontal: boolean): CurveWriter {
  return (b, xs, ys, join) => {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
      const x = xs[i] as number;
      const y = ys[i] as number;
      if (i === 0) {
        b.start(x, y, join);
        continue;
      }
      const px = xs[i - 1] as number;
      const py = ys[i - 1] as number;
      if (horizontal) {
        const mx = (px + x) / 2;
        b.cubic(mx, py, mx, y, x, y);
      } else {
        const my = (py + y) / 2;
        b.cubic(px, my, x, my, x, y);
      }
    }
    return n;
  };
}

// Pure annotations let bundlers drop the table (and every curve) when only PathBuilder or the
// arc/ribbon/bar helpers are imported.
const WRITERS: Record<Curve, CurveWriter> = /* @__PURE__ */ (() => ({
  linear: writeLinear,
  monotone: writeMonotone,
  step: stepWriter(0.5),
  stepBefore: stepWriter(0),
  stepAfter: stepWriter(1),
  natural: writeNatural,
  bump: bumpWriter(true),
  bumpY: bumpWriter(false),
}))();

const defined = (p: Point | null | undefined): p is Point => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Splits into runs of defined points (or one run of all defined points with connectNulls). */
function segments<T>(items: readonly T[], ok: (item: T) => boolean, connect: boolean): T[][] {
  const out: T[][] = [];
  let run: T[] = [];
  for (const item of items) {
    if (ok(item)) run.push(item);
    else if (!connect && run.length) {
      out.push(run);
      run = [];
    }
  }
  if (run.length) out.push(run);
  return out;
}

/**
 * A line through `points`. `null` or non-finite points break the line (or are skipped with
 * `connectNulls`). A run of a single point renders "M x,y Z" so round line caps show a dot.
 */
export function linePath(points: ReadonlyArray<Point | null | undefined>, options: PathOptions = {}): string {
  const write = WRITERS[options.curve ?? "linear"];
  const b = new PathBuilder(options.digits === undefined ? 3 : options.digits);
  for (const run of segments(points, defined, options.connectNulls ?? false)) {
    const drawn = write(
      b,
      run.map((p) => (p as Point)[0]),
      run.map((p) => (p as Point)[1]),
      false,
    );
    if (drawn === 1) b.close();
  }
  return b.d;
}

/** An area point: x, top y, baseline y. */
export type AreaPoint = readonly [x: number, y1: number, y0: number];

/**
 * A filled area between a top edge (x, y1) and a baseline (x, y0), using the same curve for both.
 * Points with any non-finite coordinate break the area into separate closed shapes.
 */
export function areaPath(points: ReadonlyArray<AreaPoint | null | undefined>, options: PathOptions = {}): string {
  const write = WRITERS[options.curve ?? "linear"];
  const b = new PathBuilder(options.digits === undefined ? 3 : options.digits);
  const ok = (p: AreaPoint | null | undefined) =>
    !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]);
  for (const run of segments(points, ok, options.connectNulls ?? false)) {
    const pts = run as AreaPoint[];
    write(
      b,
      pts.map((p) => p[0]),
      pts.map((p) => p[1]),
      false,
    );
    const back = [...pts].reverse();
    write(
      b,
      back.map((p) => p[0]),
      back.map((p) => p[2]),
      true,
      true,
    );
    b.close();
  }
  return b.d;
}

/** Convenience: area from top points down to a constant baseline y. */
export function areaToBaseline(points: ReadonlyArray<Point | null | undefined>, baseline: number, options: PathOptions = {}): string {
  return areaPath(
    points.map((p) => (p ? ([p[0], p[1], baseline] as const) : null)),
    options,
  );
}

export interface RadialOptions extends PathOptions {
  cx?: number;
  cy?: number;
  /** Close the shape back to the first point (radar polygons). */
  closed?: boolean;
}

/** Polar point to cartesian: angle in radians, 0 = 12 o'clock, clockwise. */
export function polar(angle: number, radius: number, cx = 0, cy = 0): Point {
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
}

/** A line through [angle, radius] points (radar, radial area edges). */
export function radialLinePath(points: ReadonlyArray<Point | null | undefined>, options: RadialOptions = {}): string {
  const { cx = 0, cy = 0, closed = false, ...rest } = options;
  const d = linePath(
    points.map((p) => (defined(p) ? polar(p[0], p[1], cx, cy) : null)),
    rest,
  );
  return closed && d && !d.endsWith("Z") ? `${d}Z` : d;
}

// ---------------------------------------------------------------------------------------------
// Arcs

export interface ArcOptions {
  innerRadius: number;
  outerRadius: number;
  /** Radians, 0 = 12 o'clock, clockwise. */
  startAngle: number;
  endAngle: number;
  /** Gap between neighboring slices, in radians at padRadius (a constant-width gap). Default 0. */
  padAngle?: number;
  /** Radius at which padAngle is measured. Default sqrt(inner^2 + outer^2). */
  padRadius?: number;
  /** Rounds the four corners (rounded donut ends). Clamped to fit. Default 0. */
  cornerRadius?: number;
  cx?: number;
  cy?: number;
  digits?: number | null;
}

const TAU = 2 * Math.PI;
const EPS = 1e-9;

interface ArcCorner {
  /** Point where the edge line meets the corner circle. */
  edge: Point;
  /** Point where the corner circle meets the ring circle. */
  ring: Point;
  /** Angle of `ring` on the ring circle. */
  angle: number;
  radius: number;
}

/**
 * One corner of an annular sector: the circle of radius rc tangent to the ring of radius R and to
 * the edge line at angle a (offset by h towards the slice interior). dir = +1 for the start edge.
 */
function corner(R: number, a: number, h: number, rc: number, inner: boolean, dir: 1 | -1): ArcCorner | null {
  const dist = inner ? R + rc : R - rc; // corner-circle center distance from the origin
  const off = h + rc; // its distance from the radial line through a
  if (dist <= 0 || off > dist) return null;
  const delta = Math.asin(off / dist);
  const along = Math.sqrt(dist * dist - off * off);
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  // perpendicular towards the slice interior
  const px = dir * Math.cos(a);
  const py = dir * Math.sin(a);
  const edge: Point = [ux * along + px * h, uy * along + py * h];
  const angle = a + dir * delta;
  return { edge, ring: [R * Math.sin(angle), -R * Math.cos(angle)], angle, radius: rc };
}

/** Centroid of an annular sector (label anchor). */
export function arcCentroid(options: Pick<ArcOptions, "innerRadius" | "outerRadius" | "startAngle" | "endAngle" | "cx" | "cy">): Point {
  const r = (options.innerRadius + options.outerRadius) / 2;
  const a = (options.startAngle + options.endAngle) / 2;
  return polar(a, r, options.cx, options.cy);
}

/**
 * An annular sector (pie/donut slice) with constant-width padding and rounded corners. Spans of
 * 2pi or more render a full ring (two arcs per circle, the hole wound the other way).
 */
export function arcPath(options: ArcOptions): string {
  const { cx = 0, cy = 0 } = options;
  let r0 = Math.max(0, Math.min(options.innerRadius, options.outerRadius));
  const r1 = Math.max(0, Math.max(options.innerRadius, options.outerRadius));
  const a0 = Math.min(options.startAngle, options.endAngle);
  const a1 = Math.max(options.startAngle, options.endAngle);
  const span = a1 - a0;
  const b = new PathBuilder(options.digits === undefined ? 3 : options.digits);
  const P = (p: Point) => [cx + p[0], cy + p[1]] as const;
  if (r1 <= EPS) {
    b.move(cx, cy);
    b.close();
    return b.d;
  }
  if (span >= TAU - EPS) {
    for (const [r, sweep] of [
      [r1, true],
      [r0, false],
    ] as const) {
      if (r <= EPS) continue;
      b.move(cx, cy - r);
      b.arc(r, true, sweep, cx, cy + r);
      b.arc(r, true, sweep, cx, cy - r);
      b.close();
    }
    return b.d;
  }

  const padRadius = options.padRadius ?? Math.sqrt(r0 * r0 + r1 * r1);
  const halfPad = Math.max(0, options.padAngle ?? 0) / 2;
  // Half the gap width in px; each edge line is offset this far from its radial line.
  let h = halfPad > 0 ? padRadius * Math.sin(Math.min(halfPad, Math.PI / 2)) : 0;
  const s = Math.sin(Math.min(span / 2, Math.PI / 2));
  // The pad cannot eat the whole outer edge: shrink it to leave a sliver.
  if (h > r1 * s * 0.999) h = r1 * s * 0.999;
  // The two offset edge lines meet on the bisector at h / sin(span / 2). Below that radius (or
  // below h for spans over pi) there is no inner edge, and the slice ends at that apex.
  const halfSin = Math.sin(span / 2);
  const apex = halfSin > EPS ? h / halfSin : 0;
  if (h > 0 ? r0 < (span < Math.PI ? apex : h) + EPS : r0 <= EPS) r0 = 0;

  let rc = Math.max(0, options.cornerRadius ?? 0);
  rc = Math.min(rc, (r1 - r0) / 2);
  if (span / 2 < Math.PI / 2) rc = Math.min(rc, (s * r1 - h) / (1 + s));
  if (r0 > 0 && s < 1 - EPS) rc = Math.min(rc, Math.max(0, (s * r0 - h) / (1 - s)));
  rc = Math.max(0, rc);

  const mid = (a0 + a1) / 2;
  const o0 = corner(r1, a0, h, rc, false, 1);
  const o1 = corner(r1, a1, h, rc, false, -1);
  if (!o0 || !o1) {
    b.move(cx, cy);
    b.close();
    return b.d;
  }
  // Outer edge: start corner, ring arc, end corner.
  if (rc > EPS) {
    b.move(...P(o0.edge));
    b.arc(rc, false, true, ...P(o0.ring));
  } else b.move(...P(o0.ring));
  b.arc(r1, o1.angle - o0.angle > Math.PI, true, ...P(o1.ring));
  if (rc > EPS) b.arc(rc, false, true, ...P(o1.edge));

  if (r0 > EPS) {
    const i1 = corner(r0, a1, h, rc, true, -1);
    const i0 = corner(r0, a0, h, rc, true, 1);
    if (i0 && i1) {
      if (rc > EPS) {
        b.line(...P(i1.edge));
        b.arc(rc, false, true, ...P(i1.ring));
      } else b.line(...P(i1.ring));
      b.arc(r0, i1.angle - i0.angle > Math.PI, false, ...P(i0.ring));
      if (rc > EPS) b.arc(rc, false, true, ...P(i0.edge));
      b.close();
      return b.d;
    }
  }
  // No inner edge: meet at the apex (the center when unpadded).
  const tip = polar(mid, apex);
  b.line(...P(tip));
  b.close();
  return b.d;
}

// ---------------------------------------------------------------------------------------------
// Ribbons and bars

export interface RibbonOptions {
  /** Source edge x and center y. */
  x0: number;
  y0: number;
  /** Target edge x and center y. */
  x1: number;
  y1: number;
  /** Thickness at the source (and at the target, unless width1 is given). */
  width: number;
  width1?: number;
  /** Control-point distance as a fraction of the horizontal gap (0.5 = symmetric S). */
  curvature?: number;
  digits?: number | null;
}

/** A filled horizontal S-shaped band from source to target (sankey links, flow diagrams). */
export function ribbonPath(o: RibbonOptions): string {
  const b = new PathBuilder(o.digits === undefined ? 3 : o.digits);
  const c = o.curvature ?? 0.5;
  const w0 = o.width / 2;
  const w1 = (o.width1 ?? o.width) / 2;
  const xa = o.x0 + (o.x1 - o.x0) * c;
  const xb = o.x1 - (o.x1 - o.x0) * c;
  b.move(o.x0, o.y0 - w0);
  b.cubic(xa, o.y0 - w0, xb, o.y1 - w1, o.x1, o.y1 - w1);
  b.line(o.x1, o.y1 + w1);
  b.cubic(xb, o.y1 + w1, xa, o.y0 + w0, o.x0, o.y0 + w0);
  b.close();
  return b.d;
}

export interface Corners {
  tl?: number;
  tr?: number;
  br?: number;
  bl?: number;
}

/** A rectangle with per-corner radii, each clamped to half the shorter side. Negative sizes are normalized. */
export function roundedRectPath(x: number, y: number, width: number, height: number, radius: number | Corners = 0, digits: number | null = 3): string {
  const x0 = Math.min(x, x + width);
  const y0 = Math.min(y, y + height);
  const w = Math.abs(width);
  const h = Math.abs(height);
  const b = new PathBuilder(digits);
  const max = Math.min(w, h) / 2;
  const c = typeof radius === "number" ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
  const r = (v: number | undefined) => Math.max(0, Math.min(max, v ?? 0));
  const tl = r(c.tl);
  const tr = r(c.tr);
  const br = r(c.br);
  const bl = r(c.bl);
  b.move(x0 + tl, y0);
  b.line(x0 + w - tr, y0);
  if (tr) b.arc(tr, false, true, x0 + w, y0 + tr);
  b.line(x0 + w, y0 + h - br);
  if (br) b.arc(br, false, true, x0 + w - br, y0 + h);
  b.line(x0 + bl, y0 + h);
  if (bl) b.arc(bl, false, true, x0, y0 + h - bl);
  b.line(x0, y0 + tl);
  if (tl) b.arc(tl, false, true, x0 + tl, y0);
  b.close();
  return b.d;
}

export type BarEnd = "top" | "bottom" | "left" | "right" | "none";

/**
 * A bar rounded only at its value end (`end`), so it stays flush with the baseline. Pass "none"
 * for inner stack segments; only the outermost segment of a stack should be rounded.
 */
export function roundedBarPath(x: number, y: number, width: number, height: number, radius: number, end: BarEnd = "top", digits: number | null = 3): string {
  const corners: Corners =
    end === "top"
      ? { tl: radius, tr: radius }
      : end === "bottom"
        ? { bl: radius, br: radius }
        : end === "right"
          ? { tr: radius, br: radius }
          : end === "left"
            ? { tl: radius, bl: radius }
            : {};
  return roundedRectPath(x, y, width, height, corners, digits);
}
