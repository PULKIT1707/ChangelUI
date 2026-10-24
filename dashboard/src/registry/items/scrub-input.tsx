import { ScrubInput, type ScrubInputProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  size: NonNullable<ScrubInputProps["size"]>;
  sensitivity: number;
  disabled: boolean;
};
const defaults: DemoProps = { size: "sm", sensitivity: 4, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "number", prop: "sensitivity", label: "Pixels per step", min: 1, max: 12, step: 1 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
function Glyph({ children }: { children: string }) {
  return <span className="w-3 text-center font-mono text-[11px] leading-none">{children}</span>;
}
/** A design-tool inspector: every field scrubs, and the layer on the left follows. */
function Preview({ props }: { props: DemoProps }) {
  const [layer, setLayer] = useState({ x: 48, y: 32, w: 160, h: 112, r: 12, rot: -6, opacity: 90 });
  const set = (key: keyof typeof layer) => (v: number) => setLayer((l) => ({ ...l, [key]: v }));
  const common = { size: props.size, sensitivity: props.sensitivity, disabled: props.disabled };
  return (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-[1fr_17rem]">
      <div className="relative h-72 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-muted/50 bg-[radial-gradient(var(--pui-border)_1px,transparent_1px)] bg-size-[16px_16px]">
        <div
          className="absolute flex items-center justify-center bg-linear-to-br from-pui-primary to-pui-chart-5 text-sm font-semibold text-pui-primary-foreground shadow-pui-lg"
          style={{
            left: layer.x,
            top: layer.y,
            width: layer.w,
            height: layer.h,
            borderRadius: layer.r,
            rotate: `${layer.rot}deg`,
            opacity: layer.opacity / 100,
          }}
        >
          Hero card
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-sm">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground">Layer</p>
        <div className="grid grid-cols-2 gap-2">
          <ScrubInput {...common} label={<Glyph>X</Glyph>} value={layer.x} onValueChange={set("x")} min={0} max={240} unit="px" />
          <ScrubInput {...common} label={<Glyph>Y</Glyph>} value={layer.y} onValueChange={set("y")} min={0} max={180} unit="px" />
          <ScrubInput {...common} label={<Glyph>W</Glyph>} value={layer.w} onValueChange={set("w")} min={40} max={260} unit="px" />
          <ScrubInput {...common} label={<Glyph>H</Glyph>} value={layer.h} onValueChange={set("h")} min={40} max={220} unit="px" />
        </div>
        <ScrubInput {...common} label="Rotation" value={layer.rot} onValueChange={set("rot")} min={-180} max={180} unit="°" />
        <ScrubInput {...common} label="Radius" value={layer.r} onValueChange={set("r")} min={0} max={56} unit="px" />
        <ScrubInput {...common} label="Opacity" value={layer.opacity} onValueChange={set("opacity")} min={0} max={100} step={1} unit="%" />
        <p className="m-0 text-[11px] leading-snug text-pui-muted-foreground">
          Drag sideways to scrub. Shift ×10, Alt ×0.1. Click to type, even <span className="font-mono">16*2</span>.
        </p>
      </div>
    </div>
  );
}
/** Motion tuning: unbounded fields (no track) and a custom format. */
function TimingDemo() {
  const [duration, setDuration] = useState(320);
  const [delay, setDelay] = useState(0);
  const [stiffness, setStiffness] = useState(260);
  const [committed, setCommitted] = useState("Nothing committed yet");
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <ScrubInput label="Duration" value={duration} onValueChange={setDuration} onValueCommit={(v) => setCommitted(`Saved duration ${v}ms`)} min={0} step={10} unit="ms" size="md" />
      <ScrubInput label="Delay" value={delay} onValueChange={setDelay} onValueCommit={(v) => setCommitted(`Saved delay ${v}ms`)} min={0} step={10} unit="ms" size="md" />
      <ScrubInput
        label="Stiffness"
        value={stiffness}
        onValueChange={setStiffness}
        onValueCommit={(v) => setCommitted(`Saved stiffness ${v}`)}
        min={20}
        max={800}
        step={5}
        size="md"
        format={(v) => (v < 150 ? `${v} · soft` : v < 400 ? `${v} · balanced` : `${v} · snappy`)}
      />
      <p className="m-0 text-xs text-pui-muted-foreground tabular-nums" role="status">
        {committed}
      </p>
    </div>
  );
}
/** Fine decimal steps: line height and letter spacing with a live sample. */
function TypeDemo() {
  const [size, setSize] = useState(28);
  const [leading, setLeading] = useState(1.2);
  const [tracking, setTracking] = useState(-0.02);
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="m-0 h-24 overflow-hidden font-semibold text-pui-foreground" style={{ fontSize: size, lineHeight: leading, letterSpacing: `${tracking}em` }}>
        Ship the details people feel.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <ScrubInput label="Size" value={size} onValueChange={setSize} min={12} max={44} unit="px" />
        <ScrubInput label="Leading" value={leading} onValueChange={setLeading} min={0.8} max={2} step={0.05} />
        <ScrubInput label="Tracking" value={tracking} onValueChange={setTracking} min={-0.1} max={0.2} step={0.01} unit="em" />
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div className="flex w-full max-w-52 flex-col gap-1.5" aria-hidden="true">
      {[
        ["Opacity", "72%", 0.72],
        ["Radius", "12px", 0.4],
        ["Blur", "4px", 0.2],
      ].map(([label, value, ratio]) => (
        <div key={label as string} className="relative flex h-7 items-center justify-between overflow-hidden rounded-pui-md border border-pui-input bg-pui-surface px-2 text-[11px]">
          <span className="absolute inset-y-0 left-0 bg-pui-primary/14" style={{ width: `${(ratio as number) * 100}%` }} />
          <span className="relative font-medium text-pui-muted-foreground">{label}</span>
          <span className="relative font-medium tabular-nums text-pui-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ size, sensitivity, disabled }) => {
    const attrs = [size !== "md" ? `size="${size}"` : "", sensitivity !== 4 ? `sensitivity={${sensitivity}}` : "", disabled ? "disabled" : ""].filter(Boolean);
    return `const [opacity, setOpacity] = useState(90);

<ScrubInput
  label="Opacity"
  value={opacity}
  onValueChange={setOpacity}
  onValueCommit={(v) => saveLayer({ opacity: v })}
  min={0}
  max={100}
  unit="%"${attrs.map((a) => `\n  ${a}`).join("")}
/>`;
  },
  propsTable: propDocs<ScrubInputProps>()([
    { name: "label", type: "ReactNode", required: true, description: "Visible label; it names the spinbutton." },
    { name: "value", type: "number", description: "Controlled value." },
    { name: "defaultValue", type: "number", description: "Initial value when uncontrolled. Default min (or 0)." },
    { name: "onValueChange", type: "(value: number) => void", description: "Every change, including each scrub step." },
    { name: "onValueCommit", type: "(value: number) => void", description: "Once per drag, typed entry or key step. Save here." },
    { name: "min", type: "number", default: "-Infinity", description: "Lower clamp. With min and max finite, a fill track shows the position." },
    { name: "max", type: "number", default: "Infinity", description: "Upper clamp." },
    { name: "step", type: "number", default: "1", description: "Step per sensitivity pixels. Shift ×10, Alt ×0.1." },
    { name: "sensitivity", type: "number", default: "4", description: "Pointer pixels per step." },
    { name: "precision", type: "number", description: "Fixed decimals. Default: step's decimals, one more only for Alt steps." },
    { name: "unit", type: "string", description: "Suffix such as px, %, ms or °. Typed units are ignored when parsing." },
    { name: "format", type: "(value: number) => string", description: "Custom display and aria-valuetext." },
    { name: "icon", type: "ReactNode", description: "Icon before the label." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "32 or 36 px tall." },
    { name: "disabled", type: "boolean", default: "false", description: "Not focusable, no scrubbing." },
    { name: "name", type: "string", description: "Adds a hidden input for forms." },
  ]),
  keyboard: [
    { keys: "↑ / → and ↓ / ←", action: "Step up / down (Shift ×10, Alt ×0.1)" },
    { keys: "Page Up / Page Down", action: "Ten steps" },
    { keys: "Home / End", action: "Min / max" },
    { keys: "Enter, F2 or a digit", action: "Type a value (math like 16*2 works)" },
    { keys: "Enter / Escape", action: "Commit / cancel typing" },
  ],
  a11y: [
    "The value is a spinbutton named by the visible label, with aria-valuenow, min, max and a formatted aria-valuetext.",
    "Typing swaps in a text input with the same role and name, then returns focus to the field.",
    "Scrubbing is an extra for pointers; everything it does is reachable from the keyboard.",
    "touch-action: pan-y keeps vertical page scrolling working on touch screens.",
  ],
  reducedMotion: "The fill track jumps instead of springing and the limit nudge is skipped.",
  examples: [
    { title: "Motion timing", description: "Unbounded fields have no track; format adds a hint to the value.", Demo: TimingDemo },
    { title: "Fine steps", description: "Decimal steps for line height and tracking.", Demo: TypeDemo },
  ],
};
export default item;
