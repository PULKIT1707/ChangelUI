"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { BookmarkIcon, CheckIcon, FilterIcon, PlusIcon, RotateCcwIcon, SearchIcon, XIcon } from "../lib/icons";
import { HighlightedText, foldText } from "../lib/listbox";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Matching rows, shown at the end of the option. */
  count?: number;
}
export interface FilterField {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** "select" (default) picks from options; "text" matches a typed phrase. */
  type?: "select" | "text";
  options?: FilterOption[];
}
export type FilterOperator = "is" | "is_not" | "contains" | "not_contains";
export interface ActiveFilter {
  field: string;
  operator: FilterOperator;
  /** Option values (select) or one phrase (text). */
  values: string[];
}
export interface FilterBarValue {
  query: string;
  filters: ActiveFilter[];
}
export interface FilterView {
  id: string;
  label: string;
  value: FilterBarValue;
}
export interface FilterBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  fields: FilterField[];
  value?: FilterBarValue;
  defaultValue?: FilterBarValue;
  onValueChange?: (value: FilterBarValue) => void;
  /** Saved views shown as tabs above the filters. */
  views?: FilterView[];
  /** Active view id (controlled). */
  view?: string | null;
  defaultView?: string | null;
  onViewChange?: (id: string) => void;
  /** Shows "Save view" when the filters drift from the active view (or no view is active). */
  onSaveView?: (value: FilterBarValue, viewId: string | null) => void;
  /** Rows matching the current filters. */
  resultCount?: number;
  /** Noun for the count. Default ["result", "results"]. */
  resultLabel?: [singular: string, plural: string];
  searchPlaceholder?: string;
  /** Accessible name of the toolbar. Default "Filters". */
  label?: string;
}
const EMPTY: FilterBarValue = { query: "", filters: [] };
const OPERATOR_LABEL: Record<FilterOperator, string> = { is: "is", is_not: "is not", contains: "contains", not_contains: "does not contain" };
const flip: Record<FilterOperator, FilterOperator> = { is: "is_not", is_not: "is", contains: "not_contains", not_contains: "contains" };
const isActive = (f: ActiveFilter) => f.values.some((v) => v.trim() !== "");
const sameValue = (a: FilterBarValue, b: FilterBarValue) => {
  const norm = (v: FilterBarValue) =>
    JSON.stringify({
      q: v.query.trim(),
      f: v.filters
        .filter(isActive)
        .map((f) => ({ ...f, values: [...f.values].sort() }))
        .sort((x, y) => x.field.localeCompare(y.field)),
    });
  return norm(a) === norm(b);
};
/**
 * Applies a FilterBar value to rows. `get` maps a field id to the row's value(s); `search` returns
 * the text the query matches (accent- and case-insensitive).
 */
export function filterRows<T>(
  rows: readonly T[],
  value: FilterBarValue,
  get: (row: T, field: string) => string | readonly string[] | null | undefined,
  search?: (row: T) => string,
): T[] {
  const q = foldText(value.query.trim());
  const active = value.filters.filter(isActive);
  return rows.filter((row) => {
    if (q && search && !foldText(search(row)).includes(q)) return false;
    return active.every((f) => {
      const raw = get(row, f.field);
      const cell = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]) as string[];
      if (f.operator === "contains" || f.operator === "not_contains") {
        const hit = cell.some((c) => foldText(c).includes(foldText(f.values[0] ?? "")));
        return f.operator === "contains" ? hit : !hit;
      }
      const hit = cell.some((c) => f.values.includes(c));
      return f.operator === "is" ? hit : !hit;
    });
  });
}
const chipButton = cn(
  controlReset,
  focusRing,
  "inline-flex h-full cursor-pointer items-center gap-1 px-2 text-xs transition-colors hover:bg-pui-muted -outline-offset-2",
);
/**
 * Data-table filter toolbar. Search, an Add filter menu and one chip per filter: the field, an
 * operator you click to flip (is / is not), the picked values in a searchable popover with counts,
 * and a remove button. Saved views sit above as tabs; when the filters drift from the active view
 * an Unsaved dot, Reset and Save view appear. `filterRows` applies the value to your data.
 */
