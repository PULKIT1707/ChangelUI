import { Badge, Button, Confetti, ConfettiButton, confetti, fireworks, type ConfettiOptions, type ConfettiShape } from "changelui";
import { motion } from "motion/react";
import { useState } from "react";
import { CheckGlyph, GiftIcon, SparkIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  count: number;
  spread: number;
  startVelocity: number;
  gravity: number;
  drift: number;
  scalar: number;
  shapes: "mixed" | ConfettiShape | "emoji";
  flat: boolean;
};

const defaults: DemoProps = {
  count: 120,
  spread: 70,
  startVelocity: 38,
  gravity: 1,
  drift: 0,
  scalar: 1,
  shapes: "mixed",
  flat: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "count", label: "Pieces", min: 10, max: 400, step: 10 },
  { type: "number", prop: "spread", label: "Spread (deg)", min: 10, max: 360, step: 5 },
  { type: "number", prop: "startVelocity", label: "Velocity", min: 10, max: 70, step: 1 },
  { type: "number", prop: "gravity", label: "Gravity", min: 0, max: 3, step: 0.1 },
  { type: "number", prop: "drift", label: "Wind", min: -3, max: 3, step: 0.5 },
  { type: "number", prop: "scalar", label: "Size", min: 0.5, max: 2.5, step: 0.1 },
  { type: "select", prop: "shapes", label: "Shapes", options: ["mixed", "square", "ribbon", "circle", "star", "emoji"] },
  { type: "boolean", prop: "flat", label: "Flat (no flutter)" },
];

const EMOJIS = ["🎉", "✨", "🚀", "💜", "⭐"];

function toOptions(props: DemoProps): ConfettiOptions {
  const { shapes, ...rest } = props;
  if (shapes === "emoji") return { ...rest, emojis: EMOJIS, scalar: rest.scalar * 1.4 };
  if (shapes === "mixed") return rest;
  return { ...rest, shapes: [shapes] };
}

function Preview({ props }: { props: DemoProps }) {
  const [bursts, setBursts] = useState(0);
  const options = toOptions(props);
  const cannons = () => {
    const shared = { ...options, count: Math.round(props.count * 0.7), startVelocity: props.startVelocity + 12 };
    void confetti({ ...shared, origin: { x: 0, y: 0.75 }, angle: 60 });
    void confetti({ ...shared, origin: { x: 1, y: 0.75 }, angle: 120 });
  };
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <ConfettiButton size="lg" options={options} leadingIcon={<SparkIcon />} onConfettiComplete={() => setBursts((n) => n + 1)}>
        Celebrate
      </ConfettiButton>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" tone="neutral" size="sm" onClick={cannons}>
          Side cannons
        </Button>
        <Button variant="outline" tone="neutral" size="sm" onClick={() => void fireworks({ colors: options.colors })}>
          Fireworks
        </Button>
        <Button
          variant="outline"
          tone="neutral"
          size="sm"
          onClick={() => void confetti({ ...options, origin: { x: 0.5, y: -0.05 }, angle: 270, spread: 160, startVelocity: 12, count: props.count * 2, ticks: 320 })}
        >
          Rain
        </Button>
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {bursts === 0 ? "One shared canvas, removed when the last piece lands." : `Bursts landed: ${bursts}`}
      </p>
    </div>
  );
}

function CheckoutDemo() {
  const [orders, setOrders] = useState(0);
  const [placing, setPlacing] = useState(false);
  const place = () => {
    setPlacing(true);
    window.setTimeout(() => {
      setPlacing(false);
      setOrders((n) => n + 1);
    }, 700);
  };
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm">
      <Confetti trigger={orders || null} options={{ count: 90, spread: 100, startVelocity: 30 }} className="self-center">
        <motion.div
          key={orders}
          initial={orders ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className={`flex size-14 items-center justify-center rounded-pui-full ${orders ? "bg-pui-success text-pui-success-foreground" : "bg-pui-muted text-pui-muted-foreground"}`}
        >
          {orders ? <CheckGlyph className="size-7" /> : <GiftIcon className="size-7" />}
        </motion.div>
      </Confetti>
      <div className="text-center">
        <p className="m-0 font-semibold">{orders ? "Order confirmed" : "Limited edition hoodie"}</p>
        <p className="m-0 text-sm text-pui-muted-foreground">
          {orders ? `Order #${1040 + orders} is on its way.` : "Ships in 2 days · $68.00"}
        </p>
      </div>
      <Button fullWidth loading={placing} loadingText="Placing order" onClick={place}>
        {orders ? "Order another" : "Place order"}
      </Button>
    </div>
  );
}

function EmojiDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <ConfettiButton variant="soft" options={{ emojis: ["🎉", "🥳", "🎈"], scalar: 1.6, count: 40, spread: 90 }}>
        🎉 Party
      </ConfettiButton>
      <ConfettiButton variant="soft" tone="danger" options={{ emojis: ["❤️", "💖", "💕"], scalar: 1.4, count: 36, gravity: 0.6 }}>
        ❤️ Love it
      </ConfettiButton>
      <ConfettiButton variant="soft" tone="warning" options={{ emojis: ["⭐", "✨"], scalar: 1.3, count: 50, spread: 140 }}>
        ⭐ Star
      </ConfettiButton>
    </div>
  );
}

