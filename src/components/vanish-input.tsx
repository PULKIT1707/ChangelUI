"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { resolveCssColors } from "../lib/css-color";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useDocumentVisible } from "../lib/use-document-visible";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface VanishInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "defaultValue" | "onSubmit" | "placeholder" | "children"> {
  /** Example queries that rotate in the empty field. The first one is also the native placeholder. */
  placeholders?: readonly string[];
  /** Milliseconds each placeholder stays. Default 3200. */
  interval?: number;
  value?: string;
  /** Default "". */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text when the user presses Enter or the send button. */
  onSubmit?: (value: string) => void;
  /** Empty the field after a submit (the text dissolves). Default true. */
  clearOnSubmit?: boolean;
  /** Default "md". */
  size?: "md" | "lg";
  /** Accessible name of the send button. Default "Send". */
  submitLabel?: string;
  /** Polite announcement after a submit. Default `Sent: ${value}`. */
  sentMessage?: (value: string) => string;
  /** Icon at the start of the field (decorative). */
  icon?: React.ReactNode;
  /** Class for the native input. `className` styles the outer field. */
  inputClassName?: string;
}
const sizes = {
  md: { root: "h-11 text-sm", pad: "ps-4", padIcon: "ps-10", icon: "start-3.5 size-4", button: "size-8 me-1.5" },
  lg: { root: "h-14 text-base", pad: "ps-5", padIcon: "ps-12", icon: "start-4 size-5", button: "size-10 me-2" },
} as const;
const DURATION = 950;
const MAX_PARTICLES = 3600;
interface Particle {
  x: number;
  y: number;
  /** Start delay in ms (a left-to-right sweep plus jitter). */
  delay: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  accent: boolean;
}
/** Rasterises the text exactly where the input draws it and turns the lit pixels into particles. */
function sampleText(input: HTMLInputElement, text: string, dpr: number): { particles: Particle[]; width: number; height: number } {
  const style = getComputedStyle(input);
  const width = input.offsetWidth;
  const height = input.offsetHeight;
  const scratch = document.createElement("canvas");
  scratch.width = Math.max(1, Math.round(width * dpr));
  scratch.height = Math.max(1, Math.round(height * dpr));
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { particles: [], width, height };
  ctx.scale(dpr, dpr);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ("letterSpacing" in ctx && style.letterSpacing !== "normal") (ctx as { letterSpacing: string }).letterSpacing = style.letterSpacing;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  const start = parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth) - input.scrollLeft;
  ctx.fillText(text, start, height / 2);
  const { data } = ctx.getImageData(0, 0, scratch.width, scratch.height);
  const textWidth = Math.min(width, start + ctx.measureText(text).width);
  // Coarser sampling for long text keeps the particle count bounded.
  let step = Math.max(1, Math.round(dpr * 1.5));
  let lit = 0;
  for (let i = 3; i < data.length; i += 4 * step) if ((data[i] ?? 0) > 110) lit++;
  if (lit / step > MAX_PARTICLES) step = Math.ceil(step * Math.sqrt(lit / step / MAX_PARTICLES));
  const particles: Particle[] = [];
  for (let py = 0; py < scratch.height; py += step) {
    for (let px = 0; px < scratch.width; px += step) {
      const a = data[(py * scratch.width + px) * 4 + 3] ?? 0;
      if (a < 110) continue;
      const x = px / dpr;
      const y = py / dpr;
      const angle = -Math.PI / 2 + (Math.random() - 0.25) * 1.6;
      const speed = 18 + Math.random() * 46;
      particles.push({
        x,
        y,
        delay: (x / Math.max(textWidth, 1)) * DURATION * 0.38 + Math.random() * 90,
        vx: Math.cos(angle) * speed + 26,
        vy: Math.sin(angle) * speed,
        size: (step / dpr) * (0.9 + Math.random() * 0.6),
        alpha: a / 255,
        accent: Math.random() < 0.14,
      });
    }
  }
  return { particles, width, height };
}
const ease = (t: number) => 1 - (1 - t) ** 3;
/**
 * A search or prompt field that makes sending feel real: on Enter the typed text dissolves into
 * particles that drift away, while the empty field rotates through example queries so people know
 * what to ask. The text is cleared at once (no waiting on the animation), the result is announced
 * politely, and reduced motion swaps both effects for instant changes.
 */
