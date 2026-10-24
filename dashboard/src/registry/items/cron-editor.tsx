import { CronEditor, describeCron, Input, type CronEditorProps } from "changelui";
import { useId, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  presets: boolean;
  nextRuns: number;
  showExpression: boolean;
};
const defaults: DemoProps = { presets: true, nextRuns: 5, showExpression: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "presets", label: "Quick picks" },
  { type: "number", prop: "nextRuns", label: "Next runs", min: 0, max: 8, step: 1 },
  { type: "boolean", prop: "showExpression", label: "Expression field" },
];
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState("0 9 * * 1-5");
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <CronEditor
        value={value}
        onValueChange={setValue}
        presets={props.presets ? undefined : []}
        nextRuns={props.nextRuns}
        showExpression={props.showExpression}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">
        Saved value: <code className="font-pui-mono text-pui-foreground">{value}</code>
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-60 flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-xs shadow-pui-xs">
      <code className="rounded-pui-md border border-pui-border px-2 py-1.5 font-pui-mono text-pui-foreground">0 9 * * 1-5</code>
      <span className="font-medium text-pui-foreground">{describeCron("0 9 * * 1-5")}</span>
      <span className="text-pui-muted-foreground">Mon, Oct 26, 09:00</span>
      <span className="text-pui-muted-foreground">Tue, Oct 27, 09:00</span>
    </div>
  );
}
/** A real form: name the job, pick the schedule, see the next few runs. */
function BackupFormDemo() {
  const id = useId();
  const [value, setValue] = useState("30 2 * * *");
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          Job name
        </label>
        <Input id={id} defaultValue="Nightly database backup" />
      </div>
      <CronEditor value={value} onValueChange={setValue} presets={[]} nextRuns={3} />
    </form>
  );
}
/** Expressions the builder can't express stay editable as Custom. */
function CustomDemo() {
  return <CronEditor defaultValue="*/10 9-17 * * 1-5" presets={[]} nextRuns={4} />;
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["value={schedule}", "onValueChange={setSchedule}"];
    if (!props.presets) attrs.push("presets={[]}");
    if (props.nextRuns !== 5) attrs.push(`nextRuns={${props.nextRuns}}`);
    if (!props.showExpression) attrs.push("showExpression={false}");
    return `<CronEditor\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<CronEditorProps>()([
    { name: "value", type: "string", description: "Controlled 5-field cron expression." },
    { name: "defaultValue", type: "string", default: '"0 9 * * 1-5"', description: "Initial expression." },
    { name: "onValueChange", type: "(value: string) => void", description: "Called with valid expressions only." },
    { name: "presets", type: "{ label, value }[]", default: "6 common schedules", description: "Quick picks; [] hides them." },
    { name: "nextRuns", type: "number", default: "5", description: "Upcoming runs to list; 0 hides the list." },
    { name: "now", type: "Date", description: "Reference time for upcoming runs (default: the client clock after hydration)." },
    { name: "locale", type: "string", default: '"en-US"', description: "Locale for run dates." },
    { name: "timeZoneLabel", type: "string", description: "Shown next to the run list (default: the browser's timezone)." },
    { name: "showExpression", type: "boolean", default: "true", description: "Show the raw expression field." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every control." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Quick picks, frequency, the time fields, then the expression" },
    { keys: "← / →", action: "Move between weekdays in the week picker" },
    { keys: "Type", action: "Edit the expression; the field under the caret is labeled" },
  ],
  a11y: [
    "Every control has a visible label; weekday toggles are named with the full day.",
    "Invalid expressions set aria-invalid and point to the error with aria-describedby.",
    "The plain-English sentence is a polite live region, so changes are read out.",
  ],
  reducedMotion: "Run list and caret label change without sliding.",
  examples: [
    { title: "Backup job form", description: "No quick picks, three upcoming runs.", Demo: BackupFormDemo },
    { title: "Custom expression", description: "Every 10 minutes during work hours.", Demo: CustomDemo },
  ],
};
export default item;
