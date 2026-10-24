"use client";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { hiddenInputClasses } from "../lib/form";
import { springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface CurrencyInputDetails {
  /** Integer minor units (cents), or null when empty. */
  minor: number | null;
  /** The text as shown, without the currency symbol. */
  formatted: string;
}
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size" | "type" | "min" | "max" | "step"> {
  /** Amount in major units (12.5 = $12.50); null when empty. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null, details: CurrencyInputDetails) => void;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  /** Formatting locale (symbol side, separators). Default: the user's locale. */
  locale?: string;
  /** Clamped on blur, with a nudge and an announcement. */
  min?: number;
  max?: number;
  /** Arrow key step (Shift x10). Default 1. */
  step?: number;
  /** Fraction digits. Default: the currency's (2 for USD, 0 for JPY). */
  decimals?: number;
  /** Allow a leading minus. Default false. */
  allowNegative?: boolean;
  /** Expand 2.5k, 1.2m and 3b as you type them. Default true. */
  shorthand?: boolean;
  /** Show the ISO code after the amount. Default true. */
  showCode?: boolean;
  /** Default "md". */
  size?: Size;
  invalid?: boolean;
  /** Classes for the field box (className goes there too). */
  wrapperClassName?: string;
}
interface LocaleInfo {
  decimal: string;
  group: string;
  symbol: string;
  symbolFirst: boolean;
  decimals: number;
  money: Intl.NumberFormat;
}
function localeInfo(locale: string | undefined, currency: string, decimalsProp: number | undefined): LocaleInfo {
  const fmt = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", numberingSystem: "latn" });
  const parts = fmt.formatToParts(-12345.6);
  const decimals = decimalsProp ?? fmt.resolvedOptions().maximumFractionDigits ?? 2;
  const currencyAt = parts.findIndex((p) => p.type === "currency");
  const integerAt = parts.findIndex((p) => p.type === "integer");
  return {
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    symbol: parts[currencyAt]?.value ?? currency,
    symbolFirst: currencyAt < integerAt,
    decimals,
    money: new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", numberingSystem: "latn", minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  };
}
const MULTIPLIER: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
const MAX_INT_DIGITS = 15;
/** Editing text from parts: grouped integer, optional decimal mark and fraction. */
function compose(info: LocaleInfo, negative: boolean, int: string, hasDecimal: boolean, frac: string): string {
  const cleanInt = int.replace(/^0+(?=\d)/, "");
  const grouped = cleanInt ? groupDigits(cleanInt, info.group) : hasDecimal ? "0" : "";
  if (!grouped && !hasDecimal) return negative ? "-" : "";
  return `${negative ? "-" : ""}${grouped}${hasDecimal && info.decimals > 0 ? info.decimal + frac : ""}`;
}
function groupDigits(int: string, group: string): string {
  // Western three-digit grouping; Intl's own separator char keeps locales like de-DE and fr-FR right.
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}
/** Text for a settled amount (blurred or set from outside): full fraction. */
function textFor(value: number | null, info: LocaleInfo): string {
  if (value === null || !Number.isFinite(value)) return "";
  const fixed = Math.abs(value).toFixed(info.decimals);
  const [int = "0", frac = ""] = fixed.split(".");
  return compose(info, value < 0, int, info.decimals > 0, frac);
}
/** Reads loosely typed or pasted money ("$1,234.50", "1.234,5 €", "2.5k"). */
export function parseMoney(text: string, decimalMark = "."): number | null {
  let t = text.trim().toLowerCase().replace(/[\s\u00a0\u202f']/g, "");
  const negative = /^-|^\(.*\)$|-$/.test(t.replace(/[^\d.,()-]/g, ""));
  const suffix = /([kmb])$/.exec(t.replace(/[^\d.,kmb]/g, ""))?.[1];
  t = t.replace(/[^\d.,]/g, "");
  if (!/\d/.test(t)) return null;
  const lastDot = t.lastIndexOf(".");
  const lastComma = t.lastIndexOf(",");
  let decimalAt = -1;
  if (lastDot !== -1 && lastComma !== -1) decimalAt = Math.max(lastDot, lastComma);
  else {
    const at = Math.max(lastDot, lastComma);
    if (at !== -1) {
      const mark = t[at];
      const count = t.split(mark ?? "").length - 1;
      const after = t.length - at - 1;
      // "1,234" is grouping; "1,5", "12.50" or the locale's own mark is a decimal.
      if (count === 1 && (after !== 3 || mark === decimalMark || suffix)) decimalAt = at;
    }
  }
  const int = (decimalAt === -1 ? t : t.slice(0, decimalAt)).replace(/\D/g, "");
  const frac = decimalAt === -1 ? "" : t.slice(decimalAt + 1).replace(/\D/g, "");
  let value = Number(`${int || "0"}.${frac || "0"}`);
  if (suffix) value *= MULTIPLIER[suffix] ?? 1;
  return negative ? -value : value;
}
const heights: Record<Size, string> = { sm: "h-8 px-2.5 gap-1.5", md: "h-9 px-3 gap-2", lg: "h-11 px-3.5 gap-2" };
/**
 * Money field that formats while you type. Group separators appear live without moving the caret,
 * either "." or "," starts the fraction, Backspace skips separators, and shorthand like 2.5k or 1.2m
 * expands with a little pill. On blur the fraction pads out and min/max clamp with a nudge and a
 * spoken note. The symbol sits on the side the locale puts it. Values are major units with minor
 * units alongside. The ref and the input props go to the native input.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    currency = "USD",
    locale,
    min,
    max,
    step = 1,
    decimals: decimalsProp,
    allowNegative = false,
    shorthand = true,
    showCode = true,
    size = "md",
    invalid = false,
    disabled,
    name,
    placeholder,
    className,
    wrapperClassName,
    onKeyDown,
    onBlur,
    onFocus,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const info = React.useMemo(() => localeInfo(locale, currency, decimalsProp), [locale, currency, decimalsProp]);
  const initial = valueProp !== undefined ? valueProp : defaultValue;
  const [text, setText] = React.useState(() => textFor(initial, info));
  const [amount, setAmount] = React.useState<number | null>(initial);
  const [seen, setSeen] = React.useState(valueProp);
  const [seenInfo, setSeenInfo] = React.useState(info);
  const [focused, setFocused] = React.useState(false);
  const [pill, setPill] = React.useState<{ id: number; label: string } | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const caretRef = React.useRef<number | null>(null);
  const nudge = useAnimationControls();
  // Outside changes (controlled value, locale or currency) re-render the text.
  if (seenInfo !== info) {
    setSeenInfo(info);
    setText(textFor(amount, info));
  }
  if (valueProp !== undefined && valueProp !== seen) {
    setSeen(valueProp);
    if (valueProp !== amount) {
      setAmount(valueProp);
      setText(textFor(valueProp, info));
    }
  }
  useIsomorphicLayoutEffect(() => {
    const el = inputRef.current;
    const n = caretRef.current;
    if (!el || n === null) return;
    caretRef.current = null;
    if (document.activeElement !== el) return;
    let pos = text.length;
    let count = 0;
    if (n === 0) pos = 0;
    else
      for (let i = 0; i < text.length; i++) {
        if (/[\d-]/.test(text[i] ?? "") || text[i] === info.decimal) count++;
        if (count === n) {
          pos = i + 1;
          break;
        }
      }
    el.setSelectionRange(pos, pos);
  });
  React.useEffect(() => {
    if (!pill) return;
    const timer = window.setTimeout(() => setPill(null), 1400);
    return () => window.clearTimeout(timer);
  }, [pill]);
  const toMinor = (v: number | null) => (v === null ? null : Math.round(v * 10 ** info.decimals));
  const emit = (next: number | null, nextText: string) => {
    setAmount(next);
    if (valueProp !== undefined) setSeen(next);
    if (next !== amount) onValueChange?.(next, { minor: toMinor(next), formatted: nextText });
  };
  const isSignificant = (ch: string) => /[\d-]/.test(ch) || ch === info.decimal;
  const fromRaw = (raw: string, caret: number) => {
    // Shorthand: "2.5k" becomes 2,500 the moment the letter lands.
    const letter = shorthand ? /[kmb]/i.exec(raw)?.[0]?.toLowerCase() : undefined;
    if (letter) {
      const base = parseMoney(raw.replace(/[kmb]/gi, "").split(info.group).join(""), info.decimal);
      if (base !== null) {
        const expanded = Number((base * (MULTIPLIER[letter] ?? 1)).toFixed(info.decimals));
        const nextText = textFor(allowNegative ? expanded : Math.abs(expanded), info).replace(new RegExp(`\\${info.decimal}0+$`), "");
        setText(nextText);
        caretRef.current = Number.MAX_SAFE_INTEGER;
        setPill({ id: Date.now(), label: `×${new Intl.NumberFormat(locale, { notation: "compact" }).format(MULTIPLIER[letter] ?? 1)}` });
        setAnnouncement(`Expanded to ${info.money.format(expanded)}`);
        emit(allowNegative ? expanded : Math.abs(expanded), nextText);
        return;
      }
    }
    // Pastes may carry symbols and foreign separators: normalise them through parseMoney.
    const foreign = raw.replace(new RegExp(`[\\d\\s\\u00a0\\u202f\\-${escape(info.group)}${escape(info.decimal)}]`, "g"), "");
    if (foreign.length > 0) {
      const parsed = parseMoney(raw, info.decimal);
      const nextText = textFor(parsed === null ? null : allowNegative ? parsed : Math.abs(parsed), info);
      setText(nextText);
      caretRef.current = Number.MAX_SAFE_INTEGER;
      emit(parsed === null ? null : allowNegative ? parsed : Math.abs(parsed), nextText);
      return;
    }
    let before = 0;
    for (const ch of raw.slice(0, caret)) if (isSignificant(ch)) before++;
    const negative = allowNegative && raw.includes("-");
    if (!allowNegative && raw.slice(0, caret).includes("-")) before--;
    else if (negative) before -= (raw.slice(0, caret).match(/-/g)?.length ?? 1) - 1;
    const at = raw.indexOf(info.decimal);
    const hasDecimal = at !== -1 && info.decimals > 0;
    const int = onlyDigits(hasDecimal ? raw.slice(0, at) : raw).slice(0, MAX_INT_DIGITS);
    const frac = hasDecimal ? onlyDigits(raw.slice(at + 1)).slice(0, info.decimals) : "";
    const strippedZeros = int.length - (int.replace(/^0+(?=\d)/, "").length || 0);
    const nextText = compose(info, negative, int, hasDecimal, frac);
    setText(nextText);
    caretRef.current = Math.max(0, Math.min(before - strippedZeros + (hasDecimal && !int ? 1 : 0), nextText.length));
    const digits = int + frac;
    emit(digits ? (negative ? -1 : 1) * Number(`${int || "0"}.${frac || "0"}`) : null, nextText);
  };
  const settle = (next: number | null) => {
    let clamped = next;
    let note = "";
    if (clamped !== null && max !== undefined && clamped > max) {
      clamped = max;
      note = `Maximum is ${info.money.format(max)}`;
    }
    if (clamped !== null && min !== undefined && clamped < min) {
      clamped = min;
      note = `Minimum is ${info.money.format(min)}`;
    }
    const nextText = textFor(clamped, info);
    setText(nextText);
    if (note) {
      setAnnouncement(note);
      if (!reduced) void nudge.start({ x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.36 } });
    }
    emit(clamped, nextText);
    return nextText;
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    if ((event.key === "." || event.key === ",") && !event.metaKey && !event.ctrlKey) {
      // Either mark starts the fraction; grouping is automatic, so a typed group mark is ignored.
      event.preventDefault();
      if (info.decimals === 0 || text.slice(0, start).includes(info.decimal) || text.slice(end).includes(info.decimal)) return;
      const raw = text.slice(0, start) + info.decimal + text.slice(end).split(info.group).join("");
      fromRaw(raw, start + 1);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = (event.shiftKey ? step * 10 : step) * (event.key === "ArrowUp" ? 1 : -1);
      let next = Number(((amount ?? 0) + delta).toFixed(info.decimals));
      if (!allowNegative && next < 0) next = 0;
      if (max !== undefined) next = Math.min(next, max);
      if (min !== undefined) next = Math.max(next, min);
      settle(next);
      caretRef.current = Number.MAX_SAFE_INTEGER;
      return;
    }
    if (start !== end) return;
    if (event.key === "Backspace" && start > 0 && text[start - 1] === info.group) {
      event.preventDefault();
      fromRaw(text.slice(0, start - 2) + text.slice(start), start - 2);
    } else if (event.key === "Delete" && text[start] === info.group) {
      event.preventDefault();
      fromRaw(text.slice(0, start) + text.slice(start + 2), start);
    }
  };
  const symbol = (
    <span aria-hidden="true" className={cn(blockReset, "shrink-0 select-none text-pui-muted-foreground")}>
      {info.symbol}
    </span>
  );
  return (
    <motion.div
      animate={nudge}
      data-size={size}
      data-focused={focused ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onMouseDown={(event) => {
        if (event.target !== inputRef.current) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
      className={cn(
        blockReset,
        "relative flex w-full min-w-0 cursor-text items-center rounded-pui-md border border-pui-input bg-transparent text-pui-foreground shadow-pui-xs",
        "transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out",
        "has-[input:focus-visible]:border-pui-ring has-[input:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
        invalid &&
          "border-pui-danger has-[input:focus-visible]:border-pui-danger has-[input:focus-visible]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-danger)_25%,transparent)]",
        disabled && "cursor-not-allowed opacity-50",
        heights[size],
        textSize[size],
        wrapperClassName,
        className,
      )}
    >
      {info.symbolFirst ? symbol : null}
      <input
        ref={mergedRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        placeholder={placeholder ?? textFor(0, info)}
        disabled={disabled}
        {...props}
        value={text}
        onChange={(event) => fromRaw(event.target.value, event.target.selectionStart ?? event.target.value.length)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          settle(amount);
          onBlur?.(event);
        }}
        className={cn(
          controlReset,
          "h-full w-full min-w-0 flex-1 tabular-nums text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground disabled:cursor-not-allowed",
        )}
      />
      {!info.symbolFirst ? symbol : null}
      <AnimatePresence>
        {pill ? (
          <motion.span
            key={pill.id}
            aria-hidden="true"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.8 }}
            transition={reduced ? { duration: 0.12 } : springs.bouncy}
            className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-pui-primary-text")}
          >
            {pill.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
      {showCode ? (
        <span aria-hidden="true" className={cn(blockReset, "shrink-0 select-none text-xs font-medium tracking-wide text-pui-muted-foreground")}>
          {currency.toUpperCase()}
        </span>
      ) : null}
      {name !== undefined ? (
        <input aria-hidden="true" tabIndex={-1} name={name} value={amount === null ? "" : String(amount)} readOnly className={cn(controlReset, hiddenInputClasses)} />
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </motion.div>
  );
});
function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}
function escape(ch: string): string {
  return ch.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
}
