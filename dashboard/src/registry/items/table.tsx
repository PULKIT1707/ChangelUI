import {
  Avatar,
  Badge,
  Checkbox,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  useTableSort,
  type TableProps,
} from "changelui";
import { useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  density: NonNullable<TableProps["density"]>;
  striped: boolean;
  hoverable: boolean;
  stickyHeader: boolean;
  animateRows: boolean;
};

const defaults: DemoProps = { density: "md", striped: false, hoverable: true, stickyHeader: true, animateRows: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "density", label: "Density", options: ["compact", "md", "comfortable"] },
  { type: "boolean", prop: "striped", label: "Striped" },
  { type: "boolean", prop: "hoverable", label: "Row hover" },
  { type: "boolean", prop: "stickyHeader", label: "Sticky header" },
  { type: "boolean", prop: "animateRows", label: "Animate reorder" },
];

type Invoice = { id: string; customer: string; status: "Paid" | "Pending" | "Overdue"; amount: number; date: string };

const invoices: Invoice[] = [
  { id: "INV-1042", customer: "Northwind Labs", status: "Paid", amount: 2450, date: "2026-09-02" },
  { id: "INV-1043", customer: "Acme Robotics", status: "Pending", amount: 980, date: "2026-09-05" },
  { id: "INV-1044", customer: "Lumen Studio", status: "Overdue", amount: 4120, date: "2026-08-21" },
  { id: "INV-1045", customer: "Blue Harbor", status: "Paid", amount: 615.5, date: "2026-09-11" },
  { id: "INV-1046", customer: "Kite & Co", status: "Pending", amount: 3300, date: "2026-09-14" },
  { id: "INV-1047", customer: "Orbit Analytics", status: "Paid", amount: 1290, date: "2026-09-18" },
  { id: "INV-1048", customer: "Fern Health", status: "Overdue", amount: 760, date: "2026-08-29" },
];

