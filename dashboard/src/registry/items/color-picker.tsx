import {
  ColorPicker,
  Popover,
  PopoverContent,
  PopoverTrigger,
  formatColor,
  parseColor,
  type ColorPickerProps,
} from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  format: NonNullable<ColorPickerProps["format"]>;
  showAlpha: boolean;
  swatches: boolean;
  showInput: boolean;
  showEyeDropper: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { format: "hex", showAlpha: true, swatches: true, showInput: true, showEyeDropper: true, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "format", label: "Output format", options: ["hex", "rgb", "hsl", "oklch"] },
  { type: "boolean", prop: "showAlpha", label: "Alpha" },
  { type: "boolean", prop: "swatches", label: "Swatches" },
  { type: "boolean", prop: "showInput", label: "Input" },
  { type: "boolean", prop: "showEyeDropper", label: "Eyedropper (where supported)" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

// Demo palettes are data, not styling. pui-allow-color
const SWATCHES = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#64748b"]; // pui-allow-color

function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState("#6366f1"); // pui-allow-color
  const rgba = parseColor(value);
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-6">
      <ColorPicker
        key={props.format}
        defaultValue={value}
        onValueChange={setValue}
        format={props.format}
        showAlpha={props.showAlpha}
        swatches={props.swatches ? SWATCHES : undefined}
        showInput={props.showInput}
        showEyeDropper={props.showEyeDropper}
        disabled={props.disabled}
      />
      <div className="flex w-64 flex-col gap-3">
        <div
          className="grid h-32 place-items-center rounded-pui-xl border border-pui-border text-lg font-semibold shadow-(--pui-shadow-md)"
          style={{ background: value, color: rgba && rgba.r * 0.299 + rgba.g * 0.587 + rgba.b * 0.114 > 150 && rgba.a > 0.5 ? "black" : "white" }}
        >
          Aa Preview
        </div>
        <dl className="m-0 grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 font-mono text-xs">
          {rgba
            ? (["hex", "rgb", "hsl", "oklch"] as const).map((f) => (
                <div key={f} className="contents">
                  <dt className="uppercase text-pui-muted-foreground">{f}</dt>
                  <dd className="m-0 truncate text-pui-foreground">{formatColor(rgba, f)}</dd>
                </div>
              ))
            : null}
        </dl>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none origin-center scale-[0.8]">
      <ColorPicker defaultValue="#ec4899" showInput={false} swatches={SWATCHES.slice(0, 6)} /> {/* pui-allow-color */}
    </div>
  );
}

/** A compact swatch trigger that opens the picker in a popover, like a design tool's fill field. */
function PopoverDemo() {
  const [fill, setFill] = useState("oklch(68% 0.19 25)"); // pui-allow-color
  const [stroke, setStroke] = useState("#0f172a"); // pui-allow-color
  const field = (label: string, value: string, set: (v: string) => void, format: ColorPickerProps["format"]) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-pui-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger className="flex h-8 items-center gap-2 rounded-pui-md border border-pui-input bg-pui-background px-2 font-mono text-xs text-pui-foreground hover:bg-pui-muted">
          <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-pui-foreground/15" style={{ background: value }} />
          {value}
          <span className="sr-only">, change {label.toLowerCase()} color</span>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="border-0 bg-transparent p-0 shadow-none">
          <ColorPicker value={value} onValueChange={set} format={format} swatches={SWATCHES} label={`${label} color`} />
        </PopoverContent>
      </Popover>
    </div>
  );
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-4">
        {field("Fill", fill, setFill, "oklch")}
        {field("Stroke", stroke, setStroke, "hex")}
      </div>
      <svg viewBox="0 0 120 120" className="mx-auto size-28 shrink-0" role="img" aria-label="Preview shape">
        <path d="M60 10 73 45h37L80 67l11 36-31-21-31 21 11-36-30-22h37z" fill={fill} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Brand color picked in OKLCH, with a generated tonal scale at the same hue and chroma. */
