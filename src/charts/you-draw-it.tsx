"use client";
// YouDrawIt: "guess the trend". The known part of a series is drawn; the reader draws their guess
// for the hidden part (pointer drag interpolates over skipped points, or each hidden point is a
// keyboard slider). "Show me" draws the real line in, fills the gap by sign and rolls in a score.
import { animate, AnimatePresence, motion, useInView, useMotionValue, useTransform, type Transition } from "motion/react";
import * as React from "react";
import { buttonBase, buttonPress, buttonSizes } from "../lib/button-styles";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, withOpacity } from "./core/color";
import { estimateTextWidth, formatNumber, type NumberFormat } from "./core/format";
import { areaToBaseline, linePath, type Point } from "./core/path";
import { scaleLinear } from "./core/scale";
import { nice, tickStep, ticks as niceTicks } from "./core/ticks";
import { useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const outExpo = [0.16, 1, 0.3, 1] as const;

export interface YouDrawItResult {
  /** 0 (way off) to 100 (perfect). */
  score: number;
  /** Mean absolute error over the hidden points, in data units. */
  meanError: number;
  /** Mean signed error: positive means the guess was too high. */
  bias: number;
  guesses: number[];
  actual: number[];
}

export interface YouDrawItProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  /** Point label (a year, a month): a column name or a function. */
  x: Accessor<T, string | number>;
  /** Point value. */
  y: Accessor<T, number>;
  /** Index of the first hidden point (at least 1). */
  revealFrom: number;
  /** Value axis bounds. Default: 0 (or the known minimum) to headroom above the data. */
  min?: number;
  max?: number;
  /** Keyboard step for the hidden-point sliders. Default: about 1/50 of the axis. */
  step?: number;
  format?: NumberFormat;
  locale?: string;
  /** Plot height in px. Default 320. */
  height?: number;
  initialWidth?: number;
  /** Line color. Default --pui-chart-1. */
  color?: string;
  /** Guess color. Default --pui-chart-3. */
  guessColor?: string;
  /** The ask shown in the hidden zone. Default "Draw the rest". */
  prompt?: string;
  revealLabel?: string;
  resetLabel?: string;
  /** Called once when the answer is revealed. */
  onReveal?: (result: YouDrawItResult) => void;
  onGuessChange?: (guesses: ReadonlyArray<number | null>) => void;
  /** A sentence for the score (default: a verdict such as "Pretty close"). */
  scoreLabel?: (result: YouDrawItResult) => string;
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  description?: React.ReactNode;
  ariaLabel?: string;
  animation?: ChartAnimation;
}

/** Score from the mean absolute error relative to the axis span (30% of the span or worse = 0). */
export function scoreGuess(guesses: readonly number[], actual: readonly number[], span: number): YouDrawItResult {
  const n = Math.min(guesses.length, actual.length);
  let abs = 0;
  let signed = 0;
  for (let i = 0; i < n; i++) {
    const d = (guesses[i] as number) - (actual[i] as number);
    abs += Math.abs(d);
    signed += d;
  }
  const meanError = n ? abs / n : 0;
  const bias = n ? signed / n : 0;
  const rel = span > 0 ? meanError / span : 0;
  const score = Math.round(100 * Math.max(0, Math.min(1, 1 - rel / 0.3)));
  return { score, meanError, bias, guesses: [...guesses], actual: [...actual] };
}

function verdict(score: number): string {
  if (score >= 90) return "Spot on.";
  if (score >= 75) return "Very close.";
  if (score >= 55) return "Pretty close.";
  if (score >= 35) return "Not bad, but the data surprised you.";
  return "Way off: the data took a different turn.";
}

function RollingScore({ value, play, reducedMotion }: { value: number; play: boolean; reducedMotion: boolean }) {
  const mv = useMotionValue(reducedMotion || !play ? value : 0);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  React.useEffect(() => {
    if (reducedMotion || !play) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1, delay: 1.1, ease: outExpo });
    return () => controls.stop();
  }, [mv, value, play, reducedMotion]);
  return <motion.span>{text}</motion.span>;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn(blockReset, "size-4")} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" />
      <path d="M14 7l3 3" />
    </svg>
  );
}

