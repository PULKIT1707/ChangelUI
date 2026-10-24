import { HoverRevealList, type HoverRevealItem, type HoverRevealListProps } from "changelui";
import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  size: NonNullable<HoverRevealListProps["size"]>;
  previewWidth: number;
  aspectRatio: string;
  tilt: number;
  numbered: boolean;
};
const defaults: DemoProps = { size: "md", previewWidth: 260, aspectRatio: "4 / 3", tilt: 8, numbered: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["md", "lg"] },
  { type: "number", prop: "previewWidth", label: "Preview width (px)", min: 160, max: 380, step: 10 },
  { type: "select", prop: "aspectRatio", label: "Aspect ratio", options: ["4 / 3", "1 / 1", "3 / 4", "16 / 9"] },
  { type: "number", prop: "tilt", label: "Tilt (deg)", min: 0, max: 20, step: 1 },
  { type: "boolean", prop: "numbered", label: "Numbered" },
];
const WORK = [
  { title: "Northwind Outfitters", description: "E-commerce relaunch", meta: "Retail · 2026" },
  { title: "Lumen Health", description: "Patient app and design system", meta: "Health · 2025" },
  { title: "Harbor Freightline", description: "Logistics dashboard", meta: "B2B · 2025" },
  { title: "Fieldnote", description: "Brand identity and website", meta: "Brand · 2024" },
  { title: "Atlas Transit", description: "Wayfinding and trip planner", meta: "Mobility · 2024" },
];
function useImages(w: number, h: number, offset = 0) {
  return useMemo(() => SCENES.map((scene, i) => landscape(scene, i + 1 + offset, w, h)), [w, h, offset]);
}
/** Demos use in-page links, so clicks are kept from changing the dashboard route. */
const stay = (event: ReactMouseEvent) => {
  if ((event.target as Element).closest("a")) event.preventDefault();
};
function Preview({ props }: { props: DemoProps }) {
  const images = useImages(640, 480);
  const items = useMemo<HoverRevealItem[]>(() => WORK.map((w, i) => ({ ...w, id: w.title, href: `#work-${i}`, image: images[i] ?? "" })), [images]);
  return (
    <div className="w-full max-w-3xl" onClickCapture={stay}>
      <p className="m-0 mb-3 text-xs font-semibold tracking-[0.2em] text-pui-muted-foreground uppercase">Selected work</p>
      <HoverRevealList {...props} items={items} />
    </div>
  );
}
/** Buttons instead of links: choosing a row opens it in place. */
function ArticlesDemo() {
  const images = useImages(480, 480, 12);
  const [open, setOpen] = useState<string | null>(null);
  const items: HoverRevealItem[] = [
    { title: "Designing calm notifications", meta: "6 min", image: images[0] ?? "" },
    { title: "What we learned shipping offline mode", meta: "9 min", image: images[1] ?? "" },
    { title: "A field guide to empty states", meta: "4 min", image: images[2] ?? "" },
  ];
  return (
    <div className="w-full">
      <HoverRevealList items={items} numbered={false} previewWidth={180} aspectRatio="1 / 1" onSelect={(it) => setOpen(String(it.title))} />
      <p className="m-0 mt-3 h-5 text-sm text-pui-muted-foreground" role="status">
        {open ? `Opening “${open}”…` : "Pick an article"}
      </p>
    </div>
  );
}
/** Large editorial size in a dark island. */
function StudioDemo() {
  const images = useImages(480, 640, 30);
  const items: HoverRevealItem[] = ["Spring lookbook", "Night market", "Coastline"].map((title, i) => ({ title, href: `#series-${i}`, meta: `${12 + i * 7} photos`, image: images[i] ?? "" }));
  return (
    <div className="dark w-full rounded-pui-xl bg-pui-background p-6 text-pui-foreground" onClickCapture={stay}>
      <HoverRevealList items={items} size="lg" aspectRatio="3 / 4" previewWidth={200} tilt={12} />
    </div>
  );
}
function Mini() {
  const images = useImages(240, 180, 50);
  return (
    <div className="relative w-full max-w-60" aria-hidden="true">
      {["Northwind", "Lumen", "Harbor"].map((t, i) => (
        <div key={t} className={`flex items-center justify-between border-b border-pui-border py-2 text-sm font-semibold ${i === 1 ? "" : "opacity-40"}`}>
          {t}
          <span className="text-[10px] font-normal text-pui-muted-foreground">202{6 - i}</span>
        </div>
      ))}
      <img src={images[1]} alt="" className="absolute end-6 top-4 block h-16 w-24 rotate-6 rounded-pui-md object-cover shadow-pui-lg" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ size, previewWidth, aspectRatio, tilt, numbered }) => {
    const attrs = [
      size !== "md" ? `size="${size}"` : "",
      previewWidth !== 260 ? `previewWidth={${previewWidth}}` : "",
      aspectRatio !== "4 / 3" ? `aspectRatio="${aspectRatio}"` : "",
      tilt !== 8 ? `tilt={${tilt}}` : "",
      numbered ? "" : "numbered={false}",
    ].filter(Boolean);
    return `<HoverRevealList${attrs.map((a) => `\n  ${a}`).join("")}
  items={[
    { title: "Northwind Outfitters", description: "E-commerce relaunch", meta: "2026", href: "/work/northwind", image: "/work/northwind.jpg" },
    { title: "Lumen Health", description: "Patient app", meta: "2025", href: "/work/lumen", image: "/work/lumen.jpg" },
  ]}
/>`;
  },
  propsTable: propDocs<HoverRevealListProps>()([
    { name: "items", type: "HoverRevealItem[]", required: true, description: "{ title, image, href?, description?, meta?, id? }." },
    { name: "onSelect", type: "(item, index) => void", description: "Rows without href become buttons that call this." },
    { name: "previewWidth", type: "number", default: "260", description: "Preview width in px." },
    { name: "aspectRatio", type: "string", default: '"4 / 3"', description: "CSS aspect-ratio of the preview." },
    { name: "tilt", type: "number", default: "8", description: "Most tilt in degrees from horizontal pointer speed." },
    { name: "numbered", type: "boolean", default: "true", description: "Show 01, 02 … before each title." },
    { name: "size", type: '"md" | "lg"', default: '"md"', description: "Title size and row height." },
    { name: "rowClassName", type: "string", description: "Class for each row's link or button." },
  ]),
  keyboard: [{ keys: "Tab", action: "Move between rows; the preview docks beside the focused row" }],
  a11y: [
    "Rows are real links (href) or buttons (onSelect) named by their title, description and meta.",
    "Preview images are decorative (alt=\"\", aria-hidden): the row text already says where it goes.",
    "Keyboard focus shows the same preview, docked beside the row instead of following a pointer.",
    "Touch devices get small inline thumbnails, since there is no hover.",
  ],
  reducedMotion: "The preview docks beside the row without following the pointer, tilting or scrolling between images.",
  examples: [
    { title: "Articles with buttons", description: "onSelect rows and square previews.", Demo: ArticlesDemo },
    { title: "Large, dark", description: "Editorial size with a tall preview.", Demo: StudioDemo },
  ],
};
export default item;
