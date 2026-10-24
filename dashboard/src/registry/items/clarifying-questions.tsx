import { ClarifyingQuestions, describeClarifyingAnswer, type ClarifyingAnswers, type ClarifyingQuestion, type ClarifyingQuestionsProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  autoAdvance: boolean;
  allowOther: boolean;
  required: boolean;
};
const defaults: DemoProps = { autoAdvance: true, allowOther: true, required: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "autoAdvance", label: "Advance after a pick" },
  { type: "boolean", prop: "allowOther", label: "Offer Other" },
  { type: "boolean", prop: "required", label: "Hide Skip" },
];
function reportQuestions(allowOther: boolean, required: boolean): ClarifyingQuestion[] {
  return [
    {
      id: "range",
      prompt: "Which period should the revenue report cover?",
      promptText: "Period",
      allowOther,
      optional: !required,
      otherPlaceholder: "e.g. Black Friday week",
      options: [
        { value: "last-month", label: "Last month", description: "September, closed books" },
        { value: "qtd", label: "Quarter to date", description: "Jul 1 – today, still changing" },
        { value: "ytd", label: "Year to date" },
      ],
    },
    {
      id: "breakdown",
      prompt: "Break it down by…",
      promptText: "Breakdown",
      multiple: true,
      optional: !required,
      options: [
        { value: "region", label: "Region" },
        { value: "plan", label: "Plan tier" },
        { value: "channel", label: "Acquisition channel" },
      ],
    },
    {
      id: "format",
      prompt: "How do you want it delivered?",
      promptText: "Delivery",
      allowOther,
      optional: !required,
      options: [
        { value: "chart", label: "Chart in chat" },
        { value: "sheet", label: "Spreadsheet" },
        { value: "slides", label: "3-slide summary" },
      ],
    },
  ];
}
function Preview({ props }: { props: DemoProps }) {
  const [sent, setSent] = useState<string | null>(null);
  const questions = reportQuestions(props.allowOther, props.required);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="ms-auto max-w-[85%] rounded-pui-lg rounded-ee-pui-sm bg-pui-primary px-3 py-2 text-sm text-pui-primary-foreground">Make me a revenue report for the board.</div>
      <ClarifyingQuestions
        key={`${props.allowOther}-${props.required}`}
        questions={questions}
        autoAdvance={props.autoAdvance}
        description="Three details so the first draft is the right one."
        onSubmit={(answers) =>
          setSent(
            questions
              .map((q) => `${q.promptText}: ${describeClarifyingAnswer(q, answers[q.id]) ?? "skipped"}`)
              .join(" · "),
          )
        }
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {sent ? `Sent → ${sent}` : ""}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <ClarifyingQuestions questions={reportQuestions(false, false).slice(0, 2)} />
    </div>
  );
}
const deployQuestions: ClarifyingQuestion[] = [
  {
    id: "env",
    prompt: "Deploy to which environment?",
    promptText: "Environment",
    optional: false,
    options: [
      { value: "staging", label: "Staging", description: "Auto-rollback on errors" },
      { value: "production", label: "Production", description: "Needs a second approver" },
    ],
  },
  {
    id: "migrate",
    prompt: "Run the 2 pending database migrations?",
    promptText: "Migrations",
    optional: false,
    options: [
      { value: "yes", label: "Yes, run them first" },
      { value: "no", label: "No, deploy code only" },
    ],
  },
];
/** Required questions with no Skip, then a read-only summary once sent. */
function AgentDemo() {
  const [answers, setAnswers] = useState<ClarifyingAnswers | null>(null);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      {answers ? (
        <ClarifyingQuestions questions={deployQuestions} defaultAnswers={answers} submitted />
      ) : (
        <ClarifyingQuestions title="Before I deploy" questions={deployQuestions} submitLabel="Start deploy" onSubmit={setAnswers} />
      )}
      {answers ? (
        <button
          type="button"
          onClick={() => setAnswers(null)}
          className="inline-flex h-8 w-fit cursor-pointer items-center rounded-pui-md border border-pui-border bg-pui-surface px-3 text-xs font-medium text-pui-foreground hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          Ask again
        </button>
      ) : null}
    </div>
  );
}
/** A single question works as a quick inline choice. */
function SingleDemo() {
  const [picked, setPicked] = useState("");
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <ClarifyingQuestions
        title="Which tone fits this email?"
        questions={[
          {
            id: "tone",
            prompt: "Pick a tone for the reply to the customer.",
            promptText: "Tone",
            allowOther: true,
            options: [
              { value: "warm", label: "Warm and apologetic" },
              { value: "brief", label: "Brief and factual" },
              { value: "formal", label: "Formal" },
            ],
          },
        ]}
        onSubmit={(a) => setPicked(a.tone?.values.join(", ") ?? "")}
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {picked ? `Drafting with: ${picked}` : ""}
      </p>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ClarifyingQuestions\n  questions={[\n    { id: "range", prompt: "Which period?", options: [...]${props.allowOther ? ", allowOther: true" : ""}${props.required ? ", optional: false" : ""} },\n    { id: "breakdown", prompt: "Break it down by…", multiple: true, options: [...] },\n  ]}${props.autoAdvance ? "" : "\n  autoAdvance={false}"}\n  onSubmit={(answers) => continueWith(answers)}\n/>`,
  propsTable: propDocs<ClarifyingQuestionsProps>()([
    { name: "questions", type: "ClarifyingQuestion[]", required: true, description: "{ id, prompt, promptText?, options, multiple?, allowOther?, optional? }." },
    { name: "onSubmit", type: "(answers) => void", description: "Answers keyed by question id: { values, other?, skipped? }." },
    { name: "defaultAnswers", type: "ClarifyingAnswers", description: "Start from earlier answers." },
    { name: "title", type: "ReactNode", default: '"A few quick questions"', description: "Card heading." },
    { name: "description", type: "ReactNode", description: "Why the assistant is asking." },
    { name: "autoAdvance", type: "boolean", default: "true", description: "Single-choice questions move on after a pick." },
    { name: "submitLabel", type: "string", default: '"Send answers"', description: "Label of the final button." },
    { name: "submitted", type: "boolean", default: "false", description: "Read-only summary, e.g. once sent." },
  ]),
  keyboard: [
    { keys: "1–9", action: "Pick the matching option" },
    { keys: "Arrow keys", action: "Move between options" },
    { keys: "Enter (in Other)", action: "Go to the next question" },
  ],
  a11y: [
    "Single-choice options are a radiogroup with one tab stop; multi-choice options are checkboxes.",
    "Moving between questions focuses the new prompt so screen readers announce it; step dots are labelled buttons with aria-current.",
  ],
  reducedMotion: "Questions cross-fade instead of sliding and the auto-advance happens at once.",
  examples: [
    { title: "Required before acting", description: "No Skip, then a read-only summary once the answers are sent.", Demo: AgentDemo },
    { title: "Single question", description: "One question with Other works as an inline choice.", Demo: SingleDemo },
  ],
};
export default item;