const statusTone = { Paid: "success", Pending: "warning", Overdue: "danger" } as const;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Preview({ props }: { props: DemoProps }) {
  const sort = useTableSort(invoices, { defaultKey: "date", defaultDirection: "desc" });
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["INV-1044"]));
  const all = selected.size === invoices.length;
  const total = invoices.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="w-full max-w-3xl">
      <Table
        density={props.density}
        striped={props.striped}
        hoverable={props.hoverable}
        stickyHeader={props.stickyHeader}
        animateRows={props.animateRows}
        wrapperProps={{ className: props.stickyHeader ? "max-h-80" : undefined }}
      >
        <TableCaption>Invoices for September. Click a header to sort.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all invoices"
                checked={all ? true : selected.size ? "indeterminate" : false}
                onCheckedChange={() => setSelected(all ? new Set() : new Set(invoices.map((r) => r.id)))}
              />
            </TableHead>
            <TableHead {...sort.getSortProps("id")}>Invoice</TableHead>
            <TableHead {...sort.getSortProps("customer")}>Customer</TableHead>
            <TableHead {...sort.getSortProps("status")}>Status</TableHead>
            <TableHead {...sort.getSortProps("date")}>Date</TableHead>
            <TableHead {...sort.getSortProps("amount")} align="end">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sort.rows.map((row) => {
            const isSelected = selected.has(row.id);
            return (
              <TableRow key={row.id} selected={isSelected}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${row.id}`}
                    checked={isSelected}
                    onCheckedChange={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(row.id);
                      else next.add(row.id);
                      setSelected(next);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{row.id}</TableCell>
                <TableCell className="font-medium">{row.customer}</TableCell>
                <TableCell>
                  <Badge tone={statusTone[row.status]} dot>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-pui-muted-foreground">{day.format(new Date(row.date))}</TableCell>
                <TableCell align="end">{money.format(row.amount)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>{selected.size} selected</TableCell>
            <TableCell align="end">{money.format(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead sortable sortDirection="asc">
              Name
            </TableHead>
            <TableHead align="end">MRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ["Acme", "$4.2k"],
            ["Kite", "$2.9k"],
            ["Orbit", "$1.1k"],
          ].map(([n, v]) => (
            <TableRow key={n}>
              <TableCell>{n}</TableCell>
              <TableCell align="end">{v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const players = [
  { name: "Mira Chen", team: "Falcons", score: 9820, streak: 12 },
  { name: "Leo Park", team: "Comets", score: 9410, streak: 4 },
  { name: "Ava Singh", team: "Falcons", score: 8975, streak: 7 },
  { name: "Noah Kim", team: "Tides", score: 8740, streak: 2 },
  { name: "Zoe Martin", team: "Comets", score: 8310, streak: 9 },
];

/** A live leaderboard: scores change every click and rows glide to their new rank. */
function LeaderboardDemo() {
  const [rows, setRows] = useState(players);
  const ranked = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);
  return (
    <div className="flex w-full flex-col gap-3">
      <Table density="compact">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Team</TableHead>
            <TableHead align="end">Streak</TableHead>
            <TableHead align="end">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((p, i) => (
            <TableRow key={p.name}>
              <TableCell className="font-semibold tabular-nums text-pui-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Avatar name={p.name} size="xs" />
                  {p.name}
                </span>
              </TableCell>
              <TableCell className="text-pui-muted-foreground">{p.team}</TableCell>
              <TableCell align="end">{p.streak}</TableCell>
              <TableCell align="end" className="font-medium">
                {p.score.toLocaleString("en-US")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <button
        type="button"
        onClick={() => setRows((r) => r.map((p) => ({ ...p, score: p.score + Math.round(Math.random() * 900) })))}
        className="self-start rounded-pui-md border border-pui-border bg-pui-surface px-3 py-1.5 text-sm font-medium text-pui-foreground hover:bg-pui-muted"
      >
        Play a round
      </button>
    </div>
  );
}

const packages = [
  { name: "motion", version: "12.23.0", size: 34.2, updated: "2026-09-28" },
  { name: "react", version: "19.1.0", size: 7.5, updated: "2026-08-14" },
  { name: "clsx", version: "2.1.1", size: 0.5, updated: "2026-05-02" },
  { name: "tailwind-merge", version: "3.3.1", size: 8.9, updated: "2026-09-02" },
];

/** Comfortable density, striped rows, and a custom accessor that sorts by bundle size. */
function DependenciesDemo() {
  const sort = useTableSort(packages, { defaultKey: "size", defaultDirection: "desc", allowUnsorted: false });
  return (
    <Table density="comfortable" striped>
      <TableHeader>
        <TableRow>
          <TableHead {...sort.getSortProps("name")}>Package</TableHead>
          <TableHead>Version</TableHead>
          <TableHead {...sort.getSortProps("updated")}>Updated</TableHead>
          <TableHead {...sort.getSortProps("size")} align="end">
            Size (kB gz)
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sort.rows.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-mono text-xs font-medium">{p.name}</TableCell>
            <TableCell className="font-mono text-xs text-pui-muted-foreground">{p.version}</TableCell>
            <TableCell className="text-pui-muted-foreground">{day.format(new Date(p.updated))}</TableCell>
            <TableCell align="end">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 rounded-full bg-pui-primary/70" style={{ width: `${Math.max(4, p.size * 2)}px` }} />
                {p.size.toFixed(1)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      p.density !== "md" ? `density="${p.density}"` : "",
      p.striped ? "striped" : "",
      !p.hoverable ? "hoverable={false}" : "",
      p.stickyHeader ? 'stickyHeader wrapperProps={{ className: "max-h-80" }}' : "",
      !p.animateRows ? "animateRows={false}" : "",
    ].filter(Boolean);
    return `const sort = useTableSort(invoices, { defaultKey: "date", defaultDirection: "desc" });

<Table${attrs.length ? ` ${attrs.join(" ")}` : ""}>
  <TableHeader>
    <TableRow>
      <TableHead {...sort.getSortProps("customer")}>Customer</TableHead>
      <TableHead {...sort.getSortProps("amount")} align="end">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {sort.rows.map((row) => (
      <TableRow key={row.id}>
        <TableCell>{row.customer}</TableCell>
        <TableCell align="end">{money.format(row.amount)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>`;
  },
  propsTable: propDocs<TableProps & { sortable: unknown; sortDirection: unknown; onSort: unknown; align: unknown; selected: unknown }>()([
    { name: "density", type: '"compact" | "md" | "comfortable"', default: '"md"', description: "Table: cell padding." },
    { name: "striped", type: "boolean", default: "false", description: "Table: zebra rows." },
    { name: "hoverable", type: "boolean", default: "true", description: "Table: row hover tint." },
    { name: "stickyHeader", type: "boolean", default: "false", description: "Table: header stays while the wrapper scrolls (give wrapperProps a max height)." },
    { name: "animateRows", type: "boolean", default: "true", description: "Table: rows glide to new positions on springs.layout (off above 50 rows)." },
    { name: "wrapperProps", type: "HTMLAttributes<HTMLDivElement>", description: "Table: props for the bordered, scrolling wrapper." },
    { name: "sortable", type: "boolean", description: "TableHead: renders a sort button." },
    { name: "sortDirection", type: '"asc" | "desc" | false', description: "TableHead: direction when this column is sorted; sets aria-sort." },
    { name: "onSort", type: "() => void", description: "TableHead: sort button click." },
    { name: "align", type: '"start" | "center" | "end"', default: '"start"', description: "TableHead / TableCell: alignment; end cells use tabular numbers." },
    { name: "selected", type: "boolean", description: "TableRow: selected tint and aria-selected." },
  ]),
  keyboard: [{ keys: "Tab, Enter / Space", action: "Reach a sortable header and cycle asc, desc, unsorted" }],
  a11y: [
    "Native table semantics (caption, thead, th scope=col, tbody, tfoot).",
    "Sorted headers carry aria-sort; the sort control is a real button labelled by the header text.",
    "useTableSort sorts stably with numeric-aware string collation; empty values stay last.",
  ],
  reducedMotion: "Rows jump to their new positions and the sort arrow flips instantly.",
  examples: [
    { title: "Live leaderboard", description: "Scores change and rows glide to their new rank.", Demo: LeaderboardDemo },
    { title: "Dependencies", description: "Comfortable density, striped rows, two-state sorting.", Demo: DependenciesDemo },
  ],
};

export default item;
