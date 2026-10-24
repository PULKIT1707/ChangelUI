/**
 * SaaS metrics. A revenue dashboard whose panels move together: one period switch drives every
 * panel, and picking a plan in the plan mix (click, or Tab to a legend row and press Enter) narrows
 * the KPI cards, the MRR chart and the expansion list to that plan. A radial clock shows when
 * trials start, so sales knows when to staff the chat.
 *
 * Copy-only template. Replace `buildMetrics` with your warehouse query; everything else reads
 * from its result. Wrap your app in <MotionConfig reducedMotion="user">.
 */
import { AreaChart } from "changelui/area-chart";
import { BarList } from "changelui/bar-list";
import { Button } from "changelui/button";
import { RadialBarChart } from "changelui/radial-bar-chart";
import { RadialClock } from "changelui/radial-clock";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { StatCard } from "changelui/stat-card";
import { useMemo, useState } from "react";

type Plan = "starter" | "pro" | "enterprise";
type Period = "6m" | "12m" | "24m";
const PLANS: { id: Plan; label: string; color: string }[] = [
  { id: "starter", label: "Starter", color: "var(--pui-chart-3)" },
  { id: "pro", label: "Pro", color: "var(--pui-chart-1)" },
  { id: "enterprise", label: "Enterprise", color: "var(--pui-chart-5)" },
];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACCOUNTS: { name: string; plan: Plan; domain: string }[] = [
  { name: "Northwind", plan: "enterprise", domain: "northwind.example" },
  { name: "Lumen Labs", plan: "pro", domain: "lumen.example" },
  { name: "Harbor & Co", plan: "enterprise", domain: "harbor.example" },
  { name: "Fieldnote", plan: "pro", domain: "fieldnote.example" },
  { name: "Pinecrest", plan: "starter", domain: "pinecrest.example" },
  { name: "Octave", plan: "pro", domain: "octave.example" },
  { name: "Tidewater", plan: "enterprise", domain: "tidewater.example" },
  { name: "Bramble", plan: "starter", domain: "bramble.example" },
  { name: "Kestrel", plan: "starter", domain: "kestrel.example" },
];

