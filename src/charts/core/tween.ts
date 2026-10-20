// Data tweening helpers: charts tween values, not path strings. A keyed join pairs old and new
// points so updates interpolate, entering points grow out of the line, and exiting ones collapse.

export interface Join {
  /** Indices into `next` that have no match in `prev`. */
  enter: number[];
  /** [prevIndex, nextIndex] pairs with the same key. */
  update: Array<[number, number]>;
  /** Indices into `prev` that have no match in `next`. */
  exit: number[];
}

/** Pairs items by key (first occurrence wins for duplicate keys). */
export function joinByKey<K>(prev: readonly K[], next: readonly K[]): Join {
  const before = new Map<K, number>();
  prev.forEach((k, i) => {
    if (!before.has(k)) before.set(k, i);
  });
  const matched = new Set<number>();
  const enter: number[] = [];
  const update: Array<[number, number]> = [];
  next.forEach((k, j) => {
    const i = before.get(k);
    if (i === undefined || matched.has(i)) enter.push(j);
    else {
      matched.add(i);
      update.push([i, j]);
    }
  });
  const exit = prev.map((_, i) => i).filter((i) => !matched.has(i));
  return { enter, update, exit };
}

/** out[i] = a[i] + (b[i] - a[i]) * t. Reuses `out` when given (no allocation per frame). */
export function interpolateArray(a: ArrayLike<number>, b: ArrayLike<number>, t: number, out?: Float64Array): Float64Array {
  const n = Math.min(a.length, b.length);
  const target = out && out.length === n ? out : new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = a[i] as number;
    target[i] = x + ((b[i] as number) - x) * t;
  }
  return target;
}

export interface TweenFrames {
  /** Start values, aligned with the next keys. */
  from: Float64Array;
  /** End values (the next data). */
  to: Float64Array;
  /** Exiting values (prev order) and where they collapse to. */
  exitFrom: Float64Array;
  exitTo: Float64Array;
  join: Join;
}

/**
 * Start/end arrays for a data update. Entering points start at the previous value of the nearest
 * matched neighbor before them (so they grow out of the line) or at `baseline` when there is none
 * or `enter` is "baseline". Exiting points collapse to `baseline`.
 */
export function tweenFrames<K>(
  prevKeys: readonly K[],
  prevValues: ArrayLike<number>,
  nextKeys: readonly K[],
  nextValues: ArrayLike<number>,
  options: { baseline?: number; enter?: "neighbor" | "baseline" } = {},
): TweenFrames {
  const baseline = options.baseline ?? 0;
  const join = joinByKey(prevKeys, nextKeys);
  const n = nextKeys.length;
  const from = new Float64Array(n);
  const to = new Float64Array(n);
  const prevOf = new Int32Array(n).fill(-1);
  for (const [i, j] of join.update) prevOf[j] = i;
  let lastPrev = Number.NaN;
  for (let j = 0; j < n; j++) {
    to[j] = nextValues[j] as number;
    const i = prevOf[j] as number;
    if (i >= 0) {
      from[j] = prevValues[i] as number;
      lastPrev = from[j] as number;
    } else from[j] = options.enter === "baseline" || Number.isNaN(lastPrev) ? baseline : lastPrev;
  }
  // Points entering before the first match take that first match's value instead of the baseline.
  if (options.enter !== "baseline") {
    const firstMatch = prevOf.findIndex((i) => i >= 0);
    for (let j = 0; j < firstMatch; j++) from[j] = prevValues[prevOf[firstMatch] as number] as number;
  }
  const exitFrom = Float64Array.from(join.exit, (i) => prevValues[i] as number);
  const exitTo = new Float64Array(join.exit.length).fill(baseline);
  return { from, to, exitFrom, exitTo, join };
}
