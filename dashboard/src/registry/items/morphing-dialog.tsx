import {
  Button,
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  type MorphingDialogContentProps,
  type MorphingDialogProps,
  type MorphingDialogTriggerProps,
} from "changelui";
import { useMemo } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  stiffness: number;
  damping: number;
  radius: number;
  dismissible: boolean;
};

const defaults: DemoProps = { stiffness: 380, damping: 34, radius: 16, dismissible: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "stiffness", label: "Stiffness", min: 80, max: 800, step: 10 },
  { type: "number", prop: "damping", label: "Damping", min: 8, max: 60, step: 1 },
  { type: "number", prop: "radius", label: "Card radius", min: 0, max: 32, step: 2 },
  { type: "boolean", prop: "dismissible", label: "Dismissible" },
];

/** Small generative artworks as SVG data URIs, so the demo needs no image files. */
function artwork(a: string, b: string, c: string, seed: number) {
  const blobs = [0, 1, 2]
    .map((i) => {
      const x = (seed * 37 + i * 113) % 400;
      const y = (seed * 53 + i * 71) % 300;
      const r = 110 + ((seed + i * 29) % 70);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${[a, b, c][i]}" opacity="0.85"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><filter id="b"><feGaussianBlur stdDeviation="42"/></filter></defs><rect width="400" height="300" fill="${c}"/><g filter="url(#b)">${blobs}</g><circle cx="300" cy="90" r="34" fill="#ffffff" opacity="0.22"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CARDS = [
  {
    title: "Aurora Lamp",
    subtitle: "Lighting · $149",
    colors: ["#7c5cff", "#ff6fb5", "#1e1b4b"],
    body: "A hand-blown glass shade over a dimmable LED ring. The light drifts slowly between violet and rose, so the room never feels static. Ships with a woven cable and a touch dimmer.",
    tags: ["Glass", "Dimmable", "USB-C"],
  },
  {
    title: "Tide Speaker",
    subtitle: "Audio · $229",
    colors: ["#14b8a6", "#38bdf8", "#082f49"],
    body: "Room-filling sound from a palm-sized cylinder. Two passive radiators push surprisingly deep bass, and the aluminum shell is splash-proof for the kitchen or the deck.",
    tags: ["Bluetooth 5.3", "20h battery", "IP67"],
  },
  {
    title: "Ember Mug",
    subtitle: "Kitchen · $89",
    colors: ["#fb923c", "#f43f5e", "#431407"],
    body: "Keeps coffee at exactly the temperature you like for ninety minutes. The ceramic glaze is fired twice, and the charging coaster doubles as a warm stand for slow mornings.",
    tags: ["Ceramic", "Smart heat", "Dishwasher safe"],
  },
] as const;

function Card({ card, index, props }: { card: (typeof CARDS)[number]; index: number; props: DemoProps }) {
  const src = useMemo(() => artwork(card.colors[0], card.colors[1], card.colors[2], index * 7 + 3), [card, index]);
  const transition = useMemo(
    () => ({ type: "spring" as const, stiffness: props.stiffness, damping: props.damping }),
    [props.stiffness, props.damping],
  );
  return (
    <MorphingDialog transition={transition} dismissible={props.dismissible}>
      <MorphingDialogTrigger radius={props.radius} className="w-full">
        <MorphingDialogImage src={src} alt={card.title} className="aspect-[4/3]" />
        <span className="flex flex-col gap-0.5 p-3">
          <MorphingDialogTitle className="text-sm">{card.title}</MorphingDialogTitle>
          <MorphingDialogSubtitle className="text-xs">{card.subtitle}</MorphingDialogSubtitle>
        </span>
      </MorphingDialogTrigger>
      <MorphingDialogContent>
        <MorphingDialogImage src={src} alt={card.title} className="aspect-[4/3]" />
        <div className="flex flex-col gap-1 p-5 pb-0">
          <MorphingDialogTitle className="text-sm">{card.title}</MorphingDialogTitle>
          <MorphingDialogSubtitle className="text-xs">{card.subtitle}</MorphingDialogSubtitle>
        </div>
        <MorphingDialogDescription className="flex flex-col gap-4 overflow-y-auto p-5">
          <p className="m-0">{card.body}</p>
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-pui-border px-2.5 py-1 text-xs text-pui-foreground">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm">Add to cart</Button>
            <Button size="sm" variant="outline" tone="neutral">
              Save
            </Button>
          </div>
        </MorphingDialogDescription>
        <MorphingDialogClose />
      </MorphingDialogContent>
    </MorphingDialog>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {CARDS.map((card, i) => (
          <Card key={card.title} card={card} index={i} props={props} />
        ))}
      </div>
      <span className="text-xs text-pui-muted-foreground">Open a card: the image, title and price fly into the dialog</span>
    </div>
  );
}

function Mini() {
  const src = useMemo(() => artwork("#7c5cff", "#ff6fb5", "#1e1b4b", 3), []);
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-32 w-56">
      <div className="absolute left-0 top-4 w-24 overflow-hidden rounded-xl border border-pui-border bg-pui-surface shadow-pui-sm">
        <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="h-6 p-1.5">
          <div className="h-1.5 w-12 rounded-full bg-pui-muted-foreground/40" />
        </div>
      </div>
      <div className="absolute right-0 top-0 w-36 overflow-hidden rounded-2xl border border-pui-border bg-pui-surface shadow-pui-xl">
        <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="flex flex-col gap-1 p-2">
          <div className="h-2 w-16 rounded-full bg-pui-foreground/70" />
          <div className="h-1.5 w-24 rounded-full bg-pui-muted-foreground/40" />
        </div>
      </div>
      <svg viewBox="0 0 60 20" className="absolute left-20 top-14 w-12 text-pui-primary" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M2 14c18-12 34-12 52-4M48 4l6 6-8 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ stiffness, damping, radius, dismissible }) => {
    const rootProps = [
      stiffness !== 380 || damping !== 34 ? `transition={{ type: "spring", stiffness: ${stiffness}, damping: ${damping} }}` : "",
      dismissible ? "" : "dismissible={false}",
    ]
      .filter(Boolean)
      .join(" ");
    return [
      `<MorphingDialog${rootProps ? ` ${rootProps}` : ""}>`,
      `  <MorphingDialogTrigger${radius !== 16 ? ` radius={${radius}}` : ""}>`,
      '    <MorphingDialogImage src={lamp} alt="Aurora Lamp" className="aspect-[4/3]" />',
      "    <MorphingDialogTitle>Aurora Lamp</MorphingDialogTitle>",
      "    <MorphingDialogSubtitle>Lighting · $149</MorphingDialogSubtitle>",
      "  </MorphingDialogTrigger>",
      "  <MorphingDialogContent>",
      '    <MorphingDialogImage src={lamp} alt="Aurora Lamp" className="aspect-[4/3]" />',
      "    <MorphingDialogTitle>Aurora Lamp</MorphingDialogTitle>",
      "    <MorphingDialogSubtitle>Lighting · $149</MorphingDialogSubtitle>",
      "    <MorphingDialogDescription>…</MorphingDialogDescription>",
      "    <MorphingDialogClose />",
      "  </MorphingDialogContent>",
      "</MorphingDialog>",
    ].join("\n");
  },
  propsTable: propDocs<MorphingDialogProps & MorphingDialogTriggerProps & MorphingDialogContentProps>()([
    { name: "open", type: "boolean", description: "Root: controlled open state." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Root: uncontrolled initial state." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Root: called on open and close." },
    { name: "transition", type: "Transition", default: "springs.layout", description: "Root: the morph spring (380 / 34)." },
    { name: "dismissible", type: "boolean", default: "true", description: "Root: Escape and overlay clicks close it." },
    { name: "radius", type: "number", default: "16 / 24", description: "Trigger / Content: corner radius in px, kept undistorted." },
    { name: "container", type: "HTMLElement | null", description: "Content: portal target." },
    { name: "overlayClassName", type: "string", description: "Content: classes for the overlay." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Open from the focused card" },
    { keys: "Tab / Shift+Tab", action: "Cycle focus inside the dialog" },
    { keys: "Escape", action: "Close (when dismissible) and return focus to the card" },
  ],
  a11y: [
    "The card is a button with aria-haspopup=dialog; the dialog is aria-modal, labelled by its title and described by its description.",
    "Focus is trapped while open and returns to the card on close; page scroll is locked.",
    "Images in the card get an empty alt (the title names the button); the dialog image keeps its alt.",
  ],
  reducedMotion: "Crossfades in 150ms; nothing flies or resizes.",
};

export default item;
