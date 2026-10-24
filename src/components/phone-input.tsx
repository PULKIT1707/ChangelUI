"use client";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { hiddenInputClasses } from "../lib/form";
import { CheckIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";
import { useIsomorphicLayoutEffect } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from "./select";
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 code, e.g. "GB". */
  iso: string;
  name: string;
  /** Calling code without "+", e.g. "44". */
  dial: string;
  /** National format; each # is one digit, e.g. "#### ######". */
  pattern: string;
  /** Valid national digit counts. Default: the number of # in the pattern. */
  lengths?: readonly number[];
  /** National trunk prefix dropped from E.164, e.g. "0" in "07911 123456". */
  trunk?: string;
}
export interface PhoneInputDetails {
  country: PhoneCountry;
  /** National digits, without the trunk prefix. */
  digits: string;
  /** Formatted national number as shown. */
  formatted: string;
  /** The digit count fits the country. */
  valid: boolean;
}
export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size" | "type"> {
  /** E.164 value, e.g. "+447911123456". "" when empty. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, details: PhoneInputDetails) => void;
  /** ISO code used until the user picks or pastes another. Default "US". */
  defaultCountry?: string;
  onCountryChange?: (country: PhoneCountry) => void;
  /** Countries to offer (ISO codes, in order) or full PhoneCountry records. Default: about 30 common ones. */
  countries?: readonly (string | PhoneCountry)[];
  /** ISO codes listed first under "Suggested". */
  preferredCountries?: readonly string[];
  /** Default "md". */
  size?: Size;
  invalid?: boolean;
  /** Classes for the root group (className goes there too). */
  wrapperClassName?: string;
  /** Accessible name of the country picker. Default "Country calling code". */
  countryLabel?: string;
}
const UNITED_STATES: PhoneCountry = { iso: "US", name: "United States", dial: "1", pattern: "(###) ###-####" };
const COUNTRIES: readonly PhoneCountry[] = [
  UNITED_STATES,
  { iso: "CA", name: "Canada", dial: "1", pattern: "(###) ###-####" },
  { iso: "MX", name: "Mexico", dial: "52", pattern: "## #### ####" },
  { iso: "BR", name: "Brasil", dial: "55", pattern: "(##) #####-####", lengths: [10, 11], trunk: "0" },
  { iso: "AR", name: "Argentina", dial: "54", pattern: "## ####-####", trunk: "0" },
  { iso: "GB", name: "United Kingdom", dial: "44", pattern: "#### ######", trunk: "0" },
  { iso: "IE", name: "Ireland", dial: "353", pattern: "## ### ####", trunk: "0" },
  { iso: "FR", name: "France", dial: "33", pattern: "# ## ## ## ##", trunk: "0" },
  { iso: "DE", name: "Germany", dial: "49", pattern: "#### #######", lengths: [10, 11], trunk: "0" },
  { iso: "ES", name: "Spain", dial: "34", pattern: "### ## ## ##" },
  { iso: "IT", name: "Italy", dial: "39", pattern: "### ### ####", lengths: [9, 10] },
  { iso: "NL", name: "Netherlands", dial: "31", pattern: "# ########", trunk: "0" },
  { iso: "SE", name: "Sweden", dial: "46", pattern: "##-### ## ##", trunk: "0" },
  { iso: "CH", name: "Switzerland", dial: "41", pattern: "## ### ## ##", trunk: "0" },
  { iso: "PL", name: "Poland", dial: "48", pattern: "### ### ###" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", pattern: "## ### ####", trunk: "0" },
  { iso: "SA", name: "Saudi Arabia", dial: "966", pattern: "## ### ####", trunk: "0" },
  { iso: "EG", name: "Egypt", dial: "20", pattern: "### ### ####", trunk: "0" },
  { iso: "NG", name: "Nigeria", dial: "234", pattern: "### ### ####", trunk: "0" },
  { iso: "KE", name: "Kenya", dial: "254", pattern: "### ######", trunk: "0" },
  { iso: "ZA", name: "South Africa", dial: "27", pattern: "## ### ####", trunk: "0" },
  { iso: "IN", name: "India", dial: "91", pattern: "#####-#####", trunk: "0" },
  { iso: "PK", name: "Pakistan", dial: "92", pattern: "### #######", trunk: "0" },
  { iso: "SG", name: "Singapore", dial: "65", pattern: "#### ####" },
  { iso: "PH", name: "Philippines", dial: "63", pattern: "### ### ####", trunk: "0" },
  { iso: "ID", name: "Indonesia", dial: "62", pattern: "###-####-####", lengths: [9, 10, 11], trunk: "0" },
  { iso: "CN", name: "China", dial: "86", pattern: "### #### ####" },
  { iso: "JP", name: "Japan", dial: "81", pattern: "##-####-####", trunk: "0" },
  { iso: "KR", name: "South Korea", dial: "82", pattern: "##-####-####", lengths: [9, 10], trunk: "0" },
  { iso: "AU", name: "Australia", dial: "61", pattern: "### ### ###", trunk: "0" },
  { iso: "NZ", name: "New Zealand", dial: "64", pattern: "## ### ####", lengths: [8, 9], trunk: "0" },
];
const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));
/** The built-in country table (ISO code, name, calling code, national pattern). */
export const phoneCountries: readonly PhoneCountry[] = COUNTRIES;
const onlyDigits = (text: string) => text.replace(/\D/g, "");
const slots = (pattern: string) => pattern.split("").filter((ch) => ch === "#").length;
const lengthsOf = (country: PhoneCountry) => country.lengths ?? [slots(country.pattern)];
const maxDigits = (country: PhoneCountry) => Math.max(slots(country.pattern), ...lengthsOf(country));
/** Emoji flag from an ISO code (regional indicator letters). */
export function flagOf(iso: string): string {
  return String.fromCodePoint(...iso.toUpperCase().split("").map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
/** Formats national digits with a # pattern, stopping after the last digit. Extra digits are appended. */
export function formatPhone(digits: string, pattern: string): string {
  if (!digits) return "";
  let out = "";
  let used = 0;
  for (const ch of pattern) {
    if (used >= digits.length) break;
    if (ch === "#") out += digits[used++];
    else out += ch;
  }
  return out + digits.slice(used);
}
/** Index in `text` just after its n-th digit (0 = start). */
function caretAfterDigits(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i] ?? "")) seen++;
    if (seen === n) return i + 1;
  }
  return text.length;
}
const stripTrunk = (digits: string, country: PhoneCountry) =>
  country.trunk && digits.startsWith(country.trunk) ? digits.slice(country.trunk.length) : digits;
