import { CalendarHeatmap, type CalendarHeatmapProps } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { contributions, focusMinutes, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { layout: "year" | "month"; weekStartsOn: "Sunday" | "Monday"; levels: number; gap: number; radius: number; stats: boolean; legend: boolean };
const defaults: DemoProps = { layout: "year", weekStartsOn: "Sunday", levels: 5, gap: 3, radius: 3, stats: true, legend: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "layout", label: "Layout", options: ["year", "month"] },
  { type: "select", prop: "weekStartsOn", label: "Week starts", options: ["Sunday", "Monday"] },
  { type: "number", prop: "levels", label: "Levels", min: 3, max: 8, step: 1 },
  { type: "number", prop: "gap", label: "Gap", min: 0, max: 6, step: 1 },
  { type: "number", prop: "radius", label: "Radius", min: 0, max: 8, step: 1 },
  { type: "boolean", prop: "stats", label: "Stats" },
  { type: "boolean", prop: "legend", label: "Legend" },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(4);
  const data = useMemo(() => contributions(seed, 2025), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Hover the legend to isolate a level (click pins it); hover Longest streak to outline it; arrows walk the days.">
      <CalendarHeatmap
        data={data}
        date="date"
        value="count"
        year={2025}
        layout={props.layout}
        weekStartsOn={props.weekStartsOn === "Monday" ? 1 : 0}
        levels={props.levels}
        gap={props.gap}
        radius={props.radius}
        stats={props.stats}
        legend={props.legend}
        title="Contributions in 2025"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Mini() {
  const data = useMemo(() => contributions(2, 2025).slice(0, 154), []);
  return <CalendarHeatmap data={data} date="date" value="count" start="2025-01-01" end="2025-06-03" stats={false} legend={false} gap={2} initialWidth={230} animation="never" className="w-60 [&_text]:hidden" />;
}

function MonthLayout() {
  const [seed, randomize] = useSeed(6);
  const data = useMemo(() => focusMinutes(seed), [seed]);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Month calendars with day numbers, Monday first; click a day.">
      <CalendarHeatmap
        data={data}
        date="date"
        value="minutes"
        start="2026-01-01"
        end="2026-03-31"
        layout="month"
        weekStartsOn={1}
        unit={["minute", "minutes"]}
        selectedDate={picked}
        onDateClick={(day) => setPicked(day.date)}
        title="Deep-work minutes, Q1"
        className="w-full"
      />
    </ChartDemo>
  );
}

function Habit() {
  const data = useMemo(() => contributions(13, 2025).map((d) => ({ ...d, done: d.count > 0 ? 1 : 0 })), []);
  return (
    <CalendarHeatmap
      data={data}
      date="date"
      value="done"
      start="2025-07-01"
      end="2025-12-31"
      levels={2}
      unit={["workout", "workouts"]}
      legend={false}
      title="Workout habit"
      description="Two levels: done or not. The stats strip tracks streaks."
      className="w-full"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<CalendarHeatmap",
      "  data={days} // [{ date: \"2025-03-04\", count: 12 }]",
      '  date="date"',
      '  value="count"',
      "  year={2025}",
      p.layout !== "year" ? `  layout="${p.layout}"` : null,
      p.weekStartsOn === "Monday" ? "  weekStartsOn={1}" : null,
      p.levels !== 5 ? `  levels={${p.levels}}` : null,
      p.gap !== 3 ? `  gap={${p.gap}}` : null,
      p.radius !== 3 ? `  radius={${p.radius}}` : null,
      p.stats ? null : "  stats={false}",
      p.legend ? null : "  legend={false}",
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<CalendarHeatmapProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows with a date and a value; values on the same day are summed." },
    { name: "date", type: "keyof T | (row, i) => string | number | Date", required: true, description: "ISO date, epoch ms or Date (UTC)." },
    { name: "value", type: "keyof T | (row, i) => number", required: true, description: "Value per row." },
    { name: "year", type: "number", description: "Shows Jan 1 to Dec 31 of that year." },
    { name: "start", type: '"YYYY-MM-DD"', description: "First day. Default: the first data day." },
    { name: "end", type: '"YYYY-MM-DD"', description: "Last day. Default: the last data day." },
    { name: "layout", type: '"year" | "month"', default: '"year"', description: "Weeks as columns, or one calendar per month." },
    { name: "weekStartsOn", type: "0 | 1 | ... | 6", default: "0", description: "First weekday (0 = Sunday)." },
    { name: "levels", type: "number", default: "5", description: "Color levels including empty days." },
    { name: "thresholds", type: "number[]", description: "Level bounds. Default: quantiles of the non-zero days." },
    { name: "unit", type: "[singular, plural]", default: '["contribution", "contributions"]', description: "Wording for tooltips and announcements." },
    { name: "stats", type: "boolean", default: "true", description: "Total, active days, longest and current streak." },
    { name: "legend", type: "boolean", default: "true", description: "Less to More legend; hover isolates a level, click pins it." },
    { name: "selectedDate", type: "string | null", description: "Outlined day." },
    { name: "onDateClick", type: "(day, event) => void", description: "Click or Enter on a day." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the calendar" },
    { keys: "← / → / ↑ / ↓", action: "Move by the visual layout (weeks across in year view)" },
    { keys: "Page Up / Page Down", action: "Previous / next month" },
    { keys: "Home / End", action: "First / last day" },
    { keys: "Enter / Space", action: "Activate the day (onDateClick)" },
    { keys: "T", action: "Show or hide the data table" },
  ],
  a11y: [
    'Each day is announced as "12 contributions on Tuesday, Mar 4, 2025".',
    "The summary gives the total, active days, busiest day and longest streak; an sr-only table lists active days.",
    "Legend levels are toggle buttons with their value range as the name.",
  ],
  reducedMotion: "No column-by-column entrance; levels change color instantly.",
  examples: [
    { title: "Month calendars", description: "Day numbers, Monday first, a picked day.", Demo: MonthLayout, wide: true },
    { title: "Habit tracker", description: "Two levels and streaks over half a year.", Demo: Habit, wide: true },
  ],
};
export default item;
