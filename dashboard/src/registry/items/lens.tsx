import { Badge, Button, Lens, type LensProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  zoom: number;
  size: number;
  shape: NonNullable<LensProps["shape"]>;
  followOnTouch: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { zoom: 2, size: 160, shape: "circle", followOnTouch: false, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "zoom", label: "Zoom", min: 1.25, max: 6, step: 0.25 },
  { type: "number", prop: "size", label: "Lens size (px)", min: 60, max: 320, step: 10 },
  { type: "select", prop: "shape", label: "Shape", options: ["circle", "rounded"] },
  { type: "boolean", prop: "followOnTouch", label: "Follow on touch" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function useScene(index: number, seed: number) {
  return useMemo(() => landscape(SCENES[index]!, seed, 1200, 800), [index, seed]);
}

function Preview({ props }: { props: DemoProps }) {
  const src = useScene(3, 4);
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <Lens {...props} label="Night valley photo, magnifier" className="aspect-3/2 w-full rounded-pui-xl shadow-pui-md">
        <img src={src} alt="Night valley: layered violet hills under a starry sky and a pale moon" className="block size-full object-cover" draggable={false} />
      </Lens>
      <p className="m-0 text-center text-xs text-pui-muted-foreground">Hover, or Tab to it and use the arrow keys (Shift for bigger steps, Escape hides).</p>
    </div>
  );
}

function ProductDemo() {
  const [scene, setScene] = useState(0);
  const sources = [useScene(0, 2), useScene(4, 7), useScene(5, 3)];
  return (
    <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-2">
        <Lens zoom={2.5} size={140} shape="rounded" label="Print preview, magnifier" className="aspect-square w-full rounded-pui-lg border border-pui-border">
          <img src={sources[scene]} alt={`${SCENES[[0, 4, 5][scene]!]!.name} art print`} className="block size-full object-cover" draggable={false} />
        </Lens>
        <div className="flex gap-2" role="group" aria-label="Choose a print">
          {sources.map((src, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={scene === i}
              aria-label={SCENES[[0, 4, 5][i]!]!.name}
              onClick={() => setScene(i)}
              className={`size-12 cursor-pointer overflow-hidden rounded-pui-md border-2 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring ${scene === i ? "border-pui-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img src={src} alt="" className="block size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <Badge variant="soft" tone="success" className="self-start">
          In stock
        </Badge>
        <p className="m-0 text-lg font-semibold text-pui-foreground">Giclée art print</p>
        <p className="m-0 text-pui-muted-foreground">Archival pigment on 310 gsm cotton rag. Hover the print to check the grain.</p>
        <p className="m-0 text-xl font-bold text-pui-foreground">$84</p>
        <Button className="self-start">Add to cart</Button>
      </div>
    </div>
  );
}

function ReceiptDemo() {
  const rows = [
    ["Espresso beans, 1 kg", "24.00"],
    ["Oat milk ×2", "7.80"],
    ["Ceramic pour-over", "32.50"],
    ["Paper filters (100)", "5.90"],
    ["Loyalty discount", "-4.00"],
  ];
  return (
    <Lens zoom={3} size={120} label="Receipt, magnifier" className="mx-auto w-64 rounded-pui-md border border-pui-border bg-pui-surface p-4 font-mono text-[9px] leading-snug text-pui-surface-foreground">
      <p className="m-0 text-center font-bold tracking-widest">CORNER ROASTERS</p>
      <p className="m-0 mb-2 text-center text-pui-muted-foreground">12 Harbor St · 09:41 · Till 2</p>
      {rows.map(([label, price]) => (
        <p key={label} className="m-0 flex justify-between">
          <span>{label}</span>
          <span>{price}</span>
        </p>
      ))}
      <p className="m-0 mt-2 flex justify-between border-t border-dashed border-pui-border pt-2 font-bold">
        <span>TOTAL</span>
        <span>66.20</span>
      </p>
      <p className="m-0 mt-2 text-center text-pui-muted-foreground">Any DOM works: this is text, not an image.</p>
    </Lens>
  );
}

function Mini() {
  const src = useScene(1, 5);
  return (
    <Lens active position={{ x: 0.62, y: 0.45 }} size={72} zoom={2.2} tabIndex={-1} className="h-28 w-full rounded-pui-lg">
      <img src={src} alt="" className="block size-full object-cover" draggable={false} />
    </Lens>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Lens", props, defaults, '<img src="/product.jpg" alt="Product" />', controls),
  propsTable: propDocs<LensProps>()([
    { name: "zoom", type: "number", default: "2", description: "Magnification." },
    { name: "size", type: "number", default: "160", description: "Lens diameter in px." },
    { name: "shape", type: '"circle" | "rounded"', default: '"circle"', description: "Round loupe or rounded square." },
    { name: "followOnTouch", type: "boolean", default: "false", description: "Show and drag the lens with a finger (sets touch-action: none on the element)." },
    { name: "active", type: "boolean", description: "Keep the lens visible; uncontrolled it shows while hovered or keyboard-focused." },
    { name: "position", type: "{ x: number; y: number }", default: "{ x: 0.5, y: 0.5 }", description: "Lens center (fractions) while active without a pointer." },
    { name: "label", type: "string", default: '"Magnifier"', description: "Accessible name of the focusable group." },
    { name: "step", type: "number", default: "12", description: "Arrow-key step in px; Shift moves 4×." },
    { name: "lensClassName", type: "string", description: "Class for the lens ring." },
    { name: "disabled", type: "boolean", default: "false", description: "Plain content, not focusable." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the magnifier; the lens opens in the center" },
    { keys: "Arrow keys", action: "Move the lens (Shift: bigger steps)" },
    { keys: "Escape", action: "Hide the lens" },
  ],
  a11y: [
    "A focusable group with aria-roledescription=\"magnifier\" and a label.",
    "The magnified copy is aria-hidden and inert, so content is announced and tabbable once.",
  ],
  reducedMotion: "The lens jumps to the pointer with no smoothing or opening animation.",
  examples: [
    { title: "Product detail", description: "rounded lens, swappable prints.", Demo: ProductDemo, wide: true },
    { title: "Fine print", description: "Magnifies live DOM, not just images.", Demo: ReceiptDemo },
  ],
};

export default item;
