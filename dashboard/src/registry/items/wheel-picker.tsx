import { Button, WheelPicker, type WheelPickerProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  visibleCount: number;
  itemHeight: number;
  align: NonNullable<WheelPickerProps["align"]>;
  disabled: boolean;
};

const defaults: DemoProps = { visibleCount: 5, itemHeight: 36, align: "center", disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "visibleCount", label: "Visible rows", min: 3, max: 9, step: 2 },
  { type: "number", prop: "itemHeight", label: "Row height (px)", min: 28, max: 48, step: 2 },
  { type: "select", prop: "align", label: "Align", options: ["start", "center", "end"] },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = Array.from({ length: 80 }, (_, i) => String(2008 - i));

function Preview({ props }: { props: DemoProps }) {
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("30");
  const [period, setPeriod] = useState("AM");
  const height = props.itemHeight;
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <div className="w-full rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-md">
        <p id="wp-alarm" className="m-0 mb-3 text-sm font-medium">
          Wake-up alarm
        </p>
        <div className="relative grid grid-cols-3 gap-1">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 rounded-pui-md bg-pui-muted" style={{ top: ((Math.max(3, props.visibleCount | 1) - 1) / 2) * height, height }} />
          <WheelPicker {...props} band={false} aria-label="Hour" options={HOURS} value={hour} onValueChange={setHour} />
          <WheelPicker {...props} band={false} aria-label="Minute" options={MINUTES} value={minute} onValueChange={setMinute} />
          <WheelPicker {...props} band={false} aria-label="AM or PM" options={["AM", "PM"]} value={period} onValueChange={setPeriod} />
        </div>
      </div>
      <p className="m-0 text-sm text-pui-muted-foreground" aria-live="polite">
        Alarm set for{" "}
        <span className="font-semibold text-pui-foreground tabular-nums">
          {hour}:{minute} {period}
        </span>
      </p>
    </div>
  );
}

function BirthdayDemo() {
  const [month, setMonth] = useState("June");
  const [year, setYear] = useState("1994");
  return (
    <div className="mx-auto w-full max-w-xs rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <p className="m-0 text-sm font-medium">When were you born?</p>
      <p className="m-0 mb-3 text-xs text-pui-muted-foreground">Type a letter or digit to jump, e.g. “s” for September.</p>
      <div className="grid grid-cols-[1.6fr_1fr] gap-2">
        <WheelPicker aria-label="Birth month" options={MONTHS} value={month} onValueChange={setMonth} align="start" />
        <WheelPicker aria-label="Birth year" options={YEARS} value={year} onValueChange={setYear} />
      </div>
      <p className="m-0 mt-3 text-center text-xs text-pui-muted-foreground">
        {month} {year}
      </p>
    </div>
  );
}

function SizeDemo() {
  const [size, setSize] = useState("M");
  const options = [
    { value: "XS", label: "XS · 34" },
    { value: "S", label: "S · 36" },
    { value: "M", label: "M · 38" },
    { value: "L", label: "L · 40", disabled: true },
    { value: "XL", label: "XL · 42" },
  ];
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-baseline justify-between">
        <p className="m-0 text-sm font-medium">Trail runner · Size</p>
        <span className="text-xs text-pui-muted-foreground">L sold out</span>
      </div>
      <WheelPicker aria-label="Shoe size" options={options} value={size} onValueChange={setSize} visibleCount={3} itemHeight={40} />
      <Button size="sm">Add size {size} to bag</Button>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none grid w-48 grid-cols-2 gap-1">
      <WheelPicker tabIndex={-1} options={HOURS} defaultValue="9" visibleCount={5} itemHeight={28} />
      <WheelPicker tabIndex={-1} options={MINUTES} defaultValue="30" visibleCount={5} itemHeight={28} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx("WheelPicker", props, defaults, undefined, controls).replace(
      "<WheelPicker",
      '<WheelPicker aria-label="Hour" options={hours} value={hour} onValueChange={setHour}',
    ),
  propsTable: propDocs<WheelPickerProps>()([
    { name: "options", type: "(string | number | WheelPickerOption)[]", required: true, description: "Rows; objects take { value, label, textValue?, disabled? }." },
    { name: "value", type: "string", description: "Controlled value." },
    { name: "defaultValue", type: "string", default: "first enabled", description: "Uncontrolled start value." },
    { name: "onValueChange", type: "(value) => void", description: "Fires once the wheel settles, not on every scroll frame." },
    { name: "visibleCount", type: "number", default: "5", description: "Rows shown; even numbers round up." },
    { name: "itemHeight", type: "number", default: "36", description: "Row height in px." },
    { name: "align", type: '"start" | "center" | "end"', default: '"center"', description: "Row text alignment." },
    { name: "band", type: "boolean", default: "true", description: "Selection band; turn off when several wheels share one." },
    { name: "disabled", type: "boolean", default: "false", description: "Dims the wheel and removes it from the tab order." },
  ]),
  keyboard: [
    { keys: "↑ / ↓", action: "Previous / next option (skips disabled)" },
    { keys: "Page Up / Page Down", action: "Jump a screen of rows" },
    { keys: "Home / End", action: "First / last option" },
    { keys: "Letters / digits", action: "Type-ahead to the first match" },
  ],
  a11y: [
    "Each wheel is a listbox; the centered row is the selected option and the active descendant.",
    "Give every wheel an aria-label (Hour, Minute, …) so a group of wheels reads clearly.",
    "Native scrolling keeps touch, trackpad and scroll-wheel momentum; the value commits when it settles.",
  ],
  reducedMotion: "Rows stay flat (no 3D bend) and keyboard moves jump instead of gliding.",
  examples: [
    { title: "Date of birth", description: "Month and year wheels with type-ahead.", Demo: BirthdayDemo },
    { title: "Size with sold-out option", description: "Three rows, a disabled option the wheel skips over.", Demo: SizeDemo },
  ],
};

export default item;