function ScaleDemo() {
  const [brand, setBrand] = useState("oklch(62% 0.19 264)"); // pui-allow-color
  const parsed = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(brand);
  const c = parsed ? Number(parsed[2]) : 0.19;
  const h = parsed ? Number(parsed[3]) : 264;
  const steps = [97, 92, 84, 74, 64, 54, 44, 34, 24];
  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
      <ColorPicker value={brand} onValueChange={setBrand} format="oklch" showCopy label="Brand color" />
      <ol className="m-0 grid w-full flex-1 list-none grid-cols-3 gap-2 p-0">
        {steps.map((l, i) => {
          const value = `oklch(${l}% ${(c * (1 - Math.abs(l - 60) / 60) * 0.9 + 0.01).toFixed(3)} ${h})`; // pui-allow-color
          return (
            <li key={l} className="flex flex-col gap-1">
              <span className="h-10 rounded-pui-md ring-1 ring-pui-foreground/10" style={{ background: value }} />
              <span className="font-mono text-[10px] text-pui-muted-foreground">{(i + 1) * 100}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      "value={color}",
      "onValueChange={setColor}",
      p.format !== "hex" ? `format="${p.format}"` : "",
      p.showAlpha ? "showAlpha" : "",
      p.swatches ? 'swatches={["#6366f1", "#ec4899", "#22c55e"]}' : "",
      !p.showInput ? "showInput={false}" : "",
      !p.showEyeDropper ? "showEyeDropper={false}" : "",
      p.disabled ? "disabled" : "",
    ].filter(Boolean);
    return `<ColorPicker ${attrs.join(" ")} />`;
  },
  propsTable: propDocs<ColorPickerProps>()([
    { name: "value", type: "string", description: "Any hex, rgb(), hsl() or oklch() string (defaultValue, onValueChange)." },
    { name: "defaultValue", type: "string", default: '"#6366f1"', description: "Initial color when uncontrolled." },
    { name: "onValueChange", type: "(value: string) => void", description: "Every change, in `format`." },
    { name: "onValueCommit", type: "(value: string) => void", description: "Pointer up, key presses, swatches and input commits." },
    { name: "format", type: '"hex" | "rgb" | "hsl" | "oklch"', default: '"hex"', description: "Output format; the field's display format can be switched separately." },
    { name: "showAlpha", type: "boolean", default: "false", description: "Alpha slider and alpha in the output." },
    { name: "swatches", type: "string[]", description: "Preset colors; the active one gets a sliding ring." },
    { name: "showInput", type: "boolean", default: "true", description: "Text field with a format switch; commits on Enter or blur." },
    { name: "showEyeDropper", type: "boolean", default: "true", description: "Screen eyedropper where the EyeDropper API exists." },
    { name: "showCopy", type: "boolean", default: "true", description: "Copy the displayed string." },
    { name: "label", type: "string", default: '"Color picker"', description: "Accessible name of the group." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every part." },
  ]),
  keyboard: [
    { keys: "ArrowLeft / ArrowRight", action: "Area: saturation ±1% (Shift ±10%); sliders: ±1%" },
    { keys: "ArrowUp / ArrowDown", action: "Area: brightness ±1% (Shift ±10%)" },
    { keys: "PageUp / PageDown", action: "Larger steps" },
    { keys: "Home / End", action: "Minimum / maximum" },
    { keys: "Enter / Escape", action: "Field: apply / discard the typed color" },
  ],
  a11y: [
    "role=group named by label. The area thumb is a 2D slider (aria-roledescription) whose value text names saturation and brightness.",
    "Hue and alpha are role=slider with degree / percent value text.",
    "Swatches are toggle buttons named by their color; the field reports aria-invalid for unparseable text.",
    "The eyedropper button only renders where the browser supports it; copying is announced.",
  ],
  reducedMotion: "Thumbs jump to the new position instead of following on a spring.",
  examples: [
    { title: "In a popover", description: "Swatch triggers for fill (OKLCH) and stroke (hex).", Demo: PopoverDemo, wide: true },
    { title: "Tonal scale", description: "Pick a brand color in OKLCH; the scale keeps its hue.", Demo: ScaleDemo, wide: true },
  ],
};

export default item;
