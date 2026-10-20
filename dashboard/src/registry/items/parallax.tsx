import { Parallax, ParallaxLayer, type ParallaxLayerProps, type ParallaxProps } from "changelui";
import type { RefObject } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { ScrollStage } from "../../lib/scroll-stage";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { intensity: number; pointer: number; smooth: boolean; trackPointer: boolean };
const defaults: DemoProps = { intensity: 1, pointer: 1, smooth: true, trackPointer: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "intensity", label: "Scroll depth", min: 0, max: 2.5, step: 0.1 },
  { type: "number", prop: "pointer", label: "Pointer depth", min: 0, max: 2.5, step: 0.1 },
  { type: "boolean", prop: "smooth", label: "Smooth" },
  { type: "boolean", prop: "trackPointer", label: "Track pointer" },
];

/** A soft ridge silhouette across a 1200x600 box; the bottom third is solid slack for the lift. */
function ridge(base: number, amp: number, f1: number, f2: number, phase: number) {
  let d = "M0 600";
  for (let x = 0; x <= 1200; x += 25) {
    const t = x / 1200;
    const y = base + Math.sin(t * Math.PI * f1 + phase) * amp + Math.sin(t * Math.PI * f2 + phase * 2) * amp * 0.35;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L1200 600 Z`;
}

const RIDGES = [
  { d: ridge(150, 34, 2.2, 6, 0.4), speed: 0.9, pointer: 6, opacity: 0.25 },
  { d: ridge(205, 30, 1.6, 5, 1.7), speed: 0.6, pointer: 12, opacity: 0.45 },
  { d: ridge(260, 26, 2.8, 7, 2.9), speed: 0.3, pointer: 20, opacity: 0.7 },
  { d: ridge(320, 18, 1.3, 4, 4.1), speed: 0, pointer: 30, opacity: 1 },
];

function Hero({ props, container }: { props: DemoProps; container: RefObject<HTMLDivElement | null> }) {
  const { intensity, pointer, smooth, trackPointer } = props;
  return (
    <Parallax
      container={container}
      smooth={smooth}
      trackPointer={trackPointer}
      className="mx-4 h-[22rem] overflow-hidden rounded-pui-xl border border-pui-border bg-linear-to-b from-pui-muted to-pui-background sm:mx-6"
    >
      <ParallaxLayer speed={1.2 * intensity} pointer={-4 * pointer} className="absolute top-8 right-[18%] size-24 rounded-full bg-pui-warning opacity-80 shadow-pui-glow blur-[1px]" />
      {[12, 30, 64, 80].map((left, i) => (
        <ParallaxLayer
          key={left}
          speed={(1.5 - i * 0.2) * intensity}
          pointer={(8 + i * 3) * pointer}
          className="absolute h-3 rounded-full bg-pui-surface/80 shadow-pui-xs"
          style={{ left: `${left}%`, top: `${14 + (i % 2) * 14}%`, width: `${70 + i * 18}px` }}
        />
      ))}
      <ParallaxLayer speed={0.5 * intensity} pointer={3 * pointer} className="absolute inset-x-0 top-[22%] z-10 text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.3em] text-pui-primary-text uppercase">Field notes</p>
        <h3 className="m-0 mt-2 font-pui-display text-4xl font-bold tracking-tight text-pui-foreground sm:text-5xl">Into the valley</h3>
      </ParallaxLayer>
      {RIDGES.map((r, i) => (
        <ParallaxLayer
          key={i}
          speed={r.speed * intensity}
          pointer={r.pointer * pointer}
          className="absolute -inset-x-10 bottom-[-7rem]"
          style={{ zIndex: 20 + i }}
        >
          <svg viewBox="0 0 1200 600" preserveAspectRatio="none" className="block h-[21rem] w-full" aria-hidden="true">
            <path d={r.d} fill="var(--pui-primary)" opacity={r.opacity} />
          </svg>
        </ParallaxLayer>
      ))}
    </Parallax>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <ScrollStage height="h-[26rem]" hint="Scroll and move the mouse">
      {(ref) => <Hero props={props} container={ref} />}
    </ScrollStage>
  );
}

const CARDS = [
  { title: "Revenue", value: "$48.2k", tone: "text-pui-success-text", delta: "+12.4%", left: "6%", top: "18%", speed: 0.9, pointer: 26, rotate: -6 },
  { title: "Active users", value: "3,912", tone: "text-pui-primary-text", delta: "+4.1%", left: "58%", top: "8%", speed: -0.6, pointer: -18, rotate: 4 },
  { title: "Churn", value: "1.8%", tone: "text-pui-danger-text", delta: "-0.3%", left: "64%", top: "58%", speed: 1.4, pointer: 34, rotate: 8 },
];

function FloatingCardsDemo() {
  return (
    <ScrollStage hint="Cards at different depths">
      {(ref) => (
        <Parallax container={ref} className="relative mx-4 h-80">
          <ParallaxLayer speed={0.2} pointer={8} className="absolute inset-x-[18%] top-[22%] bottom-[18%] rounded-pui-xl border border-pui-border bg-pui-surface p-4 shadow-pui-lg">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2.5 rounded-full bg-pui-muted" />
              ))}
            </div>
            <div className="mt-4 flex h-[calc(100%-2rem)] items-end gap-2">
              {[40, 64, 52, 80, 70, 92, 60, 85].map((h, i) => (
                <span key={i} className="flex-1 rounded-t-pui-sm bg-pui-primary/70" style={{ height: `${h}%` }} />
              ))}
            </div>
          </ParallaxLayer>
          {CARDS.map((card) => (
            <ParallaxLayer
              key={card.title}
              speed={card.speed}
              pointer={card.pointer}
              rotate={card.rotate}
              className="absolute w-36 rounded-pui-lg border border-pui-border bg-pui-surface/90 p-3 shadow-pui-xl backdrop-blur-md"
              style={{ left: card.left, top: card.top }}
            >
              <p className="m-0 text-xs text-pui-muted-foreground">{card.title}</p>
              <p className="m-0 mt-1 text-lg font-semibold text-pui-surface-foreground">{card.value}</p>
              <p className={`m-0 text-xs font-medium ${card.tone}`}>{card.delta}</p>
            </ParallaxLayer>
          ))}
        </Parallax>
      )}
    </ScrollStage>
  );
}

function SidewaysDemo() {
  const words = ["design", "motion", "systems", "craft", "detail", "speed"];
  return (
    <ScrollStage hint='axis="x" rows'>
      {(ref) => (
        <Parallax container={ref} trackPointer={false} className="flex flex-col gap-3 overflow-hidden py-10">
          {[1.6, -1.6, 1].map((speed, row) => (
            <ParallaxLayer key={row} axis="x" speed={speed} className="flex gap-6 whitespace-nowrap">
              {words.concat(words).map((w, i) => (
                <span
                  key={i}
                  className={`font-pui-display text-4xl font-bold tracking-tight ${(i + row) % 3 === 0 ? "text-pui-primary-text" : "text-pui-foreground/20"}`}
                >
                  {w}
                </span>
              ))}
            </ParallaxLayer>
          ))}
        </Parallax>
      )}
    </ScrollStage>
  );
}

function ImageDepthDemo() {
  const src = landscape(SCENES[3] ?? SCENES[0]!, 4, 1200, 800);
  return (
    <ScrollStage hint="Scale and fade layers">
      {(ref) => (
        <Parallax container={ref} className="mx-4 h-72 overflow-hidden rounded-pui-xl">
          <ParallaxLayer speed={0.8} scale={[1.25, 1.05]} className="absolute -inset-y-16 inset-x-0">
            <img src={src} alt="Night valley under the stars" className="block size-full object-cover" />
          </ParallaxLayer>
          <ParallaxLayer speed={-0.6} fade={[0, 1, 0]} className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-pui-lg bg-pui-surface/85 px-4 py-2 text-lg font-semibold text-pui-surface-foreground shadow-pui-md backdrop-blur-md">
              Night valley
            </span>
          </ParallaxLayer>
        </Parallax>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <div className="relative h-24 w-40 overflow-hidden rounded-pui-md border border-pui-border bg-linear-to-b from-pui-muted to-pui-background">
      <span className="absolute top-3 right-6 size-6 rounded-full bg-pui-warning opacity-80" />
      {RIDGES.map((r, i) => (
        <svg key={i} viewBox="0 0 1200 600" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-8 h-24 w-full" style={{ transform: `translateY(${(3 - i) * -5}px)` }} aria-hidden="true">
          <path d={r.d} fill="var(--pui-primary)" opacity={r.opacity} />
        </svg>
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ smooth, trackPointer }) => {
    const attrs = [smooth ? "" : " smooth={false}", trackPointer ? "" : " trackPointer={false}"].join("");
    return `<Parallax${attrs} className="relative h-[28rem] overflow-hidden">
  <ParallaxLayer speed={0.9} pointer={6} className="absolute inset-x-0 bottom-0">
    <FarHills />
  </ParallaxLayer>
  <ParallaxLayer speed={0.5} className="absolute inset-x-0 top-1/4 text-center">
    <h1>Into the valley</h1>
  </ParallaxLayer>
  <ParallaxLayer speed={0} pointer={30} className="absolute inset-x-0 bottom-0">
    <NearHills />
  </ParallaxLayer>
</Parallax>`;
  },
  propsTable: [
    ...propDocs<ParallaxProps>()([
      { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box to follow; default the window." },
      { name: "offset", type: 'UseScrollOptions["offset"]', default: '["start end", "end start"]', description: "Scroll range of the full travel." },
      { name: "smooth", type: "boolean", default: "true", description: "Ease scroll and pointer with a 120/20 spring." },
      { name: "trackPointer", type: "boolean", default: "true", description: "Track the mouse so layers with `pointer` drift." },
    ]),
    ...propDocs<ParallaxLayerProps>()([
      { name: "speed", type: "number", default: "0.2", description: "ParallaxLayer: moves speed×100px each way; positive lags (far), negative rushes (near)." },
      { name: "axis", type: '"x" | "y"', default: '"y"', description: "ParallaxLayer: scroll travel axis." },
      { name: "pointer", type: "number", default: "0", description: "ParallaxLayer: px of drift toward the pointer at the scene edge." },
      { name: "rotate", type: "number", default: "0", description: "ParallaxLayer: degrees turned across the range." },
      { name: "scale", type: "[number, number]", description: "ParallaxLayer: scale at the start and end of the range." },
      { name: "fade", type: "[number, number, number]", description: "ParallaxLayer: opacity at start, middle and end." },
    ]),
  ],
  a11y: [
    "Layers are plain elements: text keeps its semantics and stays in reading order.",
    "Movement is transform-only, so layout and focus order never shift.",
    "Pointer drift only reacts to a mouse; touch and pen scroll normally.",
  ],
  reducedMotion: "Every layer stays in place; scale, rotate and fade ranges are ignored.",
  examples: [
    { title: "Floating cards", description: "Mixed positive and negative speeds plus rotate for a product hero.", Demo: FloatingCardsDemo, wide: true },
    { title: "Sideways rows", description: 'axis="x" rows sliding in opposite directions.', Demo: SidewaysDemo },
    { title: "Image depth", description: "scale and fade ranges on a photo and its caption.", Demo: ImageDepthDemo },
  ],
};
export default item;
