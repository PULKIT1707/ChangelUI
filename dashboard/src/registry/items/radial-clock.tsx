import { RadialClock, type RadialClockBand, type RadialClockProps, type RadialClockSelection } from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  layout: "hours" | "week";
  size: number;
  innerRadius: number;
  startAt: "midnight-top" | "noon-top";
  clock: "24h" | "12h";
  bands: boolean;
  nowHand: boolean;
};
const defaults: DemoProps = { layout: "hours", size: 320, innerRadius: 0.3, startAt: "midnight-top", clock: "24h", bands: true, nowHand: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "layout", label: "Layout", options: ["hours", "week"] },
  { type: "number", prop: "size", label: "Size (px)", min: 200, max: 400, step: 10 },
  { type: "number", prop: "innerRadius", label: "Hole", min: 0.1, max: 0.5, step: 0.05 },
  { type: "select", prop: "startAt", label: "Start at", options: ["midnight-top", "noon-top"] },
  { type: "select", prop: "clock", label: "Clock", options: ["24h", "12h"] },
  { type: "boolean", prop: "bands", label: "Business-hours band" },
  { type: "boolean", prop: "nowHand", label: "Now hand" },
];

/** Support tickets per hour: a morning ramp, a lunch dip, an afternoon peak and a quiet night. */
function ticketsByHour(seed: number): number[] {
  const rand = mulberry32(seed * 4409 + 3);
  return Array.from({ length: 24 }, (_, h) => {
    const day = Math.exp(-((h - 10.5) ** 2) / 7) * 210 + Math.exp(-((h - 15) ** 2) / 6) * 260;
    const lunch = h === 12 || h === 13 ? 0.72 : 1;
    const night = h < 6 ? 6 + rand() * 10 : 18;
    return Math.round((day * lunch + night) * (0.85 + rand() * 0.3));
  });
}

/** Commits per weekday hour: weekdays busy 9-18, a late-night tail, quiet weekends. */
function commitsByWeek(seed: number): number[][] {
  const rand = mulberry32(seed * 1291 + 17);
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const weekend = d >= 5;
      const work = Math.exp(-((h - 14) ** 2) / 14) * (weekend ? 6 : 28);
      const late = h >= 21 || h <= 1 ? (weekend ? 5 : 4) : 0;
      const v = work + late + (h < 7 && h > 1 ? 0 : rand() * 3);
      return Math.max(0, Math.round(v * (0.7 + rand() * 0.6) - (rand() < 0.08 ? v : 0)));
    }),
  );
}

const BUSINESS: RadialClockBand[] = [{ from: 9, to: 17, label: "Support hours", color: "var(--pui-chart-2)" }];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const week = props.layout === "week";
  return (
    <ChartDemo onRandomize={randomize} hint="Hover or arrow through the hours; the middle reads the bin, or the peak when nothing is selected.">
      <div className="flex w-full justify-center">
        <RadialClock
          data={week ? undefined : ticketsByHour(seed)}
          matrix={week ? commitsByWeek(seed) : undefined}
          size={props.size}
          innerRadius={props.innerRadius}
          startAt={props.startAt}
          clock={props.clock}
          bands={props.bands ? BUSINESS : undefined}
          nowHand={props.nowHand}
          unit={week ? "commits" : "tickets"}
          chartLabel={week ? "Commits by weekday and hour" : "Support tickets by hour"}
        />
      </div>
    </ChartDemo>
  );
}

function Mini() {
  return <RadialClock data={ticketsByHour(1)} size={150} innerRadius={0.28} animation="never" />;
}

function FootTraffic() {
  const visits = [0, 0, 0, 0, 0, 0, 0, 4, 22, 41, 58, 74, 96, 88, 61, 55, 67, 92, 118, 104, 63, 27, 0, 0];
  return (
    <RadialClock
      title="Store visits today"
      description="The red hand is the time now in Lisbon, updated every 30 s."
      data={visits}
      bands={[{ from: 7, to: 22, label: "Open", color: "var(--pui-chart-3)" }]}
      nowHand
      timeZone="Europe/Lisbon"
      unit="visits"
      color="var(--pui-chart-4)"
      size={260}
      className="w-full"
    />
  );
}

function WeekPunchCard() {
  const [seed, randomize] = useSeed(5);
  return (
    <ChartDemo onRandomize={randomize} hint="Up and down arrows move between days, left and right between hours.">
      <div className="flex w-full justify-center">
        <RadialClock matrix={commitsByWeek(seed)} unit="commits" size={300} innerRadius={0.22} chartLabel="Commits by weekday and hour" />
      </div>
    </ChartDemo>
  );
}

function SleepFace() {
  const halfHours = Array.from({ length: 48 }, (_, i) => {
    const h = i / 2;
    const asleep = h >= 23 || h < 6.5;
    return asleep ? Math.round(40 + Math.sin(i * 1.7) * 18 + (h > 2 && h < 4 ? 30 : 0)) : h > 6.5 && h < 7.5 ? 12 : 0;
  });
  return (
    <RadialClock
      title="Deep sleep, minutes per half hour"
      data={halfHours}
      startAt="noon-top"
      clock="12h"
      bands={[
        { from: 23, to: 6.5, label: "Asleep", color: "var(--pui-chart-5)" },
        { from: 22, to: 23, label: "Wind down", color: "var(--pui-chart-6)" },
      ]}
      unit="min"
      color="var(--pui-chart-5)"
      size={260}
      className="w-full"
    />
  );
}

