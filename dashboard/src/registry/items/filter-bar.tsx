import { Badge, FilterBar, filterRows, type FilterBarProps, type FilterBarValue, type FilterField, type FilterView } from "changelui";
import { useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  views: boolean;
  counts: boolean;
  resultCount: boolean;
};
const defaults: DemoProps = { views: true, counts: true, resultCount: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "views", label: "Saved views" },
  { type: "boolean", prop: "counts", label: "Option counts" },
  { type: "boolean", prop: "resultCount", label: "Result count" },
];
type Status = "backlog" | "todo" | "in_progress" | "review" | "done";
type Priority = "urgent" | "high" | "medium" | "low";
interface Issue {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  assignee: string;
  labels: string[];
}
const Dot = ({ className }: { className: string }) => <span className={`inline-block size-2 rounded-full ${className}`} />;
const STATUS: { value: Status; label: string; dot: string }[] = [
  { value: "backlog", label: "Backlog", dot: "bg-pui-muted-foreground/50" },
  { value: "todo", label: "Todo", dot: "bg-pui-info" },
  { value: "in_progress", label: "In progress", dot: "bg-pui-warning" },
  { value: "review", label: "In review", dot: "bg-pui-primary" },
  { value: "done", label: "Done", dot: "bg-pui-success" },
];
const PRIORITY: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const PEOPLE = ["Ana Diaz", "Sam Lee", "Priya Nair", "Tom Berg", "Mei Chen"];
const LABELS = ["bug", "feature", "design", "billing", "mobile", "docs", "perf"];
const TITLES = [
  "Checkout total ignores coupon on retry",
  "Dark mode for the invoice PDF",
  "Bulk export to CSV times out over 10k rows",
  "Onboarding checklist skips the invite step",
  "Push notifications arrive twice on Android",
  "Search ranks archived projects first",
  "Billing page shows old card after update",
  "Avatar upload rejects HEIC photos",
  "Docs: webhooks retry policy",
  "Keyboard shortcut sheet for the editor",
  "Slow first paint on the analytics tab",
  "Timezone shown in UTC on reminders",
  "Seat count off by one after downgrade",
  "Empty state for filtered reports",
  "Drag to reorder dashboard widgets",
  "Rate limit errors are not surfaced",
  "Comment mentions don't notify guests",
  "iPad layout clips the sidebar",
  "Refund flow allows over-refunding",
  "Docs: SSO setup for Okta",
  "Image cropper for team logos",
  "Session expires during long uploads",
];
const ISSUES: Issue[] = TITLES.map((title, i) => ({
  id: `PUI-${140 + i}`,
  title,
  status: STATUS[(i * 3 + 1) % STATUS.length]?.value ?? "todo",
  priority: PRIORITY[(i * 7 + 2) % PRIORITY.length]?.value ?? "medium",
  assignee: PEOPLE[(i * 2 + (i > 10 ? 1 : 0)) % PEOPLE.length] ?? "Ana Diaz",
  labels: [LABELS[i % LABELS.length] ?? "bug", ...(i % 3 === 0 ? [LABELS[(i + 3) % LABELS.length] ?? "docs"] : [])],
}));
const get = (row: Issue, field: string) =>
  field === "status" ? row.status : field === "priority" ? row.priority : field === "assignee" ? row.assignee : field === "labels" ? row.labels : field === "title" ? row.title : null;
