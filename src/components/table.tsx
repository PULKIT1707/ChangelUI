"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type SortDirection = "asc" | "desc";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Cell padding. Default "md". */
  density?: "compact" | "md" | "comfortable";
  /** Zebra rows. Default false. */
  striped?: boolean;
  /** Row hover tint. Default true. */
  hoverable?: boolean;
  /** Keep the header visible while the wrapper scrolls (give the wrapper a max height). Default false. */
  stickyHeader?: boolean;
  /** Animate row reorders (e.g. after sorting) on springs.layout; off above 50 rows. Default true. */
  animateRows?: boolean;
  /** Props for the scrolling wrapper div. */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
}

export type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;

export interface TableRowProps extends MotionSafeHTMLProps<HTMLTableRowElement> {
  /** Marks the row selected (data-state="selected" + aria-selected). */
  selected?: boolean;
}

export interface TableHeadProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "align"> {
  /** Render a sort button in the header. */
  sortable?: boolean;
  /** Current direction when this column is the sorted one; undefined when not sorted. */
  sortDirection?: SortDirection | false;
  onSort?: () => void;
  /** Text alignment; "end" also puts the sort icon before the label. Default "start". */
  align?: "start" | "center" | "end";
}

export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  align?: "start" | "center" | "end";
}

export type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

interface TableContextValue {
  density: NonNullable<TableProps["density"]>;
  striped: boolean;
  hoverable: boolean;
  stickyHeader: boolean;
  animateRows: boolean;
}

const TableContext = React.createContext<TableContextValue>({
  density: "md",
  striped: false,
  hoverable: true,
  stickyHeader: false,
  animateRows: true,
});
const BodyContext = React.createContext<{ layout: boolean; section: "head" | "body" | "foot" }>({ layout: false, section: "body" });

const MAX_ANIMATED_ROWS = 50;

const cellPadding = {
  compact: "px-3 py-1.5",
  md: "px-4 py-2.5",
  comfortable: "px-5 py-3.5",
} as const;

const alignClass = { start: "text-start", center: "text-center", end: "text-end" } as const;

/** Styled native table with sortable headers and animated row reordering. Not a data grid. */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { density = "md", striped = false, hoverable = true, stickyHeader = false, animateRows = true, wrapperProps, className, ...props },
  ref,
) {
  const context = React.useMemo(
    () => ({ density, striped, hoverable, stickyHeader, animateRows }),
    [density, striped, hoverable, stickyHeader, animateRows],
  );
  return (
    <TableContext.Provider value={context}>
      <div
        {...wrapperProps}
        className={cn(
          blockReset,
          "relative w-full overflow-auto rounded-pui-lg border border-pui-border bg-pui-surface",
          wrapperProps?.className,
        )}
      >
        <table
          ref={ref}
          data-density={density}
          {...props}
          className={cn(blockReset, "w-full border-separate border-spacing-0 text-sm text-pui-surface-foreground", className)}
        />
      </div>
    </TableContext.Provider>
  );
});

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableHeader(
  { className, ...props },
  ref,
) {
  const { stickyHeader } = React.useContext(TableContext);
  return (
    <BodyContext.Provider value={{ layout: false, section: "head" }}>
      <thead
        ref={ref}
        {...props}
        className={cn(
          blockReset,
          "[&_th]:border-b [&_th]:border-pui-border [&_th]:bg-pui-muted/45",
          stickyHeader && "[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-pui-surface [&_th]:backdrop-blur-sm",
          className,
        )}
      />
    </BodyContext.Provider>
  );
});

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableBody(
  { className, children, ...props },
  ref,
) {
  const { animateRows } = React.useContext(TableContext);
  const reduced = usePrefersReducedMotion();
  const layout = animateRows && !reduced && React.Children.count(children) <= MAX_ANIMATED_ROWS;
  return (
    <BodyContext.Provider value={{ layout, section: "body" }}>
      <tbody
        ref={ref}
        {...props}
        className={cn(blockReset, "[&>tr:last-child>td]:border-b-0", className)}
      >
        {children}
      </tbody>
    </BodyContext.Provider>
  );
});

export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableFooter(
  { className, ...props },
  ref,
) {
  return (
    <BodyContext.Provider value={{ layout: false, section: "foot" }}>
      <tfoot
        ref={ref}
        {...props}
        className={cn(blockReset, "font-medium [&_td]:border-t [&_td]:border-pui-border [&_td]:bg-pui-muted/45", className)}
      />
    </BodyContext.Provider>
  );
});

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected = false, className, ...props },
  ref,
) {
  const { striped, hoverable } = React.useContext(TableContext);
  const { layout, section } = React.useContext(BodyContext);
  const body = section === "body";
  return (
    <motion.tr
      ref={ref}
      layout={layout ? "position" : false}
      transition={springs.layout}
      aria-selected={body && selected ? true : undefined}
      data-state={selected ? "selected" : undefined}
      {...props}
      className={cn(
        blockReset,
        "transition-colors duration-150",
        body && striped && "even:[&>td]:bg-pui-muted/30",
        body && hoverable && "hover:[&>td]:bg-pui-muted/55",
        body && "data-[state=selected]:[&>td]:bg-pui-primary/10",
        className,
      )}
    />
  );
});

