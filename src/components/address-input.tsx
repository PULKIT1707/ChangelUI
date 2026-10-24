"use client";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { durations, springs } from "../lib/motion";
import { blockReset, controlReset, textSize } from "../lib/styles";
import type { Size } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";

export type AddressField = "line1" | "line2" | "city" | "region" | "postalCode";

export interface AddressValue {
  /** ISO 3166-1 alpha-2 code. */
  country: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
}

export interface AddressCountry {
  code: string;
  name: string;
  /** Rows of [field, span of 12]; also the tab order. */
  rows: [AddressField, number][][];
  labels: Partial<Record<AddressField, string>>;
  required: AddressField[];
  postal?: { pattern: RegExp; example: string; numeric?: boolean; format?: (raw: string) => string };
  /** Mailing label lines; {field} placeholders, {COUNTRY} for the name in capitals. */
  template: string[];
}

export interface AddressInputDetails {
  /** Every required field is filled and the postcode matches. */
  complete: boolean;
  /** Messages by field for what is missing or malformed. */
  errors: Partial<Record<AddressField, string>>;
  /** Mailing label, one line per row. */
  formatted: string;
}

export interface AddressInputProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  value?: AddressValue;
  defaultValue?: Partial<AddressValue>;
  onValueChange?: (value: AddressValue, details: AddressInputDetails) => void;
  /** ISO codes offered, in order. Default: every built-in country. */
  countries?: string[];
  /** Visible legend for the fieldset. */
  legend?: React.ReactNode;
  /** Live mailing-label preview under the fields. Default true. */
  preview?: boolean;
  /** Prefix for field names in forms: name.line1, name.city, ... */
  name?: string;
  /** Autocomplete section, e.g. "shipping" or "billing". */
  section?: "shipping" | "billing";
  /** Default "md". */
  size?: Size;
  /** Show every field's error now, not just after blur. */
  showErrors?: boolean;
}

const LINE1 = "Street address";
const LINE2 = "Apartment, suite, etc. (optional)";

const digits = (n: number) => (raw: string) => raw.replace(/\D/g, "").slice(0, n);
const upperAlnum = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

