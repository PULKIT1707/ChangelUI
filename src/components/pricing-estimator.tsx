"use client";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { RollingNumber } from "../text/rolling-number";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";
import { Slider } from "./slider";

export interface PricingTier {
  /** Inclusive upper bound of the tier; null for the open-ended last tier. */
  upTo: number | null;
  /** Price per unit inside this tier. */
  unitPrice: number;
  /** Fixed amount added when the tier is used. Default 0. */
  flatFee?: number;
  /** Short tier name shown on its chip, e.g. "Starter". */
  label?: string;
}

/** "graduated": each unit is priced by the tier it falls in; "volume": all units use the reached tier. */
export type PricingMode = "graduated" | "volume";
export type PricingBilling = "monthly" | "yearly";

export interface PriceLine {
  /** Index into tiers. */
  tier: number;
  /** First unit counted in this line (1-based). */
  from: number;
  /** Last unit counted in this line. */
  to: number;
  quantity: number;
  amount: number;
}

export interface PriceEstimate {
  /** Usage charge (without basePrice), per month. */
  total: number;
  lines: PriceLine[];
  /** The tier the quantity currently sits in. */
  tierIndex: number;
}

/** Usage price for `quantity` units. Pure, so it can back a server quote or a test. */
export function estimatePrice(tiers: readonly PricingTier[], quantity: number, mode: PricingMode = "graduated"): PriceEstimate {
  const q = Math.max(0, quantity);
  if (tiers.length === 0) return { total: 0, lines: [], tierIndex: 0 };
  const capOf = (tier: PricingTier) => (tier.upTo === null ? Infinity : tier.upTo);
  let index = tiers.findIndex((tier) => q <= capOf(tier));
  if (index === -1) index = tiers.length - 1;
  if (mode === "volume") {
    const tier = tiers[index] as PricingTier;
    const amount = q * tier.unitPrice + (q > 0 ? (tier.flatFee ?? 0) : 0);
    return { total: amount, lines: q > 0 ? [{ tier: index, from: 1, to: q, quantity: q, amount }] : [], tierIndex: index };
  }
  const lines: PriceLine[] = [];
  let floor = 0;
  tiers.forEach((tier, i) => {
    const cap = capOf(tier);
    const used = Math.min(q, cap) - floor;
    if (used > 0) lines.push({ tier: i, from: floor + 1, to: floor + used, quantity: used, amount: used * tier.unitPrice + (tier.flatFee ?? 0) });
    floor = cap;
  });
  return { total: lines.reduce((sum, line) => sum + line.amount, 0), lines, tierIndex: index };
}

export interface PricingEstimatorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "title"> {
  /** Ascending tiers; the last one usually has upTo: null. */
  tiers: PricingTier[];
  /** Default "graduated". */
  mode?: PricingMode;
  /** Quantity (controlled). */
  value?: number;
  /** Default min. */
  defaultValue?: number;
  onValueChange?: (quantity: number) => void;
  /** Default 0. */
  min?: number;
  /** Default: twice the last finite tier bound. */
  max?: number;
  /** Quantity step. Default 1. */
  step?: number;
  /** "tiers": every tier gets an equal share of the track, so small and huge volumes are both easy to pick. Default "tiers". */
  scale?: "tiers" | "linear";
  /** Plural unit, e.g. "seats". Default "units". */
  unitLabel?: string;
  /** Singular unit for the per-unit price. Default unitLabel without a trailing "s". */
  unitSingular?: string;
  /** ISO currency. Default "USD". */
  currency?: string;
  /** Default "en-US" (fixed so server and client agree). */
  locale?: string;
  /** Fixed platform fee per month. Default 0. */
  basePrice?: number;
  /** Yearly discount, 0..1. Above 0 a monthly / yearly switch appears. Default 0. */
  yearlyDiscount?: number;
  billing?: PricingBilling;
  /** Default "monthly". */
  defaultBilling?: PricingBilling;
  onBillingChange?: (billing: PricingBilling) => void;
  /** Heading. Default "Estimate your cost". */
  title?: React.ReactNode;
  /** Slider name. Default "Monthly usage". */
  quantityLabel?: string;
  /** Show the line-by-line breakdown. Default true. */
  showBreakdown?: boolean;
  /** Formats quantities on marks and lines. Default compact ("10K"). */
  formatQuantity?: (quantity: number) => string;
  /** Rendered under the price, e.g. a call to action. */
  footer?: React.ReactNode;
  /** Accent. Default "primary". */
  tone?: Tone;
}

