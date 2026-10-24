import { Button, ImageHotspots, type Hotspot, type ImageHotspotsProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  numbered: boolean;
  pulse: boolean;
  stepper: boolean;
  cardWidth: number;
  tone: NonNullable<ImageHotspotsProps["tone"]>;
};
const defaults: DemoProps = { numbered: false, pulse: true, stepper: true, cardWidth: 256, tone: "primary" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "numbered", label: "Numbered markers" },
  { type: "boolean", prop: "pulse", label: "Pulse until opened" },
  { type: "boolean", prop: "stepper", label: "Prev / next in card" },
  { type: "number", prop: "cardWidth", label: "Card width (px)", min: 200, max: 320, step: 8 },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "info", "success", "warning"] },
];
/** A flat living-room illustration (fixed product colors, like a photo would have). */
function Room() {
  return (
    <svg viewBox="0 0 960 600" role="img" aria-label="Living room with a sofa, arc lamp, side table, plant and rug">
      <rect width="960" height="600" fill="#efe7dc" />
      <rect y="430" width="960" height="170" fill="#c9b49a" />
      <rect x="610" y="90" width="220" height="150" rx="6" fill="#f8f4ee" stroke="#b9a58c" strokeWidth="8" />
      <path d="M630 220 L690 150 L735 200 L770 165 L810 220 Z" fill="#9db6a5" />
      <ellipse cx="470" cy="540" rx="330" ry="46" fill="#a4566b" opacity="0.9" />
      <ellipse cx="470" cy="540" rx="270" ry="32" fill="none" stroke="#f3d9c9" strokeWidth="4" strokeDasharray="14 10" />
      <rect x="250" y="330" width="460" height="130" rx="34" fill="#5f7d8c" />
      <rect x="230" y="300" width="80" height="170" rx="30" fill="#557281" />
      <rect x="650" y="300" width="80" height="170" rx="30" fill="#557281" />
      <rect x="290" y="250" width="380" height="110" rx="30" fill="#6a8a99" />
      <rect x="320" y="275" width="90" height="70" rx="16" fill="#e7c36b" />
      <rect x="550" y="275" width="90" height="70" rx="16" fill="#e9d8c4" />
      <rect x="270" y="465" width="12" height="40" fill="#3b2f28" />
      <rect x="680" y="465" width="12" height="40" fill="#3b2f28" />
      <path d="M150 500 L150 150 Q150 90 230 90 L330 90" fill="none" stroke="#2e2a27" strokeWidth="8" strokeLinecap="round" />
      <path d="M295 92 Q330 60 365 92 Z" fill="#2e2a27" />
      <ellipse cx="330" cy="118" rx="44" ry="18" fill="#ffe9a8" opacity="0.55" />
      <ellipse cx="150" cy="505" rx="44" ry="10" fill="#2e2a27" />
      <rect x="770" y="380" width="110" height="12" rx="6" fill="#7a5a40" />
      <rect x="815" y="390" width="12" height="110" fill="#7a5a40" />
      <rect x="790" y="350" width="34" height="30" rx="4" fill="#d9cbb8" />
      <path d="M850 380 Q840 300 870 260 Q880 320 860 380 Z" fill="#4f7a5a" />
      <path d="M858 380 Q880 310 920 300 Q900 350 866 380 Z" fill="#3f6a4b" />
      <rect x="845" y="372" width="30" height="10" rx="3" fill="#b5643c" />
    </svg>
  );
}
const LOOK: (Hotspot & { price: number })[] = [
  { id: "lamp", x: 33, y: 17, title: "Arc floor lamp", body: "Matte black steel with a dimmable warm LED. 190 cm reach.", price: 249 },
  { id: "pillow", x: 38, y: 51, title: "Mustard linen cushion", body: "Washed linen, feather fill, 45 × 45 cm.", price: 39 },
  { id: "sofa", x: 60, y: 62, title: "Harbor 3-seat sofa", body: "Kiln-dried oak frame, removable slate-blue covers.", price: 1290 },
  { id: "plant", x: 90, y: 50, title: "Rubber plant in clay pot", body: "Low light friendly. Ships in a breathable box.", price: 64 },
  { id: "rug", x: 46, y: 91, title: "Berry wool rug", body: "Hand-tufted New Zealand wool, 200 × 300 cm.", price: 540 },
];
function Preview({ props }: { props: DemoProps }) {
  const [bag, setBag] = useState<string[]>([]);
  const total = LOOK.filter((s) => bag.includes(s.id)).reduce((sum, s) => sum + s.price, 0);
  const spots = LOOK.map((s) => ({
    ...s,
    footer: (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">${s.price.toLocaleString("en-US")}</span>
        <Button size="sm" variant={bag.includes(s.id) ? "soft" : "solid"} tone={bag.includes(s.id) ? "success" : props.tone} onClick={() => setBag((b) => (b.includes(s.id) ? b.filter((x) => x !== s.id) : [...b, s.id]))}>
          {bag.includes(s.id) ? "In bag" : "Add to bag"}
        </Button>
      </div>
    ),
  }));
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <ImageHotspots {...props} spots={spots} label="Shop the living room" aspectRatio="8 / 5">
        <Room />
      </ImageHotspots>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-pui-muted-foreground">Tap a marker to see what is in the room.</span>
        <span className="tabular-nums" aria-live="polite">
          {bag.length} {bag.length === 1 ? "item" : "items"} · <span className="font-semibold">${total.toLocaleString("en-US")}</span>
        </span>
      </div>
    </div>
  );
}
function ProductUi() {
  const bars = [42, 58, 51, 74, 66, 88, 79];
  return (
    <div aria-hidden="true" className="grid size-full grid-cols-[22%_1fr] bg-pui-background text-pui-foreground">
      <div className="flex flex-col gap-2 border-r border-pui-border bg-pui-muted/50 p-3">
        <div className="mb-2 h-3 w-16 rounded bg-pui-foreground/70" />
        {["w-20", "w-14", "w-24", "w-16", "w-12"].map((w, i) => (
          <div key={i} className={`h-2.5 rounded ${w} ${i === 1 ? "bg-pui-primary" : "bg-pui-muted-foreground/30"}`} />
        ))}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded bg-pui-foreground/70" />
          <div className="h-6 w-20 rounded-pui-md bg-pui-primary" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["$48.2K", "1,284", "3.1%"].map((v) => (
            <div key={v} className="rounded-pui-md border border-pui-border bg-pui-surface p-2">
              <div className="mb-1 h-2 w-10 rounded bg-pui-muted-foreground/30" />
              <div className="text-sm font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-1 items-end gap-2 rounded-pui-md border border-pui-border bg-pui-surface p-3">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-pui-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
const TOUR: Hotspot[] = [
  { id: "nav", x: 11, y: 24, title: "Reports live here", body: "Everything you save shows up in the sidebar for the whole team." },
  { id: "kpi", x: 40, y: 30, title: "Live KPIs", body: "Cards refresh every minute and turn amber when a target slips." },
  { id: "chart", x: 64, y: 72, title: "Drill into any bar", body: "Click a week to see the orders behind it." },
  { id: "share", x: 90, y: 11, title: "Share a snapshot", body: "Sends a read-only link that expires in 7 days." },
];
function TourDemo() {
  return (
    <div className="w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-3">
      <ImageHotspots spots={TOUR} numbered label="What is new in Reports" aspectRatio="16 / 10" cardWidth={220} tone="info">
        <ProductUi />
      </ImageHotspots>
    </div>
  );
}
function TrailDemo() {
  const src = useMemo(() => landscape(SCENES[1]!, 4, 960, 600), []);
  return (
    <ImageHotspots
      src={src}
      alt="Valley with three ridges"
      aspectRatio="8 / 5"
      tone="success"
      cardWidth={210}
      stepper={false}
      spots={[
        { id: "camp", x: 18, y: 78, title: "Base camp", body: "Water and parking. 0 km." },
        { id: "saddle", x: 52, y: 58, title: "Pine saddle", body: "Shaded rest stop. 4.2 km, +310 m." },
        { id: "summit", x: 82, y: 40, title: "East summit", body: "360° view. 7.9 km, +640 m." },
      ]}
    />
  );
}
function Mini() {
  return (
    <div aria-hidden="true" inert className="pointer-events-none w-64">
      <ImageHotspots spots={LOOK.slice(0, 3)} label="Room" aspectRatio="8 / 5" pulse={false}>
        <Room />
      </ImageHotspots>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx("ImageHotspots", props, defaults, undefined, controls).replace("<ImageHotspots", '<ImageHotspots src="/room.jpg" alt="Living room" spots={spots}'),
  propsTable: propDocs<ImageHotspotsProps>()([
    { name: "spots", type: "Hotspot[]", required: true, description: "{ id, x, y (0-100 %), title, body?, footer?, label? }." },
    { name: "src", type: "string", description: "Image source; or pass any media as children (SVG, live UI)." },
    { name: "alt", type: "string", description: "Image description; also names the figure." },
    { name: "value", type: "string | null", description: "Open spot id (controlled)." },
    { name: "defaultValue", type: "string | null", default: "null", description: "Spot open at first." },
    { name: "onValueChange", type: "(id | null) => void", description: "A spot opened or the card closed." },
    { name: "numbered", type: "boolean", default: "false", description: "Step numbers in the markers instead of plus signs." },
    { name: "pulse", type: "boolean", default: "true", description: "Breathing ring until each marker has been opened once." },
    { name: "stepper", type: "boolean", default: "true", description: "'n of total' with previous / next buttons in the card." },
    { name: "aspectRatio", type: "string", description: 'Frame ratio such as "16 / 10". Default the media size.' },
    { name: "cardWidth", type: "number", default: "256", description: "Card width in px (capped to the frame)." },
    { name: "label", type: "string", description: "Group name. Default alt." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Marker color." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Open or close the focused marker's card" },
    { keys: "→ / ↓ and ← / ↑", action: "Open the next or previous point (on a marker)" },
    { keys: "Tab", action: "From a marker into its card's controls, then on to the next marker" },
    { keys: "Escape", action: "Close the card and return focus to its marker" },
  ],
  a11y: [
    "Markers are buttons named by the spot title (plus 'step n of total' when numbered) with aria-expanded and aria-controls.",
    "The card is a labelled region placed right after its marker in the DOM, so Tab reaches its buttons naturally.",
    "Positions are percentages, so the cards stay anchored at any size and zoom level without measuring.",
  ],
  reducedMotion: "No pulse and no card scale; cards fade in place.",
  examples: [
    { title: "Numbered walkthrough", description: "Annotate a product screenshot (here live UI) and step through it.", Demo: TourDemo, wide: true },
    { title: "Trail map", description: "An image source with simple notes and no stepper.", Demo: TrailDemo },
  ],
};
export default item;