const COUNTRIES: AddressCountry[] = [
  {
    code: "US",
    name: "United States",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 6], ["region", 3], ["postalCode", 3]]],
    labels: { line1: LINE1, line2: LINE2, city: "City", region: "State", postalCode: "ZIP code" },
    required: ["line1", "city", "region", "postalCode"],
    postal: {
      pattern: /^\d{5}(-\d{4})?$/,
      example: "94103",
      numeric: true,
      format: (raw) => {
        const d = raw.replace(/\D/g, "").slice(0, 9);
        return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
      },
    },
    template: ["{line1}", "{line2}", "{city}, {region} {postalCode}", "{COUNTRY}"],
  },
  {
    code: "CA",
    name: "Canada",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 6], ["region", 3], ["postalCode", 3]]],
    labels: { line1: LINE1, line2: LINE2, city: "City", region: "Province", postalCode: "Postal code" },
    required: ["line1", "city", "region", "postalCode"],
    postal: {
      pattern: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
      example: "K1A 0B1",
      format: (raw) => {
        const s = upperAlnum(raw).slice(0, 6);
        return s.length > 3 ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
      },
    },
    template: ["{line1}", "{line2}", "{city} {region} {postalCode}", "{COUNTRY}"],
  },
  {
    code: "GB",
    name: "United Kingdom",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 12]], [["region", 7], ["postalCode", 5]]],
    labels: { line1: LINE1, line2: LINE2, city: "Town or city", region: "County (optional)", postalCode: "Postcode" },
    required: ["line1", "city", "postalCode"],
    postal: {
      pattern: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
      example: "SW1A 1AA",
      format: (raw) => {
        // Keep a space the user typed; add one once the inward code (digit + two letters) is complete.
        const s = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trimStart().slice(0, 8);
        const compact = s.replace(/ /g, "");
        if (s.includes(" ")) return s;
        return compact.length >= 5 && /\d[A-Z]{2}$/.test(compact) ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
      },
    },
    template: ["{line1}", "{line2}", "{CITY}", "{region}", "{postalCode}", "{COUNTRY}"],
  },
  {
    code: "IE",
    name: "Ireland",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 12]], [["region", 7], ["postalCode", 5]]],
    labels: { line1: LINE1, line2: LINE2, city: "Town or city", region: "County", postalCode: "Eircode (optional)" },
    required: ["line1", "city", "region"],
    postal: {
      pattern: /^[A-Z]\d[\dW] [A-Z\d]{4}$/,
      example: "D02 X285",
      format: (raw) => {
        const s = upperAlnum(raw).slice(0, 7);
        return s.length > 3 ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
      },
    },
    template: ["{line1}", "{line2}", "{city}", "Co. {region}", "{postalCode}", "{COUNTRY}"],
  },
  {
    code: "DE",
    name: "Germany",
    rows: [[["line1", 12]], [["line2", 12]], [["postalCode", 4], ["city", 8]]],
    labels: { line1: "Street and house number", line2: LINE2, city: "City", postalCode: "Postcode (PLZ)" },
    required: ["line1", "city", "postalCode"],
    postal: { pattern: /^\d{5}$/, example: "10115", numeric: true, format: digits(5) },
    template: ["{line1}", "{line2}", "{postalCode} {city}", "{COUNTRY}"],
  },
  {
    code: "FR",
    name: "France",
    rows: [[["line1", 12]], [["line2", 12]], [["postalCode", 4], ["city", 8]]],
    labels: { line1: "Number and street", line2: "Building, floor (optional)", city: "City", postalCode: "Postcode" },
    required: ["line1", "city", "postalCode"],
    postal: { pattern: /^\d{5}$/, example: "75008", numeric: true, format: digits(5) },
    template: ["{line1}", "{line2}", "{postalCode} {CITY}", "{COUNTRY}"],
  },
  {
    code: "ES",
    name: "Spain",
    rows: [[["line1", 12]], [["line2", 12]], [["postalCode", 4], ["city", 8]], [["region", 12]]],
    labels: { line1: "Street, number, floor", line2: LINE2, city: "City", region: "Province", postalCode: "Postcode" },
    required: ["line1", "city", "region", "postalCode"],
    postal: { pattern: /^\d{5}$/, example: "28013", numeric: true, format: digits(5) },
    template: ["{line1}", "{line2}", "{postalCode} {city}", "{region}", "{COUNTRY}"],
  },
  {
    code: "NL",
    name: "Netherlands",
    rows: [[["line1", 12]], [["line2", 12]], [["postalCode", 4], ["city", 8]]],
    labels: { line1: "Street and house number", line2: LINE2, city: "City", postalCode: "Postcode" },
    required: ["line1", "city", "postalCode"],
    postal: {
      pattern: /^\d{4} [A-Z]{2}$/,
      example: "1012 AB",
      format: (raw) => {
        const s = upperAlnum(raw);
        const num = /^\d{0,4}/.exec(s)?.[0] ?? "";
        const letters = num.length === 4 ? s.slice(4).replace(/[^A-Z]/g, "").slice(0, 2) : "";
        return letters ? `${num} ${letters}` : num;
      },
    },
    template: ["{line1}", "{line2}", "{postalCode} {city}", "{COUNTRY}"],
  },
  {
    code: "JP",
    name: "Japan",
    rows: [[["postalCode", 4], ["region", 8]], [["city", 12]], [["line1", 12]], [["line2", 12]]],
    labels: { postalCode: "Postal code", region: "Prefecture", city: "City, ward or town", line1: "Block and building number", line2: "Building and room (optional)" },
    required: ["postalCode", "region", "city", "line1"],
    postal: {
      pattern: /^\d{3}-\d{4}$/,
      example: "100-0001",
      numeric: true,
      format: (raw) => {
        const d = raw.replace(/\D/g, "").slice(0, 7);
        return d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
      },
    },
    template: ["〒{postalCode}", "{region} {city}", "{line1}", "{line2}", "{COUNTRY}"],
  },
  {
    code: "IN",
    name: "India",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 7], ["postalCode", 5]], [["region", 12]]],
    labels: { line1: "Flat, house, building", line2: "Area, street, landmark (optional)", city: "City", region: "State", postalCode: "PIN code" },
    required: ["line1", "city", "region", "postalCode"],
    postal: { pattern: /^\d{6}$/, example: "110001", numeric: true, format: digits(6) },
    template: ["{line1}", "{line2}", "{city} {postalCode}", "{region}", "{COUNTRY}"],
  },
  {
    code: "AU",
    name: "Australia",
    rows: [[["line1", 12]], [["line2", 12]], [["city", 6], ["region", 3], ["postalCode", 3]]],
    labels: { line1: LINE1, line2: LINE2, city: "Suburb", region: "State", postalCode: "Postcode" },
    required: ["line1", "city", "region", "postalCode"],
    postal: { pattern: /^\d{4}$/, example: "2000", numeric: true, format: digits(4) },
    template: ["{line1}", "{line2}", "{CITY} {REGION} {postalCode}", "{COUNTRY}"],
  },
  {
    code: "SG",
    name: "Singapore",
    rows: [[["line1", 12]], [["line2", 12]], [["postalCode", 5]]],
    labels: { line1: "Block, street", line2: "Unit number (optional)", postalCode: "Postal code" },
    required: ["line1", "postalCode"],
    postal: { pattern: /^\d{6}$/, example: "018956", numeric: true, format: digits(6) },
    template: ["{line1}", "{line2}", "SINGAPORE {postalCode}"],
  },
];

