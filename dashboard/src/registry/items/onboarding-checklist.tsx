import { Button, OnboardingChecklist, type OnboardingChecklistProps, type OnboardingStep } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  completed: number;
  manual: boolean;
  dismissible: boolean;
  collapsed: boolean;
};
const defaults: DemoProps = { completed: 2, manual: true, dismissible: true, collapsed: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "completed", label: "Steps done", min: 0, max: 5, step: 1 },
  { type: "boolean", prop: "manual", label: "Manual checkboxes" },
  { type: "boolean", prop: "dismissible", label: "Dismissible" },
  { type: "boolean", prop: "collapsed", label: "Start collapsed" },
];
const base: Omit<OnboardingStep, "done">[] = [
  { id: "profile", title: "Complete your profile", description: "Add a photo and your role so teammates know who you are." },
  { id: "workspace", title: "Name your workspace", description: "This is what invites and emails show." },
  { id: "invite", title: "Invite your team", description: "Projects move faster with reviewers. Invite at least one teammate." },
  { id: "connect", title: "Connect a repository", description: "Import code to get previews on every pull request." },
  { id: "deploy", title: "Ship your first deploy", description: "Push to main and watch it go live.", optional: true },
];
const withActions = (done: ReadonlySet<string>, complete: (id: string) => void): OnboardingStep[] =>
  base.map((s) => ({
    ...s,
    done: done.has(s.id),
    action: (
      <Button size="sm" onClick={() => complete(s.id)}>
        {s.id === "invite" ? "Invite teammates" : s.id === "connect" ? "Connect GitHub" : s.id === "deploy" ? "Deploy now" : "Do it now"}
      </Button>
    ),
  }));
function Preview({ props }: { props: DemoProps }) {
  return <PreviewInner key={`${props.completed}-${props.collapsed}`} props={props} />;
}
function PreviewInner({ props }: { props: DemoProps }) {
  const [done, setDone] = useState<Set<string>>(() => new Set(base.slice(0, props.completed).map((s) => s.id)));
  const [dismissed, setDismissed] = useState(false);
  const set = (id: string, value: boolean) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  if (dismissed)
    return (
      <Button variant="outline" tone="neutral" onClick={() => setDismissed(false)}>
        Show checklist again
      </Button>
    );
  return (
    <div className="w-full max-w-md">
      <OnboardingChecklist
        steps={withActions(done, (id) => set(id, true))}
        onStepToggle={props.manual ? set : undefined}
        onDismiss={props.dismissible ? () => setDismissed(true) : undefined}
        defaultCollapsed={props.collapsed}
        description={`${done.size} of ${base.length} done · about 4 minutes left`}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <OnboardingChecklist steps={base.slice(0, 3).map((s, i) => ({ ...s, done: i === 0 }))} />
    </div>
  );
}
/** Sidebar widget: starts collapsed so it doesn't crowd navigation. */
function SidebarDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-2 rounded-pui-xl border border-pui-border bg-pui-background p-3">
      {["Overview", "Projects", "Settings"].map((n) => (
        <span key={n} className="rounded-pui-md px-2 py-1.5 text-sm text-pui-muted-foreground">
          {n}
        </span>
      ))}
      <OnboardingChecklist title="Setup guide" defaultCollapsed steps={base.map((s, i) => ({ ...s, done: i < 3 }))} />
    </div>
  );
}
/** Finished: celebration with a follow-up action. */
function CompleteDemo() {
  const [shown, setShown] = useState(true);
  return (
    <div className="mx-auto w-full max-w-md">
      {shown ? (
        <OnboardingChecklist
          steps={base.map((s) => ({ ...s, done: true }))}
          onDismiss={() => setShown(false)}
          completeAction={
            <Button size="sm" variant="soft">
              Explore templates
            </Button>
          }
        />
      ) : (
        <Button variant="outline" tone="neutral" onClick={() => setShown(true)}>
          Replay celebration
        </Button>
      )}
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["steps={steps}"];
    if (props.manual) attrs.push("onStepToggle={(id, done) => markStep(id, done)}");
    if (props.dismissible) attrs.push("onDismiss={hideChecklist}");
    if (props.collapsed) attrs.push("defaultCollapsed");
    return `const steps = [\n  { id: "profile", title: "Complete your profile", done: true },\n  { id: "invite", title: "Invite your team", description: "…", action: <Button size="sm">Invite</Button> },\n];\n\n<OnboardingChecklist\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<OnboardingChecklistProps>()([
    { name: "steps", type: "{ id, title, description?, action?, done?, optional? }[]", required: true, description: "The checklist; done steps are checked off." },
    { name: "title", type: "ReactNode", default: '"Get started"', description: "Card heading." },
    { name: "description", type: "ReactNode", default: '"2 of 5 done"', description: "Under the heading." },
    { name: "onStepToggle", type: "(id, done) => void", description: "Turns step circles into checkboxes." },
    { name: "onDismiss", type: "() => void", description: "Shows a dismiss button." },
    { name: "collapsed", type: "boolean", description: "Controlled collapsed state." },
    { name: "defaultCollapsed", type: "boolean", default: "false", description: "Start collapsed." },
    { name: "onCollapsedChange", type: "(collapsed) => void", description: "Called on collapse or expand." },
    { name: "completeTitle", type: "ReactNode", default: '"You\'re all set"', description: "Completed heading." },
    { name: "completeDescription", type: "ReactNode", description: "Completed text." },
    { name: "completeAction", type: "ReactNode", description: "Extra action in the completed state." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move between step checkboxes, step titles and actions" },
    { keys: "Enter / Space", action: "Expand a step, or tick it off with its checkbox" },
  ],
  a11y: [
    "A labelled section; progress is a progressbar named like \"2 of 5 steps complete\".",
    'Step titles are buttons with aria-expanded; manual circles are role="checkbox" named by the step.',
    "Completed steps say \"done\" in text (not only the strikethrough) and progress changes are announced.",
  ],
  reducedMotion: "No ring sweep, check pop, burst or height animation; state changes apply instantly.",
  examples: [
    { title: "Sidebar setup guide", description: "Collapsed by default, expands in place.", Demo: SidebarDemo },
    { title: "All done", description: "Celebration with a follow-up action and Close.", Demo: CompleteDemo },
  ],
};
export default item;