function YouDrawItInner<T>(props: YouDrawItProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    y,
    revealFrom: revealFromProp,
    min,
    max,
    step: stepProp,
    format,
    locale = "en-US",
    height = 320,
    initialWidth = 640,
    color = categoricalColor(0),
    guessColor = categoricalColor(2),
    prompt = "Draw the rest",
    revealLabel = "Show me",
    resetLabel = "Try again",
    onReveal,
    onGuessChange,
    scoreLabel,
    title,
    titleAs: TitleTag = "h3",
    description,
    ariaLabel,
    animation = "auto",
    className,
    ...rest
  } = props;
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const size = useChartSize(boxRef, { initialWidth, height });
  const inView = useInView(boxRef, { once: true, amount: 0.3 });
  const anim = useChartAnimation(animation);
  const W = size.width;
  const H = height;
  const n = data.length;
  const revealFrom = Math.max(1, Math.min(n - 1, Math.floor(revealFromProp)));
  const hiddenCount = Math.max(0, n - revealFrom);

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { maximumFractionDigits: 1 }, locale), [format, locale]);
  const tickFmt = React.useCallback((v: number) => formatNumber(v, typeof format === "function" ? format : { notation: "compact", maximumFractionDigits: 1, ...format }, locale), [format, locale]);
  const labels = React.useMemo(() => data.map((d, i) => String(readAccessor(x, d, i))), [data, x]);
  const values = React.useMemo(() => data.map((d, i) => Number(readAccessor(y, d, i)) || 0), [data, y]);

  // The axis never reveals the answer: it is sized from the known part plus generous headroom.
  const { lo, hi } = React.useMemo(() => {
    const known = values.slice(0, revealFrom);
    const kMin = Math.min(...known);
    const kMax = Math.max(...known);
    const all = Math.max(...values);
    const a = min ?? Math.min(0, kMin);
    const b = max ?? Math.max(kMax * 1.5, all * 1.1, a + 1);
    const [n0, n1] = nice(a, b, 5);
    return { lo: min ?? n0, hi: max ?? n1 };
  }, [values, revealFrom, min, max]);
  const step = stepProp ?? tickStep(lo, hi, 50);
  const yTicks = niceTicks(lo, hi, 5);
  const left = Math.ceil(Math.max(...yTicks.map((v) => estimateTextWidth(tickFmt(v), 11)), 10)) + 14;
  const plot = { left, top: 16, right: W - 16, bottom: H - 28 };
  const yScale = scaleLinear([lo, hi], [plot.bottom, plot.top], { clamp: true });
  const xAt = (i: number) => plot.left + (i / Math.max(1, n - 1)) * (plot.right - plot.left);
  const anchorX = xAt(revealFrom - 1);
  const anchorValue = values[revealFrom - 1] ?? 0;

  const [guesses, setGuesses] = React.useState<Array<number | null>>(() => Array.from({ length: hiddenCount }, () => null));
  const [revealed, setRevealed] = React.useState(false);
  const [drawing, setDrawing] = React.useState(false);
  const [hover, setHover] = React.useState<number | null>(null);
  const [focusK, setFocusK] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");
  const onGuessRef = useLatestRef(onGuessChange);
  const lastDraw = React.useRef<{ k: number; v: number } | null>(null);

  // A new dataset (or a different hidden range) starts a fresh round.
  const roundKey = `${revealFrom}:${values.join(",")}`;
  const [round, setRound] = React.useState(roundKey);
  if (round !== roundKey) {
    setRound(roundKey);
    setGuesses(Array.from({ length: hiddenCount }, () => null));
    setRevealed(false);
    setFocusK(0);
  }

  const commit = (next: Array<number | null>) => {
    setGuesses(next);
    onGuessRef.current?.(next);
  };
  const clampV = (v: number) => Math.max(lo, Math.min(hi, v));
  const snap = (v: number) => clampV(Math.round(v / step) * step);

  const pointerToGuess = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const py = ((event.clientY - rect.top) / rect.height) * H;
    const fi = ((px - plot.left) / Math.max(1, plot.right - plot.left)) * (n - 1);
    const k = Math.max(0, Math.min(hiddenCount - 1, Math.round(fi) - revealFrom));
    const v = clampV(yScale.invert(py));
    const next = [...guesses];
    // Fill every hidden point between the previous sample (or the anchor) and this one.
    const prev = lastDraw.current ?? (next[0] === null || k === 0 ? { k: -1, v: anchorValue } : null);
    if (prev && prev.k !== k) {
      const a = Math.min(prev.k, k);
      const b = Math.max(prev.k, k);
      for (let j = Math.max(0, a); j <= b; j++) {
        const t = (j - prev.k) / (k - prev.k);
        next[j] = prev.v + (v - prev.v) * t;
      }
    } else next[k] = v;
    lastDraw.current = { k, v };
    commit(next);
  };

  const complete = guesses.every((g) => g !== null);
  const drawn = guesses.filter((g) => g !== null).length;
  const result = React.useMemo(
    () => (complete ? scoreGuess(guesses as number[], values.slice(revealFrom), hi - lo) : null),
    [complete, guesses, values, revealFrom, hi, lo],
  );
  const onRevealRef = useLatestRef(onReveal);
  const reveal = () => {
    if (!result || revealed) return;
    setRevealed(true);
    setHover(null);
    onRevealRef.current?.(result);
    const sentence = scoreLabel ? scoreLabel(result) : verdict(result.score);
    setAnnouncement(`Revealed. You scored ${result.score} out of 100. ${sentence} On average you were ${fmt(Math.abs(result.bias))} too ${result.bias >= 0 ? "high" : "low"}.`);
  };
  const reset = () => {
    commit(Array.from({ length: hiddenCount }, () => null));
    setRevealed(false);
    setFocusK(0);
    setAnnouncement("Cleared. Draw your guess again.");
  };

  const sliderKey = (k: number) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (revealed) return;
    const big = event.shiftKey ? 10 : 1;
    const cur = guesses[k] ?? guesses[k - 1] ?? anchorValue;
    let v: number | null = null;
    let move: number | null = null;
    if (event.key === "ArrowUp") v = cur + step * big;
    else if (event.key === "ArrowDown") v = cur - step * big;
    else if (event.key === "PageUp") v = cur + step * 10;
    else if (event.key === "PageDown") v = cur - step * 10;
    else if (event.key === "Home") v = lo;
    else if (event.key === "End") v = hi;
    else if (event.key === "ArrowRight") move = Math.min(hiddenCount - 1, k + 1);
    else if (event.key === "ArrowLeft") move = Math.max(0, k - 1);
    else if (event.key === "Enter" && complete) {
      event.preventDefault();
      reveal();
      return;
    }
    if (move !== null) {
      event.preventDefault();
      setFocusK(move);
      const el = boxRef.current?.querySelector<HTMLElement>(`[data-guess-index="${move}"]`);
      el?.focus();
      // Moving right onto an empty point carries the current value along, like drawing.
      if (move > k && guesses[move] === null) {
        const next = [...guesses];
        next[move] = snap(cur);
        commit(next);
      }
      return;
    }
    if (v === null) return;
    event.preventDefault();
    const next = [...guesses];
    for (let j = 0; j < k; j++) if (next[j] === null) next[j] = snap(next[j - 1] ?? anchorValue);
    next[k] = snap(v);
    commit(next);
  };

  // Geometry.
  const known: Point[] = values.slice(0, revealFrom).map((v, i) => [xAt(i), yScale(v)]);
  const actualHidden: Point[] = [[anchorX, yScale(anchorValue)], ...values.slice(revealFrom).map((v, k): Point => [xAt(revealFrom + k), yScale(v)])];
  const guessPoints: Array<Point | null> = [[anchorX, yScale(anchorValue)], ...guesses.map((g, k): Point | null => (g === null ? null : [xAt(revealFrom + k), yScale(g)]))];
  const knownD = linePath(known, { curve: "monotone" });
  const knownArea = areaToBaseline(known, plot.bottom, { curve: "monotone" });
  const actualD = linePath(actualHidden, { curve: "monotone" });
  const guessD = linePath(guessPoints, { curve: "linear" });
  const gaps = revealed
    ? guesses.map((g, k) => {
        const a0 = actualHidden[k] as Point;
        const a1 = actualHidden[k + 1] as Point;
        const g0 = guessPoints[k] as Point;
        const g1 = guessPoints[k + 1] as Point;
        const over = (g ?? 0) - (values[revealFrom + k] ?? 0) >= 0;
        return { d: `M${g0[0]},${g0[1]}L${g1[0]},${g1[1]}L${a1[0]},${a1[1]}L${a0[0]},${a0[1]}Z`, over };
      })
    : [];
  const labelEvery = Math.max(1, Math.ceil((Math.max(...labels.map((l) => estimateTextWidth(l, 11)), 1) + 8) / Math.max(1, (plot.right - plot.left) / Math.max(1, n - 1))));
  const drawIn = anim.entrance && inView;

  const nameText = ariaLabel ?? (typeof title === "string" ? title : "Guess the trend");
  const sentence = result ? (scoreLabel ? scoreLabel(result) : verdict(result.score)) : "";
  const hiddenLabels = labels.slice(revealFrom);
  const lastLabel = labels[n - 1] ?? "";
  const hoverK = hover !== null ? hover - revealFrom : -1;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (revealed || event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    lastDraw.current = null;
    setDrawing(true);
    pointerToGuess(event);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drawing) {
      pointerToGuess(event);
      return;
    }
    if (!revealed) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - plot.left) / Math.max(1, plot.right - plot.left)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    lastDraw.current = null;
    if (guesses.every((g) => g !== null)) setAnnouncement(`Guess complete. Press ${revealLabel} to see the answer.`);
  };

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? `${uid}-title` : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={`${uid}-desc`}
      data-revealed={revealed ? "" : undefined}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description ? (
        <figcaption className={cn(blockReset, "flex flex-col gap-0.5")}>
          {title ? (
            <TitleTag id={`${uid}-title`} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
              {title}
            </TitleTag>
          ) : null}
          {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
        </figcaption>
      ) : null}
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
        onPointerLeave={() => setHover(null)}
        className={cn(blockReset, "relative w-full cursor-crosshair select-none")}
        style={{ height: H, touchAction: revealed ? "pan-y" : "none" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <defs>
            <linearGradient id={`${uid}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
            <pattern id={`${uid}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--pui-border)" strokeWidth="1.5" />
            </pattern>
          </defs>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={plot.left} x2={plot.right} y1={yScale(t)} y2={yScale(t)} stroke="var(--pui-chart-grid)" strokeDasharray={t === lo ? undefined : "3 3"} />
              <text x={plot.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {tickFmt(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={i} x={xAt(i)} y={plot.bottom + 18} textAnchor="middle" fontSize={11} fill={hover === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"}>
                {l}
              </text>
            ) : null,
          )}
          {/* The hidden zone. */}
          <motion.rect
            x={anchorX}
            y={plot.top}
            width={Math.max(0, plot.right - anchorX)}
            height={plot.bottom - plot.top}
            fill={`url(#${uid}-hatch)`}
            initial={false}
            animate={{ opacity: revealed ? 0 : 0.55 }}
            transition={anim.reducedMotion ? instant : { duration: 0.4 }}
          />
          <line x1={anchorX} x2={anchorX} y1={plot.top} y2={plot.bottom} stroke="var(--pui-border)" strokeDasharray="4 4" />
          <motion.path
            d={knownArea}
            fill={`url(#${uid}-area)`}
            initial={drawIn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={anim.reducedMotion ? instant : { duration: 0.5, delay: 0.3 }}
          />
          <motion.path
            d={knownD}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={anim.entrance ? { pathLength: 0 } : false}
            animate={{ pathLength: !anim.entrance || inView ? 1 : 0 }}
            transition={anim.reducedMotion ? instant : { duration: 0.9, ease: outExpo }}
          />
          {known.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={hover === i ? 4.5 : 2.5} fill={color} stroke="var(--pui-background)" strokeWidth={1.5} />
          ))}
          {/* The gap between the guess and the truth, by sign. */}
          <AnimatePresence>
            {revealed
              ? gaps.map((g, k) => (
                  <motion.path
                    key={`gap-${k}`}
                    d={g.d}
                    fill={withOpacity(g.over ? "var(--pui-warning)" : "var(--pui-info)", 0.22)}
                    initial={anim.reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={anim.reducedMotion ? instant : { duration: 0.4, delay: 1.0 + k * 0.03 }}
                  />
                ))
              : null}
          </AnimatePresence>
          <path d={guessD} fill="none" stroke={guessColor} strokeWidth={2.5} strokeDasharray={revealed ? "5 4" : undefined} strokeLinecap="round" strokeLinejoin="round" />
          {guesses.map((g, k) =>
            g === null ? (
              <circle key={k} cx={xAt(revealFrom + k)} cy={plot.bottom} r={2} fill="var(--pui-muted-foreground)" opacity={0.5} />
            ) : (
              <circle key={k} cx={xAt(revealFrom + k)} cy={yScale(g)} r={hoverK === k ? 4.5 : 3} fill={guessColor} stroke="var(--pui-background)" strokeWidth={1.5} />
            ),
          )}
          <AnimatePresence>
            {revealed ? (
              <motion.g key="actual" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                <motion.path
                  d={actualD}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={anim.reducedMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={anim.reducedMotion ? instant : { duration: 1.2, ease: outExpo }}
                />
                {actualHidden.slice(1).map(([px, py], k) => (
                  <motion.circle
                    key={k}
                    cx={px}
                    cy={py}
                    r={hoverK === k ? 4.5 : 3}
                    fill={color}
                    stroke="var(--pui-background)"
                    strokeWidth={1.5}
                    initial={anim.reducedMotion ? false : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 500, damping: 26, delay: 0.15 + (k / Math.max(1, hiddenCount)) * 0.9 }}
                  />
                ))}
                <motion.text
                  x={actualHidden[actualHidden.length - 1]?.[0]}
                  y={(actualHidden[actualHidden.length - 1]?.[1] ?? 0) - 12}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={600}
                  fill={color}
                  initial={anim.reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={anim.reducedMotion ? instant : { delay: 1.1 }}
                >
                  Actual
                </motion.text>
              </motion.g>
            ) : null}
          </AnimatePresence>
          {revealed && hover !== null ? <line x1={xAt(hover)} x2={xAt(hover)} y1={plot.top} y2={plot.bottom} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" pointerEvents="none" /> : null}
        </svg>
        {/* Prompt in the hidden zone until drawing starts. */}
        <AnimatePresence>
          {drawn === 0 && !revealed ? (
            <motion.div
              key="prompt"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={anim.reducedMotion ? instant : { duration: 0.4, delay: anim.entrance ? 0.9 : 0 }}
              className={cn(blockReset, "pointer-events-none absolute flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-background/90 px-3 py-1.5 text-xs font-medium shadow-pui-sm")}
              style={{ left: `${(((anchorX + plot.right) / 2) / W) * 100}%`, top: `${((plot.top + plot.bottom) / 2 / H) * 100}%`, transform: "translate(-50%, -50%)", color: guessColor }}
            >
              <motion.span
                className={cn(blockReset, "inline-flex")}
                animate={anim.reducedMotion ? undefined : { x: [0, 6, 0], y: [0, -3, 0] }}
                transition={anim.reducedMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <PencilIcon />
              </motion.span>
              <span className={cn(blockReset, "text-pui-foreground")}>{prompt}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {/* A pulsing start dot at the last known point. */}
        {!revealed && drawn === 0 && !anim.reducedMotion ? (
          <motion.span
            aria-hidden="true"
            className={cn(blockReset, "pointer-events-none absolute size-3 rounded-pui-full")}
            style={{ left: `${(anchorX / W) * 100}%`, top: `${(yScale(anchorValue) / H) * 100}%`, marginLeft: -6, marginTop: -6, background: guessColor }}
            animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        {/* Keyboard: every hidden point is a slider (one tab stop, arrows move between them). */}
        {!revealed
          ? guesses.map((g, k) => {
              const v = g ?? anchorValue;
              return (
                <div
                  key={k}
                  role="slider"
                  tabIndex={k === focusK ? 0 : -1}
                  data-guess-index={k}
                  aria-label={`Your guess for ${hiddenLabels[k]}`}
                  aria-valuemin={lo}
                  aria-valuemax={hi}
                  aria-valuenow={g === null ? undefined : Math.round(v * 1000) / 1000}
                  aria-valuetext={g === null ? "not drawn yet" : fmt(v)}
                  onKeyDown={sliderKey(k)}
                  onFocus={() => setFocusK(k)}
                  className={cn(blockReset, focusRing, "absolute size-4 rounded-pui-full")}
                  style={{ left: `${(xAt(revealFrom + k) / W) * 100}%`, top: `${(yScale(v) / H) * 100}%`, marginLeft: -8, marginTop: -8 }}
                />
              );
            })
          : null}
        {/* Hover tooltip after the reveal. */}
        <AnimatePresence>
          {revealed && hover !== null ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, left: `${(xAt(hover) / W) * 100}%` }}
              animate={{ opacity: 1, left: `${(xAt(hover) / W) * 100}%` }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }}
              className={cn(blockReset, "pointer-events-none absolute top-2 z-10 w-max")}
            >
              <div
                className={cn(blockReset, "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-xs text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: `translateX(${xAt(hover) > W * 0.6 ? "calc(-100% - 10px)" : "10px"})` }}
              >
                <div className={cn(blockReset, "font-semibold")}>{labels[hover]}</div>
                <div className={cn(blockReset, "mt-1 flex items-center gap-2 tabular-nums")}>
                  <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: color }} />
                  Actual <span className={cn(blockReset, "ms-auto ps-3 font-semibold")}>{fmt(values[hover] ?? 0)}</span>
                </div>
                {hoverK >= 0 && guesses[hoverK] !== null && guesses[hoverK] !== undefined ? (
                  <>
                    <div className={cn(blockReset, "flex items-center gap-2 tabular-nums")}>
                      <span className={cn(blockReset, "size-2 rounded-pui-full")} style={{ background: guessColor }} />
                      You <span className={cn(blockReset, "ms-auto ps-3 font-semibold")}>{fmt(guesses[hoverK] as number)}</span>
                    </div>
                    <div className={cn(blockReset, "mt-1 tabular-nums text-pui-muted-foreground")}>
                      {(guesses[hoverK] as number) >= (values[hover] ?? 0) ? "+" : "\u2212"}
                      {fmt(Math.abs((guesses[hoverK] as number) - (values[hover] ?? 0)))} off
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className={cn(blockReset, "flex min-h-11 flex-wrap items-center justify-between gap-3")}>
        <AnimatePresence mode="wait" initial={false}>
          {revealed && result ? (
            <motion.div
              key="score"
              initial={anim.reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={anim.reducedMotion ? instant : { duration: 0.35, delay: 0.9 }}
              className={cn(blockReset, "flex min-w-0 items-center gap-3")}
            >
              <span className={cn(blockReset, "flex items-baseline gap-0.5 tabular-nums")}>
                <span className={cn(blockReset, "text-3xl font-semibold tracking-tight")} style={{ color: result.score >= 55 ? "var(--pui-success-text)" : result.score >= 35 ? "var(--pui-warning-text)" : "var(--pui-danger-text)" }}>
                  <RollingScore value={result.score} play={!anim.reducedMotion} reducedMotion={anim.reducedMotion} />
                </span>
                <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>/100</span>
              </span>
              <span className={cn(blockReset, "flex min-w-0 flex-col text-xs")}>
                <span className={cn(blockReset, "font-semibold")}>{sentence}</span>
                <span className={cn(blockReset, "text-pui-muted-foreground")}>
                  {lastLabel}: actual {fmt(values[n - 1] ?? 0)}, you said {fmt((guesses[hiddenCount - 1] as number | null) ?? 0)}. On average {fmt(Math.abs(result.bias))} too {result.bias >= 0 ? "high" : "low"}.
                </span>
              </span>
            </motion.div>
          ) : (
            <motion.p key="progress" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
              {drawn === 0
                ? "Drag across the shaded area, or Tab to the chart and use the arrow keys."
                : complete
                  ? "Looks good? Reveal the answer."
                  : `${drawn} of ${hiddenCount} points drawn: keep going to ${lastLabel}.`}
            </motion.p>
          )}
        </AnimatePresence>
        <div className={cn(blockReset, "flex items-center gap-2")}>
          {drawn > 0 ? (
            <button type="button" onClick={reset} className={cn(controlReset, focusRing, buttonBase, buttonPress, buttonSizes.sm, "border border-pui-border bg-pui-background hover:bg-pui-muted")}>
              {resetLabel}
            </button>
          ) : null}
          {!revealed ? (
            <button
              type="button"
              onClick={reveal}
              disabled={!complete}
              className={cn(controlReset, focusRing, buttonBase, buttonPress, buttonSizes.sm, "bg-pui-primary text-pui-primary-foreground disabled:cursor-not-allowed disabled:opacity-50")}
            >
              {revealLabel}
            </button>
          ) : null}
        </div>
      </div>
      <p id={`${uid}-desc`} className={srOnly}>
        {`${nameText}. Values are shown up to ${labels[revealFrom - 1]} (${fmt(anchorValue)}). Guess the values from ${labels[revealFrom]} to ${lastLabel}: drag in the chart, or use the sliders with the arrow keys, then reveal the answer.`}
      </p>
      <ChartLiveRegion text={announcement} />
      {revealed ? (
        <table className={srOnly}>
          <caption>{nameText}</caption>
          <thead>
            <tr>
              <th scope="col">Point</th>
              <th scope="col">Actual</th>
              <th scope="col">Your guess</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={i}>
                <th scope="row">{l}</th>
                <td>{fmt(values[i] ?? 0)}</td>
                <td>{i >= revealFrom ? fmt((guesses[i - revealFrom] as number | null) ?? 0) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}

/**
 * "Guess the trend": readers draw the hidden part of a series, then the real line is revealed and
 * their guess is scored. Pointer drawing and keyboard sliders both work.
 */
export const YouDrawIt = React.forwardRef(YouDrawItInner) as (<T>(props: YouDrawItProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
YouDrawIt.displayName = "YouDrawIt";