/** The built-in country formats. */
export const addressCountries: readonly AddressCountry[] = COUNTRIES;

const AUTOCOMPLETE: Record<AddressField, string> = {
  line1: "address-line1",
  line2: "address-line2",
  city: "address-level2",
  region: "address-level1",
  postalCode: "postal-code",
};

const EMPTY: AddressValue = { country: "US", line1: "", line2: "", city: "", region: "", postalCode: "" };

function countryOf(code: string): AddressCountry {
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? (COUNTRIES[0] as AddressCountry);
}

function flagOf(iso: string): string {
  return iso.toUpperCase().replace(/[A-Z]/g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));
}

const plainLabel = (label: string | undefined) => (label ?? "").replace(/\s*\(.*\)$/, "");

const PLACEHOLDER: Record<string, { field: AddressField; upper: boolean }> = {
  line1: { field: "line1", upper: false },
  line2: { field: "line2", upper: false },
  city: { field: "city", upper: false },
  CITY: { field: "city", upper: true },
  region: { field: "region", upper: false },
  REGION: { field: "region", upper: true },
  postalCode: { field: "postalCode", upper: false },
};

/** Mailing-label lines in the country's order; lines whose fields are all empty drop out. */
export function formatAddress(value: AddressValue): string[] {
  const country = countryOf(value.country);
  const used = new Set(country.rows.flat().map(([f]) => f));
  const get = (f: AddressField) => (used.has(f) ? (value[f] ?? "").trim() : "");
  const out: string[] = [];
  for (const line of country.template) {
    const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "");
    const fieldKeys = keys.filter((k) => k !== "COUNTRY");
    if (fieldKeys.length && fieldKeys.every((k) => !get(PLACEHOLDER[k]?.field ?? "line1"))) continue;
    const filled = line.replace(/\{(\w+)\}/g, (_, key: string) => {
      if (key === "COUNTRY") return country.name.toUpperCase();
      const p = PLACEHOLDER[key];
      if (!p) return "";
      const v = get(p.field);
      return p.upper ? v.toUpperCase() : v;
    });
    // Tidy separators left by empty fields ("Austin,  78701" -> "Austin 78701").
    const tidy = filled.replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,(\s*,)+/g, ",").replace(/^[\s,]+|[\s,]+$/g, "");
    if (tidy) out.push(tidy);
  }
  return out;
}

