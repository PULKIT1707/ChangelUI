import { Button, ClickSpark, IconButton, type ClickSparkProps } from "changelui";
import { useEffect, useRef, useState, type RefObject } from "react";
import { HeartIcon, SparkIcon, StarGlyph } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<ClickSparkProps["variant"]>;
  count: number;
  radius: number;
  length: number;
  thickness: number;
  durationMs: number;
  ring: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  variant: "lines",
  count: 8,
  radius: 18,
  length: 10,
  thickness: 2,
  durationMs: 400,
  ring: false,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["lines", "dots", "stars"] },
  { type: "number", prop: "count", label: "Sparks", min: 3, max: 24, step: 1 },
  { type: "number", prop: "radius", label: "Radius (px)", min: 8, max: 80, step: 1 },
  { type: "number", prop: "length", label: "Line length (px)", min: 4, max: 30, step: 1 },
  { type: "number", prop: "thickness", label: "Thickness (px)", min: 1, max: 6, step: 0.5 },
  { type: "number", prop: "durationMs", label: "Duration (ms)", min: 150, max: 1500, step: 50 },
  { type: "boolean", prop: "ring", label: "Ring" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const RAINBOW = ["var(--pui-chart-1)", "var(--pui-chart-2)", "var(--pui-chart-3)", "var(--pui-chart-4)", "var(--pui-chart-5)"];

function Preview({ props }: { props: DemoProps }) {
  const [clicks, setClicks] = useState(0);
  return (
    <ClickSpark
      {...props}
      onClick={() => setClicks((n) => n + 1)}
      className="flex h-64 w-full max-w-xl cursor-crosshair select-none flex-col items-center justify-center gap-3 rounded-pui-xl border border-dashed border-pui-border bg-[radial-gradient(var(--pui-pattern)_1px,transparent_1px)] bg-size-[16px_16px]"
    >
      <p className="m-0 text-sm font-medium text-pui-muted-foreground">Click anywhere in here</p>
      <Button size="sm" leadingIcon={<SparkIcon />}>
        Or press me (try Enter)
      </Button>
      <p className="m-0 text-xs tabular-nums text-pui-muted-foreground" aria-live="polite">
        {clicks} {clicks === 1 ? "click" : "clicks"}
      </p>
    </ClickSpark>
  );
}

function LikeDemo() {
  const [liked, setLiked] = useState(false);
  const [starred, setStarred] = useState(false);
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <ClickSpark variant="dots" color="var(--pui-danger)" count={10} radius={26} ring className="rounded-pui-full">
        <IconButton
          aria-label="Like"
          aria-pressed={liked}
          variant="ghost"
          tone={liked ? "danger" : "neutral"}
          size="lg"
          onClick={() => setLiked((v) => !v)}
        >
          <HeartIcon filled={liked} className="size-6" />
        </IconButton>
      </ClickSpark>
      <ClickSpark variant="stars" color="var(--pui-warning)" count={7} radius={30} className="rounded-pui-full">
        <IconButton
          aria-label="Star"
          aria-pressed={starred}
          variant="ghost"
          tone={starred ? "warning" : "neutral"}
          size="lg"
          onClick={() => setStarred((v) => !v)}
        >
          <StarGlyph filled={starred} className="size-6" />
        </IconButton>
      </ClickSpark>
      <ClickSpark radius={24} length={8} count={12} colors={RAINBOW}>
        <Button variant="outline" tone="neutral">
          Rainbow lines
        </Button>
      </ClickSpark>
    </div>
  );
}

function GameDemo() {
  const [score, setScore] = useState(0);
  const [lit, setLit] = useState(4);
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="m-0 text-sm text-pui-muted-foreground" aria-live="polite">
        Score <span className="font-semibold tabular-nums text-pui-foreground">{score}</span>
      </p>
      <ClickSpark variant="stars" colors={RAINBOW} count={9} radius={34} durationMs={550}>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={i === lit ? "Lit tile, hit it" : `Tile ${i + 1}`}
              onClick={(event) => {
                // preventDefault() tells ClickSpark to skip this click: misses don't sparkle.
                if (i !== lit) {
                  event.preventDefault();
                  return;
                }
                setScore((s) => s + 1);
                setLit((current) => (current * 7 + 5) % 12);
              }}
              className={`size-12 cursor-pointer rounded-pui-md border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring ${
                i === lit ? "border-pui-primary bg-pui-primary shadow-pui-glow" : "border-pui-border bg-pui-surface hover:bg-pui-muted"
              }`}
            />
          ))}
        </div>
      </ClickSpark>
    </div>
  );
}

/** Minis are non-interactive: click a few spots on a timer so the sparks show themselves. */
function useAutoClick(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let i = 0;
    const id = window.setInterval(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      i += 1;
      const x = rect.left + rect.width * (0.25 + ((i * 37) % 50) / 100);
      const y = rect.top + rect.height * (0.3 + ((i * 53) % 40) / 100);
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y, detail: 1 }));
    }, 700);
    return () => window.clearInterval(id);
  }, [ref]);
}

function Mini() {
  const ref = useRef<HTMLDivElement | null>(null);
  useAutoClick(ref);
  return (
    <ClickSpark ref={ref} colors={RAINBOW} radius={22} count={10} className="flex h-28 w-full items-center justify-center">
      <span className="rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1.5 text-xs font-medium text-pui-surface-foreground">Click!</span>
    </ClickSpark>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("ClickSpark", props, defaults, "<Button>Click me</Button>", controls),
  propsTable: propDocs<ClickSparkProps>()([
    { name: "variant", type: '"lines" | "dots" | "stars"', default: '"lines"', description: "Lines radiate and shrink; dots and stars burst outward." },
    { name: "color", type: "string", default: '"var(--pui-primary)"', description: "Spark color (any CSS color or token)." },
    { name: "colors", type: "string[]", description: "Several colors cycled per spark; overrides color." },
    { name: "count", type: "number", default: "8", description: "Sparks per click." },
    { name: "radius", type: "number", default: "18", description: "Travel distance in px." },
    { name: "length", type: "number", default: "10", description: "Line length in px (lines)." },
    { name: "thickness", type: "number", default: "2", description: "Line and ring thickness in px." },
    { name: "durationMs", type: "number", default: "400", description: "Spark lifetime." },
    { name: "ring", type: "boolean", default: "false", description: "Adds an expanding ring under the sparks." },
    { name: "disabled", type: "boolean", default: "false", description: "Stop sparking; clicks still reach the children." },
  ]),
  a11y: [
    "Children keep their roles and handlers; the wrapper adds no role.",
    "Sparks are aria-hidden, pointer-events: none nodes that remove themselves.",
    "Keyboard clicks (Enter or Space on a button) spark from the center of the clicked element.",
  ],
  reducedMotion: "No sparks.",
  examples: [
    { title: "Like and star", description: "dots + ring, stars, and rainbow lines.", Demo: LikeDemo },
    { title: "Whack-a-tile", description: "Sparks only on the lit tile hit.", Demo: GameDemo },
  ],
};

export default item;
