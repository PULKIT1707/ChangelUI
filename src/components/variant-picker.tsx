"use client";
import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
/** One choice inside an option, e.g. "Forest" in Color or "M" in Size. */
export interface VariantValue {
  value: string;
  /** Visible text and accessible name. Default: value. */
  label?: string;
  /** Any CSS color (or gradient) for swatches. */
  color?: string;
}
/** An option axis such as Color or Size. */
export interface VariantOption {
  /** Key used in `variants[].options` and in the selection. */
  name: string;
  /** Group heading. Default: name. */
  label?: string;
  /** Round color swatches or text chips. Default: "swatch" when every value has a color, else "chip". */
  kind?: "swatch" | "chip";
  values: readonly VariantValue[];
}
/** A purchasable combination. Extra fields (sku, price, image) ride along to onValueChange. */
export interface ProductVariant {
  id?: string;
  options: Readonly<Record<string, string>>;
  /** Units left. undefined means in stock with no count. */
  stock?: number;
  [key: string]: unknown;
}
/** Picked value per option name; missing keys are unpicked. */
export type VariantSelection = Readonly<Record<string, string | undefined>>;
/** How a value relates to the other picks. */
export type VariantValueState = "available" | "low" | "soldout" | "unavailable";
export interface VariantPickerProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "defaultValue" | "onChange"> {
  options: readonly VariantOption[];
  variants: readonly ProductVariant[];
  value?: VariantSelection;
  /** Default {} (nothing picked). */
  defaultValue?: VariantSelection;
  /** Every pick, with the matching variant once every option is picked. */
  onValueChange?: (value: VariantSelection, variant: ProductVariant | undefined) => void;
  /** Stock at or below this shows a "few left" hint. Default 3. */
  lowStock?: number;
  /** Text under the picker for the resolved variant. Default "Only {n} left" / "Sold out" / "In stock". */
  formatStock?: (variant: ProductVariant, state: VariantValueState) => React.ReactNode;
  /** Shown while some options are unpicked. Default "Pick a {label}". */
  promptLabel?: (option: VariantOption) => string;
  /** Hide the stock line under the groups. Default false. */
  hideStock?: boolean;
  /** Default "primary". */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
  disabled?: boolean;
}
const EMPTY: VariantSelection = {};
const inStock = (v: ProductVariant) => v.stock === undefined || v.stock > 0;
function matches(v: ProductVariant, picks: VariantSelection): boolean {
  for (const key in picks) {
    const want = picks[key];
    if (want !== undefined && v.options[key] !== want) return false;
  }
  return true;
}
/** The single variant every option points at, if all options are picked. */
export function findVariant(options: readonly VariantOption[], variants: readonly ProductVariant[], picks: VariantSelection): ProductVariant | undefined {
  if (options.some((o) => picks[o.name] === undefined)) return undefined;
  return variants.find((v) => matches(v, picks));
}
/**
 * Picking `value` for `name` keeps every other pick that still has an in-stock combination with
 * it (in option order) and clears the rest. Sold-out-everywhere values fall back to "exists".
 */
function resolvePick(options: readonly VariantOption[], variants: readonly ProductVariant[], picks: VariantSelection, name: string, value: string) {
  const fits = (c: VariantSelection) => variants.some((v) => inStock(v) && matches(v, c));
  const exists = (c: VariantSelection) => variants.some((v) => matches(v, c));
  const ok = fits({ [name]: value }) ? fits : exists;
  const next: Record<string, string | undefined> = { [name]: value };
  const cleared: string[] = [];
  for (const o of options) {
    if (o.name === name) continue;
    const prev = picks[o.name];
    if (prev === undefined) continue;
    if (ok({ ...next, [o.name]: prev })) next[o.name] = prev;
    else cleared.push(o.name);
  }
  return { next: next as VariantSelection, cleared };
}
const swatchSizes: Record<Size, string> = { sm: "size-7", md: "size-9", lg: "size-11" };
const chipSizes: Record<Size, string> = { sm: "h-8 min-w-10 px-2.5 text-xs", md: "h-9 min-w-12 px-3 text-sm", lg: "h-11 min-w-14 px-4 text-base" };
const gaps: Record<Size, string> = { sm: "gap-1.5", md: "gap-2", lg: "gap-2.5" };
const labelOf = (v: VariantValue) => v.label ?? v.value;
const optionLabel = (o: VariantOption) => o.label ?? o.name;
/**
 * Product option picker that knows the stock matrix. Swatches and size chips cross out values
 * that are sold out or do not exist with the other picks, a ring glides to the picked value, the
 * heading previews what you hover, and a pick that conflicts clears (and flags) only the options
 * it has to, instead of leaving the shopper on an impossible combination.
 */
