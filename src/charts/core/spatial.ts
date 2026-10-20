// Hit testing without the DOM: binary search for x-sorted series and a uniform grid for scatter
// and network marks. Both work identically for SVG and canvas renderers.

/** Index of the first element >= x in ascending `xs` (xs.length when none). */
export function bisectLeft(xs: ArrayLike<number>, x: number, lo = 0, hi = xs.length): number {
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((xs[mid] as number) < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the first element > x in ascending `xs`. */
export function bisectRight(xs: ArrayLike<number>, x: number, lo = 0, hi = xs.length): number {
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((xs[mid] as number) <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the value nearest to x in ascending `xs` (ties go left); -1 when empty. O(log n). */
export function nearestIndex(xs: ArrayLike<number>, x: number): number {
  const n = xs.length;
  if (!n) return -1;
  const i = bisectLeft(xs, x);
  if (i === 0) return 0;
  if (i === n) return n - 1;
  return x - (xs[i - 1] as number) <= (xs[i] as number) - x ? i - 1 : i;
}

/**
 * Uniform-bucket spatial index for nearest-mark lookup (default 24 px cells, the hover radius).
 * Insert points once per layout; queries only scan the cells the search radius touches.
 */
export class GridIndex {
  private readonly cell: number;
  private readonly buckets = new Map<string, number[]>();
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];

  constructor(cellSize = 24) {
    this.cell = Math.max(1, cellSize);
  }

  get size(): number {
    return this.xs.length;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  /** Adds a point; returns its id (insertion order). Non-finite points are stored but never found. */
  add(x: number, y: number): number {
    const id = this.xs.length;
    this.xs.push(x);
    this.ys.push(y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
      const list = this.buckets.get(k);
      if (list) list.push(id);
      else this.buckets.set(k, [id]);
    }
    return id;
  }

  private scan(x: number, y: number, radius: number, visit: (id: number, d2: number) => void): void {
    const r2 = radius * radius;
    const c0x = Math.floor((x - radius) / this.cell);
    const c1x = Math.floor((x + radius) / this.cell);
    const c0y = Math.floor((y - radius) / this.cell);
    const c1y = Math.floor((y + radius) / this.cell);
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cy = c0y; cy <= c1y; cy++) {
        const list = this.buckets.get(this.key(cx, cy));
        if (!list) continue;
        for (const id of list) {
          const dx = (this.xs[id] as number) - x;
          const dy = (this.ys[id] as number) - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) visit(id, d2);
        }
      }
    }
  }

  /** The id of the nearest point within `radius` (ties: lowest id), or -1. */
  nearest(x: number, y: number, radius = this.cell): number {
    let best = -1;
    let bestD = Infinity;
    this.scan(x, y, radius, (id, d2) => {
      if (d2 < bestD || (d2 === bestD && id < best)) {
        bestD = d2;
        best = id;
      }
    });
    return best;
  }

  /** Ids of every point within `radius`, nearest first. */
  within(x: number, y: number, radius: number): number[] {
    const hits: Array<[number, number]> = [];
    this.scan(x, y, radius, (id, d2) => hits.push([id, d2]));
    return hits.sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((h) => h[0]);
  }
}