/**
 * Finds the country whose calling code starts `international` digits. Returns null while the digits
 * are still a prefix of a longer code ("3" for "353"). `prefer` wins ties such as US and Canada (+1).
 */
function matchDial(international: string, list: readonly PhoneCountry[], prefer?: PhoneCountry): PhoneCountry | null {
  const matches = list.filter((c) => international.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length);
  const best = matches[0];
  if (!best) return null;
  // Typing "+35": wait, a longer code may still be coming.
  if (international.length <= best.dial.length && list.some((c) => c.dial.length > international.length && c.dial.startsWith(international))) return null;
  if (prefer && prefer.dial === best.dial) return prefer;
  return best;
}
interface PhoneState {
  iso: string;
  digits: string;
  /** "+4…" typed so far, before a calling code is recognised. */
  draft: string | null;
}
function parseE164(value: string, list: readonly PhoneCountry[], fallback: PhoneCountry): PhoneState {
  const digits = onlyDigits(value);
  if (!digits) return { iso: fallback.iso, digits: "", draft: null };
  const country = matchDial(digits, list, fallback) ?? fallback;
  const national = digits.startsWith(country.dial) ? digits.slice(country.dial.length) : digits;
  return { iso: country.iso, digits: stripTrunk(national, country).slice(0, maxDigits(country)), draft: null };
}
const heights: Record<Size, string> = { sm: "h-8 px-2.5", md: "h-9 px-3", lg: "h-11 px-3.5" };
const triggerPad: Record<Size, string> = { sm: "ps-2 pe-1.5", md: "ps-2.5 pe-2", lg: "ps-3 pe-2.5" };
/**
 * Phone number field joined to a country picker. Digits format as you type in the country's
 * national pattern with a caret that stays put, Backspace skips over separators, a leading trunk 0
 * is dropped, and pasting or typing "+44 7911 123456" switches the country on its own. The value is
 * E.164 ("+447911123456"); a check appears once the number has a valid length. The ref and the
 * input props go to the native input.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    defaultCountry = "US",
    onCountryChange,
    countries,
    preferredCountries,
    size = "md",
    invalid = false,
    disabled,
    name,
    placeholder,
    className,
    wrapperClassName,
    countryLabel = "Country calling code",
    onKeyDown,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const list = React.useMemo<PhoneCountry[]>(() => {
    if (!countries) return [...COUNTRIES];
    const out: PhoneCountry[] = [];
    for (const entry of countries) {
      const c = typeof entry === "string" ? BY_ISO.get(entry.toUpperCase()) : entry;
      if (c) out.push(c);
    }
    return out.length ? out : [...COUNTRIES];
  }, [countries]);
  const fallback = list.find((c) => c.iso === defaultCountry.toUpperCase()) ?? list[0] ?? UNITED_STATES;
  const [state, setState] = React.useState<PhoneState>(() => parseE164(valueProp ?? defaultValue, list, fallback));
  const country = list.find((c) => c.iso === state.iso) ?? fallback;
  const toE164 = (s: PhoneState, c: PhoneCountry) => (s.digits ? `+${c.dial}${s.digits}` : "");
  // Controlled: adopt outside changes to `value` (keeps the picked country when the code is shared, e.g. +1).
  const [seenValue, setSeenValue] = React.useState(valueProp);
  if (valueProp !== undefined && valueProp !== seenValue) {
    setSeenValue(valueProp);
    if (valueProp !== toE164(state, country)) setState(parseE164(valueProp, list, country));
  }
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const caretRef = React.useRef<number | null>(null);
  const flash = useAnimationControls();
  const [announcement, setAnnouncement] = React.useState("");
  const formatted = state.draft ?? formatPhone(state.digits, country.pattern);
  const valid = !state.draft && lengthsOf(country).includes(state.digits.length);
  useIsomorphicLayoutEffect(() => {
    const el = inputRef.current;
    const n = caretRef.current;
    if (!el || n === null) return;
    caretRef.current = null;
    if (document.activeElement !== el) return;
    const pos = state.draft ? formatted.length : caretAfterDigits(formatted, n);
    el.setSelectionRange(pos, pos);
  });
  const commit = (next: PhoneState, caretDigits: number | null) => {
    const nextCountry = list.find((c) => c.iso === next.iso) ?? fallback;
    caretRef.current = caretDigits;
    setState(next);
    if (next.iso !== state.iso) {
      onCountryChange?.(nextCountry);
    }
    const e164 = next.draft ? "" : toE164(next, nextCountry);
    if (e164 !== toE164(state, country) || next.draft !== state.draft) {
      setSeenValue(valueProp === undefined ? undefined : e164);
      onValueChange?.(e164, {
        country: nextCountry,
        digits: next.digits,
        formatted: formatPhone(next.digits, nextCountry.pattern),
        valid: !next.draft && lengthsOf(nextCountry).includes(next.digits.length),
      });
    }
  };
  const detected = (c: PhoneCountry) => {
    setAnnouncement(`Country set to ${c.name}, +${c.dial}`);
    if (!reduced) void flash.start({ scale: [1, 1.06, 1], transition: { duration: 0.35 } });
  };
  const handleInternational = (raw: string) => {
    const intl = onlyDigits(raw);
    const match = matchDial(intl, list, country);
    if (!match) {
      commit({ ...state, digits: "", draft: `+${intl}` }, null);
      return;
    }
    const digits = stripTrunk(intl.slice(match.dial.length), match).slice(0, maxDigits(match));
    commit({ iso: match.iso, digits, draft: null }, digits.length);
    if (match.iso !== country.iso) detected(match);
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (/^\s*(\+|00)/.test(raw)) {
      handleInternational(raw.replace(/^\s*00/, "+"));
      return;
    }
    const caret = event.target.selectionStart ?? raw.length;
    let before = onlyDigits(raw.slice(0, caret)).length;
    let digits = onlyDigits(raw);
    const trimmed = stripTrunk(digits, country);
    if (trimmed !== digits) {
      before = Math.max(0, before - (digits.length - trimmed.length));
      digits = trimmed;
    }
    digits = digits.slice(0, maxDigits(country));
    commit({ iso: country.iso, digits, draft: null }, Math.min(before, digits.length));
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || state.draft) return;
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    if (start !== el.selectionEnd) return;
    // Backspace or Delete next to a separator removes the neighbouring digit instead of doing nothing.
    if (event.key === "Backspace" && start > 0 && !/\d/.test(formatted[start - 1] ?? "")) {
      const n = onlyDigits(formatted.slice(0, start)).length;
      if (n === 0) return;
      event.preventDefault();
      commit({ ...state, digits: state.digits.slice(0, n - 1) + state.digits.slice(n) }, n - 1);
    } else if (event.key === "Delete" && start < formatted.length && !/\d/.test(formatted[start] ?? "")) {
      const n = onlyDigits(formatted.slice(0, start)).length;
      if (n >= state.digits.length) return;
      event.preventDefault();
      commit({ ...state, digits: state.digits.slice(0, n) + state.digits.slice(n + 1) }, n);
    }
  };
  const pickCountry = (iso: string) => {
    const next = list.find((c) => c.iso === iso);
    if (!next) return;
    commit({ iso, digits: state.digits.slice(0, maxDigits(next)), draft: null }, null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const preferred = (preferredCountries ?? []).map((iso) => list.find((c) => c.iso === iso.toUpperCase())).filter((c): c is PhoneCountry => !!c);
  const preferredSet = new Set(preferred.map((c) => c.iso));
  const rest = list.filter((c) => !preferredSet.has(c.iso));
  const examplePlaceholder = placeholder ?? formatPhone("1234567890123".slice(0, slots(country.pattern)), country.pattern);
  const renderItem = (c: PhoneCountry) => (
    <SelectItem key={c.iso} value={c.iso} textValue={c.name} icon={<span className={cn(blockReset, "text-base leading-none")}>{flagOf(c.iso)}</span>}>
      <span className={cn(blockReset, "flex min-w-0 items-center justify-between gap-3")}>
        <span className={cn(blockReset, "truncate")}>{c.name}</span>
        <span className={cn(blockReset, "shrink-0 tabular-nums text-pui-muted-foreground")}>+{c.dial}</span>
      </span>
    </SelectItem>
  );
  return (
    <div
      role="group"
      data-size={size}
      data-valid={valid ? "" : undefined}
      className={cn(blockReset, "relative flex w-full min-w-0 items-stretch", wrapperClassName, className)}
    >
      <Select value={country.iso} onValueChange={pickCountry} size={size} disabled={disabled} invalid={invalid}>
        <motion.span animate={flash} className={cn(blockReset, "relative z-0 flex shrink-0 focus-within:z-10")}>
          <SelectTrigger
            aria-label={`${countryLabel}: ${country.name} +${country.dial}`}
            className={cn("w-auto rounded-e-none", triggerPad[size])}
          >
            {/* The selected item's flag icon is rendered by SelectTrigger itself. */}
            <span className={cn(blockReset, "tabular-nums text-pui-foreground")}>+{country.dial}</span>
          </SelectTrigger>
        </motion.span>
        <SelectContent aria-label={countryLabel} className="w-72" listClassName="max-h-72">
          {preferred.length ? (
            <>
              <SelectGroup>
                <SelectLabel>Suggested</SelectLabel>
                {preferred.map(renderItem)}
              </SelectGroup>
              <SelectSeparator />
            </>
          ) : null}
          <SelectGroup>
            {preferred.length ? <SelectLabel>All countries</SelectLabel> : null}
            {rest.map(renderItem)}
          </SelectGroup>
        </SelectContent>
      </Select>
      <span className={cn(blockReset, "relative -ms-px flex min-w-0 flex-1 focus-within:z-10")}>
        <input
          ref={mergedRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={invalid || undefined}
          data-invalid={invalid ? "" : undefined}
          placeholder={examplePlaceholder}
          disabled={disabled}
          {...props}
          value={formatted}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            onBlur?.(event);
            setAnnouncement("");
          }}
          className={cn(
            controlReset,
            fieldClasses,
            "rounded-s-none tabular-nums shadow-pui-xs",
            heights[size],
            textSize[size],
            "pe-9",
            invalid && invalidClasses,
          )}
        />
        <AnimatePresence initial={false}>
          {valid ? (
            <motion.span
              key="valid"
              aria-hidden="true"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
              transition={reduced ? { duration: 0.12 } : springs.bouncy}
              className={cn(
                blockReset,
                "pointer-events-none absolute end-2.5 top-1/2 -mt-2.5 inline-flex size-5 items-center justify-center rounded-pui-full bg-pui-success/15 text-pui-success-text",
              )}
            >
              <CheckIcon className="size-3" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      {name !== undefined ? (
        <input aria-hidden="true" tabIndex={-1} name={name} value={state.draft ? "" : toE164(state, country)} readOnly className={cn(controlReset, hiddenInputClasses)} />
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announcement}
      </span>
    </div>
  );
});