function ClickToFilter() {
  const data = ticketsByHour(9);
  const [sel, setSel] = useState<RadialClockSelection | null>(null);
  const tickets = sel ? Math.min(4, Math.max(1, Math.round(sel.value / 60))) : 0;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <RadialClock data={data} size={240} unit="tickets" chartLabel="Tickets by hour" onSelect={setSel} />
      <p className="min-h-10 text-center text-xs text-pui-muted-foreground" aria-live="polite">
        {sel ? (
          <>
            Showing <span className="font-semibold tabular-nums text-pui-foreground">{sel.value}</span> tickets opened {String(sel.hour).padStart(2, "0")}:00–
            {String(sel.hour + 1).padStart(2, "0")}:00 · {tickets} assignee{tickets === 1 ? "" : "s"} on shift
          </>
        ) : (
          "Click a sector (or press Enter on one) to filter the queue to that hour."
        )}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<RadialClock",
      p.layout === "week" ? "  matrix={commitsByDayAndHour} // 7 rows x 24 hours" : "  data={ticketsPerHour} // 24 values",
      p.layout === "week" ? '  unit="commits"' : '  unit="tickets"',
      p.size !== 300 ? `  size={${p.size}}` : null,
      p.innerRadius !== 0.3 ? `  innerRadius={${p.innerRadius}}` : null,
      p.startAt !== "midnight-top" ? `  startAt="${p.startAt}"` : null,
      p.clock !== "24h" ? `  clock="${p.clock}"` : null,
      p.bands ? '  bands={[{ from: 9, to: 17, label: "Support hours" }]}' : null,
      p.nowHand ? "  nowHand" : null,
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<RadialClockProps>()([
    { name: "data", type: "number[]", description: 'Hours layout: one value per bin spread over 24 h (24 hourly, 48 half-hourly).' },
    { name: "matrix", type: "number[][]", description: "Week layout: rows of bins (default 7 x 24); the first row is the inner ring." },
    { name: "layout", type: '"hours" | "week"', default: '"week" with matrix', description: "Polar histogram or radial heatmap." },
    { name: "rowLabels", type: "string[]", default: "Mon..Sun", description: "Row names in the week layout." },
    { name: "max", type: "number", default: "largest value", description: "Value at the outer rim (or the darkest cell)." },
    { name: "size", type: "number", default: "300", description: "Drawing size in px; scales down with the container." },
    { name: "innerRadius", type: "number", default: "0.3", description: "Hole as a share of the radius; the readout sits in it." },
    { name: "startAt", type: '"midnight-top" | "noon-top"', default: '"midnight-top"', description: "Where midnight sits." },
    { name: "clock", type: '"24h" | "12h"', default: '"24h"', description: 'Hour labels ("06" or "6a").' },
    { name: "bands", type: "{ from, to, label, color? }[]", description: "Spans on the rim, listed under the dial; may wrap past midnight." },
    { name: "nowHand", type: "boolean | Date | number", default: "false", description: "A hand at the current (or a fixed) time. Client only, so the server render is stable." },
    { name: "timeZone", type: "string", description: "IANA zone for the hand. Default the viewer's." },
    { name: "color", type: "string", default: "--pui-chart-1", description: "Main color in the hours layout; lighter bins are quieter." },
    { name: "unit", type: "string", description: 'Plural noun for the readout and summary ("tickets").' },
    { name: "selected", type: "{ bin, row? } | null", description: "Controlled pin." },
    { name: "onSelect", type: "(sel) => void", description: "Fires on click, Enter and Escape with { bin, hour, row?, value } or null." },
    { name: "format", type: "Intl.NumberFormatOptions | (v) => string", description: "Value format." },
    { name: "title", type: "ReactNode", description: "Caption above the dial." },
    { name: "description", type: "ReactNode", description: "Muted line under the title." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous or next hour (wraps around midnight)" },
    { keys: "↑ / ↓", action: "Outer or inner day ring (week layout)" },
    { keys: "Home / End, PgUp / PgDn", action: "First or last bin, jump an eighth of the day" },
    { keys: "Enter / Space", action: "Pin the bin (fires onSelect); again to unpin" },
    { keys: "Escape", action: "Clear the pin" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'The dial is a focusable role="application" with a polite live region: "14:00–15:00: 312 tickets (9.4% of the total)."',
    "The figure summary names the busiest and quietest bins, the total and the marked bands.",
    "A data table (sr-only, T to show) lists every bin, or every day x hour in the week layout.",
  ],
  reducedMotion: "Sectors and cells render at their final size with no sweep; the now hand still follows the clock but jumps instead of fading in.",
  examples: [
    { title: "Opening hours and a live hand", description: "A band for when the store is open and a hand at the time in another zone.", Demo: FootTraffic },
    { title: "12-hour face, noon on top", description: "Half-hour bins and bands that wrap past midnight.", Demo: SleepFace },
    { title: "Week punch card", description: "Seven day rings with a sequential scale.", Demo: WeekPunchCard, wide: true },
    { title: "Click a sector to filter", description: "onSelect drives the list next to it.", Demo: ClickToFilter },
  ],
};
export default item;
