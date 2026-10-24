import { Button, SignaturePad, type SignaturePadProps, type SignatureStroke, type SignatureValue } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  height: number;
  typedFallback: boolean;
  defaultMode: string;
  caption: boolean;
};
const defaults: DemoProps = { height: 180, typedFallback: true, defaultMode: "draw", caption: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "height", label: "Height", min: 120, max: 260, step: 10 },
  { type: "boolean", prop: "typedFallback", label: "Type tab" },
  { type: "select", prop: "defaultMode", label: "Start in", options: ["draw", "type"] },
  { type: "boolean", prop: "caption", label: "Caption" },
];
/** A looping cursive scribble and an underline flourish, so demos start signed. */
function sampleSignature(width: number, baseline: number): SignatureStroke[] {
  const loops: SignatureStroke = [];
  for (let i = 0; i <= 220; i++) {
    const t = i / 220;
    const phase = Math.PI * 2 * 6.5 * t;
    const envelope = 0.55 + 0.45 * Math.sin(Math.PI * t);
    loops.push({
      x: 36 + (width - 110) * t + 13 * Math.cos(phase),
      y: baseline - 20 - 22 * Math.sin(phase) * envelope - 10 * Math.sin(Math.PI * 2 * t),
      w: 1.2 + 1.5 * Math.abs(Math.sin(phase / 2)),
    });
  }
  const flourish: SignatureStroke = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    flourish.push({ x: 48 + (width - 90) * t, y: baseline + 6 - 14 * t * t + 6 * Math.sin(Math.PI * t), w: 2.6 - 1.6 * t });
  }
  return [loops, flourish];
}
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState<SignatureValue | null>(null);
  const [png, setPng] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <SignaturePad
        key={`${props.defaultMode}-${props.typedFallback}`}
        height={props.height}
        typedFallback={props.typedFallback}
        defaultMode={props.defaultMode === "type" ? "type" : "draw"}
        defaultText="Jordan Lee"
        caption={props.caption ? "Jordan Lee · Operations lead · signed 23 Oct" : undefined}
        onChange={(next) => {
          setValue(next);
          setPng(null);
        }}
      />
      <div className="flex items-center justify-between gap-3 text-xs text-pui-muted-foreground">
        <span>{value ? `${value.mode === "draw" ? `${value.strokes.length} strokes` : `Typed “${value.text}”`} · SVG ${Math.round(value.svg.length / 100) / 10} kB` : "Nothing signed yet"}</span>
        <Button size="sm" variant="outline" tone="neutral" disabled={!value} onClick={() => setPng(value?.toPNG() ?? null)}>
          Export PNG
        </Button>
      </div>
      {png ? <img src={png} alt="Exported signature" className="h-16 w-auto self-start rounded-pui-md border border-pui-border bg-white p-1" /> : null}
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <SignaturePad height={96} typedFallback={false} defaultStrokes={sampleSignature(240, 70)} caption=" " />
    </div>
  );
}
/** Proof of delivery on a courier's handheld: a saved signature and an Accept step. */
function DeliveryDemo() {
  const [signed, setSigned] = useState(true);
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <div className="flex items-baseline justify-between">
        <h3 className="m-0 text-sm font-semibold">Proof of delivery</h3>
        <span className="text-xs tabular-nums text-pui-muted-foreground">Parcel 7 of 12</span>
      </div>
      <SignaturePad
        height={150}
        typedFallback={false}
        label="Recipient signature"
        defaultStrokes={sampleSignature(330, 110)}
        caption="Received in good condition · 14:32"
        onChange={(v) => {
          setSigned(v !== null);
          setDone(false);
        }}
      />
      <Button disabled={!signed || done} onClick={() => setDone(true)}>
        {done ? "Delivered" : "Confirm delivery"}
      </Button>
    </div>
  );
}
/** Typed-only consent for people who would rather not draw. */
function TypedDemo() {
  const [agreed, setAgreed] = useState<string | null>(null);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <SignaturePad defaultMode="type" defaultText="Ana Diaz" height={130} onChange={(v) => setAgreed(v ? v.text : null)} />
      <p className="m-0 text-xs text-pui-muted-foreground">{agreed ? `Signing as ${agreed}` : "Type a name to sign"}</p>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<SignaturePad${props.height !== 180 ? `\n  height={${props.height}}` : ""}${props.typedFallback ? "" : "\n  typedFallback={false}"}${props.defaultMode === "type" ? '\n  defaultMode="type"' : ""}${props.caption ? '\n  caption="Jordan Lee · signed 23 Oct"' : ""}\n  onChange={(signature) => setSvg(signature?.svg ?? null)}\n/>`,
  propsTable: propDocs<SignaturePadProps>()([
    { name: "onChange", type: "(value: SignatureValue | null) => void", description: "{ mode, strokes, text, svg, toPNG() } after each stroke, undo, clear or edit; null when empty." },
    { name: "height", type: "number", default: "180", description: "Pad height in px." },
    { name: "typedFallback", type: "boolean", default: "true", description: "Offer a Type tab that renders the name in a script face." },
    { name: "defaultMode", type: '"draw" | "type"', default: '"draw"', description: "Starting tab." },
    { name: "defaultText", type: "string", description: "Pre-filled typed name." },
    { name: "defaultStrokes", type: "SignatureStroke[]", description: "Strokes to start with, e.g. a saved signature." },
    { name: "label", type: "string", default: '"Signature"', description: "Accessible name of the group and canvas." },
    { name: "placeholder", type: "string", default: '"Sign here"', description: "Hint on the empty pad." },
    { name: "caption", type: "ReactNode", description: "Line under the pad (replaces the default hint)." },
    { name: "minWidth", type: "number", default: "0.9", description: "Thinnest stroke, reached when moving fast." },
    { name: "maxWidth", type: "number", default: "3", description: "Thickest stroke, when moving slowly or pressing hard." },
    { name: "penColor", type: "string", description: "Ink color. Default: the theme foreground." },
    { name: "disabled", type: "boolean", default: "false", description: "Locks the pad and its buttons." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Method tabs, Undo, Clear, then the pad" },
    { keys: "Cmd/Ctrl + Z", action: "Undo the last stroke (pad focused)" },
    { keys: "← / →", action: "Switch between Draw and Type" },
  ],
  a11y: [
    "Drawing needs a pointer, so the Type tab gives keyboard and screen reader users an equal way to sign.",
    "The canvas is a focusable image whose name says whether it is signed and how many strokes it has.",
    "Undo and Clear are real buttons that disable when there is nothing to remove.",
  ],
  reducedMotion: "Tabs and hints switch without fades and the Signed badge appears without a spring.",
  examples: [
    { title: "Proof of delivery", description: "Starts from saved strokes; Undo and Clear still work.", Demo: DeliveryDemo },
    { title: "Typed signature", description: "Keyboard-first signing in a script face.", Demo: TypedDemo },
  ],
};
export default item;
