import { Badge, Button, FlipCard, FlipCardBack, FlipCardButton, FlipCardFront, type FlipCardProps } from "changelui";
import { useEffect, useState } from "react";
import { ArrowRightIcon, CheckGlyph, FlipIcon, MailIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  trigger: NonNullable<FlipCardProps["trigger"]>;
  axis: NonNullable<FlipCardProps["axis"]>;
  reverse: boolean;
  perspective: number;
  disabled: boolean;
};

const defaults: DemoProps = { trigger: "click", axis: "y", reverse: false, perspective: 1000, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "trigger", label: "Trigger", options: ["click", "hover", "manual"] },
  { type: "select", prop: "axis", label: "Axis", options: ["y", "x"] },
  { type: "boolean", prop: "reverse", label: "Reverse" },
  { type: "number", prop: "perspective", label: "Perspective (px)", min: 300, max: 2400, step: 100 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const face = "flex flex-col rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md";

function Preview({ props }: { props: DemoProps }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <FlipCard {...props} flipped={flipped} onFlippedChange={setFlipped} className="w-72">
        <FlipCardFront className={`${face} items-center gap-3 text-center`}>
          <div className="flex size-20 items-center justify-center rounded-pui-full bg-linear-to-br from-pui-gradient-1 via-pui-gradient-2 to-pui-gradient-3 text-2xl font-bold text-pui-primary-foreground shadow-pui-glow">
            MR
          </div>
          <div>
            <p className="m-0 text-lg font-semibold">Maya Rivera</p>
            <p className="m-0 text-sm text-pui-muted-foreground">Design Engineer · Lisbon</p>
          </div>
          <div className="flex gap-1.5">
            <Badge size="sm" variant="soft">
              Motion
            </Badge>
            <Badge size="sm" variant="soft" tone="info">
              Systems
            </Badge>
          </div>
          <FlipCardButton className="mt-1">
            <FlipIcon className="size-3.5" /> Read bio
          </FlipCardButton>
        </FlipCardFront>
        <FlipCardBack className={`${face} gap-3`}>
          <p className="m-0 text-sm font-semibold">About Maya</p>
          <p className="m-0 text-sm leading-relaxed text-pui-muted-foreground">
            Builds the bridge between design files and production code. Previously shipped the motion system for a banking app used by 3M people.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {["Prototyping in code", "Design tokens", "Accessibility audits"].map((skill) => (
              <li key={skill} className="flex items-center gap-2">
                <CheckGlyph className="size-3.5 text-pui-success-text" />
                {skill}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="soft" leadingIcon={<MailIcon />}>
              Say hi
            </Button>
            <FlipCardButton>
              <FlipIcon className="size-3.5" /> Back
            </FlipCardButton>
          </div>
        </FlipCardBack>
      </FlipCard>
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        Showing the {flipped ? "back" : "front"}. {props.trigger === "click" ? "Click the card or a button." : props.trigger === "hover" ? "Hover the card." : "Only the buttons flip it."}
      </p>
    </div>
  );
}

const plans = [
  { name: "Starter", price: "$9", tone: "from-pui-chart-2/25 to-pui-chart-3/10", features: ["3 projects", "10 GB storage", "Email support"] },
  { name: "Studio", price: "$29", tone: "from-pui-gradient-1/30 to-pui-gradient-3/15", features: ["Unlimited projects", "200 GB storage", "Live chat", "Brand kits"] },
];

function PricingDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => (
        <FlipCard key={plan.name} trigger="hover" className="w-full">
          <FlipCardFront className={`${face} min-h-48 justify-between bg-linear-to-br ${plan.tone}`}>
            <p className="m-0 text-sm font-semibold uppercase tracking-widest text-pui-muted-foreground">{plan.name}</p>
            <p className="m-0 text-5xl font-bold tracking-tight">
              {plan.price}
              <span className="text-base font-normal text-pui-muted-foreground">/mo</span>
            </p>
            <FlipCardButton className="self-start px-0">
              What&apos;s included <ArrowRightIcon className="size-3.5" />
            </FlipCardButton>
          </FlipCardFront>
          <FlipCardBack className={`${face} min-h-48 gap-2`}>
            <p className="m-0 text-sm font-semibold">{plan.name} includes</p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-pui-muted-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckGlyph className="size-3.5 text-pui-success-text" />
                  {f}
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-auto">
              Choose {plan.name}
            </Button>
          </FlipCardBack>
        </FlipCard>
      ))}
    </div>
  );
}

