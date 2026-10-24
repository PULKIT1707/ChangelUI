"use client";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { GlobeIcon, MoonIcon, SunIcon } from "../lib/icons";
import { HighlightedText, defaultOptionFilter, type ListOption } from "../lib/listbox";
import { blockReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { useMinuteClock } from "../lib/use-minute-clock";
import { Combobox, type ComboboxProps } from "./combobox";
export interface TimezonePickerProps
  extends Omit<ComboboxProps, "options" | "value" | "defaultValue" | "onValueChange" | "renderOption" | "filter" | "creatable" | "onCreate"> {
  /** Selected IANA zone, e.g. "Europe/Berlin". */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (zone: string | null) => void;
  /** IANA zones to offer. Default: about 70 major cities across every region. */
  timeZones?: readonly string[];
  /** Zones shown first under "Pinned", e.g. where your team works. */
  pinned?: readonly string[];
  /** Pin the browser's own zone under "Your time zone". Default true. */
  showLocal?: boolean;
  /** Reference time for the clocks. Default: the client clock (minute precision) after hydration. */
  now?: Date | number;
  /** 12- or 24-hour clocks. Default: the locale's preference. */
  hour12?: boolean;
  /** Formatting locale. Default: the user's locale. */
  locale?: string;
  /** Group headings. */
  localLabel?: string;
  pinnedLabel?: string;
}
type Region = "Americas" | "Europe" | "Africa" | "Asia" | "Pacific" | "UTC";
interface ZoneInfo {
  label: string;
  aliases: readonly string[];
}
// City aliases make "Seattle", "Mumbai" or "Zurich" find the zone that serves them.
const ZONES: Record<string, ZoneInfo> = {
  "Pacific/Honolulu": { label: "Honolulu", aliases: ["Hawaii"] },
  "America/Anchorage": { label: "Anchorage", aliases: ["Alaska"] },
  "America/Los_Angeles": { label: "Los Angeles", aliases: ["San Francisco", "Seattle", "Vancouver", "Pacific Time", "PT"] },
  "America/Denver": { label: "Denver", aliases: ["Salt Lake City", "Calgary", "Mountain Time", "MT"] },
  "America/Phoenix": { label: "Phoenix", aliases: ["Arizona"] },
  "America/Chicago": { label: "Chicago", aliases: ["Dallas", "Houston", "Austin", "Winnipeg", "Central Time", "CT"] },
  "America/Mexico_City": { label: "Mexico City", aliases: ["Guadalajara", "Mexico"] },
  "America/New_York": { label: "New York", aliases: ["Boston", "Toronto", "Miami", "Atlanta", "Washington DC", "Montreal", "Eastern Time", "ET"] },
  "America/Bogota": { label: "Bogotá", aliases: ["Colombia", "Medellín"] },
  "America/Lima": { label: "Lima", aliases: ["Peru"] },
  "America/Halifax": { label: "Halifax", aliases: ["Atlantic Time", "Nova Scotia"] },
  "America/Santiago": { label: "Santiago", aliases: ["Chile"] },
  "America/St_Johns": { label: "St. John's", aliases: ["Newfoundland"] },
  "America/Sao_Paulo": { label: "São Paulo", aliases: ["Rio de Janeiro", "Brasília", "Brasil"] },
  "America/Argentina/Buenos_Aires": { label: "Buenos Aires", aliases: ["Argentina"] },
  UTC: { label: "UTC", aliases: ["Coordinated Universal Time", "GMT", "Zulu"] },
  "Europe/London": { label: "London", aliases: ["Edinburgh", "Manchester", "United Kingdom", "UK"] },
  "Europe/Dublin": { label: "Dublin", aliases: ["Ireland"] },
  "Europe/Lisbon": { label: "Lisbon", aliases: ["Portugal", "Porto"] },
  "Europe/Madrid": { label: "Madrid", aliases: ["Barcelona", "Spain"] },
  "Europe/Paris": { label: "Paris", aliases: ["France", "Brussels", "Lyon"] },
  "Europe/Amsterdam": { label: "Amsterdam", aliases: ["Netherlands", "Rotterdam"] },
  "Europe/Berlin": { label: "Berlin", aliases: ["Munich", "Frankfurt", "Hamburg", "Germany", "Vienna", "Zurich"] },
  "Europe/Rome": { label: "Rome", aliases: ["Milan", "Italy"] },
  "Europe/Stockholm": { label: "Stockholm", aliases: ["Sweden", "Oslo", "Copenhagen"] },
  "Europe/Warsaw": { label: "Warsaw", aliases: ["Poland", "Prague", "Budapest"] },
  "Europe/Athens": { label: "Athens", aliases: ["Greece", "Bucharest"] },
  "Europe/Helsinki": { label: "Helsinki", aliases: ["Finland", "Tallinn", "Riga", "Kyiv"] },
  "Europe/Istanbul": { label: "Istanbul", aliases: ["Turkey", "Ankara"] },
  "Europe/Moscow": { label: "Moscow", aliases: ["Saint Petersburg", "Russia"] },
  "Africa/Casablanca": { label: "Casablanca", aliases: ["Morocco"] },
  "Africa/Lagos": { label: "Lagos", aliases: ["Nigeria", "West Africa"] },
  "Africa/Cairo": { label: "Cairo", aliases: ["Egypt"] },
  "Africa/Johannesburg": { label: "Johannesburg", aliases: ["Cape Town", "South Africa"] },
  "Africa/Nairobi": { label: "Nairobi", aliases: ["Kenya", "East Africa", "Addis Ababa"] },
  "Asia/Jerusalem": { label: "Jerusalem", aliases: ["Tel Aviv", "Israel"] },
  "Asia/Riyadh": { label: "Riyadh", aliases: ["Saudi Arabia", "Kuwait", "Doha"] },
  "Asia/Tehran": { label: "Tehran", aliases: ["Iran"] },
  "Asia/Dubai": { label: "Dubai", aliases: ["Abu Dhabi", "UAE"] },
  "Asia/Karachi": { label: "Karachi", aliases: ["Pakistan", "Lahore", "Islamabad"] },
  "Asia/Kolkata": { label: "Kolkata", aliases: ["Mumbai", "New Delhi", "Bengaluru", "Bangalore", "Chennai", "Hyderabad", "India", "IST"] },
  "Asia/Kathmandu": { label: "Kathmandu", aliases: ["Nepal"] },
  "Asia/Dhaka": { label: "Dhaka", aliases: ["Bangladesh"] },
  "Asia/Bangkok": { label: "Bangkok", aliases: ["Thailand", "Hanoi"] },
  "Asia/Ho_Chi_Minh": { label: "Ho Chi Minh City", aliases: ["Saigon", "Vietnam"] },
  "Asia/Jakarta": { label: "Jakarta", aliases: ["Indonesia"] },
  "Asia/Singapore": { label: "Singapore", aliases: ["Kuala Lumpur", "Malaysia"] },
  "Asia/Manila": { label: "Manila", aliases: ["Philippines"] },
  "Asia/Hong_Kong": { label: "Hong Kong", aliases: [] },
  "Asia/Shanghai": { label: "Shanghai", aliases: ["Beijing", "Shenzhen", "China"] },
  "Asia/Taipei": { label: "Taipei", aliases: ["Taiwan"] },
  "Asia/Seoul": { label: "Seoul", aliases: ["Korea"] },
  "Asia/Tokyo": { label: "Tokyo", aliases: ["Osaka", "Japan"] },
  "Australia/Perth": { label: "Perth", aliases: ["Western Australia"] },
  "Australia/Adelaide": { label: "Adelaide", aliases: ["South Australia"] },
  "Australia/Brisbane": { label: "Brisbane", aliases: ["Queensland"] },
  "Australia/Sydney": { label: "Sydney", aliases: ["Melbourne", "Canberra", "Australia"] },
  "Pacific/Auckland": { label: "Auckland", aliases: ["Wellington", "New Zealand"] },
  "Pacific/Fiji": { label: "Fiji", aliases: [] },
};
const DEFAULT_ZONES = Object.keys(ZONES);
function regionOf(zone: string): Region {
  if (zone === "UTC" || zone.startsWith("Etc/")) return "UTC";
  const head = zone.split("/")[0];
  if (head === "America") return "Americas";
  if (head === "Europe") return "Europe";
  if (head === "Africa") return "Africa";
  if (head === "Asia" || head === "Indian") return "Asia";
  return "Pacific";
}
const REGION_ORDER: Region[] = ["UTC", "Americas", "Europe", "Africa", "Asia", "Pacific"];
const REGION_LABEL: Record<Region, string> = {
  UTC: "UTC",
  Americas: "Americas",
  Europe: "Europe",
  Africa: "Africa",
  Asia: "Asia & Middle East",
  Pacific: "Asia Pacific & Oceania",
};
const labelFor = (zone: string) => ZONES[zone]?.label ?? (zone.split("/").pop() ?? zone).replace(/_/g, " ");
function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
/** UTC offset of a zone at a moment, in minutes (east positive). */
export function timeZoneOffset(zone: string, at: Date | number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}
/** "GMT", "GMT+2" or "GMT+5:30". */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return "GMT";
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}
/** Parses "+5:30", "UTC-4", "gmt+1", "-03:00" or "+5.5" into minutes; null when the query is not an offset. */
function parseOffsetQuery(query: string): number | null {
  const q = query.trim().toLowerCase().replace(/^(utc|gmt)\s*/, "").replace(/\s+/g, "").replace("−", "-");
  const match = /^([+-])(\d{1,2})(?:(?::|\.)(\d{1,2}))?$/.exec(q);
  if (!match) return null;
  const hours = Number(match[2]);
  const rest = match[3];
  const minutes = rest === undefined ? 0 : query.includes(".") ? Math.round(Number(`0.${rest}`) * 60) : Number(rest);
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
}
interface ZoneRow {
  zone: string;
  offset: number | null;
  abbr: string | null;
}
/**
 * Searchable time zone picker that shows the current time in every zone. Zones are grouped by
 * region and sorted by UTC offset, the user's own zone and any pinned zones come first, and search
 * matches cities and their aliases ("Seattle", "Mumbai"), IANA ids, abbreviations ("PDT") and
 * offsets ("+5:30", "UTC-4"). A sun or moon marks working hours, and a day tag flags zones that are
 * already tomorrow or still yesterday. Built on Combobox; the ref goes to the input.
 */