export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(function FilterBar(
  {
    fields,
    value: valueProp,
    defaultValue = EMPTY,
    onValueChange,
    views,
    view: viewProp,
    defaultView,
    onViewChange,
    onSaveView,
    resultCount,
    resultLabel = ["result", "results"],
    searchPlaceholder = "Search…",
    label = "Filters",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [value, setValue] = useControllableState<FilterBarValue>({ value: valueProp, defaultValue, onChange: onValueChange });
  const [viewId, setViewId] = useControllableState<string | null>({
    value: viewProp,
    defaultValue: defaultView ?? null,
    onChange: (next) => {
      if (next !== null) onViewChange?.(next);
    },
  });
  const [addOpen, setAddOpen] = React.useState(false);
  const [openField, setOpenField] = React.useState<string | null>(null);
  const activeView = views?.find((v) => v.id === viewId) ?? null;
  const dirty = activeView ? !sameValue(value, activeView.value) : value.filters.some(isActive) || value.query.trim() !== "";
  const fieldOf = (fieldId: string) => fields.find((f) => f.id === fieldId);
  const update = (patch: Partial<FilterBarValue>) => setValue((prev) => ({ ...prev, ...patch }));
  const setFilter = (fieldId: string, next: ActiveFilter | null) =>
    setValue((prev) => ({
      ...prev,
      filters: next === null ? prev.filters.filter((f) => f.field !== fieldId) : prev.filters.map((f) => (f.field === fieldId ? next : f)),
    }));
  const addFilter = (field: FilterField) => {
    setAddOpen(false);
    if (!value.filters.some((f) => f.field === field.id)) {
      update({ filters: [...value.filters, { field: field.id, operator: field.type === "text" ? "contains" : "is", values: [] }] });
    }
    setOpenField(field.id);
  };
  const closeChip = (fieldId: string) => {
    setOpenField((cur) => (cur === fieldId ? null : cur));
    // A chip left without values is dropped when its editor closes.
    setValue((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.field !== fieldId || isActive(f)) }));
  };
  const hasAny = value.filters.length > 0 || value.query !== "";
  const unused = fields.filter((f) => !value.filters.some((a) => a.field === f.id));
  const count = resultCount;
  const fade = reduced ? { duration: 0 } : { duration: durations.base, ease: easings.out };
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      {...props}
      className={cn(blockReset, "flex w-full min-w-0 flex-col gap-2 text-sm text-pui-foreground", className)}
    >
      {views?.length ? (
        <div className={cn(blockReset, "flex min-w-0 flex-wrap items-center justify-between gap-2")}>
          <div role="radiogroup" aria-label="Saved views" className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-0.5 rounded-pui-md bg-pui-muted p-1")}>
            {views.map((v) => {
              const selected = v.id === viewId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected || (!activeView && v === views[0]) ? 0 : -1}
                  onClick={() => {
                    setViewId(v.id);
                    setValue(v.value);
                    setOpenField(null);
                  }}
                  onKeyDown={(event) => {
                    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                    if (!step) return;
                    event.preventDefault();
                    const at = views.indexOf(v);
                    const next = views[(at + step + views.length) % views.length];
                    if (!next) return;
                    setViewId(next.id);
                    setValue(next.value);
                    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=radio]");
                    buttons?.[(at + step + views.length) % views.length]?.focus();
                  }}
                  className={cn(
                    controlReset,
                    focusRing,
                    "relative isolate inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-pui-sm px-3 text-sm font-medium transition-colors",
                    selected ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                  )}
                >
                  {selected ? (
                    <motion.span
                      layoutId={`${id}-view`}
                      aria-hidden="true"
                      transition={reduced ? { duration: 0 } : springs.snappy}
                      className={cn(blockReset, "absolute inset-0 -z-10 rounded-pui-sm bg-pui-background shadow-pui-sm")}
                    />
                  ) : null}
                  {v.label}
                  <AnimatePresence initial={false}>
                    {selected && dirty ? (
                      <motion.span
                        key="dirty"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={reduced ? { duration: 0 } : springs.bouncy}
                        className={cn(blockReset, "size-1.5 rounded-pui-full bg-pui-warning")}
                      >
                        <span className={cn(blockReset, "sr-only")}>(unsaved changes)</span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {dirty && (activeView || onSaveView) ? (
              <motion.div
                key="view-actions"
                initial={{ opacity: 0, x: reduced ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={fade}
                className={cn(blockReset, "flex items-center gap-1")}
              >
                {activeView ? (
                  <Button size="sm" variant="ghost" tone="neutral" leadingIcon={<RotateCcwIcon className="size-3.5" />} onClick={() => setValue(activeView.value)}>
                    Reset
                  </Button>
                ) : null}
                {onSaveView ? (
                  <Button size="sm" variant="soft" leadingIcon={<BookmarkIcon className="size-3.5" />} onClick={() => onSaveView(value, viewId)}>
                    Save view
                  </Button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
      <div className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-2")}>
        <Input
          size="sm"
          type="search"
          aria-label="Search rows"
          placeholder={searchPlaceholder}
          value={value.query}
          onChange={(event) => update({ query: event.target.value })}
          leadingIcon={<SearchIcon />}
          wrapperClassName="w-full sm:w-56"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        <ul aria-label="Active filters" className={cn(listReset, "contents")}>
          <AnimatePresence initial={false} mode="popLayout">
            {value.filters.map((filter) => {
              const field = fieldOf(filter.field);
              if (!field) return null;
              return (
                <motion.li
                  key={filter.field}
                  layout={!reduced}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                  transition={reduced ? { duration: 0 } : springs.snappy}
                  className={cn(blockReset, "flex")}
                >
                  <FilterChip
                    field={field}
                    filter={filter}
                    open={openField === field.id}
                    onOpenChange={(open) => (open ? setOpenField(field.id) : closeChip(field.id))}
                    onChange={(next) => setFilter(field.id, next)}
                    onRemove={() => setFilter(field.id, null)}
                    reduced={reduced}
                  />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" tone="neutral" leadingIcon={value.filters.length ? <PlusIcon className="size-3.5" /> : <FilterIcon className="size-3.5" />} disabled={unused.length === 0}>
              {value.filters.length ? "Add filter" : "Filter"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1" aria-label="Add a filter">
            <FieldMenu fields={unused} onPick={addFilter} />
          </PopoverContent>
        </Popover>
        <AnimatePresence initial={false}>
          {hasAny ? (
            <motion.span key="clear" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className={cn(blockReset, "inline-flex")}>
              <Button
                size="sm"
                variant="ghost"
                tone="neutral"
                onClick={() => {
                  setValue(EMPTY);
                  setOpenField(null);
                }}
              >
                Clear all
              </Button>
            </motion.span>
          ) : null}
        </AnimatePresence>
        {count !== undefined ? (
          <span role="status" className={cn(blockReset, "ms-auto shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>
            {count.toLocaleString()} {count === 1 ? resultLabel[0] : resultLabel[1]}
          </span>
        ) : null}
      </div>
    </div>
  );
});
/** The field list inside Add filter, with arrow-key movement. */
function FieldMenu({ fields, onPick }: { fields: FilterField[]; onPick: (field: FilterField) => void }) {
  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return (
    <div role="menu" aria-label="Fields" tabIndex={-1} onKeyDown={move} className={cn(blockReset, "flex flex-col")}>
      <p className={cn(blockReset, "px-2 pb-1 pt-1.5 text-xs font-medium text-pui-muted-foreground")}>Filter by</p>
      {fields.map((field) => (
        <button
          key={field.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(field)}
          className={cn(
            controlReset,
            focusRing,
            "flex h-8 cursor-pointer items-center gap-2 rounded-pui-sm px-2 text-start text-sm text-pui-foreground hover:bg-pui-muted focus-visible:bg-pui-muted -outline-offset-2",
          )}
        >
          <span aria-hidden="true" className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center text-pui-muted-foreground [&_svg]:size-4")}>
            {field.icon ?? <FilterIcon />}
          </span>
          {field.label}
        </button>
      ))}
    </div>
  );
}
interface FilterChipProps {
  field: FilterField;
  filter: ActiveFilter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: ActiveFilter) => void;
  onRemove: () => void;
  reduced: boolean;
}
function FilterChip({ field, filter, open, onOpenChange, onChange, onRemove, reduced }: FilterChipProps) {
  const text = field.type === "text";
  const options = field.options ?? [];
  const picked = options.filter((o) => filter.values.includes(o.value));
  const many = !text && filter.values.length > 1;
  const operatorText = many && filter.operator === "is" ? "is any of" : many && filter.operator === "is_not" ? "is none of" : OPERATOR_LABEL[filter.operator];
  let summary: React.ReactNode;
  if (!isActive(filter)) summary = <span className={cn(blockReset, "text-pui-muted-foreground")}>pick…</span>;
  else if (text) summary = `“${filter.values[0]}”`;
  else if (picked.length <= 2) summary = picked.map((o) => o.label).join(", ");
  else summary = `${picked[0]?.label}, ${picked[1]?.label} +${picked.length - 2}`;
  return (
    <div
      className={cn(
        blockReset,
        "flex h-8 items-stretch overflow-hidden rounded-pui-md border border-pui-border bg-pui-surface text-pui-foreground shadow-pui-xs",
        open && "border-pui-ring",
      )}
    >
      <span className={cn(blockReset, "inline-flex items-center gap-1.5 ps-2 pe-1.5 text-xs font-medium")}>
        {field.icon ? <span aria-hidden="true" className={cn(blockReset, "inline-flex text-pui-muted-foreground [&_svg]:size-3.5")}>{field.icon}</span> : null}
        {field.label}
      </span>
      <button
        type="button"
        onClick={() => onChange({ ...filter, operator: flip[filter.operator] })}
        aria-label={`${field.label} ${operatorText}. Switch to ${OPERATOR_LABEL[flip[filter.operator]]}`}
        className={cn(chipButton, "border-s border-pui-border text-pui-muted-foreground")}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={operatorText}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.16, ease: easings.out }}
            className={cn(blockReset, "inline-block whitespace-nowrap")}
          >
            {operatorText}
          </motion.span>
        </AnimatePresence>
      </button>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger aria-label={`${field.label} values`} className={cn(chipButton, "max-w-56 border-s border-pui-border font-medium")}>
          {!text && picked[0]?.icon ? (
            <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 [&_svg]:size-3.5")}>
              {picked[0].icon}
            </span>
          ) : null}
          <span className={cn(blockReset, "truncate")}>{summary}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn("p-1", text ? "w-64 p-2" : "w-60")} aria-label={`Filter ${field.label}`}>
          {text ? (
            <TextEditor field={field} filter={filter} onChange={onChange} onDone={() => onOpenChange(false)} />
          ) : (
            <OptionsEditor field={field} filter={filter} onChange={onChange} />
          )}
        </PopoverContent>
      </Popover>
      <button type="button" onClick={onRemove} aria-label={`Remove ${field.label} filter`} className={cn(chipButton, "border-s border-pui-border px-1.5 text-pui-muted-foreground hover:text-pui-foreground")}>
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
function TextEditor({ field, filter, onChange, onDone }: { field: FilterField; filter: ActiveFilter; onChange: (next: ActiveFilter) => void; onDone: () => void }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onDone();
      }}
      className={cn(blockReset, "flex flex-col gap-1.5")}
    >
      <label className={cn(blockReset, "text-xs font-medium text-pui-muted-foreground")}>
        {field.label} {OPERATOR_LABEL[filter.operator]}
        <Input
          size="sm"
          className="mt-1.5"
          placeholder="Type a phrase, then Enter"
          value={filter.values[0] ?? ""}
          onChange={(event) => onChange({ ...filter, values: [event.target.value] })}
        />
      </label>
    </form>
  );
}
function OptionsEditor({ field, filter, onChange }: { field: FilterField; filter: ActiveFilter; onChange: (next: ActiveFilter) => void }) {
  const [query, setQuery] = React.useState("");
  const options = field.options ?? [];
  const searchable = options.length > 6;
  const shown = query ? options.filter((o) => foldText(o.label).includes(foldText(query.trim()))) : options;
  const toggle = (v: string) => onChange({ ...filter, values: filter.values.includes(v) ? filter.values.filter((x) => x !== v) : [...filter.values, v] });
  const move = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const root = event.currentTarget.closest("[data-pui-filter-options]");
    const items = Array.from(root?.querySelectorAll<HTMLElement>("[role=checkbox]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[at === -1 ? 0 : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return (
    <div data-pui-filter-options="" className={cn(blockReset, "flex flex-col")}>
      {searchable ? (
        <div className={cn(blockReset, "p-1")}>
          <Input size="sm" onKeyDown={move} aria-label={`Search ${field.label}`} placeholder={`Search ${field.label.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} leadingIcon={<SearchIcon />} />
        </div>
      ) : null}
      <ul aria-label={field.label} className={cn(listReset, "flex max-h-64 flex-col overflow-y-auto")}>
        {shown.map((option) => {
          const checked = filter.values.includes(option.value);
          return (
            <li key={option.value} className={cn(blockReset, "flex")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(option.value)}
                onKeyDown={move}
                className={cn(
                  controlReset,
                  focusRing,
                  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-pui-sm px-2 text-start text-sm text-pui-foreground hover:bg-pui-muted focus-visible:bg-pui-muted -outline-offset-2",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    blockReset,
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    checked ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : "border-pui-input",
                  )}
                >
                  {checked ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
                </span>
                {option.icon ? <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 [&_svg]:size-4")}>{option.icon}</span> : null}
                <span className={cn(blockReset, "min-w-0 flex-1 truncate")}>
                  <HighlightedText text={option.label} query={query} />
                </span>
                {option.count !== undefined ? <span className={cn(blockReset, "shrink-0 text-xs tabular-nums text-pui-muted-foreground")}>{option.count}</span> : null}
              </button>
            </li>
          );
        })}
        {shown.length === 0 ? <li className={cn(blockReset, "px-2 py-3 text-center text-xs text-pui-muted-foreground")}>No matches</li> : null}
      </ul>
      {filter.values.length ? (
        <div className={cn(blockReset, "mt-1 border-t border-pui-border p-1")}>
          <button
            type="button"
            onClick={() => onChange({ ...filter, values: [] })}
            className={cn(controlReset, focusRing, "h-7 w-full cursor-pointer rounded-pui-sm text-xs text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground")}
          >
            Clear selection
          </button>
        </div>
      ) : null}
    </div>
  );
}
