import { NumberInput, RollingNumber, type NumberInputProps } from "changelui";
import { useId, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type FormatName = "number" | "currency" | "percent" | "unit";

type DemoProps = {
  layout: NonNullable<NumberInputProps["layout"]>;
  size: NonNullable<NumberInputProps["size"]>;
  format: FormatName;
  step: number;
  min: number;
  max: number;
  holdAccelerate: boolean;
  roll: boolean;
  allowWheel: boolean;
  disabled: boolean;
  invalid: boolean;
};

const defaults: DemoProps = {
  layout: "split",
  size: "md",
  format: "number",
  step: 1,
  min: 0,
  max: 20,
  holdAccelerate: true,
  roll: true,
  allowWheel: true,
  disabled: false,
  invalid: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "layout", label: "Layout", options: ["split", "stacked"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "format", label: "Format", options: ["number", "currency", "percent", "unit"] },
  { type: "number", prop: "step", label: "Step", min: 0.05, max: 10, step: 0.05 },
  { type: "number", prop: "min", label: "Min", min: -100, max: 100, step: 1 },
  { type: "number", prop: "max", label: "Max", min: -100, max: 1000, step: 1 },
  { type: "boolean", prop: "holdAccelerate", label: "Hold accelerates" },
  { type: "boolean", prop: "roll", label: "Rolling digits" },
  { type: "boolean", prop: "allowWheel", label: "Wheel" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];

const formats: Record<FormatName, Intl.NumberFormatOptions | undefined> = {
  number: undefined,
  currency: { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 },
  percent: { style: "percent" },
  unit: { style: "unit", unit: "kilogram" },
};

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const percent = props.format === "percent";
  const [value, setValue] = useState(percent ? 0.4 : 4);
  const scale = percent ? 0.01 : 1;
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        {props.format === "unit" ? "Weight" : props.format === "currency" ? "Tip" : props.format === "percent" ? "Opacity" : "Guests"}
      </label>
      <NumberInput
        key={props.format}
        inputProps={{ id }}
        defaultValue={percent ? 0.4 : 4}
        onValueChange={setValue}
        layout={props.layout}
        size={props.size}
        format={formats[props.format]}
        step={props.step * scale}
        min={props.min * scale}
        max={Math.max(props.min, props.max) * scale}
        holdAccelerate={props.holdAccelerate}
        roll={props.roll}
        allowWheel={props.allowWheel}
        disabled={props.disabled}
        invalid={props.invalid}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Hold + or − to accelerate. Arrows, PageUp/PageDown, Home/End and the wheel work while focused.</p>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: {value}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-44 flex-col gap-2">
      <NumberInput aria-label="Guests" defaultValue={12} min={0} inputProps={{ tabIndex: -1 }} />
      <NumberInput
        aria-label="Price"
        layout="stacked"
        size="sm"
        defaultValue={49}
        format={{ style: "currency", currency: "USD" }}
        inputProps={{ tabIndex: -1 }}
      />
    </div>
  );
}

const products = [
  { id: "mug", name: "Stoneware mug", color: "bg-pui-primary/15 text-pui-primary-text", price: 18 },
  { id: "beans", name: "Single origin beans", color: "bg-pui-warning/15 text-pui-warning-text", price: 24.5 },
  { id: "filter", name: "Paper filters (100)", color: "bg-pui-info/15 text-pui-info-text", price: 6.25 },
];

/** Shopping cart: compact steppers, a total that rolls with every change. */
function CartDemo() {
  const [qty, setQty] = useState<Record<string, number>>({ mug: 2, beans: 1, filter: 3 });
  const total = products.reduce((sum, p) => sum + p.price * (qty[p.id] ?? 0), 0);
  const items = Object.values(qty).reduce((a, b) => a + b, 0);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <p className="m-0 mb-2 text-sm font-semibold">Your cart</p>
      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-pui-border py-2.5 last:border-b-0">
          <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-pui-md text-xs font-bold ${p.color}`}>
            {p.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{p.name}</span>
            <span className="block text-xs text-pui-muted-foreground">${p.price.toFixed(2)}</span>
          </span>
          <NumberInput
            aria-label={`${p.name} quantity`}
            size="sm"
            min={0}
            max={12}
            value={qty[p.id] ?? 0}
            onValueChange={(v) => setQty((prev) => ({ ...prev, [p.id]: v }))}
            className="w-28"
          />
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-sm text-pui-muted-foreground">
          <RollingNumber value={items} /> {items === 1 ? "item" : "items"}
        </span>
        <span className="text-xl font-semibold">
          <RollingNumber value={total} format={{ style: "currency", currency: "USD" }} />
        </span>
      </div>
    </div>
  );
}

/** Thermostat: stacked layout, unit format with half-degree steps and a dial that follows. */
function ThermostatDemo() {
  const id = useId();
  const [temp, setTemp] = useState(21.5);
  const min = 10;
  const max = 30;
  const t = (temp - min) / (max - min);
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = 0.75;
  const tone = temp >= 24 ? "text-pui-warning" : temp <= 17 ? "text-pui-info" : "text-pui-primary";
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div className="relative size-36">
        <svg viewBox="0 0 120 120" className="size-full -rotate-[225deg]" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-pui-muted" strokeDasharray={`${c * arc} ${c}`} />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={`stroke-current transition-[stroke-dasharray,color] duration-300 ease-pui-out ${tone}`}
            strokeDasharray={`${c * arc * t} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight">
            <RollingNumber value={temp} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />°
          </span>
          <span className="text-xs text-pui-muted-foreground">{temp >= 24 ? "Cooling" : temp <= 17 ? "Heating" : "Comfort"}</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-pui-muted-foreground">
          Target temperature
        </label>
        <NumberInput
          inputProps={{ id }}
          layout="stacked"
          value={temp}
          onValueChange={setTemp}
          min={min}
          max={max}
          step={0.5}
          format={{ style: "unit", unit: "celsius" }}
        />
      </div>
    </div>
  );
}

