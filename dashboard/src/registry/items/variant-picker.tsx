import {
  Badge,
  Button,
  VariantPicker,
  type ProductVariant,
  type VariantOption,
  type VariantPickerProps,
  type VariantSelection,
} from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  size: NonNullable<VariantPickerProps["size"]>;
  tone: NonNullable<VariantPickerProps["tone"]>;
  lowStock: number;
  hideStock: boolean;
  disabled: boolean;
};
const defaults: DemoProps = { size: "md", tone: "primary", lowStock: 3, hideStock: false, disabled: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "info", "success"] },
  { type: "number", prop: "lowStock", label: "Low stock at", min: 0, max: 10, step: 1 },
  { type: "boolean", prop: "hideStock", label: "Hide stock line" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];
const TEE_COLORS = [
  { value: "sand", label: "Sand", color: "#d8c3a5" },
  { value: "forest", label: "Forest", color: "#2f5d46" },
  { value: "ink", label: "Ink", color: "#1f2533" },
  { value: "clay", label: "Clay", color: "#b5643c" },
  { value: "sky", label: "Sky", color: "#8fb8de" },
];
const TEE_OPTIONS: VariantOption[] = [
  { name: "color", label: "Color", values: TEE_COLORS },
  { name: "size", label: "Size", values: ["XS", "S", "M", "L", "XL", "XXL"].map((value) => ({ value })) },
];
// Stock per color, XS..XXL. 0 = sold out, null = never made in that color.
const STOCK: Record<string, (number | null)[]> = {
  sand: [4, 12, 18, 9, 2, null],
  forest: [0, 6, 0, 14, 7, 3],
  ink: [8, 22, 31, 25, 11, 6],
  clay: [null, 2, 5, 0, 0, null],
  sky: [3, 0, 9, 1, null, null],
};
const TEE_VARIANTS: ProductVariant[] = Object.entries(STOCK).flatMap(([color, row]) =>
  row.flatMap((stock, i) => (stock === null ? [] : [{ id: `tee-${color}-${i}`, options: { color, size: TEE_OPTIONS[1]!.values[i]!.value }, stock, price: color === "clay" ? 42 : 38 }])),
);
function Tee({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className="size-full">
      <path
        d="M70 30 Q100 48 130 30 L172 52 L160 88 L142 80 L142 172 Q100 180 58 172 L58 80 L40 88 L28 52 Z"
        fill={color}
        stroke="color-mix(in oklab, var(--pui-foreground) 22%, transparent)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: "fill 300ms ease" }}
      />
      <path d="M82 34 Q100 52 118 34" fill="none" stroke="color-mix(in oklab, var(--pui-foreground) 30%, transparent)" strokeWidth="2" />
    </svg>
  );
}
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState<VariantSelection>({ color: "forest" });
  const [variant, setVariant] = useState<ProductVariant | undefined>();
  const color = TEE_COLORS.find((c) => c.value === value.color)?.color ?? TEE_COLORS[0]!.color;
  const soldOut = variant?.stock === 0;
  return (
    <div className="grid w-full max-w-3xl items-center gap-6 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <div className="relative grid aspect-square place-items-center rounded-pui-lg bg-pui-muted/60 p-6">
        <Tee color={color} />
        <Badge className="absolute top-3 left-3" tone="neutral" variant="soft" size="sm">
          Organic cotton
        </Badge>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="m-0 text-lg font-semibold">Everyday heavyweight tee</p>
          <p className="m-0 text-sm text-pui-muted-foreground">${(variant?.price as number | undefined) ?? 38} · Free returns for 30 days</p>
        </div>
        <VariantPicker
          {...props}
          options={TEE_OPTIONS}
          variants={TEE_VARIANTS}
          value={value}
          onValueChange={(v, match) => {
            setValue(v);
            setVariant(match);
          }}
        />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={props.disabled || !variant || soldOut}>
            {!variant ? "Pick a size" : soldOut ? "Sold out" : "Add to bag"}
          </Button>
          <Button variant="outline" tone="neutral" disabled={!soldOut}>
            Notify me
          </Button>
        </div>
      </div>
    </div>
  );
}
const SHOE_SIZES = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"];
const SHOE_OPTIONS: VariantOption[] = [
  { name: "width", label: "Width", kind: "chip", values: [{ value: "regular", label: "Regular" }, { value: "wide", label: "Wide" }] },
  { name: "size", label: "US size", values: SHOE_SIZES.map((value) => ({ value })) },
];
const SHOE_VARIANTS: ProductVariant[] = SHOE_SIZES.flatMap((size, i) => [
  { options: { width: "regular", size }, stock: [0, 2, 6, 0, 11, 8, 4, 0, 3, 1, 0][i] },
  ...(i >= 2 && i <= 9 ? [{ options: { width: "wide", size }, stock: [5, 0, 3, 7, 0, 2, 1, 4][i - 2] }] : []),
]);
function ShoesDemo() {
  return (
    <div className="w-full rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <VariantPicker size="sm" options={SHOE_OPTIONS} variants={SHOE_VARIANTS} defaultValue={{ width: "regular" }} lowStock={2} />
    </div>
  );
}
const LAPTOP_OPTIONS: VariantOption[] = [
  { name: "chip", label: "Processor", kind: "chip", values: [{ value: "base", label: "8-core" }, { value: "pro", label: "12-core" }] },
  { name: "memory", label: "Memory", kind: "chip", values: ["16 GB", "24 GB", "32 GB", "64 GB"].map((value) => ({ value })) },
  { name: "finish", label: "Finish", values: [
    { value: "silver", label: "Silver", color: "linear-gradient(135deg,#f1f3f5,#c6cad0)" },
    { value: "graphite", label: "Graphite", color: "linear-gradient(135deg,#6b7078,#2d3036)" },
  ] },
];
// 64 GB only ships with the 12-core chip; 16 GB is not offered on it.
const LAPTOP_VARIANTS: ProductVariant[] = ["base", "pro"].flatMap((chip) =>
  ["16 GB", "24 GB", "32 GB", "64 GB"]
    .filter((m) => (chip === "base" ? m !== "64 GB" : m !== "16 GB"))
    .flatMap((memory) => ["silver", "graphite"].map((finish) => ({ options: { chip, memory, finish }, stock: memory === "32 GB" && finish === "graphite" ? 0 : undefined }))),
);
function ConfiguratorDemo() {
  const [value, setValue] = useState<VariantSelection>({ chip: "base", memory: "24 GB", finish: "silver" });
  return (
    <div className="flex w-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-sm text-pui-surface-foreground">
      <VariantPicker tone="info" options={LAPTOP_OPTIONS} variants={LAPTOP_VARIANTS} value={value} onValueChange={(v) => setValue(v)} />
      <p className="m-0 text-xs text-pui-muted-foreground">Pick 64 GB: the processor stays, 16 GB-only picks clear and the heading flags what needs a new choice.</p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" inert className="pointer-events-none w-56">
      <VariantPicker size="sm" options={TEE_OPTIONS} variants={TEE_VARIANTS} defaultValue={{ color: "clay", size: "M" }} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx("VariantPicker", props, defaults, undefined, controls).replace(
      "<VariantPicker",
      "<VariantPicker options={options} variants={variants} value={value} onValueChange={(v, variant) => { setValue(v); setVariant(variant); }}",
    ),
  propsTable: propDocs<VariantPickerProps>()([
    { name: "options", type: "VariantOption[]", required: true, description: "Axes such as Color and Size: { name, label?, kind?, values: { value, label?, color? }[] }." },
    { name: "variants", type: "ProductVariant[]", required: true, description: "Purchasable combinations: { options: { color: 'red', size: 'M' }, stock?, ...extra }." },
    { name: "value", type: "VariantSelection", description: "Controlled picks, keyed by option name." },
    { name: "defaultValue", type: "VariantSelection", default: "{}", description: "Starting picks when uncontrolled." },
    { name: "onValueChange", type: "(value, variant | undefined) => void", description: "Every pick, with the matching variant once every option is picked." },
    { name: "lowStock", type: "number", default: "3", description: "Stock at or below this shows a dot and an 'Only n left' line." },
    { name: "formatStock", type: "(variant, state) => ReactNode", description: "Custom stock line for the resolved variant." },
    { name: "promptLabel", type: "(option) => string", default: '"Pick a {label}"', description: "Shown while an option is unpicked or was cleared." },
    { name: "hideStock", type: "boolean", default: "false", description: "Hide the stock line." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Selection ring and chip color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Swatch and chip size." },
    { name: "disabled", type: "boolean", default: "false", description: "Locks every option." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move between option groups (one stop per group)" },
    { keys: "← / → or ↑ / ↓", action: "Pick the previous or next value in the group" },
    { keys: "Home / End", action: "Pick the first or last value" },
  ],
  a11y: [
    "Each option is a radiogroup named by its visible heading; values are role=radio with aria-checked and a roving tab stop.",
    "Crossed-out values stay focusable and say why in their name: \"(sold out)\" or \"(not available with your picks)\".",
    "A polite status announces each pick and which options were cleared because of it.",
  ],
  reducedMotion: "The selection ring jumps instead of gliding; colors still change.",
  examples: [
    { title: "Sneaker sizes", description: "Many sold-out sizes; a dot marks the last pairs.", Demo: ShoesDemo },
    { title: "Configurator rules", description: "Some memory sizes only ship with one chip; conflicting picks clear and get flagged.", Demo: ConfiguratorDemo },
  ],
};
export default item;
