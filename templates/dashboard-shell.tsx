/**
 * Dashboard shell. A complete app frame: a collapsible sidebar (icon rail, badges, nested
 * projects, a drawer on small screens), a header with a command palette, KPI stat cards with
 * sparklines, a year of deploy activity as a contribution heatmap and a sortable orders table whose
 * row actions confirm with toasts.
 *
 * Copy-only template. Render <Toaster /> once at your app root (from changelui/toast) so
 * the toasts show. The palette opens from the header button; pass hotkey="mod+k" to CommandMenu in
 * your app (this preview leaves the shortcut to the docs site). Wrap your app in
 * <MotionConfig reducedMotion="user">.
 */
import { Avatar } from "changelui/avatar";
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { CalendarHeatmap } from "changelui/calendar-heatmap";
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandMenu } from "changelui/command-menu";
import { IconButton } from "changelui/icon-button";
import { Kbd } from "changelui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarSub,
  SidebarTrigger,
  useSidebar,
} from "changelui/sidebar";
import { StatCard } from "changelui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useTableSort } from "changelui/table";
import { toast } from "changelui/toast";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";

type Page = "overview" | "analytics" | "orders" | "customers" | "web" | "mobile" | "settings";

const TITLES: Record<Page, string> = {
  overview: "Overview",
  analytics: "Analytics",
  orders: "Orders",
  customers: "Customers",
  web: "Web storefront",
  mobile: "Mobile app",
  settings: "Settings",
};

// ---------------------------------------------------------------------------------------------
// Deterministic demo data (same on the server and the client).

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function trend(seed: number, start: number, drift: number, noise: number, length = 14) {
  const rand = seeded(seed);
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < length; i++) {
    v = v * (1 + drift + (rand() - 0.5) * noise);
    out.push(Math.round(v * 10_000) / 10_000);
  }
  return out;
}

const KPIS = [
  { label: "Revenue", values: trend(3, 41_000, 0.012, 0.06), format: { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 } as const },
  { label: "Orders", values: trend(7, 1_180, 0.008, 0.08), format: { maximumFractionDigits: 0 } as const },
  { label: "Conversion", values: trend(11, 0.031, 0.004, 0.05), format: { style: "percent", maximumFractionDigits: 1 } as const },
  { label: "Refund rate", values: trend(19, 0.024, -0.01, 0.06), format: { style: "percent", maximumFractionDigits: 1 } as const, invert: true },
];

const DEPLOYS = (() => {
  const rand = seeded(42);
  const days: { date: string; count: number }[] = [];
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 365; i++) {
    const date = new Date(start + i * 86_400_000);
    const weekday = date.getUTCDay();
    const busy = weekday === 0 || weekday === 6 ? 0.25 : 1;
    const r = rand();
    days.push({ date: date.toISOString().slice(0, 10), count: r < 0.2 ? 0 : Math.round(r * r * 9 * busy) });
  }
  return days;
})();

type Status = "paid" | "pending" | "refunded" | "failed";

interface Order {
  id: string;
  customer: string;
  email: string;
  status: Status;
  date: string;
  amount: number;
}

const ORDERS: Order[] = [
  { id: "#4821", customer: "Amara Nwosu", email: "amara@example.com", status: "paid", date: "2026-10-16", amount: 289 },
  { id: "#4820", customer: "Jonas Berg", email: "jonas@example.com", status: "pending", date: "2026-10-16", amount: 74.5 },
  { id: "#4819", customer: "Priya Raman", email: "priya@example.com", status: "paid", date: "2026-10-15", amount: 1240 },
  { id: "#4818", customer: "Luca Moretti", email: "luca@example.com", status: "refunded", date: "2026-10-15", amount: 56 },
  { id: "#4817", customer: "Hana Kato", email: "hana@example.com", status: "paid", date: "2026-10-14", amount: 412.2 },
  { id: "#4816", customer: "Diego Alvarez", email: "diego@example.com", status: "failed", date: "2026-10-14", amount: 98 },
];

const STATUS_TONE: Record<Status, "success" | "warning" | "neutral" | "danger"> = { paid: "success", pending: "warning", refunded: "neutral", failed: "danger" };
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// ---------------------------------------------------------------------------------------------
// Icons

