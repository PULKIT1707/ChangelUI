import { YouDrawIt, type YouDrawItProps, type YouDrawItResult } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { guessScenario, useSeed, type GuessScenario } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  scenario: "adoption" | "jump" | "plateau";
  revealFrom: number;
  height: number;
  prompt: string;
  revealLabel: string;
};
const defaults: DemoProps = { scenario: "adoption", revealFrom: 9, height: 320, prompt: "Draw the rest", revealLabel: "Show me" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "scenario", label: "Scenario", options: ["adoption", "jump", "plateau"] },
  { type: "number", prop: "revealFrom", label: "Hidden from (index)", min: 3, max: 14, step: 1 },
  { type: "number", prop: "height", label: "Height (px)", min: 220, max: 420, step: 20 },
  { type: "text", prop: "prompt", label: "Prompt", maxLength: 40 },
  { type: "text", prop: "revealLabel", label: "Reveal label", maxLength: 24 },
];

function formatFor(s: GuessScenario): Intl.NumberFormatOptions {
  if (s.unit === "usd") return { style: "currency", currency: "USD", maximumFractionDigits: 2 };
  if (s.unit === "percent") return { style: "unit", unit: "percent", maximumFractionDigits: 1 };
  return { maximumFractionDigits: 1 };
}

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(1);
  const s = useMemo(() => guessScenario(props.scenario, seed), [props.scenario, seed]);
  const [last, setLast] = useState<YouDrawItResult | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Drag across the shaded area to draw your guess, then press Show me. Randomize starts a new round.">
      <YouDrawIt
        title={s.title}
        description={s.description}
        data={s.data}
        x="year"
        y="value"
        revealFrom={props.revealFrom}
        format={formatFor(s)}
        height={props.height}
        prompt={props.prompt}
        revealLabel={props.revealLabel}
        onReveal={setLast}
        className="w-full"
      />
      {last ? <p className="text-xs text-pui-muted-foreground">onReveal: score {last.score}, mean error {last.meanError.toFixed(2)}</p> : null}
    </ChartDemo>
  );
}

function Mini() {
  const s = useMemo(() => guessScenario("adoption", 2), []);
  return (
    <div className="pointer-events-none w-56">
      <YouDrawIt data={s.data} x="year" y="value" revealFrom={9} height={130} initialWidth={224} animation="never" prompt="Guess" />
    </div>
  );
}

function Jump() {
  const [seed, randomize] = useSeed(4);
  const s = useMemo(() => guessScenario("jump", seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="A trend break: most people draw a straight line.">
      <YouDrawIt data={s.data} x="year" y="value" revealFrom={s.revealFrom} format={formatFor(s)} height={260} color="var(--pui-chart-6)" guessColor="var(--pui-chart-4)" />
    </ChartDemo>
  );
}

function Coffee() {
  const [seed, randomize] = useSeed(7);
  const s = useMemo(() => guessScenario("plateau", seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Custom score copy with scoreLabel.">
      <YouDrawIt
        data={s.data}
        x="year"
        y="value"
        revealFrom={s.revealFrom}
        min={0}
        max={6}
        format={formatFor(s)}
        height={260}
        prompt="How much will a coffee cost?"
        revealLabel="Reveal the price"
        resetLabel="Guess again"
        scoreLabel={(r) => (r.bias > 0 ? "You expected more inflation than there was." : "Prices rose faster than you thought.")}
      />
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ scenario: _scenario, height, prompt, revealLabel, revealFrom }) =>
    [
      `<YouDrawIt`,
      `  title="Share of new cars that are electric"`,
      `  data={rows}`,
      `  x="year"`,
      `  y="value"`,
      `  revealFrom={${revealFrom}}`,
      `  format={{ style: "unit", unit: "percent" }}`,
      ...(height !== 320 ? [`  height={${height}}`] : []),
      ...(prompt !== "Draw the rest" ? [`  prompt=${JSON.stringify(prompt)}`] : []),
      ...(revealLabel !== "Show me" ? [`  revealLabel=${JSON.stringify(revealLabel)}`] : []),
      `  onReveal={({ score }) => track("guess", { score })}`,
      `/>`,
    ].join("\n"),
  propsTable: propDocs<YouDrawItProps<unknown>>()([
    { name: "data", type: "readonly T[]", required: true, description: "Rows in x order." },
    { name: "x", type: "keyof T | (row, i) => string | number", required: true, description: "Point label (year, month)." },
    { name: "y", type: "keyof T | (row, i) => number", required: true, description: "Point value." },
    { name: "revealFrom", type: "number", required: true, description: "Index of the first hidden point." },
    { name: "min", type: "number", description: "Axis minimum. Default 0 (or the known minimum)." },
    { name: "max", type: "number", description: "Axis maximum. Default: headroom above the data, so the axis does not give the answer away." },
    { name: "step", type: "number", description: "Keyboard step for the sliders. Default about 1/50 of the axis." },
    { name: "onReveal", type: "(result) => void", description: "Score 0-100, mean error, bias, guesses and actual values." },
    { name: "onGuessChange", type: "(guesses) => void", description: "Every change to the drawn guess (null = not drawn)." },
    { name: "scoreLabel", type: "(result) => string", description: "Sentence next to the score. Default: a verdict." },
    { name: "prompt", type: "string", default: '"Draw the rest"', description: "The ask shown in the hidden zone." },
    { name: "revealLabel", type: "string", default: '"Show me"', description: "Reveal button label." },
    { name: "resetLabel", type: "string", default: '"Try again"', description: "Clear button label." },
    { name: "color", type: "string", default: "var(--pui-chart-1)", description: "Actual line color." },
    { name: "guessColor", type: "string", default: "var(--pui-chart-3)", description: "Guess line color." },
    { name: "height", type: "number", default: "320", description: "Plot height in px." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the first hidden point (one tab stop), then the buttons" },
    { keys: "↑ / ↓", action: "Raise / lower the guess by one step (Shift: 10 steps)" },
    { keys: "← / →", action: "Previous / next hidden point (moving right carries the value along)" },
    { keys: "Home / End", action: "Axis minimum / maximum" },
    { keys: "Enter", action: "Reveal once every point is drawn" },
  ],
  a11y: [
    'Each hidden point is a role="slider" with a value text ("Your guess for 2021: 18.4%").',
    "The description tells readers what is known and what to guess; the score and the bias are announced on reveal.",
    "After the reveal a screen-reader table lists actual values next to the guesses.",
  ],
  reducedMotion: "The answer appears instantly: no draw-in, gap fade or rolling score.",
  examples: [
    { title: "A trend break", description: "Custom colors; the gap fills by sign (too high or too low).", Demo: Jump },
    { title: "Fixed axis and custom copy", description: "min / max fix the axis; scoreLabel writes the verdict.", Demo: Coffee },
  ],
};
export default item;