function useFields(counts: boolean): FilterField[] {
  return useMemo(() => {
    const count = (field: string, v: string) => (counts ? ISSUES.filter((r) => [get(r, field)].flat().includes(v)).length : undefined);
    return [
      { id: "status", label: "Status", icon: <Dot className="bg-pui-warning" />, options: STATUS.map((s) => ({ value: s.value, label: s.label, icon: <Dot className={s.dot} />, count: count("status", s.value) })) },
      { id: "priority", label: "Priority", options: PRIORITY.map((p) => ({ ...p, count: count("priority", p.value) })) },
      { id: "assignee", label: "Assignee", options: PEOPLE.map((p) => ({ value: p, label: p, count: count("assignee", p) })) },
      { id: "labels", label: "Labels", options: LABELS.map((l) => ({ value: l, label: l, count: count("labels", l) })) },
      { id: "title", label: "Title", type: "text" },
    ];
  }, [counts]);
}
const START_VIEWS: FilterView[] = [
  { id: "all", label: "All issues", value: { query: "", filters: [] } },
  { id: "mine", label: "My open", value: { query: "", filters: [{ field: "assignee", operator: "is", values: ["Sam Lee"] }, { field: "status", operator: "is_not", values: ["done"] }] } },
  { id: "urgent", label: "Urgent", value: { query: "", filters: [{ field: "priority", operator: "is", values: ["urgent", "high"] }] } },
];
function IssueTable({ rows }: { rows: Issue[] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-pui-surface text-xs text-pui-muted-foreground">
          <tr className="border-b border-pui-border">
            <th className="px-3 py-2 font-medium">Issue</th>
            <th className="w-32 px-3 py-2 font-medium">Status</th>
            <th className="hidden w-24 px-3 py-2 font-medium sm:table-cell">Priority</th>
            <th className="hidden w-28 px-3 py-2 font-medium md:table-cell">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = STATUS.find((s) => s.value === r.status);
            return (
              <tr key={r.id} className="border-b border-pui-border last:border-0">
                <td className="px-3 py-2">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 whitespace-nowrap font-mono text-xs text-pui-muted-foreground">{r.id}</span>
                    <span className="truncate">{r.title}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Dot className={status?.dot ?? ""} />
                    {status?.label}
                  </span>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <Badge size="sm" variant="soft" tone={r.priority === "urgent" ? "danger" : r.priority === "high" ? "warning" : "neutral"}>
                    {PRIORITY.find((p) => p.value === r.priority)?.label}
                  </Badge>
                </td>
                <td className="hidden truncate whitespace-nowrap px-3 py-2 text-xs md:table-cell">{r.assignee}</td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-sm text-pui-muted-foreground">
                No issues match these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
function Preview({ props }: { props: DemoProps }) {
  const fields = useFields(props.counts);
  const [views, setViews] = useState(START_VIEWS);
  const [view, setView] = useState<string | null>("mine");
  const [value, setValue] = useState<FilterBarValue>(START_VIEWS[1]?.value ?? { query: "", filters: [] });
  const rows = filterRows(ISSUES, value, get, (r) => `${r.id} ${r.title}`);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <FilterBar
        fields={fields}
        value={value}
        onValueChange={setValue}
        views={props.views ? views : undefined}
        view={props.views ? view : null}
        onViewChange={setView}
        onSaveView={(next, id) => {
          if (id && id !== "all") setViews((list) => list.map((v) => (v.id === id ? { ...v, value: next } : v)));
          else {
            const created = { id: `view-${views.length + 1}`, label: `Saved ${views.length - 2}`, value: next };
            setViews((list) => [...list, created]);
            setView(created.id);
          }
        }}
        resultCount={props.resultCount ? rows.length : undefined}
        resultLabel={["issue", "issues"]}
        searchPlaceholder="Search issues…"
      />
      <IssueTable rows={rows} />
    </div>
  );
}
function Mini() {
  const fields = useFields(false);
  return (
    <div aria-hidden="true" className="pointer-events-none w-80">
      <FilterBar fields={fields} defaultValue={{ query: "", filters: [{ field: "status", operator: "is", values: ["todo", "in_progress"] }] }} />
    </div>
  );
}
/** No views: a plain toolbar over a list, with a text filter on titles. */
function SimpleDemo() {
  const fields = useFields(true);
  const [value, setValue] = useState<FilterBarValue>({ query: "", filters: [{ field: "title", operator: "contains", values: ["docs"] }] });
  const rows = filterRows(ISSUES, value, get, (r) => r.title);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <FilterBar fields={fields} value={value} onValueChange={setValue} resultCount={rows.length} resultLabel={["issue", "issues"]} />
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {rows.slice(0, 5).map((r) => (
          <li key={r.id} className="truncate text-pui-foreground">
            <span className="me-2 font-mono text-xs text-pui-muted-foreground">{r.id}</span>
            {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const fields = [\n  { id: "status", label: "Status", options: [{ value: "todo", label: "Todo" }, { value: "done", label: "Done" }] },\n  { id: "title", label: "Title", type: "text" },\n];\n\n<FilterBar\n  fields={fields}\n  value={value}\n  onValueChange={setValue}${props.views ? "\n  views={views}\n  view={view}\n  onViewChange={setView}\n  onSaveView={saveView}" : ""}${props.resultCount ? "\n  resultCount={rows.length}" : ""}\n/>\n\nconst rows = filterRows(issues, value, (row, field) => row[field], (row) => row.title);`,
  propsTable: propDocs<FilterBarProps>()([
    { name: "fields", type: "FilterField[]", required: true, description: "{ id, label, icon?, type?: \"select\" | \"text\", options?: { value, label, icon?, count? }[] }." },
    { name: "value", type: "FilterBarValue", description: "Controlled { query, filters: { field, operator, values }[] }." },
    { name: "defaultValue", type: "FilterBarValue", description: "Initial value when uncontrolled." },
    { name: "onValueChange", type: "(value: FilterBarValue) => void", description: "Called on every search, chip or operator change." },
    { name: "views", type: "FilterView[]", description: "Saved views as tabs: { id, label, value }." },
    { name: "view", type: "string | null", description: "Controlled active view id." },
    { name: "defaultView", type: "string | null", description: "Initial active view." },
    { name: "onViewChange", type: "(id: string) => void", description: "Called when a view tab is picked." },
    { name: "onSaveView", type: "(value, viewId) => void", description: "Shows Save view when the filters drift from the active view." },
    { name: "resultCount", type: "number", description: "Rows matching now, announced politely." },
    { name: "resultLabel", type: "[string, string]", default: '["result", "results"]', description: "Singular and plural noun for the count." },
    { name: "searchPlaceholder", type: "string", default: '"Search…"', description: "Search box placeholder." },
    { name: "label", type: "string", default: '"Filters"', description: "Accessible name of the group." },
  ]),
  keyboard: [
    { keys: "↑ / ↓", action: "Move through fields and options in a menu" },
    { keys: "Space / Enter", action: "Toggle the focused option" },
    { keys: "← / →", action: "Switch saved views" },
    { keys: "Escape", action: "Close the open menu" },
  ],
  a11y: [
    "Each chip has three named buttons: flip the operator, edit the values and remove the filter.",
    "Options are checkboxes with their counts in the name; the result count is a polite status.",
    "Saved views are a radio group; an unsaved change is spoken as “unsaved changes” after the view name.",
  ],
  reducedMotion: "Chips and the view highlight appear in place instead of springing.",
  examples: [{ title: "Without views", description: "Search plus a text filter on titles.", Demo: SimpleDemo, wide: true }],
};
export default item;
