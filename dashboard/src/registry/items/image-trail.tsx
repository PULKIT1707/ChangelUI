import { ImageTrail, type ImageTrailProps } from "changelui";
import { useMemo, useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  threshold: number;
  lifetimeMs: number;
  maxActive: number;
  imageWidth: number;
  rotate: number;
  layer: NonNullable<ImageTrailProps["layer"]>;
};

const defaults: DemoProps = { threshold: 80, lifetimeMs: 900, maxActive: 8, imageWidth: 150, rotate: 8, layer: "behind" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "threshold", label: "Spacing (px)", min: 20, max: 240, step: 10 },
  { type: "number", prop: "lifetimeMs", label: "Lifetime (ms)", min: 300, max: 3000, step: 100 },
  { type: "number", prop: "maxActive", label: "Max on screen", min: 1, max: 20, step: 1 },
  { type: "number", prop: "imageWidth", label: "Image width (px)", min: 60, max: 280, step: 10 },
  { type: "number", prop: "rotate", label: "Tilt (±deg)", min: 0, max: 30, step: 1 },
  { type: "select", prop: "layer", label: "Layer", options: ["behind", "front"] },
];

function useImages(w: number, h: number, offset = 0) {
  return useMemo(() => SCENES.map((scene, i) => landscape(scene, i + 1 + offset, w, h)), [w, h, offset]);
}

function Preview({ props }: { props: DemoProps }) {
  const images = useImages(400, 500);
  return (
    <ImageTrail
      {...props}
      images={images}
      className="flex h-80 w-full max-w-3xl items-center justify-center rounded-pui-xl border border-pui-border bg-pui-surface"
    >
      <div className="pointer-events-none select-none text-center">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.3em] text-pui-muted-foreground">Field notes · 2024</p>
        <p className="m-0 mt-2 text-4xl font-bold tracking-tight text-pui-foreground sm:text-5xl">Eight landscapes</p>
        <p className="m-0 mt-2 text-sm text-pui-muted-foreground">Move your pointer to leave a trail of photos.</p>
      </div>
    </ImageTrail>
  );
}

function PortfolioDemo() {
  const images = useImages(500, 500, 10);
  return (
    <div className="dark">
      <ImageTrail
        images={images}
        threshold={60}
        lifetimeMs={1200}
        maxActive={12}
        imageWidth={120}
        aspectRatio="1 / 1"
        rotate={0}
        imageClassName="rounded-pui-sm ring-0"
        className="flex h-72 w-full items-end rounded-pui-xl bg-pui-background p-6"
      >
        <div className="pointer-events-none select-none">
          <p className="m-0 font-serif text-5xl italic leading-none text-pui-foreground">Studio Nord</p>
          <p className="m-0 mt-2 text-sm text-pui-muted-foreground">Photography &amp; art direction · square crops, no tilt</p>
        </div>
      </ImageTrail>
    </div>
  );
}

function DropsDemo() {
  const images = useImages(480, 360, 20);
  return (
    <ImageTrail
      images={images}
      layer="front"
      threshold={110}
      lifetimeMs={700}
      maxActive={5}
      imageWidth={110}
      aspectRatio="4 / 3"
      rotate={16}
      className="flex h-72 w-full flex-col items-center justify-center gap-2 rounded-pui-xl bg-linear-to-br from-pui-gradient-1/25 via-pui-gradient-2/20 to-pui-gradient-3/25"
    >
      <p className="m-0 text-3xl font-black uppercase tracking-tight text-pui-foreground">New drop</p>
      <p className="m-0 text-sm text-pui-muted-foreground">layer=&quot;front&quot;, short lifetime, wild tilt</p>
    </ImageTrail>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement | null>(null);
  const images = useImages(200, 250);
  useAutoPointer(ref);
  return <ImageTrail ref={ref} images={images} threshold={40} imageWidth={48} maxActive={6} lifetimeMs={700} className="h-28 w-full rounded-pui-lg" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("ImageTrail", props, defaults, "<h1>Portfolio</h1>", controls).replace("<ImageTrail", "<ImageTrail images={photos}"),
  propsTable: propDocs<ImageTrailProps>()([
    { name: "images", type: "string[]", required: true, description: "Image URLs, used in order and cycled." },
    { name: "threshold", type: "number", default: "80", description: "Pointer travel in px between two images." },
    { name: "lifetimeMs", type: "number", default: "900", description: "How long each image stays before it drops away." },
    { name: "maxActive", type: "number", default: "8", description: "Most images on screen; the oldest leaves first." },
    { name: "imageWidth", type: "number", default: "150", description: "Image width in px." },
    { name: "aspectRatio", type: "string", default: '"4 / 5"', description: "CSS aspect-ratio of each image." },
    { name: "rotate", type: "number", default: "8", description: "Random tilt range (±degrees)." },
    { name: "layer", type: '"behind" | "front"', default: '"behind"', description: "Draw the trail behind or over the children." },
    { name: "imageClassName", type: "string", description: "Class for each image (radius, ring, shadow)." },
    { name: "fallback", type: "ReactNode", description: "Rendered instead under reduced motion, e.g. a static collage." },
    { name: "disabled", type: "boolean", default: "false", description: "No trail." },
  ]),
  a11y: [
    "Trail images are decorative: alt=\"\", aria-hidden layer, pointer-events: none.",
    "Children keep their semantics; put the meaningful headline in them.",
    "Touch input is ignored, so phones scroll normally.",
  ],
  reducedMotion: "No trail; the optional fallback renders instead.",
  examples: [
    { title: "Portfolio hero", description: "Dark island, square crops, longer trail.", Demo: PortfolioDemo, wide: true },
    { title: "Product drop", Demo: DropsDemo, wide: true },
  ],
};

export default item;
