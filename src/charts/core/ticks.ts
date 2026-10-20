// Nice numeric ticks and calendar-aware time ticks. Pure, dependency-free, server-safe.
// Numeric ticks follow the 1-2-5 x 10^k rule; time ticks pick the interval nearest to the requested
// density by ratio. Both follow the same rules as d3 (inspiration only; no code or dependency).

const E10 = 7.0710678118654755; // Math.sqrt(50), inlined so the module has no top-level calls
const E5 = 3.1622776601683795; // Math.sqrt(10)
const E2 = Math.SQRT2;

/** [first index, last index, increment]. A negative increment means "divide by |inc|" (exact decimals). */
type TickSpec = [number, number, number];

function tickSpec(start: number, stop: number, count: number): TickSpec {
  const raw = (stop - start) / Math.max(0, count);
  const power = Math.floor(Math.log10(raw));
  const error = raw / 10 ** power;
  const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
  let i0: number;
  let i1: number;
  let inc: number;
  if (power < 0) {
    // Work in inverse units so 0.1, 0.2, 0.3 are computed as 1/10, 2/10, 3/10 (no 0.30000000000000004).
    inc = 10 ** -power / factor;
    i0 = Math.round(start * inc);
    i1 = Math.round(stop * inc);
    if (i0 / inc < start) i0 += 1;
    if (i1 / inc > stop) i1 -= 1;
    inc = -inc;
  } else {
    inc = 10 ** power * factor;
    i0 = Math.round(start / inc);
    i1 = Math.round(stop / inc);
    if (i0 * inc < start) i0 += 1;
    if (i1 * inc > stop) i1 -= 1;
  }
  // A count between 0.5 and 2 can land between two ticks: retry with a denser target.
  if (i1 < i0 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
  return [i0, i1, inc];
}

/**
 * The tick step for about `count` ticks over [start, stop]. Positive: the step itself. Negative:
 * the step is 1 / |value| (kept inverted so sub-unit steps stay exact).
 */
export function tickIncrement(start: number, stop: number, count: number): number {
  return tickSpec(start, stop, count)[2];
}

/** The positive tick step for about `count` ticks; sign follows the domain direction. */
export function tickStep(start: number, stop: number, count: number): number {
  const reverse = stop < start;
  const inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

/** About `count` evenly spaced, round ticks inside [start, stop] (reversed domains give reversed ticks). */
export function ticks(start: number, stop: number, count: number): number[] {
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start;
  const [i0, i1, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
  if (!(i1 >= i0)) return [];
  const n = i1 - i0 + 1;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const k = reverse ? i1 - i : i0 + i;
    out[i] = inc < 0 ? k / -inc : k * inc;
  }
  return out;
}

/**
 * Extends [d0, d1] outward to round values for about `count` ticks. Iterates until the step is
 * stable (at most 10 rounds); a domain that never settles (zero span, NaN) is returned unchanged.
 */
export function nice(d0: number, d1: number, count = 10): [number, number] {
  const reverse = d1 < d0;
  let start = reverse ? d1 : d0;
  let stop = reverse ? d0 : d1;
  let previous: number | undefined;
  for (let round = 0; round < 10; round++) {
    const step = tickIncrement(start, stop, count);
    if (step === previous) return reverse ? [stop, start] : [start, stop];
    if (step > 0) {
      start = Math.floor(start / step) * step;
      stop = Math.ceil(stop / step) * step;
    } else if (step < 0) {
      start = Math.ceil(start * step) / step;
      stop = Math.floor(stop * step) / step;
    } else break;
    previous = step;
  }
  return [d0, d1];
}

// ---------------------------------------------------------------------------------------------
// Log ticks

/** Ticks for a log scale: 1-9 subdivisions per decade when few decades, else numeric ticks of the exponent. */
export function logTicks(d0: number, d1: number, count = 10, base = 10): number[] {
  const reverse = d1 < d0;
  const u = reverse ? d1 : d0;
  const v = reverse ? d0 : d1;
  const negative = u < 0;
  const { log, pow } = logPair(base, negative);
  let i = log(u);
  let j = log(v);
  let out: number[] = [];
  if (!(base % 1) && j - i < count) {
    i = Math.floor(i);
    j = Math.ceil(j);
    if (u > 0) {
      for (; i <= j; i++) {
        for (let k = 1; k < base; k++) {
          const t = i < 0 ? k / pow(-i) : k * pow(i);
          if (t < u) continue;
          if (t > v) break;
          out.push(t);
        }
      }
    } else {
      for (; i <= j; i++) {
        for (let k = base - 1; k >= 1; k--) {
          const t = i > 0 ? k / pow(-i) : k * pow(i);
          if (t < u) continue;
          if (t > v) break;
          out.push(t);
        }
      }
    }
    if (out.length * 2 < count) out = ticks(u, v, count);
  } else {
    out = ticks(i, j, Math.min(j - i, count)).map(pow);
  }
  return reverse ? out.reverse() : out;
}

function pow10(x: number): number {
  // "1e-3" parses to exactly 0.001; Math.pow(10, -3) is 0.0010000000000000002.
  return Number.isFinite(x) ? Number(`1e${x}`) : x < 0 ? 0 : x;
}

/** log/pow pair for a base; negative domains are reflected (-log(-x)). */
export function logPair(base: number, negative = false): { log: (x: number) => number; pow: (x: number) => number } {
  const log =
    base === Math.E ? Math.log : base === 10 ? Math.log10 : base === 2 ? Math.log2 : (x: number) => Math.log(x) / Math.log(base);
  const pow = base === 10 ? pow10 : base === Math.E ? Math.exp : (x: number) => base ** x;
  return negative ? { log: (x) => -log(-x), pow: (x) => -pow(-x) } : { log, pow };
}

// ---------------------------------------------------------------------------------------------
// Time intervals and ticks

export type TimeUnit = "millisecond" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

export const SECOND = 1e3;
export const MINUTE = 6e4;
export const HOUR = 36e5;
export const DAY = 864e5;
export const WEEK = 7 * DAY;
/** Nominal lengths used only to compare densities (calendar months and years vary). */
const MONTH_NOMINAL = 30 * DAY;
const YEAR_NOMINAL = 365 * DAY;

export interface TimeOptions {
  /** true (default): UTC calendar. false: the runtime's local calendar (avoid during SSR). */
  utc?: boolean;
  /** First day of the week for week ticks: 0 = Sunday (default), 1 = Monday (ISO). */
  weekStartsOn?: number;
}

export interface TimeInterval {
  unit: TimeUnit;
  step: number;
  /** Largest tick instant <= t. */
  floor(t: number): number;
  /** Smallest tick instant >= t. */
  ceil(t: number): number;
  /** Every tick instant in [start, stop]. */
  range(start: number, stop: number): number[];
}

const INTERVALS: ReadonlyArray<readonly [TimeUnit, number, number]> = [
  ["second", 1, SECOND],
  ["second", 5, 5 * SECOND],
  ["second", 15, 15 * SECOND],
  ["second", 30, 30 * SECOND],
  ["minute", 1, MINUTE],
  ["minute", 5, 5 * MINUTE],
  ["minute", 15, 15 * MINUTE],
  ["minute", 30, 30 * MINUTE],
  ["hour", 1, HOUR],
  ["hour", 3, 3 * HOUR],
  ["hour", 6, 6 * HOUR],
  ["hour", 12, 12 * HOUR],
  ["day", 1, DAY],
  ["day", 2, 2 * DAY],
  ["week", 1, WEEK],
  ["month", 1, MONTH_NOMINAL],
  ["month", 3, 3 * MONTH_NOMINAL],
  ["year", 1, YEAR_NOMINAL],
];

interface Calendar {
  year(d: Date): number;
  month(d: Date): number;
  date(d: Date): number;
  day(d: Date): number;
  make(y: number, m: number, d: number): number;
}

const UTC_CALENDAR: Calendar = {
  year: (d) => d.getUTCFullYear(),
  month: (d) => d.getUTCMonth(),
  date: (d) => d.getUTCDate(),
  day: (d) => d.getUTCDay(),
  // Date.UTC maps years 0-99 to 1900-1999; shift by one 400-year Gregorian cycle (146097 days) instead.
  make: (y, m, d) => (y >= 0 && y < 100 ? Date.UTC(y + 400, m, d) - 146097 * DAY : Date.UTC(y, m, d)),
};

const LOCAL_CALENDAR: Calendar = {
  year: (d) => d.getFullYear(),
  month: (d) => d.getMonth(),
  date: (d) => d.getDate(),
  day: (d) => d.getDay(),
  make: (y, m, d) => {
    const t = new Date(y + (y >= 0 && y < 100 ? 400 : 0), m, d);
    if (y >= 0 && y < 100) t.setFullYear(t.getFullYear() - 400);
    return t.getTime();
  },
};

/** Local offset in ms at instant t (0 in UTC mode). Used to floor sub-day units on the local clock. */
function localOffset(t: number): number {
  return -new Date(t).getTimezoneOffset() * MINUTE;
}

/**
 * A calendar interval: `step` units, aligned the way calendars are (seconds/minutes/hours on clock
 * multiples, multi-day steps on whole epoch days in UTC and on day-of-month 1, 3, 5... in local
 * time, months on Jan/Apr/Jul/Oct for step 3, years on multiples of the step).
 */
export function timeInterval(unit: TimeUnit, step = 1, options: TimeOptions = {}): TimeInterval {
  const utc = options.utc ?? true;
  const weekStartsOn = (((options.weekStartsOn ?? 0) % 7) + 7) % 7;
  const cal = utc ? UTC_CALENDAR : LOCAL_CALENDAR;
  const k = Math.max(1, Math.floor(step));

  let floor: (t: number) => number;
  let next: (t: number) => number;

  switch (unit) {
    case "millisecond":
    case "second":
    case "minute":
    case "hour": {
      const size = k * (unit === "millisecond" ? 1 : unit === "second" ? SECOND : unit === "minute" ? MINUTE : HOUR);
      floor = (t) => {
        const off = utc || unit === "millisecond" || unit === "second" ? 0 : localOffset(t);
        return Math.floor((t + off) / size) * size - off;
      };
      next = (t) => {
        if (utc) return t + size;
        // Local clock: a DST fall-back hour can floor back onto t, so overshoot by an hour once.
        const n = floor(t + size);
        return n > t ? n : floor(t + size + HOUR);
      };
      break;
    }
    case "day": {
      if (utc) {
        // UTC multi-day steps count whole days since the epoch, so spacing stays even across
        // month ends (no 31st-then-1st pair).
        const size = k * DAY;
        floor = (t) => Math.floor(t / size) * size;
        next = (t) => t + size;
        break;
      }
      floor = (t) => {
        const d = new Date(t);
        const day = cal.date(d);
        return cal.make(cal.year(d), cal.month(d), day - ((day - 1) % k));
      };
      next = (t) => {
        const d = new Date(t);
        const probe = cal.make(cal.year(d), cal.month(d), cal.date(d) + k);
        // Restart at the 1st when the step runs past the month (1st, 3rd, ..., 29th, 31st, then 1st).
        return cal.month(new Date(probe)) === cal.month(d) ? probe : cal.make(cal.year(d), cal.month(d) + 1, 1);
      };
      break;
    }
    case "week": {
      floor = (t) => {
        const d = new Date(t);
        const back = (cal.day(d) - weekStartsOn + 7) % 7;
        return cal.make(cal.year(d), cal.month(d), cal.date(d) - back);
      };
      next = (t) => {
        const d = new Date(t);
        return cal.make(cal.year(d), cal.month(d), cal.date(d) + 7 * k);
      };
      break;
    }
    case "month": {
      floor = (t) => {
        const d = new Date(t);
        const m = cal.month(d);
        return cal.make(cal.year(d), m - (m % k), 1);
      };
      next = (t) => {
        const d = new Date(t);
        return cal.make(cal.year(d), cal.month(d) + k, 1);
      };
      break;
    }
    case "year": {
      floor = (t) => {
        const y = cal.year(new Date(t));
        return cal.make(Math.floor(y / k) * k, 0, 1);
      };
      next = (t) => cal.make(cal.year(new Date(t)) + k, 0, 1);
      break;
    }
  }

  const ceil = (t: number) => {
    const f = floor(t);
    return f < t ? next(f) : f;
  };
  return {
    unit,
    step: k,
    floor,
    ceil,
    range(start, stop) {
      const out: number[] = [];
      if (!(stop >= start)) return out;
      for (let t = ceil(start); t <= stop; t = next(t)) {
        out.push(t);
        if (out.length > 1e5) break; // guards against pathological domains
      }
      return out;
    },
  };
}

/**
 * The interval whose nominal length is nearest (by ratio) to span / count. Spans finer than a
 * second use millisecond steps; spans coarser than a year use 1-2-5 multiples of years.
 */
export function pickTimeInterval(t0: number, t1: number, count = 10, options: TimeOptions = {}): TimeInterval {
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  const target = (hi - lo) / count;
  let i = 0;
  while (i < INTERVALS.length && (INTERVALS[i] as readonly [TimeUnit, number, number])[2] <= target) i++;
  if (i === INTERVALS.length) {
    return timeInterval("year", Math.abs(tickStep(lo / YEAR_NOMINAL, hi / YEAR_NOMINAL, count)), options);
  }
  if (i === 0) return timeInterval("millisecond", Math.max(Math.abs(tickStep(lo, hi, count)), 1), options);
  const below = INTERVALS[i - 1] as readonly [TimeUnit, number, number];
  const above = INTERVALS[i] as readonly [TimeUnit, number, number];
  const [unit, step] = target / below[2] < above[2] / target ? below : above;
  return timeInterval(unit, step, options);
}

export interface TimeTicks {
  ticks: number[];
  interval: TimeInterval;
}

/** About `count` calendar-aligned ticks (epoch ms) inside [t0, t1]; reversed domains give reversed ticks. */
export function timeTicks(t0: number, t1: number, count = 10, options: TimeOptions = {}): TimeTicks {
  const reverse = t1 < t0;
  const lo = reverse ? t1 : t0;
  const hi = reverse ? t0 : t1;
  const interval = pickTimeInterval(lo, hi, count, options);
  const out = interval.range(lo, hi);
  return { ticks: reverse ? out.reverse() : out, interval };
}

/** Extends [t0, t1] outward to the interval picked for `count` ticks. */
export function niceTime(t0: number, t1: number, count = 10, options: TimeOptions = {}): [number, number] {
  const reverse = t1 < t0;
  const lo = reverse ? t1 : t0;
  const hi = reverse ? t0 : t1;
  const interval = pickTimeInterval(lo, hi, count, options);
  const a = interval.floor(lo);
  const b = interval.ceil(hi);
  return reverse ? [b, a] : [a, b];
}