const SEGMENT = 200;

/** Position on an equal-share track <-> quantity, piecewise linear between the tier bounds. */
function tierScale(stops: readonly number[], step: number) {
  const segments = Math.max(1, stops.length - 1);
  const toQuantity = (pos: number) => {
    const seg = Math.min(Math.floor(pos / SEGMENT), segments - 1);
    const t = (pos - seg * SEGMENT) / SEGMENT;
    const a = stops[seg] ?? 0;
    const b = stops[seg + 1] ?? a;
    return Math.round((a + t * (b - a)) / step) * step;
  };
  const toPosition = (quantity: number) => {
    for (let seg = 0; seg < segments; seg += 1) {
      const a = stops[seg] ?? 0;
      const b = stops[seg + 1] ?? a;
      if (quantity <= b || seg === segments - 1) {
        const t = b === a ? 0 : (quantity - a) / (b - a);
        return Math.round((seg + Math.min(Math.max(t, 0), 1)) * SEGMENT);
      }
    }
    return 0;
  };
  return { toQuantity, toPosition, max: segments * SEGMENT };
}

/**
 * Usage-based pricing estimator: drag the volume, watch the price roll, see which tier you are in and
 * exactly how the total is built. Tier bounds sit on the track as labelled marks.
 */
export const PricingEstimator = React.forwardRef<HTMLDivElement, PricingEstimatorProps>(function PricingEstimator(
  {
    tiers,
    mode = "graduated",
    value: valueProp,
    defaultValue,
    onValueChange,
    min = 0,
    max: maxProp,
    step = 1,
    scale = "tiers",
    unitLabel = "units",
    unitSingular,
    currency = "USD",
    locale = "en-US",
    basePrice = 0,
    yearlyDiscount = 0,
    billing: billingProp,
    defaultBilling = "monthly",
    onBillingChange,
    title = "Estimate your cost",
    quantityLabel = "Monthly usage",
    showBreakdown = true,
    formatQuantity: formatQuantityProp,
    footer,
    tone = "primary",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const bounds = tiers.map((tier) => tier.upTo).filter((b): b is number => b !== null && Number.isFinite(b));
  const lastBound = bounds.length > 0 ? Math.max(...bounds) : 100;
  const max = maxProp ?? lastBound * 2;
  const [quantity, setQuantity] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? min,
    onChange: onValueChange,
    name: "value",
  });
  const [billing, setBilling] = useControllableState<PricingBilling>({
    value: billingProp,
    defaultValue: defaultBilling,
    onChange: onBillingChange,
    name: "billing",
  });
  const q = Math.min(Math.max(quantity, min), max);
  const singular = unitSingular ?? unitLabel.replace(/s$/, "");

  const compact = React.useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale]);
  const formatQuantity = formatQuantityProp ?? ((n: number) => compact.format(n));
  const money = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );
  const unitMoney = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 4 }),
    [locale, currency],
  );

  // Inner bounds become stops and marks; the track always spans min..max.
  const stopsKey = bounds.filter((b) => b > min && b < max).join(",");
  const stops = React.useMemo(
    () => [min, ...(stopsKey ? stopsKey.split(",").map(Number) : []), max],
    [min, max, stopsKey],
  );
  const mapping = React.useMemo(() => tierScale(stops, step), [stops, step]);
  const tiered = scale === "tiers" && stops.length > 2;
  const position = tiered ? mapping.toPosition(q) : q;
  const marks = React.useMemo(
    () =>
      stops.slice(1, -1).map((stop) => ({
        value: tiered ? mapping.toPosition(stop) : stop,
        label: formatQuantityProp ? formatQuantityProp(stop) : compact.format(stop),
      })),
    [stops, tiered, mapping, formatQuantityProp, compact],
  );

  const estimate = estimatePrice(tiers, q, mode);
  const monthly = estimate.total + basePrice;
  const discount = Math.min(Math.max(yearlyDiscount, 0), 0.95);
  const yearly = billing === "yearly" && discount > 0;
  const perMonth = yearly ? monthly * (1 - discount) : monthly;
  const savings = monthly * discount * 12;
  const perUnit = q > 0 ? estimate.total / q : 0;

  // Debounced so dragging does not flood screen readers.
  const summary = `${money.format(Math.round(perMonth))} per month for ${q.toLocaleString(locale)} ${unitLabel}`;
  const [announced, setAnnounced] = React.useState("");
  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(summary), 600);
    return () => window.clearTimeout(timer);
  }, [summary]);

  const rangeLabel = (i: number) => {
    const from = i === 0 ? 0 : (tiers[i - 1]?.upTo ?? 0);
    const to = tiers[i]?.upTo ?? null;
    return to === null ? `${formatQuantity(from)}+` : `${formatQuantity(from)}–${formatQuantity(to)}`;
  };

  return (
    <div
      ref={ref}
      data-mode={mode}
      data-billing={billing}
      {...props}
      className={cn(
        blockReset,
        "flex w-full flex-col gap-5 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm",
        toneClasses[tone],
        className,
      )}
    >
      <div className={cn(blockReset, "flex flex-wrap items-center justify-between gap-3")}>
        <h3 id={`${id}-title`} className={cn(blockReset, "text-sm font-semibold")}>
          {title}
        </h3>
        {discount > 0 ? (
          <SegmentedControl
            size="sm"
            aria-label="Billing period"
            value={billing}
            onValueChange={(next) => setBilling(next as PricingBilling)}
          >
            <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
            <SegmentedControlItem value="yearly">
              Yearly
              <span className={cn(blockReset, "ml-1 rounded-pui-full bg-pui-success/15 px-1.5 text-[10px] font-semibold text-pui-success-text")}>
                −{Math.round(discount * 100)}%
              </span>
            </SegmentedControlItem>
          </SegmentedControl>
        ) : null}
      </div>

      <div className={cn(blockReset, "flex flex-col gap-3")}>
        <div className={cn(blockReset, "flex items-baseline justify-between gap-3")}>
          <span id={`${id}-qty`} className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>
            {quantityLabel}
          </span>
          <span className={cn(blockReset, "flex items-baseline gap-1.5")}>
            <RollingNumber value={q} locale={locale} className="text-lg font-semibold tabular-nums" />
            <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{unitLabel}</span>
          </span>
        </div>
        <Slider
          aria-labelledby={`${id}-qty`}
          tone={tone}
          min={tiered ? 0 : min}
          max={tiered ? mapping.max : max}
          step={tiered ? 1 : step}
          value={position}
          onValueChange={(pos) => setQuantity(tiered ? mapping.toQuantity(pos) : pos)}
          formatValue={(pos) => `${(pos === position ? q : tiered ? mapping.toQuantity(pos) : pos).toLocaleString(locale)} ${unitLabel}`}
          showValue="never"
          marks={marks}
        />
      </div>

      <LayoutGroup id={id}>
        <ol aria-label="Tiers" className={cn(listReset, "grid gap-1.5")} style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
          {tiers.map((tier, i) => {
            const current = i === estimate.tierIndex;
            const used = mode === "graduated" ? i < estimate.tierIndex : false;
            return (
              <li
                key={i}
                aria-current={current ? "true" : undefined}
                className={cn(
                  blockReset,
                  "relative flex min-w-0 flex-col gap-0.5 rounded-pui-lg border px-2.5 py-2 transition-colors duration-(--pui-duration-base)",
                  current ? "border-(--pui-tone)/50" : "border-pui-border",
                )}
              >
                {current ? (
                  <motion.span
                    layoutId="tier"
                    aria-hidden="true"
                    className={cn(blockReset, "absolute inset-0 -z-0 rounded-[inherit] bg-(--pui-tone)/10")}
                    transition={reduced ? { duration: 0 } : springs.snappy}
                  />
                ) : null}
                <span className={cn(blockReset, "relative truncate text-[11px] font-medium text-pui-muted-foreground")}>
                  {tier.label ?? rangeLabel(i)}
                  {used ? <span className={cn(blockReset, "sr-only")}> (used)</span> : null}
                </span>
                <span
                  className={cn(
                    blockReset,
                    "relative truncate text-xs font-semibold tabular-nums",
                    current ? "text-(--pui-tone-text)" : "text-pui-foreground",
                  )}
                >
                  {tier.unitPrice === 0 ? "Free" : unitMoney.format(tier.unitPrice)}
                </span>
                {tier.label ? (
                  <span className={cn(blockReset, "relative truncate text-[10px] text-pui-muted-foreground")}>{rangeLabel(i)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </LayoutGroup>

      <div className={cn(blockReset, "flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-pui-border pt-4")}>
        <div className={cn(blockReset, "flex flex-col gap-1")}>
          <span className={cn(blockReset, "flex items-baseline gap-1")}>
            <RollingNumber
              value={Math.round(perMonth)}
              locale={locale}
              format={{ style: "currency", currency, maximumFractionDigits: 0 }}
              className="text-3xl font-bold tracking-tight tabular-nums"
            />
            <span className={cn(blockReset, "text-sm text-pui-muted-foreground")}>/mo</span>
          </span>
          <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
            {yearly
              ? `Billed ${money.format(Math.round(perMonth * 12))} yearly · you save ${money.format(Math.round(savings))}`
              : discount > 0 && monthly > 0
                ? `Save ${money.format(Math.round(savings))} a year with yearly billing`
                : "Billed monthly · cancel anytime"}
          </span>
        </div>
        <span className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>
          {q > 0 && estimate.total > 0 ? `≈ ${unitMoney.format(perUnit)} per ${singular}` : "\u00a0"}
        </span>
      </div>

      {showBreakdown ? (
        <ul aria-label="Price breakdown" className={cn(listReset, "flex flex-col text-xs")}>
          <AnimatePresence initial={false}>
            {basePrice > 0 ? (
              <BreakdownRow key="base" reduced={reduced} label="Platform fee" amount={money.format(basePrice)} />
            ) : null}
            {estimate.lines.map((line) => {
              const tier = tiers[line.tier] as PricingTier;
              const price = tier.unitPrice === 0 ? "free" : `${unitMoney.format(tier.unitPrice)}`;
              const lead = mode === "volume" ? "All" : line.from === 1 ? "First" : "Next";
              return (
                <BreakdownRow
                  key={`${mode}-${line.tier}`}
                  reduced={reduced}
                  label={`${lead} ${formatQuantity(line.quantity)} × ${price}${tier.flatFee ? ` + ${money.format(tier.flatFee)}` : ""}`}
                  amount={money.format(line.amount)}
                />
              );
            })}
          </AnimatePresence>
        </ul>
      ) : null}

      {footer ? <div className={cn(blockReset)}>{footer}</div> : null}
      <span role="status" aria-live="polite" className={cn(blockReset, "sr-only")}>
        {announced}
      </span>
    </div>
  );
});

function BreakdownRow({ label, amount, reduced }: { label: string; amount: string; reduced: boolean }) {
  return (
    <motion.li
      layout={reduced ? false : "position"}
      initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={reduced ? { duration: 0.12 } : springs.smooth}
      className={cn(blockReset, "overflow-hidden")}
    >
      <span className={cn(blockReset, "flex items-center justify-between gap-3 py-1 text-pui-muted-foreground")}>
        <span className={cn(blockReset, "truncate")}>{label}</span>
        <span className={cn(blockReset, "font-medium tabular-nums text-pui-foreground")}>{amount}</span>
      </span>
    </motion.li>
  );
}
