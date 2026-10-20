"use client";

// Chart export: PNG (2x, theme background), SVG (computed styles inlined, so CSS variables are
// resolved and the file renders standalone), CSV (from rows, or read from the chart's own data
// table), copy-image and fullscreen, for any chart in the library or any element with an <svg>.
// <ChartExport> wraps a chart and adds a hover toolbar; <ChartToolbar> targets a ref.
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { CheckIcon, CopyIcon, XIcon } from "../lib/icons";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { ChartLiveRegion } from "./core/a11y";

export type ChartExportFormat = "png" | "svg" | "csv" | "copy";

export interface ChartImageOptions {
  /** Background fill. Default: the nearest opaque background (the theme surface). "transparent" for none. */
  background?: string;
  /** Add the chart's caption title above the image. Default true. */
  includeTitle?: boolean;
  /** Padding around the chart in px. Default 16. */
  padding?: number;
  /**
   * Also capture HTML labels drawn over the chart (stage labels, conversion pills, center values)
   * as SVG text and rects. Tooltips, screen-reader text and `data-export="ignore"` are skipped.
   * Default true.
   */
  includeHtml?: boolean;
}

export interface ChartPngOptions extends ChartImageOptions {
  /** Pixel ratio. Default 2. */
  scale?: number;
}

export type CsvColumn<T> = { key: keyof T & string; label?: string } | { label: string; value: (row: T, index: number) => unknown };

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "color",
  "stop-color",
  "stop-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant-numeric",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
  "visibility",
  "display",
  "transform",
  "transform-origin",
  "transform-box",
] as const;

function resolveTarget(target: Element | null | undefined): Element | null {
  return target ?? null;
}

/** The chart's main <svg>: the largest one inside the target (tooltips and icons are smaller). */
export function findChartSvg(target: Element): SVGSVGElement | null {
  if (target instanceof SVGSVGElement) return target;
  let best: SVGSVGElement | null = null;
  let bestArea = 0;
  for (const svg of Array.from(target.querySelectorAll("svg"))) {
    const r = svg.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea || !best) {
      best = svg;
      bestArea = area;
    }
  }
  return best;
}

function chartTitle(target: Element): string {
  const fig = target.closest("figure") ?? target.querySelector("figure");
  const t = fig?.querySelector("figcaption h1, figcaption h2, figcaption h3, figcaption h4, figcaption p");
  return (t?.textContent ?? "").trim();
}

function opaqueBackground(el: Element): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(bg) && !/\/\s*0\)$/.test(bg)) return bg;
  }
  return "#ffffff";
}

const escapeXml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

const isTransparent = (c: string) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);

/** Hidden, screen-reader-only, tooltip or opted-out: not part of the picture. */
function skipHtml(el: Element, root: Element): boolean {
  for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
    if (node.getAttribute("data-export") === "ignore" || node.getAttribute("role") === "presentation" || node.getAttribute("role") === "status") return true;
    if (node.tagName === "TABLE" || node.tagName === "BUTTON" || node.tagName === "svg") return true;
    const cs = getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return true;
    const r = node.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return true;
  }
  return false;
}

/**
 * HTML drawn over the chart (absolutely positioned labels and pills) as SVG markup in the chart's
 * pixel space: a rounded rect per painted box, and a <text> per text run at its measured position.
 */
