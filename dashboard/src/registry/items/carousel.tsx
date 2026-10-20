import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselProps,
} from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  align: NonNullable<CarouselProps["align"]>;
  effect: NonNullable<CarouselProps["effect"]>;
  perView: "1" | "2" | "3";
  loop: boolean;
  autoplay: boolean;
  autoplayMs: number;
  draggable: boolean;
};

const defaults: DemoProps = {
  align: "start",
  effect: "none",
  perView: "1",
  loop: false,
  autoplay: false,
  autoplayMs: 4000,
  draggable: true,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "align", label: "Align", options: ["start", "center"] },
  { type: "select", prop: "effect", label: "Effect", options: ["none", "scale"] },
  { type: "select", prop: "perView", label: "Per view", options: ["1", "2", "3"] },
  { type: "boolean", prop: "loop", label: "Loop" },
  { type: "boolean", prop: "autoplay", label: "Autoplay" },
  { type: "number", prop: "autoplayMs", label: "Autoplay (ms)", min: 1500, max: 8000, step: 250 },
  { type: "boolean", prop: "draggable", label: "Mouse drag" },
];

const BASIS = { "1": "basis-full", "2": "basis-[85%] sm:basis-1/2", "3": "basis-[85%] sm:basis-1/3" } as const;

const SLIDES = [
  { kicker: "Destinations", title: "Wake up above the clouds", body: "Ridge huts with sunrise views, booked by the night." },
  { kicker: "Field notes", title: "Midday on the northern trail", body: "A 14 km loop with three lakes and one very steep ladder." },
  { kicker: "Photo essay", title: "The dunes at golden hour", body: "Why the desert looks copper for exactly nine minutes." },
  { kicker: "Stargazing", title: "A valley without light", body: "Dark-sky parks where the Milky Way casts a shadow." },
  { kicker: "Coastline", title: "Low tide at the lagoon", body: "Tide pools, salt flats and the best fish tacos in town." },
  { kicker: "Seasons", title: "Rose hills after the rain", body: "The two weeks each spring when the slopes turn pink." },
];

function useArt() {
  return useMemo(() => SCENES.slice(0, SLIDES.length).map((scene, i) => landscape(scene, i + 7, 1200, 750)), []);
}

