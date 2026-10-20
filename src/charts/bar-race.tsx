"use client";
// BarRace: a bar chart race. A continuous playhead interpolates values linearly within each frame;
// bar widths and rolling value labels are driven by MotionValues (no React render per frame), and
// React only re-renders when the ranking changes, when bars re-order on the layout spring.
import { animate, AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { distinctCategoricalColor } from "./core/color";
import { estimateTextWidth, formatNumber, type NumberFormat } from "./core/format";
import { ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

const instant: Transition = { duration: 0 };
const SPEEDS = [0.5, 1, 2] as const;

export interface BarRaceFrame {
  /** The frame's time label (a year, a week, a date string). */
  time: string | number;
  /** Value per competitor; missing keys count as 0. */
  values: Readonly<Record<string, number>>;
}

export interface BarRaceProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  frames: readonly BarRaceFrame[];
  /** Bars shown at once. Default 10. */
  topN?: number;
  /** Milliseconds per frame at 1x. Default 1200. */
  frameDurationMs?: number;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Controlled frame index (the playhead seeks to it). */
  frame?: number;
  defaultFrame?: number;
  /** Called when the playhead reaches a new frame. */
  onFrameChange?: (frame: number) => void;
  /** Start playing once in view (never under reduced motion). Default false. */
  autoPlay?: boolean;
  /** Restart from the first frame at the end. Default false. */
  loop?: boolean;
  /** Color per key: a map or a function. Default: the chart palette by first appearance, shaded past 8 keys so no two share a color. */
  colors?: Readonly<Record<string, string>> | ((key: string) => string | undefined);
  format?: NumberFormat;
  /** Time label format. Default String(time). */
  formatTime?: (time: string | number) => string;
  locale?: string;
  /** Plot height in px. Default topN * 34 + 16. */
  height?: number;
  initialWidth?: number;
  playLabel?: string;
  pauseLabel?: string;
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  description?: React.ReactNode;
  ariaLabel?: string;
  animation?: ChartAnimation;
}

type ValueAt = (key: string, p: number) => number;

function makeValueAt(frames: readonly BarRaceFrame[]): ValueAt {
  const last = Math.max(0, frames.length - 1);
  return (key, p) => {
    const t = Math.max(0, Math.min(last, p));
    const i = Math.floor(t);
    const f = t - i;
    const a = frames[i]?.values[key] ?? 0;
    if (f === 0 || i >= last) return a;
    const b = frames[i + 1]?.values[key] ?? 0;
    return a + (b - a) * f;
  };
}

function rankAt(keys: readonly string[], valueAt: ValueAt, p: number): string[] {
  return [...keys].sort((a, b) => valueAt(b, p) - valueAt(a, p) || (a < b ? -1 : 1));
}

function RaceBar({
  name,
  rank,
  topN,
  rowH,
  p,
  maxMv,
  valueAt,
  plotW,
  labelW,
  color,
  fmt,
  dim,
  reducedMotion,
  onEnter,
  onLeave,
}: {
  name: string;
  rank: number;
  topN: number;
  rowH: number;
  p: MotionValue<number>;
  maxMv: MotionValue<number>;
  valueAt: ValueAt;
  plotW: number;
  labelW: number;
  color: string;
  fmt: (v: number) => string;
  dim: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const width = useTransform(() => {
    const m = maxMv.get();
    return m > 0 ? Math.max(0, (valueAt(name, p.get()) / m) * plotW) : 0;
  });
  const valueX = useTransform(width, (w) => labelW + w + 8);
  const text = useTransform(p, (v) => fmt(valueAt(name, v)));
  const visible = rank < topN;
  const barH = Math.max(4, rowH * 0.74);
  return (
    <motion.g
      initial={false}
      animate={{ y: visible ? rank * rowH : topN * rowH + rowH * 0.6, opacity: visible ? (dim ? 0.4 : 1) : 0 }}
      transition={reducedMotion ? instant : { y: chartMotion.layout, opacity: { duration: 0.25 } }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <rect x={0} y={0} width={labelW + plotW + 60} height={rowH} fill="transparent" />
      <text x={labelW - 10} y={rowH / 2} dy="0.34em" textAnchor="end" fontSize={Math.min(13, rowH * 0.42)} fontWeight={600} fill="var(--pui-foreground)">
        {name}
      </text>
      <motion.rect x={labelW} y={(rowH - barH) / 2} height={barH} width={width} rx={Math.min(6, barH / 3)} fill={color} />
      <motion.text x={valueX} y={rowH / 2} dy="0.34em" fontSize={Math.min(12, rowH * 0.4)} fill="var(--pui-muted-foreground)" className="tabular-nums">
        {text}
      </motion.text>
    </motion.g>
  );
}

function GridLine({ value, maxMv, plotW, labelW, top, bottom, label }: { value: number; maxMv: MotionValue<number>; plotW: number; labelW: number; top: number; bottom: number; label: string }) {
  const x = useTransform(maxMv, (m) => labelW + (m > 0 ? (value / m) * plotW : 0));
  const opacity = useTransform(maxMv, (m) => (m > 0 && value / m <= 1.001 ? 1 : 0));
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.g style={{ opacity }}>
        <motion.line x1={x} x2={x} y1={top} y2={bottom} stroke="var(--pui-chart-grid)" strokeDasharray="3 3" />
        <motion.text x={x} y={top - 6} textAnchor="middle" fontSize={10.5} fill="var(--pui-muted-foreground)" className="tabular-nums">
          {label}
        </motion.text>
      </motion.g>
    </motion.g>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn(blockReset, "size-3.5")} fill="currentColor">
      {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4.5 2.8v10.4L13 8z" />}
    </svg>
  );
}

/**
 * Bar chart race: animated rankings over time with Play / Pause, a scrubber, frame stepping and
 * rolling values. Values interpolate within frames; rank changes re-order on a spring.
 */
export const BarRace = React.forwardRef<HTMLElement, BarRaceProps>(function BarRace(
  {
    frames,
    topN = 10,
    frameDurationMs = 1200,
    playing: playingProp,
    defaultPlaying = false,
    onPlayingChange,
    frame: frameProp,
    defaultFrame = 0,
    onFrameChange,
    autoPlay = false,
    loop = false,
    colors,
    format,
    formatTime = String,
    locale = "en-US",
    height,
    initialWidth = 640,
    playLabel = "Play",
    pauseLabel = "Pause",
    title,
    titleAs: TitleTag = "h3",
    description,
    ariaLabel,
    animation = "auto",
    className,
    ...rest
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const rangeRef = React.useRef<HTMLInputElement>(null);
  const shown = Math.max(1, Math.floor(topN));
  const H = height ?? shown * 34 + 16;
  const size = useChartSize(boxRef, { initialWidth, height: H });
  const inView = useInView(boxRef, { amount: 0.4 });
  const anim = useChartAnimation(animation);
  const W = size.width;
  const last = Math.max(0, frames.length - 1);

  const fmt = React.useCallback((v: number) => formatNumber(Math.round(v * 10) / 10, format ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [format, locale]);
  const fullFmt = React.useCallback((v: number) => formatNumber(v, typeof format === "function" ? format : { maximumFractionDigits: 0, ...format }, locale), [format, locale]);
  const keys = React.useMemo(() => {
    const seen = new Set<string>();
    for (const f of frames) for (const k of Object.keys(f.values)) seen.add(k);
    return [...seen];
  }, [frames]);
  const colorOf = React.useCallback(
    (key: string) => {
      const custom = typeof colors === "function" ? colors(key) : colors?.[key];
      // Stable per key (first appearance), and unique even past the 8 palette tokens.
      return custom ?? distinctCategoricalColor(keys.indexOf(key));
    },
    [colors, keys],
  );
  const valueAt = React.useMemo(() => makeValueAt(frames), [frames]);

  const [playing, setPlaying] = useControllableState<boolean>({ value: playingProp, defaultValue: defaultPlaying, onChange: onPlayingChange, name: "playing" });
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const p = useMotionValue(Math.max(0, Math.min(last, defaultFrame)));
  const [order, setOrder] = React.useState<string[]>(() => rankAt(keys, valueAt, p.get()));
  const [frameIdx, setFrameIdx] = React.useState(() => Math.round(p.get()));
  const [hover, setHover] = React.useState<string | null>(null);
  const [focusRank, setFocusRank] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const maxMv = useTransform(p, (v) => {
    let m = 0;
    for (const k of keys) m = Math.max(m, valueAt(k, v));
    return m * 1.02;
  });
  const onFrameRef = useLatestRef(onFrameChange);
  const reported = React.useRef(frameIdx);

  const sync = React.useCallback(
    (v: number) => {
      const next = rankAt(keys, valueAt, v);
      setOrder((prev) => (prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next));
      const f = Math.round(v);
      setFrameIdx(f);
      if (reported.current !== f) {
        reported.current = f;
        onFrameRef.current?.(f);
      }
      if (rangeRef.current) rangeRef.current.value = String(v);
    },
    [keys, valueAt, onFrameRef],
  );
  useMotionValueEvent(p, "change", sync);
  // New frames: re-rank at the current playhead.
  const [seenFrames, setSeenFrames] = React.useState(frames);
  if (seenFrames !== frames) {
    setSeenFrames(frames);
    setOrder(rankAt(keys, valueAt, Math.min(last, p.get())));
  }

  // Controlled frame: seek.
  React.useEffect(() => {
    if (frameProp === undefined) return;
    const target = Math.max(0, Math.min(last, frameProp));
    if (Math.round(p.get()) === target) return;
    if (anim.reducedMotion) {
      p.set(target);
      return;
    }
    const controls = animate(p, target, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [frameProp, last, p, anim.reducedMotion]);

  // Playback: a linear tween of the playhead to the end (or whole-frame steps under reduced motion).
  const [cycle, setCycle] = React.useState(0);
  React.useEffect(() => {
    if (!playing || last === 0) return;
    const perFrame = frameDurationMs / speed;
    if (anim.reducedMotion) {
      const id = setInterval(() => {
        const next = Math.floor(p.get() + 1e-6) + 1;
        if (next > last) {
          if (loop) p.set(0);
          else setPlaying(false);
          return;
        }
        p.set(next);
      }, perFrame);
      return () => clearInterval(id);
    }
    const start = p.get() >= last - 1e-6 ? 0 : p.get();
    if (start === 0) p.set(0);
    const controls = animate(p, last, {
      duration: ((last - start) * perFrame) / 1000,
      ease: "linear",
      onComplete: () => {
        if (loop) {
          p.set(0);
          setCycle((c) => c + 1);
        } else setPlaying(false);
      },
    });
    return () => controls.stop();
  }, [playing, speed, last, frameDurationMs, anim.reducedMotion, loop, p, setPlaying, cycle]);

  // Autoplay once in view (never under reduced motion).
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (!autoPlay || autoStarted.current || !inView || anim.reducedMotion) return;
    autoStarted.current = true;
    setPlaying(true);
  }, [autoPlay, inView, anim.reducedMotion, setPlaying]);

  const leaderText = (f: number) => {
    const ranked = rankAt(keys, valueAt, f);
    const leader = ranked[0];
    return leader ? `Leader: ${leader} with ${fullFmt(valueAt(leader, f))}.` : "";
  };
  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    if (!next) setAnnouncement(`Paused at ${formatTime(frames[Math.round(p.get())]?.time ?? "")}. ${leaderText(p.get())}`);
    else setAnnouncement("Playing.");
  };
  const seek = (f: number) => {
    const target = Math.max(0, Math.min(last, f));
    setPlaying(false);
    if (anim.reducedMotion) p.set(target);
    else animate(p, target, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
    setAnnouncement(`${formatTime(frames[target]?.time ?? "")}. ${leaderText(target)}`);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const cur = Math.round(p.get());
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seek(cur + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seek(cur - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      seek(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seek(last);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const r = focusRank === null ? 0 : Math.max(0, Math.min(Math.min(shown, order.length) - 1, focusRank + (event.key === "ArrowDown" ? 1 : -1)));
      setFocusRank(r);
      const key = order[r];
      if (key) setAnnouncement(`Rank ${r + 1}: ${key}, ${fullFmt(valueAt(key, p.get()))}.`);
    } else if (event.key === "Escape" && focusRank !== null) {
      event.preventDefault();
      event.stopPropagation();
      setFocusRank(null);
    }
  };

  // Layout.
  const labelW = Math.min(Math.max(...keys.map((k) => estimateTextWidth(k, 13)), 40) + 18, W * 0.34);
  const top = 22;
  const rowH = (H - top - 6) / shown;
  const plotW = Math.max(10, W - labelW - 64);
  const frameMax = Math.max(0, ...keys.map((k) => frames[frameIdx]?.values[k] ?? 0));
  const gridTicks = frameMax > 0 ? niceTicks(0, frameMax, 4).filter((t) => t > 0) : [];
  const activeKey = hover ?? (focusRank !== null ? order[focusRank] : undefined) ?? null;
  const timeLabel = formatTime(frames[frameIdx]?.time ?? "");
  const nameText = ariaLabel ?? (typeof title === "string" ? title : "Bar chart race");
  const firstTime = formatTime(frames[0]?.time ?? "");
  const lastTime = formatTime(frames[last]?.time ?? "");
  const finalLeader = rankAt(keys, valueAt, last)[0];
  const summary = `${nameText}: ${keys.length} competitors over ${frames.length} frames, ${firstTime} to ${lastTime}. ${finalLeader ? `${finalLeader} leads at the end with ${fullFmt(valueAt(finalLeader, last))}.` : ""}`;
  const hoverInfo = activeKey
    ? (() => {
        const rank = order.indexOf(activeKey);
        const prevF = Math.max(0, frameIdx - 1);
        const prevRank = rankAt(keys, valueAt, prevF).indexOf(activeKey);
        const v = valueAt(activeKey, frameIdx);
        const pv = valueAt(activeKey, prevF);
        return { rank, move: prevRank - rank, v, change: pv ? (v - pv) / Math.abs(pv) : 0 };
      })()
    : null;

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? `${uid}-title` : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={`${uid}-desc`}
      data-playing={playing ? "" : undefined}
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
        tabIndex={0}
        role="application"
        aria-roledescription="interactive chart"
        aria-label={`${nameText}. Space plays or pauses, left and right arrows step frames, up and down read the ranking.`}
        onKeyDown={onKeyDown}
        onBlur={() => setFocusRank(null)}
        onPointerLeave={() => setHover(null)}
        className={cn(blockReset, focusRing, "relative w-full select-none rounded-pui-md")}
        style={{ height: H, touchAction: "pan-y" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-hidden")}>
          <AnimatePresence initial={false}>
            {gridTicks.map((t) => (
              <GridLine key={t} value={t} maxMv={maxMv} plotW={plotW} labelW={labelW} top={top} bottom={H - 4} label={fmt(t)} />
            ))}
          </AnimatePresence>
          <line x1={labelW} x2={labelW} y1={top - 4} y2={H - 4} stroke="var(--pui-chart-axis)" />
          <AnimatePresence initial={false}>
            <motion.text
              key={frameIdx}
              x={W - 12}
              y={H - 18}
              textAnchor="end"
              fontSize={Math.max(26, Math.min(64, H * 0.16))}
              fontWeight={700}
              fill="var(--pui-foreground)"
              opacity={0.16}
              className="tabular-nums"
              initial={anim.reducedMotion ? false : { opacity: 0, y: H - 6 }}
              animate={{ opacity: 0.16, y: H - 18 }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, y: H - 30, transition: { duration: 0.2 } }}
              transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 30 }}
            >
              {timeLabel}
            </motion.text>
          </AnimatePresence>
          <g transform={`translate(0,${top})`}>
            {keys.map((k) => (
              <RaceBar
                key={k}
                name={k}
                rank={order.indexOf(k)}
                topN={shown}
                rowH={rowH}
                p={p}
                maxMv={maxMv}
                valueAt={valueAt}
                plotW={plotW}
                labelW={labelW}
                color={colorOf(k)}
                fmt={fmt}
                dim={activeKey !== null && activeKey !== k}
                reducedMotion={anim.reducedMotion}
                onEnter={() => setHover(k)}
                onLeave={() => setHover((h) => (h === k ? null : h))}
              />
            ))}
            {focusRank !== null && focusRank < shown ? (
              <motion.rect
                initial={false}
                animate={{ y: focusRank * rowH + 1 }}
                transition={anim.reducedMotion ? instant : chartMotion.hover}
                x={2}
                width={W - 4}
                height={rowH - 2}
                rx={6}
                fill="none"
                stroke="var(--pui-ring)"
                strokeWidth={2}
              />
            ) : null}
          </g>
        </svg>
        <AnimatePresence>
          {hoverInfo && activeKey && hoverInfo.rank >= 0 && hoverInfo.rank < shown ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, top: top + hoverInfo.rank * rowH }}
              animate={{ opacity: 1, top: top + hoverInfo.rank * rowH }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={anim.reducedMotion ? instant : chartMotion.hover}
              className={cn(blockReset, "pointer-events-none absolute right-3 z-10 w-max")}
              style={{ marginTop: rowH / 2, transform: "translateY(-50%)" }}
            >
              <div className={cn(blockReset, "flex items-center gap-2 rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-2.5 py-1.5 text-xs text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}>
                <span className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: colorOf(activeKey) }} />
                <span className={cn(blockReset, "font-semibold")}>
                  #{hoverInfo.rank + 1} {activeKey}
                </span>
                <span className={cn(blockReset, "tabular-nums")}>{fullFmt(hoverInfo.v)}</span>
                {hoverInfo.move !== 0 ? (
                  <span className={cn(blockReset, "font-semibold tabular-nums", hoverInfo.move > 0 ? "text-pui-success-text" : "text-pui-danger-text")}>
                    {hoverInfo.move > 0 ? "\u25b2" : "\u25bc"}
                    {Math.abs(hoverInfo.move)}
                  </span>
                ) : null}
                {frameIdx > 0 ? (
                  <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>
                    {hoverInfo.change >= 0 ? "+" : "\u2212"}
                    {Math.abs(Math.round(hoverInfo.change * 1000) / 10)}%
                  </span>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className={cn(blockReset, "flex items-center gap-3")}>
        <button
          type="button"
          onClick={togglePlay}
          aria-pressed={playing}
          className={cn(
            controlReset,
            focusRing,
            "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pui-full bg-pui-primary px-3.5 text-xs font-semibold text-pui-primary-foreground transition-transform duration-150 active:scale-95 motion-reduce:active:scale-100",
          )}
        >
          <PlayIcon playing={playing} />
          {playing ? pauseLabel : playLabel}
        </button>
        <input
          ref={rangeRef}
          type="range"
          min={0}
          max={last}
          step="any"
          defaultValue={p.get()}
          aria-label="Time"
          aria-valuetext={timeLabel}
          onInput={(event) => {
            setPlaying(false);
            p.set(Number((event.target as HTMLInputElement).value));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              seek(Math.round(p.get()) + (event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1));
            }
          }}
          className={cn(controlReset, focusRing, "h-1.5 min-w-0 flex-1 cursor-pointer rounded-pui-full accent-pui-primary")}
          style={{ background: "var(--pui-muted)" }}
        />
        <span className={cn(blockReset, "w-16 shrink-0 text-right text-xs font-semibold tabular-nums")}>{timeLabel}</span>
        <button
          type="button"
          onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length] as (typeof SPEEDS)[number])}
          aria-label={`Speed ${speed}x`}
          className={cn(controlReset, focusRing, "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-pui-md border border-pui-border px-2 text-xs font-medium tabular-nums hover:bg-pui-muted")}
        >
          {`${speed}\u00d7`}
        </button>
      </div>
      <p id={`${uid}-desc`} className={srOnly}>
        {summary}
      </p>
      <ChartLiveRegion text={announcement} />
      <table className={srOnly}>
        <caption>{`${nameText}, ${timeLabel}`}</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {rankAt(keys, valueAt, frameIdx)
            .slice(0, shown)
            .map((k, r) => (
              <tr key={k}>
                <td>{r + 1}</td>
                <th scope="row">{k}</th>
                <td>{fullFmt(valueAt(k, frameIdx))}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </figure>
  );
});