function htmlOverlayMarkup(svg: SVGSVGElement): string {
  const root = svg.parentElement;
  if (!root || typeof document.createRange !== "function") return "";
  const origin = svg.getBoundingClientRect();
  const out: string[] = [];
  for (const el of Array.from(root.querySelectorAll("*"))) {
    if (svg.contains(el) || el instanceof SVGElement || skipHtml(el, root)) continue;
    const cs = getComputedStyle(el);
    if (isTransparent(cs.backgroundColor) && (cs.borderTopWidth === "0px" || isTransparent(cs.borderTopColor))) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= origin.width * 0.9 && r.height >= origin.height * 0.9) continue;
    const rx = Number.parseFloat(cs.borderTopLeftRadius) || 0;
    const stroke = cs.borderTopWidth !== "0px" && !isTransparent(cs.borderTopColor) ? ` stroke="${escapeXml(cs.borderTopColor)}" stroke-width="${Number.parseFloat(cs.borderTopWidth) || 1}"` : "";
    out.push(
      `<rect x="${(r.left - origin.left).toFixed(1)}" y="${(r.top - origin.top).toFixed(1)}" width="${r.width.toFixed(1)}" height="${r.height.toFixed(1)}" rx="${Math.min(rx, r.height / 2).toFixed(1)}" fill="${escapeXml(isTransparent(cs.backgroundColor) ? "none" : cs.backgroundColor)}"${stroke}/>`,
    );
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    if (!text || !parent || svg.contains(parent) || skipHtml(parent, root)) continue;
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(parent);
    const size = Number.parseFloat(cs.fontSize) || 12;
    out.push(
      `<text x="${(r.left - origin.left).toFixed(1)}" y="${(r.top - origin.top + r.height / 2).toFixed(1)}" dominant-baseline="central" font-family="${escapeXml(cs.fontFamily)}" font-size="${size}" font-weight="${escapeXml(cs.fontWeight)}" fill="${escapeXml(cs.color)}"${Number(cs.opacity) < 1 ? ` opacity="${cs.opacity}"` : ""}>${escapeXml(text)}</text>`,
    );
  }
  return out.join("");
}

/** A filesystem-friendly name from the chart title ("Revenue by month" -> "revenue-by-month"). */
export function chartFilename(target: Element | null, fallback = "chart"): string {
  const t = target ? chartTitle(target) : "";
  const slug = t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/**
 * Serializes the chart as standalone SVG: every element gets its computed paint and text styles
 * inlined (CSS variables, color-mix and theme tokens resolved), plus a background and title.
 */
export function chartToSvgString(target: Element, options: ChartImageOptions = {}): string {
  const svg = findChartSvg(target);
  if (!svg) throw new Error("chartToSvgString: no <svg> found in the target.");
  const { includeTitle = true, padding = 16, includeHtml = true } = options;
  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
  src.forEach((el, i) => {
    const out = dst[i] as Element | undefined;
    if (!out) return;
    const cs = getComputedStyle(el);
    const parts: string[] = [];
    for (const prop of STYLE_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (!v) continue;
      // Paint servers keep their attribute (gradients and patterns are cloned with the defs).
      if (v.includes("url(")) continue;
      if (prop === "transform" && v === "none") continue;
      parts.push(`${prop}:${v}`);
    }
    out.setAttribute("style", parts.join(";"));
    out.removeAttribute("class");
  });
  clone.removeAttribute("aria-hidden");
  clone.setAttribute("x", String(padding));
  const title = includeTitle ? chartTitle(target) : "";
  const titleH = title ? 28 : 0;
  clone.setAttribute("y", String(padding + titleH));
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("overflow", "visible");
  const W = w + padding * 2;
  const H = h + padding * 2 + titleH;
  const bg = options.background ?? opaqueBackground(svg);
  const fg = getComputedStyle(svg).color || "#111111";
  const font = getComputedStyle(svg).fontFamily || "system-ui, sans-serif";
  const inner = new XMLSerializer().serializeToString(clone);
  const overlay = includeHtml ? htmlOverlayMarkup(svg) : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    bg !== "transparent" ? `<rect width="100%" height="100%" fill="${escapeXml(bg)}"/>` : "",
    title ? `<text x="${padding}" y="${padding + 14}" font-family="${escapeXml(font)}" font-size="14" font-weight="600" fill="${escapeXml(fg)}">${escapeXml(title)}</text>` : "",
    inner,
    overlay ? `<g transform="translate(${padding},${padding + titleH})">${overlay}</g>` : "",
    "</svg>",
  ].join("");
}

