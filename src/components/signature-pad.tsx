"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { PencilIcon, RotateCcwIcon, TypeIcon, XIcon } from "../lib/icons";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { SegmentedControl, SegmentedControlItem } from "./segmented-control";
export interface SignaturePoint {
  x: number;
  y: number;
  /** Stroke width at this point, in CSS px. */
  w: number;
}
export type SignatureStroke = SignaturePoint[];
export interface SignatureValue {
  mode: "draw" | "type";
  strokes: SignatureStroke[];
  /** Typed name (type mode). */
  text: string;
  /** Standalone SVG markup of the signature (stroke color: currentColor). */
  svg: string;
  /** PNG data URL with a transparent background, or null before mount. */
  toPNG: () => string | null;
}
export interface SignaturePadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Called after every stroke, undo, clear or typed change; null when empty. */
  onChange?: (value: SignatureValue | null) => void;
  /** Pad height in px. Default 180. */
  height?: number;
  /** Offer a Type tab so people who can't draw can sign by typing. Default true. */
  typedFallback?: boolean;
  /** Default "draw". */
  defaultMode?: "draw" | "type";
  /** Pre-filled typed name. */
  defaultText?: string;
  /** Strokes to start with, e.g. a saved signature (CSS px in the pad box). */
  defaultStrokes?: SignatureStroke[];
  /** Accessible name. Default "Signature". */
  label?: string;
  /** Hint on the empty pad. Default "Sign here". */
  placeholder?: string;
  /** Line under the pad, e.g. the signer's name and date. */
  caption?: React.ReactNode;
  /** Thinnest and thickest stroke widths in px. Default 0.9 and 3. */
  minWidth?: number;
  maxWidth?: number;
  /** Ink color (CSS). Default: the theme foreground. */
  penColor?: string;
  disabled?: boolean;
}
const SCRIPT_FONT = '"Segoe Script", "Bradley Hand", "Snell Roundhand", "Brush Script MT", "Lucida Handwriting", cursive';
const mid = (a: SignaturePoint, b: SignaturePoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const round = (n: number) => Math.round(n * 10) / 10;
/** Draws one stroke as quadratic curves through point midpoints, with per-segment width. */
function paintStroke(ctx: CanvasRenderingContext2D, stroke: SignatureStroke, from = 0) {
  const first = stroke[0];
  if (!first) return;
  if (stroke.length === 1) {
    ctx.beginPath();
    ctx.arc(first.x, first.y, first.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = Math.max(1, from); i < stroke.length; i++) {
    const prev = stroke[i - 1] as SignaturePoint;
    const cur = stroke[i] as SignaturePoint;
    const before = stroke[i - 2];
    const start = before ? mid(before, prev) : prev;
    const end = mid(prev, cur);
    ctx.beginPath();
    ctx.lineWidth = (prev.w + cur.w) / 2;
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(prev.x, prev.y, end.x, end.y);
    ctx.stroke();
  }
}
/** SVG markup for strokes (or typed text) in a width x height box. */
export function signatureToSVG(value: { strokes: SignatureStroke[]; text?: string; mode?: "draw" | "type" }, width: number, height: number, color = "currentColor"): string {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}">`;
  if (value.mode === "type") {
    const text = (value.text ?? "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch] ?? ch);
    return `${head}<text x="50%" y="62%" text-anchor="middle" font-family='${SCRIPT_FONT}' font-size="${round(height * 0.32)}" fill="${color}">${text}</text></svg>`;
  }
  const body = value.strokes
    .map((stroke) => {
      const first = stroke[0];
      if (!first) return "";
      if (stroke.length === 1) return `<circle cx="${round(first.x)}" cy="${round(first.y)}" r="${round(first.w / 2)}" fill="${color}"/>`;
      let d = `M${round(first.x)} ${round(first.y)}`;
      for (let i = 1; i < stroke.length; i++) {
        const prev = stroke[i - 1] as SignaturePoint;
        const end = mid(prev, stroke[i] as SignaturePoint);
        d += ` Q${round(prev.x)} ${round(prev.y)} ${round(end.x)} ${round(end.y)}`;
      }
      const last = stroke[stroke.length - 1] as SignaturePoint;
      d += ` L${round(last.x)} ${round(last.y)}`;
      const w = stroke.reduce((sum, p) => sum + p.w, 0) / stroke.length;
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${round(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `${head}${body}</svg>`;
}
/**
 * Signature field for contracts, deliveries and consent forms. Strokes are smoothed into curves and
 * thin out as the pen speeds up (pens use real pressure), Undo and Clear sit beside the pad and
 * Cmd/Ctrl+Z undoes, and a Type tab renders the typed name in a script face so anyone can sign
 * from the keyboard. Exports SVG and PNG through onChange.
 */
export const SignaturePad = React.forwardRef<HTMLDivElement, SignaturePadProps>(function SignaturePad(
  {
    onChange,
    height = 180,
    typedFallback = true,
    defaultMode = "draw",
    defaultText = "",
    defaultStrokes,
    label = "Signature",
    placeholder = "Sign here",
    caption,
    minWidth = 0.9,
    maxWidth = 3,
    penColor,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [mode, setMode] = React.useState<"draw" | "type">(typedFallback ? defaultMode : "draw");
  const [strokes, setStrokes] = React.useState<SignatureStroke[]>(() => defaultStrokes ?? []);
  const [text, setText] = React.useState(defaultText);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sizeRef = React.useRef({ width: 0, height });
  const liveRef = React.useRef<SignatureStroke | null>(null);
  const lastRef = React.useRef<{ x: number; y: number; t: number; w: number } | null>(null);
  const strokesRef = useLatestRef(strokes);
  const onChangeRef = useLatestRef(onChange);
  const inkColor = () => penColor ?? (canvasRef.current ? getComputedStyle(canvasRef.current).color : "#111");
  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = ctx.fillStyle = penColor ?? getComputedStyle(canvas).color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) paintStroke(ctx, stroke);
    if (liveRef.current) paintStroke(ctx, liveRef.current);
  }, [penColor, strokesRef]);
  // Size the backing store to the box and device pixel ratio, and repaint on theme changes.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "draw") return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      redraw();
    };
    fit();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    resize?.observe(canvas);
    const theme = new MutationObserver(redraw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => {
      resize?.disconnect();
      theme.disconnect();
    };
  }, [mode, redraw]);
  React.useEffect(redraw, [strokes, redraw]);
  const valueFor = (nextMode: "draw" | "type", nextStrokes: SignatureStroke[], nextText: string): SignatureValue | null => {
      if (nextMode === "draw" ? nextStrokes.length === 0 : nextText.trim() === "") return null;
      const { width, height: h } = sizeRef.current;
      const w = width || 480;
      return {
        mode: nextMode,
        strokes: nextStrokes,
        text: nextText,
        svg: signatureToSVG({ strokes: nextStrokes, text: nextText, mode: nextMode }, w, h),
        toPNG: () => {
          if (typeof document === "undefined") return null;
          const dpr = window.devicePixelRatio || 1;
          const out = document.createElement("canvas");
          out.width = Math.round(w * dpr);
          out.height = Math.round(h * dpr);
          const ctx = out.getContext("2d");
          if (!ctx) return null;
          ctx.scale(dpr, dpr);
          ctx.strokeStyle = ctx.fillStyle = inkColor();
          ctx.lineCap = ctx.lineJoin = "round";
          if (nextMode === "type") {
            ctx.font = `${h * 0.32}px ${SCRIPT_FONT}`;
            ctx.textAlign = "center";
            ctx.fillText(nextText, w / 2, h * 0.62);
          } else nextStrokes.forEach((s) => paintStroke(ctx, s));
          return out.toDataURL("image/png");
        },
      };
  };
  const emit = (nextMode: "draw" | "type", nextStrokes: SignatureStroke[], nextText: string) =>
    onChangeRef.current?.(valueFor(nextMode, nextStrokes, nextText));
  const pointFrom = (event: PointerEvent | React.PointerEvent, t: number): SignaturePoint => {
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const last = lastRef.current;
    let w: number;
    if (event.pointerType === "pen" && event.pressure > 0) w = minWidth + (maxWidth - minWidth) * event.pressure;
    else if (!last) w = (minWidth + maxWidth) / 2;
    else {
      // Faster movement draws a thinner line, eased so the width never jumps.
      const speed = Math.hypot(x - last.x, y - last.y) / Math.max(1, t - last.t);
      const target = Math.max(minWidth, maxWidth - speed * 1.6);
      w = last.w * 0.65 + target * 0.35;
    }
    lastRef.current = { x, y, t, w };
    return { x, y, w };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    lastRef.current = null;
    liveRef.current = [pointFrom(event, event.timeStamp)];
    redraw();
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const live = liveRef.current;
    if (!live) return;
    const native = event.nativeEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const from = live.length;
    for (const e of events.length ? events : [native]) {
      const p = pointFrom(e, e.timeStamp);
      const prev = live[live.length - 1];
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.8) live.push(p);
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintStroke(ctx, live, Math.max(1, from));
  };
  const endStroke = () => {
    const live = liveRef.current;
    if (!live) return;
    liveRef.current = null;
    const next = [...strokesRef.current, live];
    setStrokes(next);
    emit("draw", next, text);
  };
  const undo = () => {
    if (!strokes.length) return;
    const next = strokes.slice(0, -1);
    setStrokes(next);
    emit("draw", next, text);
  };
  const clear = () => {
    if (mode === "type") {
      setText("");
      emit("type", strokes, "");
      return;
    }
    setStrokes([]);
    emit("draw", [], text);
  };
  const empty = mode === "draw" ? strokes.length === 0 : text.trim() === "";
  const hintId = `${id}-hint`;
  const fade = reduced ? { duration: 0 } : { duration: durations.base, ease: easings.out };
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-mode={mode}
      data-empty={empty ? "" : undefined}
      aria-disabled={disabled || undefined}
      {...props}
      className={cn(
        blockReset,
        "flex w-full min-w-0 flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-2 text-sm text-pui-surface-foreground shadow-pui-xs",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className={cn(blockReset, "flex min-h-8 flex-wrap items-center justify-between gap-2")}>
        {typedFallback ? (
          <SegmentedControl
            size="sm"
            aria-label="Signing method"
            value={mode}
            disabled={disabled}
            onValueChange={(next) => {
              const nextMode = next === "type" ? "type" : "draw";
              setMode(nextMode);
              emit(nextMode, strokes, text);
            }}
          >
            <SegmentedControlItem value="draw" icon={<PencilIcon className="size-3.5" />}>
              Draw
            </SegmentedControlItem>
            <SegmentedControlItem value="type" icon={<TypeIcon className="size-3.5" />}>
              Type
            </SegmentedControlItem>
          </SegmentedControl>
        ) : (
          <span className={cn(blockReset, "ps-1 text-xs font-medium text-pui-muted-foreground")}>{label}</span>
        )}
        <div className={cn(blockReset, "flex items-center gap-1")}>
          {mode === "draw" ? (
            <Button size="sm" variant="ghost" tone="neutral" leadingIcon={<RotateCcwIcon className="size-3.5" />} onClick={undo} disabled={disabled || strokes.length === 0} aria-keyshortcuts="Meta+Z Control+Z">
              Undo
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" tone="neutral" leadingIcon={<XIcon className="size-3.5" />} onClick={clear} disabled={disabled || empty}>
            Clear
          </Button>
        </div>
      </div>
      <div
        className={cn(blockReset, "relative overflow-hidden rounded-pui-md border border-dashed border-pui-border bg-pui-background/60")}
        style={{ height }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {mode === "draw" ? (
            <motion.div key="draw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className={cn(blockReset, "absolute inset-0")}>
              <canvas
                ref={canvasRef}
                tabIndex={disabled ? -1 : 0}
                role="img"
                aria-label={`${label}: ${strokes.length ? `signed, ${strokes.length} stroke${strokes.length === 1 ? "" : "s"}` : "empty"}`}
                aria-describedby={hintId}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                onLostPointerCapture={endStroke}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
                    event.preventDefault();
                    undo();
                  }
                }}
                style={{ color: penColor }}
                className={cn(
                  blockReset,
                  "block size-full touch-none text-pui-foreground",
                  disabled ? "cursor-not-allowed" : "cursor-crosshair",
                  focusRing,
                  "focus-visible:outline-offset-[-2px]",
                )}
              />
            </motion.div>
          ) : (
            <motion.div
              key="type"
              initial={{ opacity: 0, y: reduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className={cn(blockReset, "absolute inset-0 flex flex-col items-center justify-center gap-2 px-4")}
            >
              <span
                aria-hidden="true"
                className={cn(blockReset, "max-w-full truncate text-pui-foreground")}
                style={{ fontFamily: SCRIPT_FONT, fontSize: Math.round(height * 0.26), lineHeight: 1.15 }}
              >
                {text || "\u00a0"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Baseline with the classic sign-here cross. */}
        <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-x-5 flex items-end gap-2")} style={{ bottom: Math.round(height * 0.24) }}>
          <XIcon className="mb-0.5 size-3.5 text-pui-muted-foreground" />
          <span className={cn(blockReset, "h-px flex-1 bg-pui-border")} />
        </div>
        <AnimatePresence>
          {empty && mode === "draw" ? (
            <motion.span
              key="hint"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
              transition={fade}
              className={cn(blockReset, "pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center text-sm text-pui-muted-foreground")}
            >
              {placeholder}
            </motion.span>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {!empty ? (
            <motion.span
              key="signed"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={reduced ? { duration: 0.12 } : springs.bouncy}
              aria-hidden="true"
              className={cn(blockReset, "pointer-events-none absolute end-2 top-2 rounded-pui-full bg-pui-success/15 px-2 py-0.5 text-[0.6875rem] font-medium text-pui-success-text")}
            >
              Signed
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      {mode === "type" ? (
        <input
          type="text"
          aria-label={`${label}: type your full name`}
          placeholder="Type your full name"
          autoComplete="name"
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value);
            emit("type", strokes, event.target.value);
          }}
          className={cn(
            controlReset,
            "h-9 w-full rounded-pui-md border border-pui-input px-3 text-sm text-pui-foreground outline-hidden placeholder:text-pui-muted-foreground",
            "focus-visible:border-pui-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)]",
          )}
        />
      ) : null}
      <p id={hintId} className={cn(blockReset, "px-1 text-xs text-pui-muted-foreground")}>
        {caption ??
          (mode === "draw"
            ? `Draw with a mouse, finger or pen.${typedFallback ? " Prefer the keyboard? Switch to Type." : ""}`
            : "Your typed name is used as your signature.")}
      </p>
    </div>
  );
});