function MilestoneDemo() {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 rounded-pui-xl bg-linear-to-br from-pui-gradient-1/20 via-pui-gradient-2/15 to-pui-gradient-3/20 p-6 text-center">
      <Badge tone="primary" variant="soft">
        Milestone
      </Badge>
      <p className="m-0 text-3xl font-bold tracking-tight text-pui-foreground">10,000 stars</p>
      <p className="m-0 text-sm text-pui-muted-foreground">A full fireworks show from one call.</p>
      <Confetti trigger={shown || null} effect="fireworks" options={{ durationMs: 2600 }} onComplete={() => setShown(false)}>
        <Button variant="solid" tone="neutral" disabled={shown} onClick={() => setShown(true)}>
          {shown ? "Enjoy the show" : "Launch fireworks"}
        </Button>
      </Confetti>
    </div>
  );
}

const pieces = [
  { x: "12%", y: "18%", r: 20, c: "bg-pui-chart-1", s: "h-2 w-3" },
  { x: "80%", y: "14%", r: -30, c: "bg-pui-chart-2", s: "h-3 w-1.5 rounded-pui-full" },
  { x: "24%", y: "74%", r: 45, c: "bg-pui-chart-3", s: "size-2 rounded-pui-full" },
  { x: "72%", y: "70%", r: 12, c: "bg-pui-chart-4", s: "h-2 w-3" },
  { x: "50%", y: "10%", r: -12, c: "bg-pui-chart-5", s: "h-3 w-1.5 rounded-pui-full" },
  { x: "88%", y: "46%", r: 60, c: "bg-pui-primary", s: "size-2 rounded-pui-full" },
  { x: "8%", y: "48%", r: -50, c: "bg-pui-chart-2", s: "h-2 w-3" },
];

function Mini() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className={`absolute ${p.c} ${p.s}`}
          style={{ left: p.x, top: p.y, rotate: p.r }}
          animate={{ y: [0, 8, 0], rotate: [p.r, p.r + 40, p.r] }}
          transition={{ duration: 2.4 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <span className="rounded-pui-full bg-pui-primary px-4 py-1.5 text-xs font-semibold text-pui-primary-foreground shadow-pui-md">Celebrate</span>
    </div>
  );
}

function snippet(props: DemoProps): string {
  const options = toOptions(props) as Record<string, unknown>;
  const changed = Object.entries(options).filter(([key, value]) => {
    const base = (defaults as Record<string, unknown>)[key];
    return key === "emojis" || key === "shapes" || (base !== undefined && base !== value);
  });
  const body = changed.length
    ? `{ ${changed.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(", ")} }`
    : "";
  return `import { confetti, fireworks, ConfettiButton } from "changelui";

// Imperative: from anywhere (handlers, effects, after an await).
confetti(${body});
confetti({ origin: buttonElement }); // from an element's center
await fireworks({ durationMs: 2500 });

// Declarative
<ConfettiButton${body ? ` options={${body}}` : ""}>Celebrate</ConfettiButton>
<Confetti trigger={orderId}>{children}</Confetti>`;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet,
  propsTable: propDocs<ConfettiOptions>()([
    { name: "origin", type: "{ x: number; y: number } | Element", default: "{ x: 0.5, y: 0.6 }", description: "Viewport fractions, or an element whose center launches the pieces." },
    { name: "count", type: "number", default: "120", description: "Pieces in the burst (the shared canvas caps at 1500)." },
    { name: "spread", type: "number", default: "70", description: "Cone width in degrees." },
    { name: "angle", type: "number", default: "90", description: "Launch direction in degrees; 90 is straight up." },
    { name: "startVelocity", type: "number", default: "38", description: "Launch speed in px per frame." },
    { name: "decay", type: "number", default: "0.92", description: "Velocity kept per frame (air drag)." },
    { name: "gravity", type: "number", default: "1", description: "Gravity multiplier." },
    { name: "drift", type: "number", default: "0", description: "Sideways wind." },
    { name: "colors", type: "string[]", default: "chart palette + primary", description: "CSS colors; tokens like var(--pui-chart-1) are resolved, so presets recolor it." },
    { name: "shapes", type: '("square" | "ribbon" | "circle" | "star")[]', default: '["square", "ribbon", "circle"]', description: "Piece shapes, picked at random." },
    { name: "emojis", type: "string[]", description: "Emoji or short text pieces instead of shapes." },
    { name: "scalar", type: "number", default: "1", description: "Size multiplier." },
    { name: "ticks", type: "number", default: "200", description: "Lifetime in frames; pieces fade over the last 30%." },
    { name: "flat", type: "boolean", default: "false", description: "Keep pieces face-on (no 3D flutter)." },
    { name: "disableForReducedMotion", type: "boolean", default: "true", description: "Skip under prefers-reduced-motion; the promise still resolves." },
  ]),
  a11y: [
    "The overlay canvas is aria-hidden and pointer-events: none, so it never blocks clicks or reaches assistive tech.",
    "Announce the success itself (a status message, a toast); confetti is decoration.",
    "Confetti and ConfettiButton keep the wrapped content and the Button's semantics untouched.",
  ],
  reducedMotion: "No pieces are drawn; promises resolve and onComplete callbacks still fire.",
  examples: [
    { title: "Checkout success", description: "Confetti wrapper fired by a changing trigger.", Demo: CheckoutDemo },
    { title: "Emoji bursts", Demo: EmojiDemo },
    { title: "Fireworks", description: "effect=\"fireworks\" with onComplete.", Demo: MilestoneDemo, wide: true },
  ],
};

export default item;
