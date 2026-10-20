// Calendar math on plain ISO date strings ("YYYY-MM-DD") with no date library (roadmap I-11).
// Every computation runs in UTC on the date parts, so time zones and DST never shift a day, and
// labels come from Intl.DateTimeFormat with timeZone "UTC" so the server and client agree.

/** 0 = Sunday ... 6 = Saturday, like Date#getDay. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DateParts {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const DAY_MS = 86_400_000;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Parses "YYYY-MM-DD"; null when malformed or not a real date (2024-02-30). */
export function parseISODate(value: string | null | undefined): DateParts | null {
  if (!value) return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && parseISODate(value) !== null;
}

export function toISODate({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** "YYYY-MM" of a date or month string; null when malformed. */
export function toISOMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseISODate(value);
  if (date) return `${pad(date.year, 4)}-${pad(date.month)}`;
  const match = ISO_MONTH.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : null;
}

/** First day of a "YYYY-MM" month as parts. */
export function monthParts(isoMonth: string): DateParts {
  const [year, month] = isoMonth.split("-").map(Number) as [number, number];
  return { year, month, day: 1 };
}

function toUTC(iso: string): number {
  const { year, month, day } = parseISODate(iso) ?? { year: 1970, month: 1, day: 1 };
  return Date.UTC(year, month - 1, day);
}

function fromUTC(ms: number): string {
  const date = new Date(ms);
  return toISODate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

/** The local calendar day of `now` as ISO. Call it in effects or after mount, never in SSR output. */
export function todayISO(now: Date = new Date()): string {
  return toISODate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

export function addDays(iso: string, days: number): string {
  return fromUTC(toUTC(iso) + days * DAY_MS);
}

/** Adds months and clamps the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseISODate(iso) ?? { year: 1970, month: 1, day: 1 };
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return toISODate({ year: nextYear, month: nextMonth, day: Math.min(day, daysInMonth(nextYear, nextMonth)) });
}

export function addMonthsToMonth(isoMonth: string, months: number): string {
  return addMonths(`${isoMonth}-01`, months).slice(0, 7);
}

/** Whole months from `a` to `b` ("YYYY-MM"). */
export function monthDelta(a: string, b: string): number {
  const pa = monthParts(a);
  const pb = monthParts(b);
  return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}

export function dayOfWeek(iso: string): WeekDay {
  return new Date(toUTC(iso)).getUTCDay() as WeekDay;
}

/** Days from `a` to `b`. */
export function dayDelta(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** ISO strings compare correctly as text; this just names it. */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function clampISO(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function startOfWeek(iso: string, weekStartsOn: WeekDay): string {
  return addDays(iso, -((dayOfWeek(iso) - weekStartsOn + 7) % 7));
}

export function endOfWeek(iso: string, weekStartsOn: WeekDay): string {
  return addDays(startOfWeek(iso, weekStartsOn), 6);
}

export interface MonthDay {
  iso: string;
  day: number;
  /** Belongs to the previous or next month (leading/trailing filler). */
  outside: boolean;
}

/** Weeks of the month starting on `weekStartsOn`. `fixedWeeks` always returns 6 rows. */
export function monthMatrix(isoMonth: string, weekStartsOn: WeekDay, fixedWeeks = true): MonthDay[][] {
  const first = `${isoMonth}-01`;
  const { year, month } = monthParts(isoMonth);
  const total = daysInMonth(year, month);
  const start = startOfWeek(first, weekStartsOn);
  const lead = dayDelta(start, first);
  const rows = fixedWeeks ? 6 : Math.ceil((lead + total) / 7);
  const weeks: MonthDay[][] = [];
  let cursor = start;
  for (let row = 0; row < rows; row += 1) {
    const week: MonthDay[] = [];
    for (let col = 0; col < 7; col += 1) {
      const parts = parseISODate(cursor) as DateParts;
      week.push({ iso: cursor, day: parts.day, outside: parts.month !== month || parts.year !== year });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** Cached UTC formatter, so labels never depend on the viewer's time zone. */
export function dateFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatISO(iso: string, locale: string | undefined, options: Intl.DateTimeFormatOptions): string {
  return dateFormatter(locale, options).format(toUTC(iso));
}

/** Weekday names in display order starting at `weekStartsOn`. */
export function weekdayNames(
  locale: string | undefined,
  weekStartsOn: WeekDay,
  width: "narrow" | "short" | "long",
): string[] {
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    formatISO(addDays("2023-01-01", (weekStartsOn + index) % 7), locale, { weekday: width }),
  );
}

/** Month names January..December. */
export function monthNames(locale: string | undefined, width: "short" | "long"): string[] {
  return Array.from({ length: 12 }, (_, index) => formatISO(`2023-${pad(index + 1)}-01`, locale, { month: width }));
}

/** Locale's first day of the week via Intl.Locale weekInfo where available; falls back to Sunday. */
export function localeWeekStart(locale: string | undefined): WeekDay {
  try {
    const info = (new Intl.Locale(locale ?? "en-US") as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    });
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (typeof firstDay === "number") return (firstDay % 7) as WeekDay;
  } catch {
    // Unknown locale tag: use the default below.
  }
  return 0;
}

type PartOrder = Array<"year" | "month" | "day">;

/** The numeric field order of the locale's short date, e.g. ["month", "day", "year"] for en-US. */
function numericOrder(locale: string | undefined): PartOrder {
  const parts = dateFormatter(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    Date.UTC(2023, 10, 22),
  );
  const order = parts
    .map((part) => part.type)
    .filter((type): type is "year" | "month" | "day" => type === "year" || type === "month" || type === "day");
  return order.length === 3 ? order : ["month", "day", "year"];
}

function normalizeYear(year: number, digits: number): number {
  return digits <= 2 ? 2000 + year : year;
}

function build(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return toISODate({ year, month, day });
}

/**
 * Parses typed text into an ISO date: ISO ("2024-03-09"), the locale's numeric order ("3/9/2024",
 * "9.3.24"), month names in the locale or English ("Mar 9", "9 March 2024"), and the words
 * today / tomorrow / yesterday. A missing year uses the year of `reference` (an ISO date).
 */
export function parseDateInput(text: string, locale: string | undefined, reference: string): string | null {
  const input = text.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!input) return null;
  if (input === "today") return reference;
  if (input === "tomorrow") return addDays(reference, 1);
  if (input === "yesterday") return addDays(reference, -1);
  const relative = /^([+-])\s?(\d{1,3})\s?(d|w|m|day|days|week|weeks|month|months)$/.exec(input);
  if (relative) {
    const amount = Number(relative[2]) * (relative[1] === "-" ? -1 : 1);
    const unit = relative[3] as string;
    if (unit.startsWith("m")) return addMonths(reference, amount);
    return addDays(reference, unit.startsWith("w") ? amount * 7 : amount);
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const refYear = (parseISODate(reference) ?? { year: 2024 }).year;
  const tokens = input.split(/[\s/.\-]+/).filter(Boolean);

  // Month names: match the locale's and English names by prefix (at least 3 letters).
  const names = [...monthNames(locale, "long"), ...monthNames("en-US", "long")].map((name) =>
    name.toLowerCase().replace(/\./g, ""),
  );
  const nameIndex = tokens.findIndex((token) => /\p{L}/u.test(token));
  if (nameIndex !== -1) {
    const word = (tokens[nameIndex] as string).replace(/\./g, "");
    if (word.length < 3) return null;
    const found = names.findIndex((name) => name.startsWith(word));
    if (found === -1) return null;
    const month = (found % 12) + 1;
    const numbers = tokens.filter((_, index) => index !== nameIndex).map((token) => token.replace(/\D/g, ""));
    if (numbers.length === 0 || numbers.length > 2 || numbers.some((n) => n === "")) return null;
    let day: number;
    let year = refYear;
    if (numbers.length === 1) day = Number(numbers[0]);
    else if ((numbers[0] as string).length === 4) {
      year = Number(numbers[0]);
      day = Number(numbers[1]);
    } else {
      day = Number(numbers[0]);
      year = normalizeYear(Number(numbers[1]), (numbers[1] as string).length);
    }
    return build(year, month, day);
  }

  if (!tokens.every((token) => /^\d+$/.test(token))) return null;
  if (tokens.length === 1 && /^\d{8}$/.test(tokens[0] as string)) {
    const raw = tokens[0] as string;
    return build(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)), Number(raw.slice(6, 8)));
  }
  if (tokens.length < 2 || tokens.length > 3) return null;
  const order = numericOrder(locale);
  const fields = tokens.length === 2 ? order.filter((part) => part !== "year") : order;
  const values: Record<string, number> = { year: refYear };
  fields.forEach((field, index) => {
    const token = tokens[index] as string;
    values[field] = field === "year" ? normalizeYear(Number(token), token.length) : Number(token);
  });
  return build(values.year as number, values.month as number, values.day as number);
}