function SortIcon({ direction, reduced }: { direction: SortDirection | false | undefined; reduced: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        blockReset,
        "grid size-4 shrink-0 place-items-center transition-opacity duration-150",
        direction ? "opacity-100 text-pui-primary-text" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60",
      )}
    >
      <motion.svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ rotate: direction === "desc" ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : springs.snappy}
        className={cn(blockReset, "block size-3.5")}
      >
        <path d="M8 13V3" />
        <path d="m4 7 4-4 4 4" />
      </motion.svg>
    </span>
  );
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { sortable = false, sortDirection, onSort, align = "start", scope, className, children, ...props },
  ref,
) {
  const { density } = React.useContext(TableContext);
  const reduced = usePrefersReducedMotion();
  const ariaSort = sortable && sortDirection ? (sortDirection === "asc" ? "ascending" : "descending") : undefined;
  return (
    <th
      ref={ref}
      scope={scope ?? "col"}
      aria-sort={ariaSort}
      {...props}
      className={cn(
        blockReset,
        "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-pui-muted-foreground",
        cellPadding[density],
        alignClass[align],
        sortable && "p-0",
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            controlReset,
            "group/sort inline-flex w-full cursor-pointer items-center gap-1.5 uppercase tracking-wide hover:text-pui-foreground",
            sortDirection && "text-pui-foreground",
            align === "end" && "flex-row-reverse",
            align === "center" && "justify-center",
            cellPadding[density],
            focusRing,
            "focus-visible:-outline-offset-2",
          )}
        >
          <span className={cn(blockReset, "min-w-0")}>{children}</span>
          <SortIcon direction={sortDirection} reduced={reduced} />
        </button>
      ) : (
        children
      )}
    </th>
  );
});

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = "start", className, ...props },
  ref,
) {
  const { density } = React.useContext(TableContext);
  return (
    <td
      ref={ref}
      {...props}
      className={cn(
        blockReset,
        "border-b border-pui-border align-middle transition-colors duration-150",
        cellPadding[density],
        alignClass[align],
        align === "end" && "tabular-nums",
        className,
      )}
    />
  );
});

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
  { className, ...props },
  ref,
) {
  return (
    <caption
      ref={ref}
      {...props}
      className={cn(blockReset, "caption-bottom border-t border-pui-border px-4 py-2.5 text-start text-xs text-pui-muted-foreground", className)}
    />
  );
});

export interface UseTableSortOptions<T> {
  /** Initial sort key. */
  defaultKey?: keyof T & string;
  /** Default "asc". */
  defaultDirection?: SortDirection;
  /** Custom values per key (e.g. a nested field or a date). */
  accessors?: Partial<Record<string, (row: T) => unknown>>;
  /** Clicking a sorted column cycles asc -> desc -> unsorted when true. Default true. */
  allowUnsorted?: boolean;
  /** Collator locale for strings. */
  locale?: string;
}

export interface UseTableSortResult<T> {
  rows: T[];
  sortKey: string | null;
  sortDirection: SortDirection;
  /** Spread on a TableHead: sortable, sortDirection, onSort. */
  getSortProps: (key: string) => Pick<TableHeadProps, "sortable" | "sortDirection" | "onSort">;
  setSort: (key: string | null, direction?: SortDirection) => void;
}

function compareValues(a: unknown, b: unknown, collator: Intl.Collator): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/** Client-side sorting for Table: stable, numeric-aware strings, dates, numbers; empty values last. */
export function useTableSort<T>(rows: readonly T[], options: UseTableSortOptions<T> = {}): UseTableSortResult<T> {
  const { defaultKey, defaultDirection = "asc", accessors, allowUnsorted = true, locale } = options;
  const [sort, setSortState] = React.useState<{ key: string | null; direction: SortDirection }>({
    key: defaultKey ?? null,
    direction: defaultDirection,
  });
  const collator = React.useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: "base" }), [locale]);
  const sorted = React.useMemo(() => {
    if (!sort.key) return [...rows];
    const key = sort.key;
    const get = accessors?.[key] ?? ((row: T) => (row as Record<string, unknown>)[key]);
    const factor = sort.direction === "asc" ? 1 : -1;
    return rows
      .map((row, index) => ({ row, index, value: get(row) }))
      .sort((a, b) => {
        const empty = (v: unknown) => v === null || v === undefined || v === "";
        // Empty values stay last in both directions.
        if (empty(a.value) !== empty(b.value)) return empty(a.value) ? 1 : -1;
        return compareValues(a.value, b.value, collator) * factor || a.index - b.index;
      })
      .map((entry) => entry.row);
  }, [rows, sort, accessors, collator]);

  const cycle = (key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return allowUnsorted ? { key: null, direction: "asc" } : { key, direction: "asc" };
    });
  };

  return {
    rows: sorted,
    sortKey: sort.key,
    sortDirection: sort.direction,
    getSortProps: (key) => ({
      sortable: true,
      sortDirection: sort.key === key ? sort.direction : false,
      onSort: () => cycle(key),
    }),
    setSort: (key, direction = "asc") => setSortState({ key, direction }),
  };
}
