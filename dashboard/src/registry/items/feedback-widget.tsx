import { Button, FeedbackWidget, type FeedbackOption, type FeedbackResult, type FeedbackWidgetProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  layout: NonNullable<FeedbackWidgetProps["layout"]>;
  question: string;
  comment: boolean;
  scale: "4 faces" | "3 faces" | "5 faces";
  thanks: string;
};

const defaults: DemoProps = { layout: "inline", question: "Was this page helpful?", comment: true, scale: "4 faces", thanks: "Thanks for the feedback" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "layout", label: "Layout", options: ["inline", "card"] },
  { type: "text", prop: "question", label: "Question", maxLength: 48 },
  { type: "boolean", prop: "comment", label: "Ask for a comment" },
  { type: "select", prop: "scale", label: "Scale", options: ["3 faces", "4 faces", "5 faces"] },
  { type: "text", prop: "thanks", label: "Thanks", maxLength: 40 },
];

const SCALES: Record<DemoProps["scale"], FeedbackOption[] | undefined> = {
  "4 faces": undefined,
  "3 faces": [
    { value: "bad", label: "No" },
    { value: "ok", label: "Somewhat" },
    { value: "good", label: "Yes" },
  ],
  "5 faces": [
    { value: 1, label: "Very poor" },
    { value: 2, label: "Poor" },
    { value: 3, label: "Okay" },
    { value: 4, label: "Good" },
    { value: 5, label: "Excellent" },
  ],
};

function Preview({ props }: { props: DemoProps }) {
  const { scale, ...rest } = props;
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [round, setRound] = useState(0);
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <div className="w-full rounded-pui-xl border border-pui-border bg-pui-background p-5 text-sm text-pui-foreground">
        <p className="m-0 text-xs font-medium tracking-wide text-pui-muted-foreground uppercase">Guides · Billing</p>
        <h3 className="m-0 mt-1 text-lg font-semibold">Change your billing cycle</h3>
        <p className="m-0 mt-2 leading-relaxed text-pui-muted-foreground">
          Switch between monthly and yearly billing from Settings → Plan. The change applies at your next renewal and any unused time is credited.
        </p>
        <div className={rest.layout === "card" ? "mt-5 flex justify-center" : "mt-5"}>
          <FeedbackWidget key={`${round}-${scale}-${rest.layout}-${String(rest.comment)}`} {...rest} options={SCALES[scale]} onSubmit={setResult} />
        </div>
      </div>
      <div className="flex h-8 items-center gap-3 text-xs text-pui-muted-foreground">
        <span aria-live="polite">{result ? `Received: ${result.option.label}${result.comment ? `, “${result.comment}”` : ""}` : "Pick a face. The rating fires right away; the comment is optional."}</span>
        {result ? (
          <Button
            size="sm"
            variant="outline"
            tone="neutral"
            onClick={() => {
              setResult(null);
              setRound((r) => r + 1);
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SupportDemo() {
  return (
    <div className="flex justify-center">
      <FeedbackWidget
        layout="card"
        question="How was your chat with Sam?"
        commentPrompt={(_o, i) => (i < 2 ? "What could Sam have done better?" : "Anything Sam should keep doing?")}
        thanks="Thanks, this goes straight to the team"
        thanksDescription="Your ticket #4821 stays open until you close it."
        onSubmit={() => new Promise((r) => setTimeout(r, 700))}
      />
    </div>
  );
}

function ReleaseNotesDemo() {
  return (
    <div className="space-y-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground">
      <p className="m-0 font-semibold">Release 3.2: faster search</p>
      <p className="m-0 text-pui-muted-foreground">Search results now load as you type, and filters remember your last choice.</p>
      <FeedbackWidget
        question="Is search faster for you?"
        comment={false}
        options={[
          { value: "no", label: "Not really" },
          { value: "yes", label: "Yes, much" },
        ]}
        thanks="Noted, thank you"
        className="bg-pui-background"
      />
    </div>
  );
}

function CustomIconsDemo() {
  const glyph = (d: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-full">
      <path d={d} />
    </svg>
  );
  return (
    <FeedbackWidget
      question="Did this answer your question?"
      options={[
        { value: "down", label: "No", icon: glyph("M7 14V3M15 18.1L14 14h5.8a2 2 0 0 0 2-2.3l-1.4-7A2 2 0 0 0 18.4 3H7v11l4 8a3 3 0 0 0 4-3.9z") },
        { value: "up", label: "Yes", icon: glyph("M7 10v11M15 5.9L14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9z") },
      ]}
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <FeedbackWidget layout="card" question="Was this helpful?" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ layout, question, comment, thanks }) =>
    toJsx<Record<string, unknown>>(
      "FeedbackWidget",
      { layout, question, comment, thanks },
      { layout: "inline", question: "Was this page helpful?", comment: true, thanks: "Thanks for the feedback" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace("<FeedbackWidget", "<FeedbackWidget onSubmit={({ value, comment }) => send(value, comment)}"),
  propsTable: propDocs<FeedbackWidgetProps>()([
    { name: "question", type: "ReactNode", default: '"Was this page helpful?"', description: "Labels the scale." },
    { name: "options", type: "FeedbackOption[]", default: "4 faces", description: "{ value, label, icon? }, worst to best. Default faces smile more along the scale." },
    { name: "layout", type: '"inline" | "card"', default: '"inline"', description: "One row for page footers, or a stacked card." },
    { name: "comment", type: "boolean", default: "true", description: "Ask for an optional comment after rating." },
    { name: "commentPrompt", type: "string | (option, index) => string", description: "Prompt for the comment; defaults depend on the rating." },
    { name: "thanks", type: "ReactNode", default: '"Thanks for the feedback"', description: "Final message." },
    { name: "thanksDescription", type: "ReactNode", description: "Second line under the thanks." },
    { name: "onRate", type: "(option) => void", description: "Fires immediately on a rating, so skipped comments never lose it." },
    { name: "onSubmit", type: "({ option, value, comment }) => unknown", description: "Fires on Send or Skip; a promise keeps Send busy." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Move between faces" },
    { keys: "Home / End", action: "First / last face" },
    { keys: "Enter / Space", action: "Rate" },
    { keys: "⌘/Ctrl + Enter", action: "Send the comment (card layout)" },
  ],
  a11y: [
    "Faces are buttons in a group labelled by the question, each with its own name.",
    "Focus moves to the comment field after rating, then to the thank-you, so it is never lost.",
    "The steps share one grid cell: the widget keeps its size and the page under it never shifts.",
  ],
  reducedMotion: "Steps swap instantly; faces do not spring and the check appears fully drawn.",
  examples: [
    { title: "Support chat rating", description: "Card layout, custom prompts and an async submit.", Demo: SupportDemo },
    { title: "Two-option poll", description: "comment={false} for a quick yes or no.", Demo: ReleaseNotesDemo },
    { title: "Custom icons", description: "Thumbs instead of faces.", Demo: CustomIconsDemo, wide: true },
  ],
};

export default item;