export const TimezonePicker = React.forwardRef<HTMLInputElement, TimezonePickerProps>(function TimezonePicker(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    timeZones = DEFAULT_ZONES,
    pinned,
    showLocal = true,
    now: nowProp,
    hour12,
    locale,
    localLabel = "Your time zone",
    pinnedLabel = "Pinned",
    placeholder = "Search city, zone or offset…",
    emptyLabel = "No time zone matches",
    leadingIcon = <GlobeIcon />,
    ...props
  },
  ref,
) {
  const isClient = useIsClient();
  const clock = useMinuteClock();
  const now = nowProp !== undefined ? (nowProp instanceof Date ? nowProp.getTime() : nowProp) : clock;
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue });
  const localZone = React.useMemo(() => (isClient && showLocal ? Intl.DateTimeFormat().resolvedOptions().timeZone : null), [isClient, showLocal]);
  // Offsets and clocks need a client clock (they depend on DST), so the server renders names only.
  const rows = React.useMemo(() => {
    const seen = new Set<string>();
    const list: ZoneRow[] = [];
    const extra = [...(pinned ?? []), ...(localZone ? [localZone] : []), ...(value ? [value] : [])];
    for (const zone of [...timeZones, ...extra]) {
      if (seen.has(zone) || !isValidZone(zone)) continue;
      seen.add(zone);
      let abbr: string | null = null;
      if (now !== null) {
        abbr =
          new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ??
          null;
      }
      list.push({ zone, offset: now === null ? null : timeZoneOffset(zone, now), abbr: abbr && !abbr.startsWith("GMT") && abbr !== "UTC" ? abbr : null });
    }
    return list;
  }, [timeZones, pinned, localZone, value, now]);
  const byZone = React.useMemo(() => new Map(rows.map((r) => [r.zone, r])), [rows]);
  const options = React.useMemo<ListOption[]>(() => {
    const pinnedSet = new Set(pinned ?? []);
    const toOption = (row: ZoneRow, group: string): ListOption => ({
      value: row.zone,
      label: labelFor(row.zone),
      group,
      keywords: [
        row.zone,
        row.zone.replace(/_/g, " "),
        ...(ZONES[row.zone]?.aliases ?? []),
        ...(row.abbr ? [row.abbr] : []),
        ...(row.offset !== null ? [formatOffset(row.offset).replace("−", "-")] : []),
      ],
    });
    const head: ListOption[] = [];
    if (localZone && byZone.has(localZone)) head.push(toOption(byZone.get(localZone) as ZoneRow, localLabel));
    for (const zone of pinned ?? []) {
      const row = byZone.get(zone);
      if (row && zone !== localZone) head.push(toOption(row, pinnedLabel));
    }
    const taken = new Set(head.map((o) => o.value));
    const rest = rows
      .filter((r) => !taken.has(r.zone) && (timeZones.includes(r.zone) || r.zone === value) && !pinnedSet.has(r.zone))
      .sort((a, b) => {
        const ra = REGION_ORDER.indexOf(regionOf(a.zone));
        const rb = REGION_ORDER.indexOf(regionOf(b.zone));
        if (ra !== rb) return ra - rb;
        if (a.offset !== null && b.offset !== null && a.offset !== b.offset) return a.offset - b.offset;
        return labelFor(a.zone).localeCompare(labelFor(b.zone));
      })
      .map((r) => toOption(r, REGION_LABEL[regionOf(r.zone)]));
    return [...head, ...rest];
  }, [rows, byZone, pinned, localZone, timeZones, value, localLabel, pinnedLabel]);
  const timeFormat = React.useMemo(() => {
    const cache = new Map<string, Intl.DateTimeFormat>();
    return (zone: string) => {
      let f = cache.get(zone);
      if (!f) {
        f = new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "numeric", minute: "2-digit", hour12 });
        cache.set(zone, f);
      }
      return f;
    };
  }, [locale, hour12]);
  const localDayKey = React.useMemo(() => {
    if (now === null) return null;
    return dayKey(now, localZone ?? undefined);
  }, [now, localZone]);
  const filter = React.useCallback(
    (option: ListOption, query: string) => {
      const offset = parseOffsetQuery(query);
      if (offset !== null) return byZone.get(option.value)?.offset === offset;
      return defaultOptionFilter(option, query);
    },
    [byZone],
  );
  return (
    <Combobox
      ref={ref}
      {...props}
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      filter={filter}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      leadingIcon={leadingIcon}
      renderOption={(option, state) => {
        const row = byZone.get(option.value);
        const offset = row?.offset ?? null;
        const time = now !== null ? timeFormat(option.value).format(now) : null;
        const hour = now !== null ? hourIn(now, option.value) : null;
        const day = now !== null && localDayKey !== null ? dayKey(now, option.value) : null;
        const shift = day !== null && localDayKey !== null && day !== localDayKey ? (day > localDayKey ? "Tomorrow" : "Yesterday") : null;
        const daytime = hour !== null && hour >= 7 && hour < 19;
        return (
          <span className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-3")}>
            <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col")}>
              <span className={cn(blockReset, "truncate")}>
                <HighlightedText text={option.label ?? option.value} query={state.query} />
              </span>
              <span className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>
                {option.value.replace(/_/g, " ")}
                {row?.abbr ? ` · ${row.abbr}` : ""}
              </span>
            </span>
            {time !== null ? (
              <span className={cn(blockReset, "flex shrink-0 flex-col items-end")}>
                <span className={cn(blockReset, "flex items-center gap-1.5 text-sm tabular-nums")}>
                  {shift ? (
                    <span className={cn(blockReset, "rounded-pui-sm bg-pui-muted px-1 text-[0.625rem] font-medium text-pui-muted-foreground")}>{shift}</span>
                  ) : null}
                  {daytime ? (
                    <SunIcon className="size-3.5 text-pui-warning" />
                  ) : (
                    <MoonIcon className="size-3.5 text-pui-info" />
                  )}
                  {time}
                </span>
                {offset !== null ? <span className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>{formatOffset(offset)}</span> : null}
              </span>
            ) : null}
          </span>
        );
      }}
    />
  );
});
function hourIn(at: number, zone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(at);
  return Number(h) % 24;
}
/** yyyymmdd as a number, so later days compare greater. */
function dayKey(at: number, zone: string | undefined): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("year") * 10_000 + get("month") * 100 + get("day");
}
