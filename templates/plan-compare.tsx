/**
 * Plan comparison. A real table with a sticky plan header (name, rolling price, call to action),
 * an "only show differences" switch that folds identical rows away and counts them, a column that
 * lights up under the pointer or keyboard focus, and a plan switcher on narrow containers so the
 * table never needs sideways scrolling on a phone.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { RollingNumber } from "changelui/rolling-number";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { Switch } from "changelui/switch";
import { durations, easings } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
type Billing = "monthly" | "yearly";
type Cell = boolean | string;
interface Plan {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  cta: string;
  recommended?: boolean;
}
interface Row {
  feature: string;
  hint?: string;
  values: [Cell, Cell, Cell];
}
const PLANS: Plan[] = [
  { id: "free", name: "Free", monthly: 0, yearly: 0, cta: "Start free" },
  { id: "pro", name: "Pro", monthly: 24, yearly: 19, cta: "Try Pro free", recommended: true },
  { id: "business", name: "Business", monthly: 59, yearly: 47, cta: "Talk to sales" },
];
const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Usage",
    rows: [
      { feature: "Projects", values: ["3", "Unlimited", "Unlimited"] },
      { feature: "Events per month", hint: "Page views, clicks and custom events", values: ["10k", "2M", "10M"] },
      { feature: "Data history", values: ["30 days", "1 year", "Unlimited"] },
      { feature: "Realtime dashboard", values: [true, true, true] },
      { feature: "CSV export", values: [true, true, true] },
    ],
  },
  {
    title: "Collaboration",
    rows: [
      { feature: "Seats", values: ["1", "5 included", "Unlimited"] },
      { feature: "Shared dashboards", values: [false, true, true] },
      { feature: "Comments and mentions", values: [true, true, true] },
      { feature: "Guest viewers", hint: "Read-only links for clients", values: [false, "10", "Unlimited"] },
    ],
  },
  {
    title: "Security",
    rows: [
      { feature: "Two-factor auth", values: [true, true, true] },
      { feature: "SSO (SAML, OIDC)", values: [false, false, true] },
      { feature: "Audit log", values: [false, "30 days", "1 year"] },
      { feature: "Data residency", hint: "Choose where your data is stored", values: [false, false, true] },
    ],
  },
  {
    title: "Support",
    rows: [
      { feature: "Help center and community", values: [true, true, true] },
      { feature: "Email support", values: [false, "Next business day", "4 hour response"] },
      { feature: "Dedicated success manager", values: [false, false, true] },
    ],
  },
];
const USD = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;
const differs = (row: Row) => row.values.some((v) => v !== row.values[0]);
function CellValue({ value }: { value: Cell }): ReactNode {
  if (value === true)
    return (
      <>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="mx-auto size-4 text-pui-primary-text" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m3.5 8.5 3 3 6-7" />
        </svg>
        <span className="sr-only">Included</span>
      </>
    );
  if (value === false)
    return (
      <>
        <span aria-hidden="true" className="mx-auto block h-px w-3 bg-pui-muted-foreground/50" />
        <span className="sr-only">Not included</span>
      </>
    );
  return <span className="text-sm font-medium">{value}</span>;
}
export default function PlanCompare() {
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const [billing, setBilling] = useState<Billing>("yearly");
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [mobilePlan, setMobilePlan] = useState("pro");
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const hidden = SECTIONS.reduce((n, s) => n + s.rows.filter((r) => !differs(r)).length, 0);
  const fade = reduced ? { duration: 0 } : { duration: durations.base, ease: easings.out };
  // Column tint: hover/focus wins, the recommended plan keeps a soft tint otherwise.
  // Header cells are sticky and need an opaque fill, so they tint with a gradient layer instead.
  const colClass = (col: number, header = false) => {
    const plan = PLANS[col]!;
    const narrow = plan.id === mobilePlan ? "" : "hidden @2xl:table-cell";
    const level = hoverCol === col ? 8 : plan.recommended && hoverCol === null ? 4 : 0;
    const tint =
      level === 0 ? "" : header ? (level === 8 ? "bg-linear-to-b from-pui-primary/8 to-pui-primary/8" : "bg-linear-to-b from-pui-primary/4 to-pui-primary/4") : level === 8 ? "bg-pui-primary/8" : "bg-pui-primary/4";
    return `${narrow} ${tint} transition-colors duration-150 motion-reduce:transition-none`;
  };
  const colEvents = (col: number) => ({
    onPointerEnter: () => setHoverCol(col),
    onFocus: () => setHoverCol(col),
  });
  return (
    <section aria-labelledby={`${id}-title`} className="@container bg-pui-background px-5 py-14 text-pui-foreground @3xl:px-8 @3xl:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div className="max-w-xl">
            <h2 id={`${id}-title`} className="text-balance text-3xl font-bold tracking-tight @xl:text-4xl">
              Compare every plan
            </h2>
            <p className="mt-3 text-pretty text-pui-muted-foreground">All plans include the realtime dashboard and unlimited exports. Upgrade or downgrade any time.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <SegmentedControl aria-label="Billing period" size="sm" value={billing} onValueChange={(v) => setBilling(v as Billing)}>
              <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
              <SegmentedControlItem value="yearly">Yearly · save 20%</SegmentedControlItem>
            </SegmentedControl>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Switch size="sm" checked={onlyDiff} onCheckedChange={setOnlyDiff} aria-describedby={`${id}-hidden`} />
              Only show differences
            </label>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 @2xl:hidden">
          <span className="text-sm text-pui-muted-foreground">Showing</span>
          <SegmentedControl aria-label="Plan to compare" size="sm" value={mobilePlan} onValueChange={setMobilePlan}>
            {PLANS.map((p) => (
              <SegmentedControlItem key={p.id} value={p.id}>
                {p.name}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <p id={`${id}-hidden`} className="mt-4 h-5 text-sm text-pui-muted-foreground" aria-live="polite">
          <AnimatePresence initial={false}>
            {onlyDiff ? (
              <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                Hiding {hidden} rows that are the same on every plan.
              </motion.span>
            ) : null}
          </AnimatePresence>
        </p>
        <div
          role="region"
          aria-labelledby={`${id}-title`}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the scroll region must be keyboard scrollable
          tabIndex={0}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          onPointerLeave={() => setHoverCol(null)}
          className="mt-2 max-h-[38rem] overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          <table className="w-full table-fixed border-separate border-spacing-0 text-start">
            <caption className="sr-only">Plan comparison, prices billed {billing}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className={`sticky top-0 z-10 w-1/2 border-b bg-pui-surface p-4 text-start align-bottom text-sm font-medium @2xl:w-[34%] text-pui-muted-foreground transition-shadow ${scrolled ? "border-pui-border shadow-pui-sm" : "border-transparent"}`}
                >
                  Features
                </th>
                {PLANS.map((p, col) => (
                  <th
                    key={p.id}
                    scope="col"
                    {...colEvents(col)}
                    className={`sticky top-0 z-10 border-b bg-pui-surface p-4 text-start align-bottom font-normal transition-shadow ${scrolled ? "border-pui-border shadow-pui-sm" : "border-transparent"} ${colClass(col, true)}`}
                  >
                    <div className="flex min-h-5 items-center gap-2">
                      <span className="text-base font-semibold text-pui-foreground">{p.name}</span>
                      {p.recommended ? (
                        <Badge tone="primary" variant="soft" size="sm">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <RollingNumber value={billing === "yearly" ? p.yearly : p.monthly} format={USD} className="text-2xl font-bold tracking-tight tabular-nums" />
                      <span className="text-xs text-pui-muted-foreground">/ seat / mo</span>
                    </div>
                    <Button size="sm" variant={p.recommended ? "solid" : "outline"} tone={p.recommended ? "primary" : "neutral"} className="mt-3 w-full">
                      {p.cta}
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            {SECTIONS.map((section) => {
              const rows = onlyDiff ? section.rows.filter(differs) : section.rows;
              if (rows.length === 0) return null;
              return (
                <tbody key={section.title}>
                  <tr>
                    {/* One cell per column (no colSpan) so hidden plan columns on narrow screens take no width. */}
                    <th scope="colgroup" className="border-b border-pui-border bg-pui-muted/50 px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground">
                      {section.title}
                    </th>
                    {PLANS.map((p, col) => (
                      <td key={p.id} aria-hidden="true" className={`border-b border-pui-border bg-pui-muted/50 ${PLANS[col]!.id === mobilePlan ? "" : "hidden @2xl:table-cell"}`} />
                    ))}
                  </tr>
                  <AnimatePresence initial={false}>
                    {rows.map((row) => (
                      <motion.tr key={row.feature} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="group/row">
                        <th scope="row" className="border-b border-pui-border px-4 py-3 text-start align-middle font-normal group-last/row:border-b-0">
                          <span className="block text-sm font-medium text-pui-foreground">{row.feature}</span>
                          {row.hint ? <span className="mt-0.5 block text-xs text-pui-muted-foreground">{row.hint}</span> : null}
                        </th>
                        {row.values.map((value, col) => (
                            <td key={PLANS[col]!.id} {...colEvents(col)} className={`border-b border-pui-border px-4 py-3 text-center align-middle group-last/row:border-b-0 @2xl:text-start ${colClass(col)}`}>
                              <span className="inline-flex min-h-5 items-center @2xl:[&>svg]:mx-0 @2xl:[&>span[aria-hidden]]:mx-0">
                                <CellValue value={value} />
                              </span>
                            </td>
                        ))}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              );
            })}
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-pui-muted-foreground">Prices in USD per seat, before tax. Business includes a 99.9% uptime SLA.</p>
      </div>
    </section>
  );
}