/** Small seeded generator, so the server and the client render the same numbers. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MonthRow {
  month: string;
  starter: number;
  pro: number;
  enterprise: number;
}

/** 24 months of MRR per plan plus subscribers, churn and trial starts per hour. */
function buildMetrics() {
  const rand = seeded(42);
  const base: Record<Plan, number> = { starter: 18_000, pro: 42_000, enterprise: 61_000 };
  const growth: Record<Plan, number> = { starter: 0.012, pro: 0.026, enterprise: 0.034 };
  const months: MonthRow[] = [];
  for (let i = 0; i < 24; i++) {
    const year = 2025 + Math.floor(i / 12);
    const row: MonthRow = { month: `${MONTH_NAMES[i % 12]} ${String(year).slice(2)}`, starter: 0, pro: 0, enterprise: 0 };
    for (const p of PLANS) {
      base[p.id] *= 1 + growth[p.id] + (rand() - 0.5) * 0.03;
      row[p.id] = Math.round(base[p.id] / 10) * 10;
    }
    months.push(row);
  }
  const price: Record<Plan, number> = { starter: 29, pro: 99, enterprise: 1450 };
  const churn: Record<Plan, number> = { starter: 4.1, pro: 2.3, enterprise: 0.8 };
  const nrr: Record<Plan, number> = { starter: 96, pro: 108, enterprise: 121 };
  const trials = Array.from({ length: 24 }, (_, h) => Math.round(Math.exp(-((h - 10) ** 2) / 8) * 48 + Math.exp(-((h - 15.5) ** 2) / 6) * 64 + 6 + rand() * 6));
  const expansion = ACCOUNTS.map((a) => ({ ...a, added: Math.round((a.plan === "enterprise" ? 2400 : a.plan === "pro" ? 690 : 140) * (0.5 + rand())) }));
  return { months, price, churn, nrr, trials, expansion };
}

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k` : `$${Math.round(v)}`);

export default function SaasMetrics() {
  const metrics = useMemo(() => buildMetrics(), []);
  const [period, setPeriod] = useState<Period>("12m");
  const [plan, setPlan] = useState<Plan | null>(null);
  const span = period === "6m" ? 6 : period === "12m" ? 12 : 24;
  const rows = metrics.months.slice(-span);
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const active = plan ? PLANS.filter((p) => p.id === plan) : PLANS;
  const mrrOf = (r: MonthRow) => active.reduce((sum, p) => sum + r[p.id], 0);
  const subsOf = (r: MonthRow) => active.reduce((sum, p) => sum + Math.round(r[p.id] / metrics.price[p.id]), 0);
  const weighted = (pick: Record<Plan, number>) => {
    const total = active.reduce((sum, p) => sum + last[p.id], 0);
    return active.reduce((sum, p) => sum + pick[p.id] * (last[p.id] / total), 0);
  };
  const planLabel = plan ? PLANS.find((p) => p.id === plan)!.label : "All plans";
  const caption = `vs ${first.month}`;

  return (
    <div className="@container min-h-full bg-pui-background text-pui-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 @3xl:gap-5 @3xl:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-pui-muted-foreground">Revenue · {planLabel}</p>
            <h1 className="text-xl font-semibold tracking-tight">Subscription metrics</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {plan ? (
              <Button size="sm" variant="ghost" tone="neutral" onClick={() => setPlan(null)}>
                Clear plan filter
              </Button>
            ) : null}
            <SegmentedControl aria-label="Period" size="sm" value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SegmentedControlItem value="6m">6 months</SegmentedControlItem>
              <SegmentedControlItem value="12m">12 months</SegmentedControlItem>
              <SegmentedControlItem value="24m">24 months</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </header>

        <section aria-label="Key metrics" className="grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-4">
          <StatCard
            label="MRR"
            value={mrrOf(last)}
            previousValue={mrrOf(first)}
            format={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }}
            trend={rows.map(mrrOf)}
            trendLabels={rows.map((r) => r.month)}
            trendVariant="area"
            deltaCaption={caption}
          />
          <StatCard
            label="Subscribers"
            value={subsOf(last)}
            previousValue={subsOf(first)}
            format={{ maximumFractionDigits: 0 }}
            trend={rows.map(subsOf)}
            trendLabels={rows.map((r) => r.month)}
            trendVariant="bar"
            deltaCaption={caption}
          />
          <StatCard
            label="Net revenue retention"
            value={weighted(metrics.nrr) / 100}
            format={{ style: "percent", maximumFractionDigits: 1 }}
            target={1.1}
            targetLabel="Goal"
            footer={<span className="text-xs text-pui-muted-foreground">Trailing 12 months, MRR weighted</span>}
          />
          <StatCard
            label="Monthly churn"
            value={weighted(metrics.churn) / 100}
            previousValue={(weighted(metrics.churn) + 0.4) / 100}
            invertDelta
            format={{ style: "percent", maximumFractionDigits: 1 }}
            deltaType="absolute"
            deltaCaption={caption}
          />
        </section>

        <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-label="MRR by plan" className="min-w-0 rounded-pui-xl border border-pui-border bg-pui-surface p-4">
            <AreaChart
              title="MRR by plan"
              description={`${rows[0]!.month} – ${last.month}, stacked`}
              data={rows}
              x="month"
              stack="stack"
              height={280}
              yAxis={{ format: money }}
              series={PLANS.map((p) => ({ id: p.id, y: p.id, label: p.label, color: p.color, hidden: !!plan && plan !== p.id, format: money }))}
            />
          </section>
          <section aria-label="Plan breakdown" className="flex min-w-0 flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Plan mix</h2>
              <p className="text-xs text-pui-muted-foreground">Pick a plan to filter the whole page</p>
            </div>
            <RadialBarChart
              chartLabel={`MRR by plan, ${last.month}`}
              data={PLANS.map((p) => ({ key: p.id, label: p.label, value: last[p.id], color: p.color }))}
              active={plan}
              onActiveChange={(k) => setPlan(k as Plan | null)}
              size={220}
              sort="desc"
              // Ring-start labels crowd the top-left and the inner ring has no room for one, so every
              // ring is named with its value in the legend list instead.
              labels="none"
              legend="right"
              format={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }}
              className="items-center"
            />
          </section>
        </div>

        <div className="grid gap-4 @4xl:grid-cols-2">
          <section aria-label="Top expansion" className="min-w-0 rounded-pui-xl border border-pui-border bg-pui-surface p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Top expansion this month</h2>
            <BarList
              listLabel="Expansion MRR by account"
              header={["Account", "Added MRR"]}
              items={metrics.expansion
                .filter((a) => !plan || a.plan === plan)
                .map((a) => ({ key: a.name, label: a.name, value: a.added, color: PLANS.find((p) => p.id === a.plan)!.color }))}
              format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
            />
          </section>
          <section aria-label="Trial starts by hour" className="flex min-w-0 flex-col items-center rounded-pui-xl border border-pui-border bg-pui-surface p-4">
            <RadialClock
              title="When trials start"
              description="Last 30 days, by hour (UTC). Staff live chat in the band."
              data={metrics.trials}
              unit="trials"
              bands={[{ from: 9, to: 18, label: "Chat staffed", color: "var(--pui-chart-2)" }]}
              color="var(--pui-chart-1)"
              size={250}
              className="w-full"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
