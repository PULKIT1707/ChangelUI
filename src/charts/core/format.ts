// Intl-only formatting with cached formatters, plus a deterministic text-width estimate so tick
// density and margins are identical on the server and the client (no DOM measuring).
import { DAY, HOUR, MINUTE, SECOND, tickStep, type TimeUnit } from "./ticks";

/** Fixed default so server and client render identical text (charts-roadmap 2.4). */
export const DEFAULT_LOCALE = "en-US";
export const DEFAULT_TIME_ZONE = "UTC";

export type NumberFormat = Intl.NumberFormatOptions | ((value: number) => string);
export type DateFormat = Intl.DateTimeFormatOptions | ((value: number) => string);

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();
const CACHE_LIMIT = 256;

function cached<T>(cache: Map<string, T>, key: string, create: () => T): T {
  let value = cache.get(key);
  if (value === undefined) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    value = create();
    cache.set(key, value);
  }
  return value;
}

/** A cached Intl.NumberFormat per (locale, options). */
export function getNumberFormat(locale = DEFAULT_LOCALE, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return cached(numberCache, `${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options));
}

/** A cached Intl.DateTimeFormat per (locale, options). Pass `timeZone` in options (default UTC). */
export function getDateFormat(locale = DEFAULT_LOCALE, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const withZone = { timeZone: DEFAULT_TIME_ZONE, ...options };
  return cached(dateCache, `${locale}|${JSON.stringify(withZone)}`, () => new Intl.DateTimeFormat(locale, withZone));
}

/** Formats a number with Intl options or a custom function. Non-finite values render as an en dash. */
export function formatNumber(value: number, format: NumberFormat = {}, locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(value)) return "\u2013";
  return typeof format === "function" ? format(value) : getNumberFormat(locale, format).format(value);
}

/** 1.2K, 3.4M (axis default). */
export function formatCompact(value: number, locale = DEFAULT_LOCALE, maximumFractionDigits = 1): string {
  return formatNumber(value, { notation: "compact", maximumFractionDigits }, locale);
}

/** 0.123 -> "12.3%". */
export function formatPercent(value: number, locale = DEFAULT_LOCALE, maximumFractionDigits = 1): string {
  return formatNumber(value, { style: "percent", maximumFractionDigits }, locale);
}

export function formatCurrency(value: number, currency: string, locale = DEFAULT_LOCALE, compact = false): string {
  return formatNumber(
    value,
    compact ? { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 } : { style: "currency", currency },
    locale,
  );
}

const DURATION_UNITS: ReadonlyArray<readonly [Intl.NumberFormatOptions["unit"] & string, number]> = [
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
  ["second", SECOND],
  ["millisecond", 1],
];

/**
 * Milliseconds as the two largest non-zero units, narrow style: 5_400_000 -> "1h 30m" (en-US).
 * Sub-second values print as milliseconds; negative values keep their sign.
 */
export function formatDuration(ms: number, locale = DEFAULT_LOCALE, maxUnits = 2): string {
  if (!Number.isFinite(ms)) return "\u2013";
  const sign = ms < 0 ? "-" : "";
  let rest = Math.round(Math.abs(ms));
  const parts: string[] = [];
  for (const [unit, size] of DURATION_UNITS) {
    if (parts.length >= maxUnits) break;
    const amount = Math.floor(rest / size);
    if (amount > 0 || (unit === "millisecond" && parts.length === 0)) {
      parts.push(getNumberFormat(locale, { style: "unit", unit, unitDisplay: "narrow" }).format(amount));
      rest -= amount * size;
    }
  }
  return sign + parts.join(" ");
}

/** Formats an instant (epoch ms or Date). Default: medium date in UTC. */
export function formatDate(
  value: number | Date,
  format: DateFormat = { dateStyle: "medium" },
  locale = DEFAULT_LOCALE,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const t = +value;
  if (!Number.isFinite(t)) return "\u2013";
  return typeof format === "function" ? format(t) : getDateFormat(locale, { timeZone, ...format }).format(t);
}

/**
 * A formatter for numeric ticks: just enough fraction digits for the tick step, so 0.1-step ticks
 * print "0.1" and 1000-step ticks print "1,000". `compact` (axis default) gives 1.2K / 3.4M.
 */
export function tickFormat(
  start: number,
  stop: number,
  count = 10,
  options: { locale?: string; compact?: boolean; format?: Intl.NumberFormatOptions } = {},
): (value: number) => string {
  const step = Math.abs(tickStep(start, stop, count));
  const digits = Number.isFinite(step) && step > 0 ? Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) : 0;
  const base: Intl.NumberFormatOptions = options.compact
    ? { notation: "compact", maximumFractionDigits: Math.max(1, digits) }
    : { maximumFractionDigits: Math.min(20, digits), minimumFractionDigits: 0 };
  const fmt = getNumberFormat(options.locale ?? DEFAULT_LOCALE, { ...base, ...options.format });
  return (value) => fmt.format(value);
}

// ---------------------------------------------------------------------------------------------
// Time tick labels

const UNIT_FORMATS: Record<TimeUnit, Intl.DateTimeFormatOptions> = {
  millisecond: { minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 },
  second: { minute: "2-digit", second: "2-digit" },
  minute: { hour: "numeric", minute: "2-digit" },
  hour: { hour: "numeric" },
  day: { month: "short", day: "numeric" },
  week: { month: "short", day: "numeric" },
  month: { month: "short" },
  year: { year: "numeric" },
};

/** Single-level label for ticks of one interval unit ("Mar 4", "Mar", "2025"). */
export function timeTickFormat(unit: TimeUnit, locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE): (t: number) => string {
  const fmt = getDateFormat(locale, { ...UNIT_FORMATS[unit], timeZone });
  return (t) => fmt.format(t);
}

interface ZonedFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

/** Calendar fields of instant t in the given IANA zone (or "UTC"). */
export function zonedFields(t: number, timeZone = DEFAULT_TIME_ZONE): ZonedFields {
  if (timeZone === "UTC") {
    const d = new Date(t);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      ms: d.getUTCMilliseconds(),
    };
  }
  const fmt = getDateFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const out: Record<string, number> = {};
  for (const part of fmt.formatToParts(t)) if (part.type !== "literal") out[part.type] = Number(part.value);
  return {
    year: out.year ?? 0,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
    ms: ((t % 1000) + 1000) % 1000,
  };
}

/** The coarsest calendar boundary that t sits on, in the zone ("year" for Jan 1 00:00, ...). */
export function timeBoundary(t: number, timeZone = DEFAULT_TIME_ZONE): TimeUnit {
  const f = zonedFields(t, timeZone);
  if (f.ms) return "millisecond";
  if (f.second) return "second";
  if (f.minute) return "minute";
  if (f.hour) return "hour";
  if (f.day !== 1) return "day";
  if (f.month !== 1) return "month";
  return "year";
}

/**
 * Multi-level labels: each tick is labeled at the coarsest unit it starts, so a month axis reads
 * "Nov, Dec, 2025, Feb" and an hour axis shows the date at midnight ("6 PM, Mar 5, 6 AM").
 */
export function multiTimeFormat(locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE): (t: number) => string {
  return (t) => {
    const unit = timeBoundary(t, timeZone);
    return getDateFormat(locale, { ...UNIT_FORMATS[unit], timeZone }).format(t);
  };
}

// ---------------------------------------------------------------------------------------------
// Text width estimate

/**
 * Approximate rendered width of `text` in px at `fontPx`, from per-class character widths
 * (digits 0.56em, uppercase 0.66em, lowercase 0.52em, everything else 0.33em). Deterministic, so
 * label collision and margins agree between server and client.
 */
export function estimateTextWidth(text: string, fontPx = 12): number {
  let em = 0;
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") em += 0.56;
    else if (ch >= "A" && ch <= "Z") em += 0.66;
    else if (ch >= "a" && ch <= "z") em += 0.52;
    else if (ch.charCodeAt(0) > 0x2e7f) em += 1; // CJK and other full-width glyphs
    else em += 0.33;
  }
  return em * fontPx;
}