export const VanishInput = React.forwardRef<HTMLInputElement, VanishInputProps>(function VanishInput(
  {
    placeholders = [],
    interval = 3200,
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onSubmit,
    clearOnSubmit = true,
    size = "md",
    submitLabel = "Send",
    sentMessage = (v) => `Sent: ${v}`,
    icon,
    inputClassName,
    className,
    style,
    disabled,
    onChange,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange, name: "value" });
  const [index, setIndex] = React.useState(0);
  const [vanishing, setVanishing] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState({ text: "", n: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rootRef = React.useRef<HTMLFormElement>(null);
  const rafRef = React.useRef(0);
  const refs = React.useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const latest = useLatestRef({ onSubmit, sentMessage, clearOnSubmit, reduced });
  const empty = value.length === 0;
  const count = placeholders.length;
  const current = count > 0 ? placeholders[index % count] : undefined;
  React.useEffect(() => {
    if (count < 2 || !empty || !visible || interval <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, empty, visible, interval]);
  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  const dissolve = (text: string) => {
    const input = inputRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!input || !canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { particles, width, height } = sampleText(input, text, dpr);
    if (particles.length === 0) return;
    const [ink = "#000", accent = ink] = resolveCssColors(input, [getComputedStyle(input).color, "var(--color-pui-primary)"]);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${input.offsetLeft}px`;
    canvas.style.top = `${input.offsetTop}px`;
    cancelAnimationFrame(rafRef.current);
    setVanishing(true);
    const start = performance.now();
    const life = DURATION * 0.6;
    const frame = (now: number) => {
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const local = Math.min(Math.max((t - p.delay) / life, 0), 1);
        if (local >= 1) continue;
        const k = ease(local);
        ctx.globalAlpha = p.alpha * (1 - local);
        ctx.fillStyle = p.accent && local > 0 ? accent : ink;
        const s = p.size * (1 - local * 0.5);
        ctx.fillRect(p.x + p.vx * k, p.y + p.vy * k + 10 * local * local, s, s);
      }
      if (t < DURATION) rafRef.current = requestAnimationFrame(frame);
      else {
        ctx.clearRect(0, 0, width, height);
        setVanishing(false);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    const { onSubmit: send, sentMessage: message, clearOnSubmit: clear, reduced: still } = latest.current;
    if (clear) {
      if (!still) dissolve(value);
      setValue("");
    }
    send?.(text);
    setAnnouncement((a) => ({ text: message(text), n: a.n + 1 }));
    inputRef.current?.focus();
  };
  const s = sizes[size];
  const showPlaceholder = empty && current !== undefined && !vanishing;
  return (
    <form
      ref={rootRef}
      role="search"
      noValidate
      onSubmit={submit}
      data-size={size}
      data-state={vanishing ? "vanishing" : empty ? "empty" : "filled"}
      className={cn(
        blockReset,
        "relative flex w-full items-center overflow-hidden rounded-pui-full border border-pui-input bg-pui-surface text-pui-surface-foreground shadow-pui-sm transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out focus-within:border-pui-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_22%,transparent)]",
        disabled && "opacity-60",
        s.root,
        className,
      )}
      style={style}
    >
      {icon ? (
        <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inline-flex items-center justify-center text-pui-muted-foreground", s.icon)}>
          {icon}
        </span>
      ) : null}
      <input
        ref={refs}
        type="text"
        autoComplete="off"
        enterKeyHint="send"
        aria-label={ariaLabel ?? (current === undefined ? "Search" : undefined)}
        placeholder={placeholders[0]}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          onChange?.(event);
          setValue(event.target.value);
        }}
        {...props}
        className={cn(
          controlReset,
          "relative z-1 h-full min-w-0 flex-1 bg-transparent pe-2 text-pui-foreground outline-hidden placeholder:text-transparent disabled:cursor-not-allowed",
          icon ? s.padIcon : s.pad,
          inputClassName,
        )}
      />
      <canvas ref={canvasRef} aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute z-2 block")} style={{ width: 0, height: 0 }} />
      <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-y-0 end-14 flex items-center overflow-hidden", icon ? s.padIcon : s.pad, "start-0")}>
        <AnimatePresence initial={false} mode="popLayout">
          {showPlaceholder ? (
            <motion.span
              key={index}
              className={cn(blockReset, "block truncate text-pui-muted-foreground")}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -14, filter: "blur(4px)", transition: { duration: durations.base, ease: easings.inQuint } }}
              transition={reduced ? { duration: 0 } : { duration: durations.slow, ease: easings.out }}
            >
              {current}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      <motion.button
        type="submit"
        aria-label={submitLabel}
        disabled={disabled || empty}
        className={cn(
          controlReset,
          focusRing,
          "relative z-3 grid shrink-0 cursor-pointer place-items-center rounded-pui-full transition-colors duration-(--pui-duration-base) disabled:cursor-default",
          empty ? "bg-pui-muted text-pui-muted-foreground" : "bg-pui-primary text-pui-primary-foreground",
          s.button,
        )}
        whileTap={reduced || empty ? undefined : { scale: 0.9 }}
        transition={springs.press}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn(blockReset, "block size-1/2")}>
          <motion.path d="M5 12h14" initial={false} animate={{ pathLength: empty ? 0.55 : 1 }} transition={reduced ? { duration: 0 } : springs.smooth} />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </motion.button>
      <span role="status" className={cn(blockReset, "sr-only")}>
        <span key={announcement.n}>{announcement.text}</span>
      </span>
    </form>
  );
});