function Icon({ children, className = "size-4" }: { children: ReactNode; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS: Partial<Record<Page, ReactNode>> = {
  overview: <path d="M3 10.5 12 4l9 6.5V20H3ZM9 20v-6h6v6" />,
  analytics: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  orders: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />,
  customers: <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 20v-2a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />,
  settings: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
};

const FolderIcon = <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />;

// ---------------------------------------------------------------------------------------------

function Brand() {
  const { state, isMobile } = useSidebar();
  const showText = state === "expanded" || isMobile;
  return (
    <div className="flex items-center gap-2 px-1">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 text-pui-primary-foreground">
        <Icon>
          <path d="M4 15c3-6 13-6 16 0M8 15c1.5-2.5 6.5-2.5 8 0" />
        </Icon>
      </span>
      <motion.span initial={false} animate={{ opacity: showText ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex min-w-0 flex-col whitespace-nowrap leading-tight">
        <span className="truncate text-sm font-semibold">Halcyon Shop</span>
        <span className="truncate text-[11px] text-pui-muted-foreground">Pro workspace</span>
      </motion.span>
    </div>
  );
}

function UserRow() {
  const { state, isMobile } = useSidebar();
  const showText = state === "expanded" || isMobile;
  return (
    <div className="flex items-center gap-2 px-1">
      <Avatar name="Maya Okafor" size="sm" status="online" className="shrink-0" />
      <motion.span initial={false} animate={{ opacity: showText ? 1 : 0 }} transition={{ duration: 0.15 }} className="flex min-w-0 flex-col whitespace-nowrap leading-tight">
        <span className="truncate text-sm font-medium">Maya Okafor</span>
        <span className="truncate text-[11px] text-pui-muted-foreground">maya@example.com</span>
      </motion.span>
    </div>
  );
}

function OrdersTable() {
  const [rows, setRows] = useState(ORDERS);
  const sort = useTableSort(rows, { defaultKey: "date", defaultDirection: "desc" });

  const refund = (order: Order) => {
    setRows((list) => list.map((row) => (row.id === order.id ? { ...row, status: "refunded" } : row)));
    toast.success(`Refunded ${order.id}`, {
      description: `${USD.format(order.amount)} back to ${order.customer}.`,
      action: { label: "Undo", onClick: () => setRows((list) => list.map((row) => (row.id === order.id ? order : row))) },
    });
  };

  return (
    <Table hoverable animateRows aria-label="Recent orders">
      <TableHeader>
        <TableRow>
          <TableHead {...sort.getSortProps("id")}>Order</TableHead>
          <TableHead {...sort.getSortProps("customer")}>Customer</TableHead>
          <TableHead {...sort.getSortProps("status")}>Status</TableHead>
          <TableHead {...sort.getSortProps("date")}>Date</TableHead>
          <TableHead {...sort.getSortProps("amount")} align="end">
            Amount
          </TableHead>
          <TableHead align="end">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sort.rows.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-pui-mono text-xs">{order.id}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Avatar name={order.customer} size="xs" />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium">{order.customer}</span>
                  <span className="truncate text-xs text-pui-muted-foreground">{order.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge size="sm" variant="soft" tone={STATUS_TONE[order.status]} dot>
                {order.status[0]!.toUpperCase() + order.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-pui-muted-foreground">
              <time dateTime={order.date}>{DAY.format(new Date(`${order.date}T00:00:00Z`))}</time>
            </TableCell>
            <TableCell align="end" className="tabular-nums">
              {USD.format(order.amount)}
            </TableCell>
            <TableCell align="end">
              <Button size="sm" variant="ghost" tone="neutral" disabled={order.status !== "paid"} onClick={() => refund(order)}>
                Refund
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function DashboardShell() {
  const reduced = usePrefersReducedMotion();
  const [page, setPage] = useState<Page>("overview");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [period, setPeriod] = useState("14d");
  const totalDeploys = useMemo(() => DEPLOYS.reduce((sum, day) => sum + day.count, 0), []);

  const item = (key: Page, extra: { badge?: ReactNode } = {}) => (
    <SidebarItem
      href={`#${key}`}
      icon={ICONS[key] ? <Icon>{ICONS[key]}</Icon> : undefined}
      active={page === key}
      badge={extra.badge}
      onClick={(event) => {
        event.preventDefault();
        setPage(key);
      }}
    >
      {TITLES[key]}
    </SidebarItem>
  );

  const run = (action: () => void) => () => {
    action();
    setPaletteOpen(false);
  };

  return (
    <div className="@container bg-pui-background p-3 text-pui-foreground @3xl:p-6">
      <SidebarProvider width={240} className="h-[760px] overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background shadow-pui-lg">
        <Sidebar label="App">
          <SidebarHeader>
            <Brand />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup label="Store">
              {item("overview")}
              {item("analytics", { badge: "New" })}
              {item("orders", { badge: 6 })}
              {item("customers")}
            </SidebarGroup>
            <SidebarGroup label="Channels">
              <SidebarSub label="Storefronts" icon={<Icon>{FolderIcon}</Icon>} defaultOpen>
                {(["web", "mobile"] as const).map((key) => (
                  <SidebarItem
                    key={key}
                    href={`#${key}`}
                    active={page === key}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(key);
                    }}
                  >
                    {TITLES[key]}
                  </SidebarItem>
                ))}
              </SidebarSub>
              {item("settings")}
            </SidebarGroup>
          </SidebarContent>
          <SidebarSeparator />
          <SidebarFooter>
            <UserRow />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-pui-border px-3 @3xl:px-4">
            <SidebarTrigger />
            <span aria-hidden="true" className="h-4 w-px bg-pui-border" />
            <h1 className="truncate text-sm font-semibold">{TITLES[page]}</h1>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ms-auto flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface px-3 text-sm text-pui-muted-foreground transition-colors hover:border-pui-primary/40 hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-pui-ring @3xl:w-64"
            >
              <Icon>
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4.5-4.5" />
              </Icon>
              <span className="hidden truncate whitespace-nowrap @3xl:inline">Search or run a command…</span>
              <span className="sr-only @3xl:hidden">Open command palette</span>
              <Kbd size="sm" className="ms-auto hidden @3xl:inline-flex">
                ⌘K
              </Kbd>
            </button>
            <IconButton aria-label="Notifications, 3 unread" variant="ghost" tone="neutral" className="relative" onClick={() => toast.info("3 new notifications", { description: "Two orders and one review are waiting." })}>
              <Icon>
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
              </Icon>
              <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-pui-danger ring-2 ring-pui-background" />
            </IconButton>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={page}
              initial={{ opacity: 0, y: reduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 0.2 }}
              className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 @3xl:gap-5 @3xl:p-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-pui-muted-foreground">Good afternoon, Maya</p>
                  <p className="text-lg font-semibold tracking-tight">Here's how the store is doing</p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    void toast.promise(new Promise((resolve) => setTimeout(resolve, 1400)), {
                      loading: "Exporting report…",
                      success: { title: "Report ready", description: "orders-october.csv was saved to Downloads." },
                      error: "Export failed",
                    })
                  }
                >
                  Export report
                </Button>
              </div>

              <div className="grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-4">
                {KPIS.map((kpi) => (
                  <StatCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.values[kpi.values.length - 1]!}
                    previousValue={kpi.values[0]}
                    format={kpi.format}
                    trend={kpi.values}
                    trendVariant="area"
                    invertDelta={kpi.invert}
                    deltaCaption="vs 2 weeks ago"
                    periods={["7d", "14d", "30d"]}
                    period={period}
                    onPeriodChange={setPeriod}
                  />
                ))}
              </div>

              <section aria-labelledby="deploys-title" className="rounded-pui-xl border border-pui-border bg-pui-surface p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="deploys-title" className="text-sm font-semibold">
                    Storefront deploys in 2026
                  </h2>
                  <span className="text-xs text-pui-muted-foreground">{totalDeploys.toLocaleString("en-US")} deploys</span>
                </div>
                <CalendarHeatmap data={DEPLOYS} date="date" value="count" year={2026} unit={["deploy", "deploys"]} stats={false} chartLabel="Deploys per day in 2026" />
              </section>

              <section aria-labelledby="orders-title" className="rounded-pui-xl border border-pui-border bg-pui-surface">
                <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                  <h2 id="orders-title" className="text-sm font-semibold">
                    Recent orders
                  </h2>
                  <Button size="sm" variant="link" onClick={() => setPage("orders")}>
                    View all
                  </Button>
                </div>
                <OrdersTable />
              </section>
            </motion.main>
          </AnimatePresence>
        </SidebarInset>
      </SidebarProvider>

      <CommandMenu open={paletteOpen} onOpenChange={setPaletteOpen} hotkey={null} label="Commands">
        <CommandInput aria-label="Search commands" placeholder="Search pages and actions…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Go to">
            {(Object.keys(TITLES) as Page[]).map((key) => (
              <CommandItem key={key} value={TITLES[key]} keywords={[key]} onSelect={run(() => setPage(key))}>
                {TITLES[key]}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem value="Create invoice" keywords={["new", "bill"]} shortcut="⌘ I" onSelect={run(() => toast.success("Invoice INV-2207 created", { description: "Draft saved. Send it when you're ready." }))}>
              Create invoice
            </CommandItem>
            <CommandItem value="Invite teammate" keywords={["member", "user"]} onSelect={run(() => toast({ title: "Invite link copied", description: "It expires in 7 days." }))}>
              Invite teammate
            </CommandItem>
            <CommandItem value="Pause storefront" keywords={["maintenance"]} onSelect={run(() => toast.warning("Storefront paused", { description: "Visitors see the maintenance page." }))}>
              Pause storefront
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandMenu>
    </div>
  );
}