function Slide({ i, art }: { i: number; art: string }) {
  const slide = SLIDES[i]!;
  return (
    <article className="relative isolate flex aspect-[16/10] h-full flex-col justify-end overflow-hidden rounded-pui-xl border border-pui-border p-5 text-[oklch(0.99_0_0)] shadow-pui-md">
      <img src={art} alt="" draggable={false} className="absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,oklch(0_0_0/0.65),transparent_65%)]" />
      <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-wider opacity-80">{slide.kicker}</p>
      <h3 className="m-0 mt-1 text-lg font-semibold leading-tight">{slide.title}</h3>
      <p className="m-0 mt-1 text-sm opacity-85">{slide.body}</p>
    </article>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const art = useArt();
  const [index, setIndex] = useState(0);
  const { perView, autoplay, autoplayMs, ...rest } = props;
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <Carousel
        key={`${props.align}-${perView}-${autoplay}`}
        aria-label="Travel stories"
        {...rest}
        autoplayMs={autoplay ? autoplayMs : undefined}
        onIndexChange={setIndex}
      >
        <CarouselContent className={rest.align === "center" ? "px-[7%]" : undefined}>
          {SLIDES.map((_, i) => (
            <CarouselItem key={i} className={BASIS[perView]}>
              <Slide i={i} art={art[i]!} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        <CarouselDots className="mt-3" />
      </Carousel>
      <p className="m-0 text-center text-xs tabular-nums text-pui-muted-foreground">
        Snap {index + 1} · native scroll on touch and trackpads, drag with a mouse, arrow keys when focused
      </p>
    </div>
  );
}

const PRODUCTS = [
  { name: "Aero Bottle", price: "$32", hue: "var(--pui-chart-1)" },
  { name: "Trail Mug", price: "$24", hue: "var(--pui-chart-2)" },
  { name: "Camp Lantern", price: "$58", hue: "var(--pui-chart-3)" },
  { name: "Wool Beanie", price: "$29", hue: "var(--pui-chart-4)" },
  { name: "Day Pack", price: "$89", hue: "var(--pui-chart-5)" },
  { name: "Sit Pad", price: "$19", hue: "var(--pui-chart-1)" },
  { name: "Stove Kit", price: "$74", hue: "var(--pui-chart-2)" },
];

function ProductRow() {
  return (
    <Carousel aria-label="New arrivals" className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold">New arrivals</p>
        <div className="flex gap-1.5">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </div>
      <CarouselContent className="gap-3">
        {PRODUCTS.map((p) => (
          <CarouselItem key={p.name} className="basis-[45%] sm:basis-[30%]">
            <div className="flex flex-col gap-2">
              <div className="aspect-square rounded-pui-lg border border-pui-border" style={{ background: `radial-gradient(circle at 30% 25%, ${p.hue}, var(--pui-muted) 70%)` }} />
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="tabular-nums text-pui-muted-foreground">{p.price}</span>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

const QUOTES = [
  { quote: "We replaced three libraries with this one and our bundle got smaller.", who: "Priya N., Staff engineer" },
  { quote: "The motion defaults are the first ones our designers didn't ask us to tweak.", who: "Marco D., Design lead" },
  { quote: "Keyboard support everywhere. Our accessibility audit came back clean.", who: "Sam K., Frontend lead" },
];

function Testimonials() {
  return (
    <Carousel aria-label="Testimonials" autoplayMs={5000} loop className="w-full">
      <CarouselContent>
        {QUOTES.map((q) => (
          <CarouselItem key={q.who}>
            <figure className="m-0 flex min-h-36 flex-col justify-between gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
              <blockquote className="m-0 text-base leading-relaxed">“{q.quote}”</blockquote>
              <figcaption className="text-xs text-pui-muted-foreground">{q.who}</figcaption>
            </figure>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselDots className="mt-3" />
    </Carousel>
  );
}

function CoverFlow() {
  const art = useArt();
  return (
    <Carousel aria-label="Cover flow" align="center" effect="scale" loop className="w-full">
      <CarouselContent className="gap-2 px-[18%]">
        {SLIDES.map((s, i) => (
          <CarouselItem key={i} className="basis-[64%]">
            <img src={art[i]} alt={s.title} draggable={false} className="block aspect-square w-full rounded-pui-xl object-cover shadow-pui-lg" />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselDots className="mt-3" />
    </Carousel>
  );
}

function Mini() {
  const art = useArt();
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <Carousel aria-label="Mini">
        <CarouselContent tabIndex={-1} className="gap-2">
          {[0, 1, 2].map((i) => (
            <CarouselItem key={i} className="basis-[80%]">
              <img src={art[i]} alt="" className="block aspect-video w-full rounded-pui-lg object-cover" />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselDots className="mt-2" />
      </Carousel>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ perView, autoplay, autoplayMs, ...props }) => {
    const root = toJsx<Record<string, unknown>>(
      "Carousel",
      { "aria-label": "Stories", ...props, ...(autoplay ? { autoplayMs } : {}) },
      { align: "start", effect: "none", loop: false, draggable: true },
      "__BODY__",
      controls as ControlSpec<Record<string, unknown>>[],
    );
    const body = `<CarouselContent>\n    {slides.map((slide) => (\n      <CarouselItem key={slide.id} className="${BASIS[perView]}">\n        <Slide {...slide} />\n      </CarouselItem>\n    ))}\n  </CarouselContent>\n  <CarouselPrevious />\n  <CarouselNext />\n  <CarouselDots />`;
    return root.replace("__BODY__", body);
  },
  propsTable: propDocs<CarouselProps>()([
    { name: "aria-label", type: "string", description: "Name of the carousel region." },
    { name: "align", type: '"start" | "center"', default: '"start"', description: "Where slides snap." },
    { name: "effect", type: '"none" | "scale"', default: '"none"', description: "Scale and dim slides by distance from the snap point." },
    { name: "loop", type: "boolean", default: "false", description: "Wrap around for buttons, keys and autoplay." },
    { name: "autoplayMs", type: "number", description: "Advance every N ms; the active dot fills as a timer." },
    { name: "draggable", type: "boolean", default: "true", description: "Mouse drag-to-scroll with momentum." },
    { name: "onIndexChange", type: "(index: number) => void", description: "Active snap changes." },
    { name: "slideLabel", type: "(position, total) => string", default: "`${i} of ${n}`", description: "Name of each slide." },
  ]),
  keyboard: [
    { keys: "ArrowLeft / ArrowRight", action: "Previous / next slide (focus inside the carousel)" },
    { keys: "Tab", action: "Into the scroll track, buttons and dots" },
  ],
  a11y: [
    'A region with aria-roledescription="carousel"; slides are groups named “3 of 8”.',
    "Autoplay pauses on hover, keyboard focus, hidden tabs and offscreen, and the dots include a pause button (WCAG 2.2.2).",
    "A polite status announces the current slide when autoplay is off.",
  ],
  reducedMotion: "No autoplay until the user presses play, instant scrolling and no scale effect.",
  examples: [
    { title: "Product row", description: "Several per view with the buttons in a header.", Demo: ProductRow, wide: true },
    { title: "Testimonials", description: "Autoplay + loop; the active dot is the timer.", Demo: Testimonials },
    { title: "Cover flow", description: 'align="center" effect="scale" loop.', Demo: CoverFlow },
  ],
};

export default item;
