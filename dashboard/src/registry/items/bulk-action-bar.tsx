import { BulkActionBar, Checkbox, type BulkAction, type BulkActionBarProps } from "changelui";
import { useState } from "react";
import { ArchiveIcon, DownloadIcon, PencilIcon, TrashIcon, UserIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  maxVisible: number;
  selectAll: boolean;
  icons: boolean;
};
const defaults: DemoProps = { maxVisible: 2, selectAll: true, icons: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "maxVisible", label: "Visible actions", min: 1, max: 5, step: 1 },
  { type: "boolean", prop: "selectAll", label: "Select all step" },
  { type: "boolean", prop: "icons", label: "Icons" },
];
const ROWS = [
  { id: "INV-1042", customer: "Harbor & Pine", amount: "$1,240.00", status: "Overdue" },
  { id: "INV-1043", customer: "Northwind Studio", amount: "$860.00", status: "Sent" },
  { id: "INV-1044", customer: "Lumen Bakery", amount: "$312.50", status: "Overdue" },
  { id: "INV-1045", customer: "Kestrel Labs", amount: "$4,900.00", status: "Draft" },
  { id: "INV-1046", customer: "Atlas Freight", amount: "$2,075.00", status: "Sent" },
];
const TOTAL = 248;
function useActions(icons: boolean, onDone: (msg: string) => void): BulkAction[] {
  const icon = (node: React.ReactNode) => (icons ? node : undefined);
  return [
    { id: "remind", label: "Send reminder", icon: icon(<PencilIcon />), onClick: () => onDone("Reminders queued.") },
    { id: "assign", label: "Assign", icon: icon(<UserIcon />), onClick: () => onDone("Assign dialog would open.") },
    { id: "export", label: "Export CSV", icon: icon(<DownloadIcon />), onClick: () => onDone("CSV exported.") },
    { id: "archive", label: "Archive", icon: icon(<ArchiveIcon />), onClick: () => onDone("Archived.") },
    { id: "delete", label: "Delete", icon: icon(<TrashIcon />), tone: "danger", onClick: () => onDone("Deleted (with undo).") },
  ];
}
function InvoiceTable({ props, rows = ROWS }: { props: DemoProps; rows?: typeof ROWS }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["INV-1042", "INV-1044"]));
  const [all, setAll] = useState(false);
  const [log, setLog] = useState("");
  const count = all ? TOTAL : selected.size;
  const clear = () => {
    setSelected(new Set());
    setAll(false);
  };
  const toggle = (id: string) => {
    setAll(false);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const pageChecked = selected.size === rows.length ? true : selected.size > 0 ? "indeterminate" : false;
  const actions = useActions(props.icons, (msg) => {
    setLog(`${count} invoices: ${msg}`);
    clear();
  });
  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface pb-20 text-sm text-pui-surface-foreground shadow-pui-sm">
      <table className="w-full border-collapse text-start">
        <thead>
          <tr className="border-b border-pui-border text-xs text-pui-muted-foreground">
            <th scope="col" className="w-10 px-3 py-2 text-start font-medium">
              <Checkbox
                aria-label="Select all on this page"
                checked={pageChecked}
                onCheckedChange={(v) => {
                  setAll(false);
                  setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set());
                }}
              />
            </th>
            <th scope="col" className="px-2 py-2 text-start font-medium">Invoice</th>
            <th scope="col" className="px-2 py-2 text-start font-medium">Customer</th>
            <th scope="col" className="px-2 py-2 text-end font-medium">Amount</th>
            <th scope="col" className="px-3 py-2 text-start font-medium max-sm:hidden">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const on = all || selected.has(r.id);
            return (
              <tr key={r.id} data-selected={on || undefined} className="border-b border-pui-border last:border-0 data-selected:bg-pui-primary/5">
                <td className="px-3 py-2">
                  <Checkbox aria-label={`Select ${r.id}`} checked={on} onCheckedChange={() => toggle(r.id)} />
                </td>
                <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-2 py-2">{r.customer}</td>
                <td className="px-2 py-2 text-end tabular-nums">{r.amount}</td>
                <td className="px-3 py-2 text-xs text-pui-muted-foreground max-sm:hidden">{r.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="m-0 px-3 pt-3 text-xs text-pui-muted-foreground" aria-live="polite">
        {log || `Showing ${rows.length} of ${TOTAL} invoices.`}
      </p>
      <BulkActionBar
        position="absolute"
        count={count}
        total={TOTAL}
        noun={["invoice", "invoices"]}
        onSelectAll={props.selectAll ? () => setAll(true) : undefined}
        onClear={clear}
        actions={actions}
        maxVisible={props.maxVisible}
      />
    </div>
  );
}
function Preview({ props }: { props: DemoProps }) {
  return <InvoiceTable key={`${props.icons}`} props={props} />;
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-16 w-72">
      <BulkActionBar position="absolute" count={12} total={248} onSelectAll={() => {}} onClear={() => {}} actions={[{ id: "a", label: "Archive", onClick: () => {} }]} />
    </div>
  );
}
/** Text-only actions in flow (no icons), e.g. under a file grid. */
function StaticDemo() {
  const [count, setCount] = useState(4);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3">
      <div className="flex gap-2">
        <button type="button" className="h-8 cursor-pointer rounded-pui-md border border-pui-border bg-pui-surface px-3 text-xs text-pui-foreground hover:bg-pui-muted" onClick={() => setCount((c) => c + 1)}>
          Select one more
        </button>
        <button type="button" className="h-8 cursor-pointer rounded-pui-md border border-pui-border bg-pui-surface px-3 text-xs text-pui-foreground hover:bg-pui-muted" onClick={() => setCount((c) => Math.max(0, c - 1))}>
          Deselect one
        </button>
      </div>
      <div className="flex min-h-12 w-full justify-center">
        <BulkActionBar
          position="static"
          count={count}
          noun={["file", "files"]}
          onClear={() => setCount(0)}
          actions={[
            { id: "share", label: "Share", onClick: () => {} },
            { id: "move", label: "Move", onClick: () => {} },
            { id: "delete", label: "Delete", tone: "danger", onClick: () => setCount(0) },
          ]}
        />
      </div>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<BulkActionBar\n  count={selected.size}\n  total={${TOTAL}}\n  noun={["invoice", "invoices"]}${props.selectAll ? "\n  onSelectAll={selectAllMatching}" : ""}\n  onClear={clearSelection}\n  actions={[\n    { id: "remind", label: "Send reminder", icon: <SendIcon />, onClick: remind },\n    { id: "export", label: "Export CSV", onClick: exportCsv },\n    { id: "delete", label: "Delete", tone: "danger", onClick: remove },\n  ]}${props.maxVisible !== 3 ? `\n  maxVisible={${props.maxVisible}}` : ""}\n/>`,
  propsTable: propDocs<BulkActionBarProps>()([
    { name: "count", type: "number", required: true, description: "Selected items; the bar shows while it is above 0." },
    { name: "onClear", type: "() => void", required: true, description: "Clears the selection (X and Escape)." },
    { name: "actions", type: "{ id, label, icon?, onClick, tone?, disabled? }[]", required: true, description: "Buttons, then a More menu past maxVisible." },
    { name: "total", type: "number", description: "Items in the view; enables Select all N and the All selected state." },
    { name: "onSelectAll", type: "() => void", description: "Shows Select all N while count < total." },
    { name: "maxVisible", type: "number", default: "3", description: "Actions shown as buttons." },
    { name: "position", type: '"fixed" | "absolute" | "static"', default: '"fixed"', description: "Viewport bottom, parent bottom or in flow." },
    { name: "noun", type: "[singular, plural]", default: '["item", "items"]', description: "Words for the count." },
    { name: "clearOnEscape", type: "boolean", default: "true", description: "Escape clears (not while typing in a field)." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Move between the bar's buttons" },
    { keys: "Home / End", action: "First or last button" },
    { keys: "Escape", action: "Clear the selection" },
  ],
  a11y: [
    'role="toolbar" with a label; icon actions keep their text as the accessible name and on wider screens as a visible label.',
    "The count is announced in a polite live region whenever the selection changes.",
  ],
  reducedMotion: "The bar fades in and out without the spring, and the count changes without rolling.",
  examples: [{ title: "In flow, text only", description: "position=\"static\" with plain labels; deselect to 0 and it springs away.", Demo: StaticDemo }],
};
export default item;