/** Missing required fields and malformed postcodes, with human messages. */
export function validateAddress(value: AddressValue): Partial<Record<AddressField, string>> {
  const country = countryOf(value.country);
  const errors: Partial<Record<AddressField, string>> = {};
  for (const [field] of country.rows.flat()) {
    const v = value[field].trim();
    const label = plainLabel(country.labels[field]);
    // Keep acronyms ("ZIP code", "PIN code") as written; lowercase ordinary words.
    const noun = /^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
    const place = /^(United|Netherlands)/.test(country.name) ? `the ${country.name}` : country.name;
    if (!v && country.required.includes(field)) errors[field] = `Enter ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
    else if (v && field === "postalCode" && country.postal && !country.postal.pattern.test(v))
      errors[field] = `${label}s in ${place} look like ${country.postal.example}`;
  }
  return errors;
}

const fieldHeight: Record<Size, string> = { sm: "h-8 px-2.5", md: "h-9 px-3", lg: "h-11 px-3.5" };

/**
 * Address fields that follow the country instead of a US-only form: pick a country and the fields
 * glide into its order and labels (State, Province, Prefecture; ZIP, Postcode, PIN), the postcode
 * formats as you type (SW1A 1AA, K1A 0B1, 100-0001) and is checked against the local pattern with
 * an example on blur, autocomplete tokens are set for browser autofill, and a live mailing-label
 * preview shows exactly what the courier will print. The ref goes to the fieldset.
 */
export const AddressInput = React.forwardRef<HTMLFieldSetElement, AddressInputProps>(function AddressInput(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    countries: countryCodes,
    legend,
    preview = true,
    name,
    section,
    size = "md",
    showErrors = false,
    disabled,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [state, setState] = React.useState<AddressValue>(() => ({ ...EMPTY, ...defaultValue }));
  const value = valueProp ?? state;
  const [touched, setTouched] = React.useState<Partial<Record<AddressField, boolean>>>({});
  const country = countryOf(value.country);
  const list = React.useMemo(
    () => (countryCodes ? countryCodes.map((c) => COUNTRIES.find((x) => x.code === c.toUpperCase())).filter((c): c is AddressCountry => !!c) : COUNTRIES),
    [countryCodes],
  );
  const errors = validateAddress(value);
  const lines = formatAddress(value);

  const commit = (next: AddressValue) => {
    if (valueProp === undefined) setState(next);
    onValueChange?.(next, { complete: Object.keys(validateAddress(next)).length === 0, errors: validateAddress(next), formatted: formatAddress(next).join("\n") });
  };

  const setField = (field: AddressField, raw: string) => {
    const v = field === "postalCode" && country.postal?.format ? country.postal.format(raw) : raw;
    commit({ ...value, [field]: v });
  };

  const setCountry = (code: string) => {
    const next = countryOf(code);
    const postal = next.postal?.format && value.postalCode ? next.postal.format(value.postalCode) : value.postalCode;
    setTouched({});
    commit({ ...value, country: next.code, postalCode: postal });
  };

  const ac = (field: AddressField) => [section, AUTOCOMPLETE[field]].filter(Boolean).join(" ");
  const fields = country.rows.flat();

  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      data-country={country.code}
      {...props}
      className={cn(blockReset, "m-0 flex w-full min-w-0 flex-col gap-4 border-0 p-0 @container", className)}
    >
      {legend ? <legend className={cn(blockReset, "mb-3 p-0 text-base font-semibold text-pui-foreground")}>{legend}</legend> : null}
      <LayoutGroup id={id}>
        <div className={cn(blockReset, "grid grid-cols-12 gap-x-3 gap-y-3")}>
          <div className={cn(blockReset, "col-span-12 flex flex-col gap-1.5")}>
            <span aria-hidden="true" className={cn(blockReset, "text-sm font-medium text-pui-foreground")}>
              Country or region
            </span>
            <Select value={country.code} onValueChange={setCountry} size={size} disabled={disabled} name={name ? `${name}.country` : undefined}>
              <SelectTrigger aria-label={`Country or region: ${country.name}`} className="w-full" />
              <SelectContent aria-label="Country or region" listClassName="max-h-72">
                {list.map((c) => (
                  <SelectItem key={c.code} value={c.code} textValue={c.name} icon={<span className={cn(blockReset, "text-base leading-none")}>{flagOf(c.code)}</span>}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fields.map(([field, span]) => {
            const fieldId = `${id}-${field}`;
            const label = country.labels[field] ?? field;
            const error = touched[field] || showErrors ? errors[field] : undefined;
            const isPostal = field === "postalCode";
            const hintId = `${fieldId}-hint`;
            return (
              <motion.div
                key={field}
                layout={reduced ? false : "position"}
                transition={springs.layout}
                style={{ "--span": span } as React.CSSProperties}
                className={cn(blockReset, "col-span-12 flex min-w-0 flex-col gap-1.5 @md:col-[span_var(--span)/span_var(--span)]")}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.label
                    key={`${country.code}-${label}`}
                    htmlFor={fieldId}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: durations.base }}
                    className={cn(blockReset, "truncate text-sm font-medium text-pui-foreground")}
                  >
                    {label}
                  </motion.label>
                </AnimatePresence>
                <input
                  id={fieldId}
                  name={name ? `${name}.${field}` : undefined}
                  autoComplete={ac(field)}
                  inputMode={isPostal && country.postal?.numeric ? "numeric" : undefined}
                  autoCapitalize={isPostal ? "characters" : undefined}
                  spellCheck={false}
                  required={country.required.includes(field)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error || isPostal ? hintId : undefined}
                  placeholder={isPostal && country.postal ? `e.g. ${country.postal.example}` : undefined}
                  value={value[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  onBlur={() => setTouched((t) => (t[field] ? t : { ...t, [field]: true }))}
                  className={cn(controlReset, fieldClasses, fieldHeight[size], textSize[size], isPostal && "tabular-nums uppercase placeholder:normal-case", error && invalidClasses)}
                />
                {error || (isPostal && country.postal) ? (
                  <p id={hintId} className={cn(blockReset, "text-xs", error ? "text-pui-danger-text" : "sr-only")}>
                    {error ?? `For example ${country.postal?.example}`}
                  </p>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
      {preview ? (
        <div
          role="group"
          aria-label="Mailing label preview"
          className={cn(
            blockReset,
            "relative overflow-hidden rounded-pui-lg border border-dashed border-pui-border bg-pui-surface px-4 py-3 text-pui-surface-foreground",
          )}
        >
          <div className={cn(blockReset, "mb-1.5 flex items-center justify-between gap-2")}>
            <span className={cn(blockReset, "text-[0.6875rem] font-semibold uppercase tracking-wider text-pui-muted-foreground")}>Label preview</span>
            <span aria-hidden="true" className={cn(blockReset, "text-base leading-none")}>
              {flagOf(country.code)}
            </span>
          </div>
          {lines.length > 1 || value.line1 || value.city || value.postalCode ? (
            <address className={cn(blockReset, "flex flex-col font-mono text-[0.8125rem] not-italic leading-6 text-pui-foreground")}>
              <AnimatePresence initial={false}>
                {lines.map((line, i) => (
                  <motion.span
                    key={`${i}-${line.split(" ")[0] ?? ""}`}
                    layout={reduced ? false : "position"}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={reduced ? { duration: durations.fast } : springs.smooth}
                    className={cn(blockReset, "block truncate")}
                  >
                    {line}
                  </motion.span>
                ))}
              </AnimatePresence>
            </address>
          ) : (
            <p className={cn(blockReset, "text-sm text-pui-muted-foreground")}>Start typing to see the label.</p>
          )}
        </div>
      ) : null}
    </fieldset>
  );
});