export const VariantPicker = React.forwardRef<HTMLDivElement, VariantPickerProps>(function VariantPicker(
  {
    options,
    variants,
    value: valueProp,
    defaultValue = EMPTY,
    onValueChange,
    lowStock = 3,
    formatStock,
    promptLabel = (o) => `Pick a ${optionLabel(o).toLowerCase()}`,
    hideStock = false,
    tone = "primary",
    size = "md",
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const uid = React.useId();
  const [picks, setPicks] = useControllableState<VariantSelection>({ value: valueProp, defaultValue, name: "value" });
  const [preview, setPreview] = React.useState<Record<string, string | undefined>>({});
  const [flagged, setFlagged] = React.useState<readonly string[]>([]);
  const [message, setMessage] = React.useState("");
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const stateOf = (name: string, value: string): VariantValueState => {
    const others: Record<string, string | undefined> = { ...picks, [name]: value };
    const found = variants.filter((v) => matches(v, others));
    if (found.length === 0) return "unavailable";
    const live = found.filter(inStock);
    if (live.length === 0) return "soldout";
    const complete = options.every((o) => others[o.name] !== undefined);
    const only = complete ? live[0] : undefined;
    return only?.stock !== undefined && only.stock <= lowStock ? "low" : "available";
  };
  const pick = (option: VariantOption, v: VariantValue) => {
    if (disabled) return;
    const { next, cleared } = resolvePick(options, variants, picks, option.name, v.value);
    setPicks(next);
    setFlagged(cleared);
    const labels = cleared.map((n) => optionLabel(options.find((o) => o.name === n) ?? { name: n, values: [] }).toLowerCase());
    setMessage(
      cleared.length > 0
        ? `${labelOf(v)} selected. ${labels.join(" and ")} cleared: not available with ${labelOf(v)}.`
        : `${optionLabel(option)}: ${labelOf(v)}`,
    );
    onValueChange?.(next, findVariant(options, variants, next));
  };
  const variant = findVariant(options, variants, picks);
  const variantState: VariantValueState | null = variant
    ? !inStock(variant)
      ? "soldout"
      : variant.stock !== undefined && variant.stock <= lowStock
        ? "low"
        : "available"
    : null;
  const missing = options.find((o) => picks[o.name] === undefined);
  const stockText =
    variant && variantState
      ? (formatStock?.(variant, variantState) ??
        (variantState === "soldout" ? "Sold out" : variantState === "low" ? `Only ${variant.stock} left` : "In stock"))
      : missing
        ? promptLabel(missing)
        : "Not available";
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, option: VariantOption, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const n = option.values.length;
    let target = -1;
    if (delta !== 0) target = (index + delta + n) % n;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = n - 1;
    if (target === -1) return;
    event.preventDefault();
    const v = option.values[target];
    if (!v) return;
    refs.current.get(`${option.name}\u0000${v.value}`)?.focus();
    pick(option, v);
  };
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(blockReset, "flex w-full flex-col gap-5", toneClasses[tone], disabled && "opacity-60", className)}
    >
      {options.map((option) => {
        const kind = option.kind ?? (option.values.every((v) => v.color) ? "swatch" : "chip");
        const picked = option.values.find((v) => v.value === picks[option.name]);
        const hovered = option.values.find((v) => v.value === preview[option.name]);
        const shown = hovered ?? picked;
        const isFlagged = flagged.includes(option.name) && !picked;
        const headingId = `${uid}-${option.name}`;
        const tabValue = picked?.value ?? option.values[0]?.value;
        return (
          <div key={option.name} className={cn(blockReset, "flex flex-col gap-2.5")}>
            <div className={cn(blockReset, "flex min-h-5 items-baseline gap-1.5 text-sm")}>
              <span id={headingId} className={cn(blockReset, "font-medium text-pui-foreground")}>
                {optionLabel(option)}
              </span>
              <span
                aria-hidden="true"
                data-pui-variant-preview=""
                className={cn(
                  blockReset,
                  "truncate",
                  isFlagged ? "text-pui-warning-text" : hovered && hovered !== picked ? "text-pui-muted-foreground italic" : "text-pui-muted-foreground",
                )}
              >
                {shown ? labelOf(shown) : isFlagged ? promptLabel(option) : ""}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby={headingId}
              aria-disabled={disabled || undefined}
              className={cn(blockReset, "flex flex-wrap", gaps[size])}
              onPointerLeave={() => setPreview((p) => ({ ...p, [option.name]: undefined }))}
            >
              {option.values.map((v, index) => {
                const state = stateOf(option.name, v.value);
                const checked = picked?.value === v.value;
                const crossed = state === "soldout" || state === "unavailable";
                const note = state === "soldout" ? " (sold out)" : state === "unavailable" ? " (not available with your picks)" : state === "low" ? " (few left)" : "";
                return (
                  <button
                    key={v.value}
                    ref={(el) => {
                      const k = `${option.name}\u0000${v.value}`;
                      if (el) refs.current.set(k, el);
                      else refs.current.delete(k);
                    }}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    aria-label={`${labelOf(v)}${note}`}
                    tabIndex={v.value === tabValue ? 0 : -1}
                    disabled={disabled}
                    data-state={state}
                    data-checked={checked ? "" : undefined}
                    onClick={() => pick(option, v)}
                    onKeyDown={(e) => onKeyDown(e, option, index)}
                    onPointerEnter={() => setPreview((p) => ({ ...p, [option.name]: v.value }))}
                    onFocus={() => setPreview((p) => ({ ...p, [option.name]: undefined }))}
                    className={cn(
                      controlReset,
                      focusRing,
                      "relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center transition-[color,opacity,border-color] duration-(--pui-duration-fast)",
                      kind === "swatch"
                        ? cn("rounded-pui-full p-[3px]", swatchSizes[size])
                        : cn(
                            "rounded-pui-md border font-medium tabular-nums",
                            chipSizes[size],
                            checked ? "border-transparent text-(--pui-tone-fg)" : "border-pui-border text-pui-foreground hover:border-pui-foreground/40",
                            state === "unavailable" && !checked && "border-dashed",
                          ),
                      crossed && !checked && "text-pui-muted-foreground",
                      disabled && "cursor-not-allowed",
                    )}
                  >
                    {checked ? (
                      <motion.span
                        aria-hidden="true"
                        layoutId={`${uid}-ring-${option.name}`}
                        transition={reduced ? { duration: 0 } : springs.snappy}
                        className={cn(
                          blockReset,
                          "absolute inset-0 -z-10 block",
                          kind === "swatch" ? "rounded-pui-full border-2 border-(--pui-tone)" : "rounded-pui-md bg-(--pui-tone) shadow-pui-sm",
                        )}
                      />
                    ) : null}
                    {kind === "swatch" ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          blockReset,
                          "block size-full rounded-pui-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pui-foreground)_18%,transparent)]",
                          crossed && "opacity-45",
                        )}
                        style={{ background: v.color }}
                      />
                    ) : (
                      <span className={cn(blockReset, crossed && !checked && "opacity-60")}>{labelOf(v)}</span>
                    )}
                    {crossed ? (
                      <span
                        aria-hidden="true"
                        data-pui-variant-cross=""
                        className={cn(
                          blockReset,
                          "pointer-events-none absolute top-1/2 left-1/2 block h-[1.5px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full",
                          kind === "swatch" ? "w-[70%] bg-pui-foreground/70" : "w-[78%]",
                          kind === "chip" && (checked ? "bg-(--pui-tone-fg)/80" : "bg-pui-muted-foreground/70"),
                        )}
                      />
                    ) : null}
                    {state === "low" && !checked ? (
                      <span
                        aria-hidden="true"
                        className={cn(blockReset, "absolute -top-0.5 -right-0.5 block size-2 rounded-full bg-pui-warning ring-2 ring-pui-background")}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {hideStock ? null : (
        <p
          data-pui-variant-stock={variantState ?? "incomplete"}
          className={cn(
            blockReset,
            "flex min-h-5 items-center gap-2 text-sm",
            variantState === "soldout"
              ? "text-pui-danger-text"
              : variantState === "low"
                ? "text-pui-warning-text"
                : variantState === "available"
                  ? "text-pui-success-text"
                  : "text-pui-muted-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "block size-1.5 shrink-0 rounded-full",
              variantState === "soldout"
                ? "bg-pui-danger"
                : variantState === "low"
                  ? "bg-pui-warning"
                  : variantState === "available"
                    ? "bg-pui-success"
                    : "bg-pui-muted-foreground/50",
            )}
          />
          {stockText}
        </p>
      )}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {message}
      </span>
    </div>
  );
});