const cards = [
  { term: "Saudade", meaning: "A deep longing for something absent", lang: "Portuguese" },
  { term: "Hygge", meaning: "Cosy contentment with good company", lang: "Danish" },
  { term: "Komorebi", meaning: "Sunlight filtering through leaves", lang: "Japanese" },
];

function FlashcardsDemo() {
  const [flipped, setFlipped] = useState<boolean[]>(cards.map(() => false));
  const all = flipped.every(Boolean);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card, i) => (
          <FlipCard
            key={card.term}
            axis="x"
            flipped={flipped[i]}
            onFlippedChange={(next) => setFlipped((list) => list.map((v, j) => (j === i ? next : v)))}
          >
            <FlipCardFront className={`${face} min-h-32 items-center justify-center gap-1 text-center`}>
              <p className="m-0 text-xl font-semibold">{card.term}</p>
              <p className="m-0 text-xs text-pui-muted-foreground">{card.lang}</p>
              <FlipCardButton className="mt-1">Reveal</FlipCardButton>
            </FlipCardFront>
            <FlipCardBack className={`${face} min-h-32 items-center justify-center gap-1 bg-pui-primary text-center text-pui-primary-foreground`}>
              <p className="m-0 text-sm font-medium">{card.meaning}</p>
              <FlipCardButton className="mt-1 text-pui-primary-foreground/80 hover:bg-pui-primary-foreground/10 hover:text-pui-primary-foreground">Hide</FlipCardButton>
            </FlipCardBack>
          </FlipCard>
        ))}
      </div>
      <Button variant="outline" tone="neutral" size="sm" className="self-center" onClick={() => setFlipped(cards.map(() => !all))}>
        {all ? "Hide all" : "Reveal all"}
      </Button>
    </div>
  );
}

function Mini() {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setFlipped((v) => !v), 1800);
    return () => window.clearInterval(id);
  }, []);
  return (
    <FlipCard flipped={flipped} trigger="manual" className="w-32">
      <FlipCardFront className="flex h-24 items-center justify-center rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 text-lg font-bold text-pui-primary-foreground">
        Front
      </FlipCardFront>
      <FlipCardBack className="flex h-24 items-center justify-center rounded-pui-lg border border-pui-border bg-pui-surface text-lg font-bold text-pui-surface-foreground">
        Back
      </FlipCardBack>
    </FlipCard>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx(
      "FlipCard",
      props,
      defaults,
      "<FlipCardFront>\n    …\n    <FlipCardButton>Details</FlipCardButton>\n  </FlipCardFront>\n  <FlipCardBack>\n    …\n    <FlipCardButton>Back</FlipCardButton>\n  </FlipCardBack>",
      controls,
    ),
  propsTable: propDocs<FlipCardProps>()([
    { name: "flipped", type: "boolean", description: "Controlled: true shows the back face." },
    { name: "defaultFlipped", type: "boolean", default: "false", description: "Initial face when uncontrolled." },
    { name: "onFlippedChange", type: "(flipped: boolean) => void", description: "Called when a click, hover or FlipCardButton flips the card." },
    { name: "trigger", type: '"click" | "hover" | "manual"', default: '"click"', description: "Click anywhere outside nested controls, mouse hover, or only FlipCardButton / flipped." },
    { name: "axis", type: '"x" | "y"', default: '"y"', description: "Rotation axis." },
    { name: "reverse", type: "boolean", default: "false", description: "Rotate the other way." },
    { name: "perspective", type: "number", default: "1000", description: "3D perspective in px." },
    { name: "disabled", type: "boolean", default: "false", description: "Stay on the current face." },
  ]),
  a11y: [
    "FlipCardButton is a real button with aria-pressed; put one on each face so keyboard and screen-reader users can flip.",
    "The turned-away face is aria-hidden and inert (set through the DOM), so its links and buttons leave the tab order.",
    "If focus was on the face that turns away, it moves to the visible face's FlipCardButton.",
  ],
  reducedMotion: "The faces crossfade in place instead of rotating.",
  examples: [
    { title: "Pricing detail", description: "trigger=\"hover\" with a button for keyboards.", Demo: PricingDemo, wide: true },
    { title: "Flashcards", description: "Controlled, axis=\"x\", with Reveal all.", Demo: FlashcardsDemo, wide: true },
  ],
};

export default item;