/** Pricing calculator: big seat stepper, PageUp jumps by 10, the bill rolls. */
function SeatsDemo() {
  const id = useId();
  const [seats, setSeats] = useState(8);
  const [annual, setAnnual] = useState(true);
  const perSeat = annual ? 12 : 15;
  return (
    <div className="flex w-full flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          Seats
        </label>
        <NumberInput inputProps={{ id }} size="lg" value={seats} onValueChange={setSeats} min={1} max={500} largeStep={10} className="w-44" />
        <span className="text-xs text-pui-muted-foreground">PageUp / PageDown change by 10.</span>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-pui-full bg-pui-muted p-0.5 text-xs">
          {[true, false].map((a) => (
            <button
              key={String(a)}
              type="button"
              role="radio"
              aria-checked={annual === a}
              onClick={() => setAnnual(a)}
              className={`cursor-pointer rounded-pui-full border-0 px-3 py-1 font-medium transition-colors ${annual === a ? "bg-pui-background text-pui-foreground shadow-pui-xs" : "bg-transparent text-pui-muted-foreground"}`}
            >
              {a ? "Yearly −20%" : "Monthly"}
            </button>
          ))}
        </div>
        <span className="text-3xl font-semibold tracking-tight">
          <RollingNumber value={seats * perSeat} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />
          <span className="text-sm font-normal text-pui-muted-foreground"> / month</span>
        </span>
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["value={value}", "onValueChange={setValue}", `min={${props.min}}`, `max={${props.max}}`];
    if (props.step !== 1) attrs.push(`step={${props.step}}`);
    if (props.layout !== "split") attrs.push(`layout="${props.layout}"`);
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.format === "currency") attrs.push('format={{ style: "currency", currency: "USD" }}');
    if (props.format === "percent") attrs.push('format={{ style: "percent" }}');
    if (props.format === "unit") attrs.push('format={{ style: "unit", unit: "kilogram" }}');
    if (!props.holdAccelerate) attrs.push("holdAccelerate={false}");
    if (!props.roll) attrs.push("roll={false}");
    if (!props.allowWheel) attrs.push("allowWheel={false}");
    if (props.disabled) attrs.push("disabled");
    if (props.invalid) attrs.push("invalid");
    return `const [value, setValue] = useState(4);

<label htmlFor="guests">Guests</label>
<NumberInput
  inputProps={{ id: "guests" }}
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<NumberInputProps>()([
    { name: "value", type: "number", description: "Current value (defaultValue, onValueChange)." },
    { name: "min", type: "number", description: "Lower limit. Stepping past a limit bumps the field." },
    { name: "max", type: "number", description: "Upper limit; Home / End jump to the limits." },
    { name: "step", type: "number", default: "1", description: "Buttons, arrows and wheel step." },
    { name: "largeStep", type: "number", default: "step * 10", description: "PageUp / PageDown step." },
    { name: "precision", type: "number", default: "decimals of step", description: "Decimal places the value rounds to." },
    { name: "format", type: "Intl.NumberFormatOptions", description: "currency, percent, unit, compact, ..." },
    { name: "locale", type: "string", default: '"en-US"', description: "Formatting and parsing locale." },
    { name: "layout", type: '"split" | "stacked"', default: '"split"', description: "− value + or value with chevrons." },
    { name: "holdAccelerate", type: "boolean", default: "true", description: "Press-and-hold repeats speed up." },
    { name: "roll", type: "boolean", default: "true", description: "Rolling odometer digits while not typing." },
    { name: "allowWheel", type: "boolean", default: "true", description: "Wheel steps while focused." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height." },
    { name: "name", type: "string", description: "Hidden form input; reset restores defaultValue." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "For the spinbutton: id (label htmlFor), aria-describedby, ..." },
    { name: "incrementLabel", type: "string", default: '"Increase"', description: "Name of the + button." },
    { name: "decrementLabel", type: "string", default: '"Decrease"', description: "Name of the − button." },
  ]),
  keyboard: [
    { keys: "ArrowUp / ArrowDown", action: "Step by step" },
    { keys: "PageUp / PageDown", action: "Step by largeStep" },
    { keys: "Home / End", action: "Jump to min / max (when set)" },
    { keys: "Type + Enter", action: "Commit typed text (grouping and currency are ignored)" },
    { keys: "Escape", action: "Discard typed text" },
  ],
  a11y: [
    "The field is role=spinbutton with aria-valuenow/min/max and the formatted value as aria-valuetext.",
    "The −/+ buttons are labelled, out of the tab order, and keep focus in the field while pressed.",
    "The rolling digits are aria-hidden; the input carries the value.",
  ],
  reducedMotion: "Digits swap without rolling, and the limit bump and press scale are off.",
  examples: [
    { title: "Cart", description: "Compact steppers with a rolling total.", Demo: CartDemo },
    { title: "Thermostat", description: "Stacked layout, celsius unit format, 0.5 steps.", Demo: ThermostatDemo },
    { title: "Seat pricing", description: "Large size with largeStep={10}.", Demo: SeatsDemo, wide: true },
  ],
};

export default item;