/** The chart as a PNG Blob (default 2x). */
export async function chartToPngBlob(target: Element, options: ChartPngOptions = {}): Promise<Blob> {
  const scale = options.scale ?? 2;
  const markup = chartToSvgString(target, options);
  const size = /width="(\d+)" height="(\d+)"/.exec(markup);
  const W = Number(size?.[1] ?? 640);
  const H = Number(size?.[2] ?? 320);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("chartToPngBlob: the SVG could not be rasterized."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("chartToPngBlob: no 2D canvas context.");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("chartToPngBlob: encoding failed."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Triggers a download of `blob` as `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the chart as PNG. */
export async function exportChartPng(target: Element, options: ChartPngOptions & { filename?: string } = {}): Promise<Blob> {
  const blob = await chartToPngBlob(target, options);
  downloadBlob(blob, `${options.filename ?? chartFilename(target)}.png`);
  return blob;
}

/** Downloads the chart as standalone SVG. */
export function exportChartSvg(target: Element, options: ChartImageOptions & { filename?: string } = {}): string {
  const markup = chartToSvgString(target, options);
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), `${options.filename ?? chartFilename(target)}.svg`);
  return markup;
}

/** Copies the chart to the clipboard as a PNG image. */
export async function copyChartImage(target: Element, options: ChartPngOptions = {}): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("copyChartImage: the Clipboard API is not available.");
  // Pass a promise so Safari keeps the user activation while the PNG encodes.
  await navigator.clipboard.write([new ClipboardItem({ "image/png": chartToPngBlob(target, options) })]);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text from rows of objects (columns default to the first row's keys). */
export function toCsv<T extends object>(rows: readonly T[], columns?: readonly CsvColumn<T>[]): string {
  const cols: CsvColumn<T>[] = columns ? [...columns] : rows[0] ? (Object.keys(rows[0]) as Array<keyof T & string>).map((key) => ({ key })) : [];
  const head = cols.map((c) => csvCell("key" in c ? (c.label ?? c.key) : c.label)).join(",");
  const body = rows.map((r, i) => cols.map((c) => csvCell("key" in c ? r[c.key] : c.value(r, i))).join(","));
  return [head, ...body].join("\r\n");
}

/** CSV text read from the first <table> inside the target (every chart renders its data table). */
export function tableToCsv(target: Element): string {
  const table = target.querySelector("table");
  if (!table) return "";
  return Array.from(table.querySelectorAll("tr"))
    .map((tr) =>
      Array.from(tr.children)
        .map((cell) => csvCell((cell.textContent ?? "").trim()))
        .join(","),
    )
    .join("\r\n");
}

/** Downloads CSV from rows, or from the chart's own data table when given an element. */
export function exportChartCsv<T extends object>(source: readonly T[] | Element, options: { columns?: readonly CsvColumn<T>[]; filename?: string } = {}): string {
  const isEl = typeof Element !== "undefined" && source instanceof Element;
  const text = isEl ? tableToCsv(source as Element) : toCsv(source as readonly T[], options.columns);
  // BOM so spreadsheet apps read UTF-8.
  downloadBlob(new Blob(["\ufeff", text], { type: "text/csv;charset=utf-8" }), `${options.filename ?? (isEl ? chartFilename(source as Element) : "chart-data")}.csv`);
  return text;
}

// ---------------------------------------------------------------------------------------------
// Toolbar

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}
function TableIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M9.5 10v9.5" />
    </svg>
  );
}
function ExpandIcon({ active, ...props }: React.SVGProps<SVGSVGElement> & { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {active ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}

export interface ChartToolbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The chart element (or a wrapper with the chart inside). */
  target: React.RefObject<Element | null>;
  /** Buttons, in order. Default ["png", "svg", "csv", "copy"]. */
  formats?: readonly ChartExportFormat[];
  /** Adds a fullscreen toggle for `fullscreenTarget` (default `target`). */
  fullscreen?: boolean;
  fullscreenTarget?: React.RefObject<Element | null>;
  /** File name without extension. Default: the chart title, slugified. */
  filename?: string;
  /** CSV rows. Default: read from the chart's data table. */
  csv?: { rows: readonly object[]; columns?: readonly CsvColumn<object>[] };
  image?: ChartPngOptions;
  onExport?: (format: ChartExportFormat | "fullscreen") => void;
  labels?: Partial<Record<ChartExportFormat | "fullscreen" | "exitFullscreen", string>>;
}

const DEFAULT_LABELS: Record<ChartExportFormat | "fullscreen" | "exitFullscreen", string> = {
  png: "Download PNG",
  svg: "Download SVG",
  csv: "Download CSV",
  copy: "Copy image",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
};
const DONE: Record<ChartExportFormat, string> = { png: "PNG downloaded", svg: "SVG downloaded", csv: "CSV downloaded", copy: "Image copied to the clipboard" };
const SHORT: Record<ChartExportFormat, string> = { png: "PNG", svg: "SVG", csv: "CSV", copy: "" };

/** A roving-focus toolbar with export buttons and an optional fullscreen toggle. */
export const ChartToolbar = React.forwardRef<HTMLDivElement, ChartToolbarProps>(function ChartToolbar(
  { target, formats = ["png", "svg", "csv", "copy"], fullscreen = false, fullscreenTarget, filename, csv, image, onExport, labels, className, onKeyDown, ...rest },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const text = { ...DEFAULT_LABELS, ...labels };
  const [status, setStatus] = React.useState<{ key: string; ok: boolean } | null>(null);
  const [message, setMessage] = React.useState("");
  const [isFull, setIsFull] = React.useState(false);
  const [focusIndex, setFocusIndex] = React.useState(0);
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  React.useEffect(() => {
    if (!fullscreen || typeof document === "undefined") return;
    const onChange = () => {
      const el = (fullscreenTarget ?? target).current;
      const full = !!el && document.fullscreenElement === el;
      setIsFull(full);
      setMessage(full ? "Fullscreen on. Press Escape to exit." : "Fullscreen off.");
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [fullscreen, fullscreenTarget, target]);

  const flash = (key: string, ok: boolean, msg: string) => {
    setStatus({ key, ok });
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), 1600);
  };

  const run = async (format: ChartExportFormat) => {
    const el = resolveTarget(target.current);
    if (!el) return;
    const name = filename ?? chartFilename(el);
    try {
      if (format === "png") await exportChartPng(el, { ...image, filename: name });
      else if (format === "svg") exportChartSvg(el, { ...image, filename: name });
      else if (format === "csv") exportChartCsv(csv ? csv.rows : el, { columns: csv?.columns, filename: name });
      else await copyChartImage(el, image);
      flash(format, true, DONE[format]);
      onExport?.(format);
    } catch {
      flash(format, false, `${text[format]} failed`);
    }
  };

  const toggleFull = async () => {
    const el = (fullscreenTarget ?? target).current as HTMLElement | null;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen();
      else await el.requestFullscreen();
      onExport?.("fullscreen");
    } catch {
      setMessage("Fullscreen is not available here.");
    }
  };

  const items: Array<{ key: string; label: string; onClick: () => void; icon: React.ReactNode; short: string }> = [
    ...formats.map((f) => ({
      key: f,
      label: text[f],
      short: SHORT[f],
      onClick: () => void run(f),
      icon: f === "copy" ? <CopyIcon className="size-3.5" /> : f === "csv" ? <TableIcon className="size-3.5" /> : <DownloadIcon className="size-3.5" />,
    })),
    ...(fullscreen
      ? [{ key: "fullscreen", label: isFull ? text.exitFullscreen : text.fullscreen, short: "", onClick: () => void toggleFull(), icon: <ExpandIcon active={isFull} className="size-3.5" /> }]
      : []),
  ];

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Chart export"
      aria-orientation="horizontal"
      {...rest}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const k = event.key;
        let next = focusIndex;
        if (k === "ArrowRight") next = (focusIndex + 1) % items.length;
        else if (k === "ArrowLeft") next = (focusIndex - 1 + items.length) % items.length;
        else if (k === "Home") next = 0;
        else if (k === "End") next = items.length - 1;
        else return;
        event.preventDefault();
        setFocusIndex(next);
        buttons.current[next]?.focus();
      }}
      className={cn(blockReset, "inline-flex items-center gap-0.5 rounded-pui-lg border border-pui-border bg-pui-background/90 p-0.5 shadow-pui-sm backdrop-blur-md", className)}
    >
      {items.map((item, i) => {
        const st = status?.key === item.key ? status : null;
        return (
          <button
            key={item.key}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            tabIndex={i === focusIndex ? 0 : -1}
            aria-label={item.label}
            title={item.label}
            onFocus={() => setFocusIndex(i)}
            onClick={item.onClick}
            className={cn(
              controlReset,
              focusRing,
              "relative inline-flex h-7 min-w-7 items-center justify-center gap-1 overflow-hidden rounded-pui-md px-1.5 text-[11px] font-medium text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
              st ? (st.ok ? "text-pui-success-text" : "text-pui-danger-text") : "",
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={st ? (st.ok ? "ok" : "err") : "icon"}
                initial={reduced ? false : { opacity: 0, scale: 0.5, filter: "blur(3px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.5, filter: "blur(3px)" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(blockReset, "inline-flex")}
              >
                {st ? st.ok ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" /> : item.icon}
              </motion.span>
            </AnimatePresence>
            {item.short ? <span aria-hidden="true">{item.short}</span> : null}
          </button>
        );
      })}
      <ChartLiveRegion text={message} />
    </div>
  );
});
ChartToolbar.displayName = "ChartToolbar";

export interface ChartExportProps extends Omit<ChartToolbarProps, "target" | "fullscreenTarget"> {
  children?: React.ReactNode;
  /** "hover" shows the toolbar on hover and focus (always on touch screens). Default "hover". */
  toolbar?: "hover" | "always";
  /** Toolbar corner. Default "top-end". */
  placement?: "top-end" | "top-start" | "bottom-end" | "bottom-start";
  toolbarClassName?: string;
}

/**
 * Wraps any chart with a hover toolbar for PNG, SVG and CSV downloads, copy-image and fullscreen.
 * Exports read the chart's own SVG and data table, so no extra wiring is needed.
 */
export const ChartExport = React.forwardRef<HTMLDivElement, ChartExportProps>(function ChartExport(
  { children, toolbar = "hover", placement = "top-end", className, toolbarClassName, formats, fullscreen = true, filename, csv, image, onExport, labels, ...rest },
  ref,
) {
  const inner = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => inner.current as HTMLDivElement);
  const corner = {
    "top-end": "top-2 end-2",
    "top-start": "top-2 start-2",
    "bottom-end": "bottom-2 end-2",
    "bottom-start": "bottom-2 start-2",
  }[placement];
  return (
    <div
      ref={inner}
      {...rest}
      className={cn(
        blockReset,
        "group/chart-export relative min-w-0 [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:overflow-auto [&:fullscreen]:bg-pui-background [&:fullscreen]:p-8",
        className,
      )}
    >
      {children}
      <ChartToolbar
        target={inner}
        formats={formats}
        fullscreen={fullscreen}
        filename={filename}
        csv={csv}
        image={image}
        onExport={onExport}
        labels={labels}
        className={cn(
          "absolute z-20",
          corner,
          toolbar === "hover"
            ? "opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/chart-export:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
            : "",
          toolbarClassName,
        )}
      />
    </div>
  );
});
ChartExport.displayName = "ChartExport";
