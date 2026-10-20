import { Button, ZoomParallax, type ZoomParallaxImage, type ZoomParallaxProps } from "changelui";
import { useMemo } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { ScrollStage } from "../../lib/scroll-stage";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { count: number; intensity: number; smooth: boolean; overlay: boolean };
const defaults: DemoProps = { count: 7, intensity: 1, smooth: true, overlay: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Images", min: 1, max: 7, step: 1 },
  { type: "number", prop: "intensity", label: "Intensity", min: 0.5, max: 2, step: 0.1 },
  { type: "boolean", prop: "smooth", label: "Smooth" },
  { type: "boolean", prop: "overlay", label: "Headline overlay" },
];

const ORDER = [3, 0, 2, 4, 1, 5, 7];

function useImages(offset = 0): ZoomParallaxImage[] {
  return useMemo(
    () =>
      ORDER.map((sceneIndex, i) => {
        const scene = SCENES[(sceneIndex + offset) % SCENES.length] ?? SCENES[0]!;
        return { src: landscape(scene, i + 21 + offset, 1200, 800), alt: scene.name };
      }),
    [offset],
  );
}

function Headline() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-pui-xl bg-pui-surface/85 px-6 py-5 text-center shadow-pui-xl backdrop-blur-md">
      <span className="text-xs font-semibold tracking-[0.3em] text-pui-primary-text uppercase">Summer collection</span>
      <span className="font-pui-display text-3xl font-bold tracking-tight text-pui-surface-foreground">Go further</span>
      <Button size="sm" className="rounded-full">
        Explore trips
      </Button>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { count, overlay, ...rest } = props;
  const images = useImages();
  return (
    <ScrollStage height="h-[26rem]" hint="Scroll to zoom in" lead="h-24" tail="h-32">
      {(ref) => (
        <ZoomParallax {...rest} container={ref} images={images.slice(0, count)}>
          {overlay ? <Headline /> : null}
        </ZoomParallax>
      )}
    </ScrollStage>
  );
}

function GentleDemo() {
  const images = useImages(2);
  return (
    <ScrollStage hint="intensity 0.6, no overlay" lead="h-16" tail="h-24">
      {(ref) => <ZoomParallax container={ref} images={images} intensity={0.6} height="220vh" className="mx-4" />}
    </ScrollStage>
  );
}

function Mini() {
  const tiles = [
    { l: "36%", t: "34%", w: "28%", h: "32%", c: "var(--pui-primary)" },
    { l: "6%", t: "6%", w: "34%", h: "26%", c: "var(--pui-chart-2)" },
    { l: "68%", t: "8%", w: "24%", h: "40%", c: "var(--pui-chart-3)" },
    { l: "70%", t: "62%", w: "24%", h: "30%", c: "var(--pui-chart-4)" },
    { l: "10%", t: "62%", w: "22%", h: "30%", c: "var(--pui-chart-5)" },
  ];
  return (
    <div className="relative h-24 w-40 overflow-hidden rounded-pui-md border border-pui-border bg-pui-background">
      {tiles.map((t, i) => (
        <span key={i} className="absolute rounded-pui-sm shadow-pui-xs" style={{ left: t.l, top: t.t, width: t.w, height: t.h, background: t.c, opacity: i === 0 ? 1 : 0.7 }} />
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ intensity, smooth, overlay }) =>
    toJsx<Record<string, unknown>>(
      "ZoomParallax",
      { images: "__IMAGES__", intensity, smooth },
      { images: "", intensity: 1, smooth: true },
      overlay ? "<h2>Go further</h2>" : undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('images="__IMAGES__"', 'images={[{ src: "/hero.jpg", alt: "Mountain lake" }, /* up to 7 */]}'),
  propsTable: propDocs<ZoomParallaxProps>()([
    { name: "images", type: "{ src: string; alt: string }[]", description: "Up to 7 images; the first is the center one.", required: true },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box the scene lives in; default the window." },
    { name: "height", type: "string", default: '"300vh"', description: "Total scroll length of the scene." },
    { name: "viewportHeight", type: "string", description: "Sticky viewport height; default the container height or 100vh." },
    { name: "intensity", type: "number", default: "1", description: "Zoom multiplier (1 = 4× center zoom)." },
    { name: "smooth", type: "boolean", default: "true", description: "Ease the zoom with a spring." },
    { name: "children", type: "ReactNode", description: "Overlay that fades in once the center image fills the scene." },
  ]),
  a11y: [
    "Every image is a real img with alt text, in order; the zoom is transform-only.",
    "The overlay content stays in the DOM, so links in it are reachable by keyboard at any scroll position.",
  ],
  reducedMotion: "A static image grid with the overlay content below it.",
  examples: [{ title: "Gentle zoom", description: "Lower intensity and a shorter scroll for in-page sections.", Demo: GentleDemo, wide: true }],
};
export default item;
