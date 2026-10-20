import { ScrollTextReveal, type ScrollTextRevealProps } from "changelui";
import { useRef, type ReactNode, type RefObject } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  split: NonNullable<ScrollTextRevealProps["split"]>;
  dimOpacity: number;
  blur: boolean;
  smooth: boolean;
};

const defaults: DemoProps = {
  text: "We build tools that get out of the way. Every pixel earns its place, every motion has a reason, and every detail is there so you can focus on the work that matters.",
  split: "word",
  dimOpacity: 0.18,
  blur: false,
  smooth: true,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 240 },
  { type: "select", prop: "split", label: "Split", options: ["word", "char"] },
  { type: "number", prop: "dimOpacity", label: "Dim opacity", min: 0, max: 0.6, step: 0.02 },
  { type: "boolean", prop: "blur", label: "Blur unread" },
  { type: "boolean", prop: "smooth", label: "Smooth" },
];

function ScrollStage({
  children,
  height = "h-80",
  hint = "Scroll to read",
}: {
  children: (ref: RefObject<HTMLDivElement | null>) => ReactNode;
  height?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label="Scrollable demo"
      className={`relative w-full overflow-y-auto rounded-pui-lg border border-pui-border bg-pui-background outline-none focus-visible:outline-2 focus-visible:outline-pui-ring ${height}`}
    >
      <div className="flex h-56 items-end justify-center pb-6 text-xs text-pui-muted-foreground">{hint} ↓</div>
      <div className="px-6 sm:px-10">{children(ref)}</div>
      <div className="h-64" />
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <ScrollStage>
      {(ref) => (
        <ScrollTextReveal
          {...rest}
          container={ref}
          className="mx-auto max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-pui-foreground sm:text-3xl"
        >
          {text}
        </ScrollTextReveal>
      )}
    </ScrollStage>
  );
}

function ManifestoDemo() {
  return (
    <ScrollStage height="h-96" hint="A manifesto, one word at a time">
      {(ref) => (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <span className="text-xs font-semibold tracking-widest text-pui-primary-text uppercase">Our principles</span>
          <ScrollTextReveal
            container={ref}
            blur
            dimOpacity={0.1}
            accent={["calm", "fast", "yours"]}
            offset={["start 0.85", "end 0.5"]}
            className="font-pui-display text-4xl font-bold leading-tight tracking-tight text-pui-foreground"
          >
            Software should feel calm. It should be fast without asking. And it should always, always be yours.
          </ScrollTextReveal>
        </div>
      )}
    </ScrollStage>
  );
}

function QuoteDemo() {
  return (
    <ScrollStage hint="Letter by letter">
      {(ref) => (
        <figure className="mx-auto m-0 flex max-w-xl flex-col gap-4">
          <ScrollTextReveal
            container={ref}
            split="char"
            as="p"
            dimOpacity={0.12}
            className="text-2xl font-medium italic leading-snug text-pui-foreground"
          >
            “The details are not the details. They make the design.”
          </ScrollTextReveal>
          <figcaption className="text-sm text-pui-muted-foreground">Charles Eames</figcaption>
        </figure>
      )}
    </ScrollStage>
  );
}

function FeatureDemo() {
  return (
    <ScrollStage hint="Accent words light up in color">
      {(ref) => (
        <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <span className="grid size-12 place-items-center rounded-pui-lg bg-pui-primary text-xl text-pui-primary-foreground shadow-pui-md" aria-hidden="true">
            ⚡
          </span>
          <ScrollTextReveal
            container={ref}
            accent={["instant", "offline", "synced"]}
            accentColor="var(--pui-chart-2)"
            className="text-xl font-medium leading-relaxed text-pui-foreground"
          >
            Search is instant, edits work offline, and every change is synced to your team the moment you are back online.
          </ScrollTextReveal>
        </div>
      )}
    </ScrollStage>
  );
}

function Mini() {
  return (
    <p className="m-0 max-w-[12rem] text-center text-base font-semibold leading-snug">
      <span className="text-pui-foreground">Read as you </span>
      <span className="text-pui-foreground/50">scroll through </span>
      <span className="text-pui-foreground/20">the story</span>
    </p>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>(
      "ScrollTextReveal",
      props,
      { split: "word", dimOpacity: 0.18, blur: false, smooth: true },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<ScrollTextRevealProps>()([
    { name: "children", type: "string", description: "The paragraph.", required: true },
    { name: "offset", type: "UseScrollOptions[\"offset\"]", default: '["start 0.9", "end 0.4"]', description: "Scroll range that maps to 0..1 (target edge, viewport edge)." },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box to follow (non-static position); default the window." },
    { name: "split", type: '"word" | "char"', default: '"word"', description: "Light up word by word or letter by letter." },
    { name: "dimOpacity", type: "number", default: "0.18", description: "Opacity of text not reached yet." },
    { name: "blur", type: "boolean", default: "false", description: "Unread text is also slightly blurred." },
    { name: "smooth", type: "boolean", default: "true", description: "Ease progress with a spring." },
    { name: "accent", type: "string[]", description: "Words that light up in the accent color (case and punctuation ignored)." },
    { name: "accentColor", type: "string", default: '"var(--pui-primary-text)"', description: "Accent color." },
    { name: "as", type: "TextTag", default: '"p"', description: "Rendered tag." },
  ]),
  a11y: [
    "Screen readers get the whole paragraph at once from an sr-only copy; the dimmed words are aria-hidden.",
    "Nothing is ever removed: dim text stays in the DOM and in the layout.",
  ],
  reducedMotion: "All words are shown at full opacity without blur.",
  examples: [
    { title: "Manifesto", description: "blur, a lower dim and accent words on a display heading.", Demo: ManifestoDemo, wide: true },
    { title: "Pull quote", description: 'split="char" for a slower, finer reveal.', Demo: QuoteDemo },
    { title: "Feature copy", description: "accent words in a chart color next to an icon.", Demo: FeatureDemo },
  ],
};
export default item;
