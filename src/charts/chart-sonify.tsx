"use client";
// ChartSonify: "listen to the chart". Web Audio maps each value to pitch (log scale, 220-880 Hz by
// default) and its x position to stereo pan, with short clicks where the series crosses a
// threshold. One oscillator glides through the scheduled frequencies, so playback is sample
// accurate; a rAF playhead reads the audio clock and, inside a <Chart>, moves the chart's
// crosshair and tooltip along. Never autoplays; the AudioContext is created on the first gesture.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { ChartLiveRegion } from "./core/a11y";
import { useChartLayer, useOptionalChart } from "./core/cartesian";
import { categoricalColor } from "./core/color";
import { formatNumber, type NumberFormat } from "./core/format";
import { crossings } from "./core/insights";
import { linePath } from "./core/path";
const instant: Transition = { duration: 0 };
export type SonifyInstrument = "sine" | "triangle" | "square" | "sawtooth";
type Num = number | null | undefined;
const finite = (v: Num): v is number => typeof v === "number" && Number.isFinite(v);
/** Frequency for a value: log-spaced between minHz and maxHz across [lo, hi]. */
export function pitchFor(value: number, lo: number, hi: number, minHz = 220, maxHz = 880): number {
  const t = hi > lo ? Math.max(0, Math.min(1, (value - lo) / (hi - lo))) : 0.5;
  return minHz * (maxHz / minHz) ** t;
}
export interface UseSonifyOptions {
  values: readonly Num[];
  /** Full playback length. Default 4000 ms. */
  durationMs?: number;
  /** Default 220. */
  minHz?: number;
  /** Default 880. */
  maxHz?: number;
  /** Default "sine". */
  instrument?: SonifyInstrument;
  /** 0..1. Default 0.5. */
  volume?: number;
  /** Values that click when crossed. */
  thresholds?: readonly number[];
  /** Left-to-right stereo pan. Default true. */
  pan?: boolean;
  /** The point under the playhead (null when stopped). */
  onIndexChange?: (index: number | null) => void;
  onEnd?: () => void;
}
export interface SonifyControls {
  /** Web Audio is available (false on the server and until mounted). */
  supported: boolean;
  playing: boolean;
  /** Playhead, 0..1. */
  position: number;
  /** Point under the playhead, or null when stopped at the start. */
  index: number | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  /** A short tone for one point (keyboard exploration). */
  playPoint: (index: number) => void;
  /** Moves the playhead (0..1); keeps playing if it was. */
  seek: (position: number) => void;
}
interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
  extra: AudioScheduledSourceNode[];
}
type AudioWindow = { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
/** Headless sonification: schedule, play, pause, seek and single-point tones for a series. */
export function useSonify(options: UseSonifyOptions): SonifyControls {
  const { values, durationMs = 4000, minHz = 220, maxHz = 880, instrument = "sine", volume = 0.5, thresholds, pan = true } = options;
  const [supported, setSupported] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [index, setIndex] = React.useState<number | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const voice = React.useRef<Voice | null>(null);
  const run = React.useRef<{ start: number; from: number; frame: number } | null>(null);
  const callbacks = React.useRef(options);
  callbacks.current = options;
  const posRef = React.useRef(0);
  const indexRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const w = window as unknown as AudioWindow;
    setSupported(typeof w.AudioContext !== "undefined" || typeof w.webkitAudioContext !== "undefined");
  }, []);
  const n = values.length;
  const range = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      if (!finite(v)) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return Number.isFinite(lo) ? ([lo, hi] as const) : ([0, 1] as const);
  }, [values]);
  const audio = (): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const w = window as unknown as AudioWindow;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    ctxRef.current = new Ctor();
    return ctxRef.current;
  };
  const setIdx = (i: number | null) => {
    if (indexRef.current === i) return;
    indexRef.current = i;
    setIndex(i);
    callbacks.current.onIndexChange?.(i);
  };
  const silence = () => {
    const v = voice.current;
    const ctx = ctxRef.current;
    if (run.current) cancelAnimationFrame(run.current.frame);
    run.current = null;
    if (!v || !ctx) return;
    const t = ctx.currentTime;
    // A 30 ms release avoids the click of a hard stop.
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.linearRampToValueAtTime(0, t + 0.03);
    v.osc.stop(t + 0.05);
    for (const e of v.extra) {
      try {
        e.stop(t + 0.01);
      } catch {
        // already stopped
      }
    }
    voice.current = null;
  };
  const blip = (ctx: AudioContext, at: number, out: AudioNode, list: AudioScheduledSourceNode[]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 1760;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(volume * 0.25, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.06);
    list.push(o);
  };
  const playFrom = (from: number) => {
    const ctx = audio();
    if (!ctx || n < 1) return;
    silence();
    void ctx.resume();
    const span = durationMs / 1000;
    const t0 = ctx.currentTime + 0.04;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    osc.type = instrument;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    const timeOf = (i: number) => t0 + ((n > 1 ? i / (n - 1) : 0) - from) * span;
    const first = Math.max(0, Math.floor(from * (n - 1)));
    const level = volume * 0.32;
    let on = false;
    for (let i = first; i < n; i++) {
      const v = values[i];
      const t = Math.max(t0, timeOf(i));
      if (!finite(v)) {
        if (on) gain.gain.linearRampToValueAtTime(0, t);
        on = false;
        continue;
      }
      const f = pitchFor(v, range[0], range[1], minHz, maxHz);
      if (i === first) osc.frequency.setValueAtTime(f, t0);
      else osc.frequency.linearRampToValueAtTime(f, t);
      if (!on) {
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(level, t + 0.02);
        on = true;
      }
      if (panner && pan) {
        const p = n > 1 ? (i / (n - 1)) * 1.6 - 0.8 : 0;
        if (i === first) panner.pan.setValueAtTime(p, t0);
        else panner.pan.linearRampToValueAtTime(p, t);
      }
    }
    const end = t0 + (1 - from) * span;
    gain.gain.setValueAtTime(level, Math.max(t0, end - 0.06));
    gain.gain.linearRampToValueAtTime(0, end);
    if (panner) osc.connect(gain).connect(panner).connect(ctx.destination);
    else osc.connect(gain).connect(ctx.destination);
    const extra: AudioScheduledSourceNode[] = [];
    for (const th of thresholds ?? []) {
      for (const c of crossings(values, th)) {
        const at = timeOf(c.at);
        if (at >= t0) blip(ctx, at, ctx.destination, extra);
      }
    }
    osc.start(t0);
    osc.stop(end + 0.05);
    voice.current = { osc, gain, extra };
    setPlaying(true);
    const tick = () => {
      if (!run.current) return;
      const p = Math.min(1, run.current.from + (ctx.currentTime - run.current.start) / span);
      posRef.current = p;
      setPosition(p);
      setIdx(n > 1 ? Math.round(Math.max(0, p) * (n - 1)) : 0);
      if (p >= 1) {
        run.current = null;
        voice.current = null;
        setPlaying(false);
        callbacks.current.onEnd?.();
        return;
      }
      run.current.frame = requestAnimationFrame(tick);
    };
    run.current = { start: t0, from, frame: requestAnimationFrame(tick) };
  };
  const play = () => playFrom(posRef.current >= 1 ? 0 : posRef.current);
  const pause = () => {
    silence();
    setPlaying(false);
  };
  const stop = () => {
    silence();
    setPlaying(false);
    posRef.current = 0;
    setPosition(0);
    setIdx(null);
  };
  const seek = (p: number) => {
    const next = Math.max(0, Math.min(1, p));
    posRef.current = next;
    setPosition(next);
    setIdx(n > 1 ? Math.round(next * (n - 1)) : 0);
    if (run.current) playFrom(next);
  };
  const playPoint = (i: number) => {
    const ctx = audio();
    const v = values[i];
    if (!ctx || !finite(v)) return;
    void ctx.resume();
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = instrument;
    o.frequency.value = pitchFor(v, range[0], range[1], minHz, maxHz);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.32, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const panner = typeof ctx.createStereoPanner === "function" && pan ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = n > 1 ? (i / (n - 1)) * 1.6 - 0.8 : 0;
      o.connect(g).connect(panner).connect(ctx.destination);
    } else o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.25);
  };
  React.useEffect(
    () => () => {
      if (run.current) cancelAnimationFrame(run.current.frame);
      run.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );
  return { supported, playing, position, index, play, pause, stop, toggle: () => (run.current ? pause() : play()), playPoint, seek };
}
// ---------------------------------------------------------------------------------------------
// Component

export interface ChartSonifyProps extends Omit<UseSonifyOptions, "values" | "onIndexChange" | "onEnd"> {
  /** Standalone values. Inside a <Chart> the series comes from the chart. */
  values?: readonly Num[];
  /** Standalone x labels for announcements and the scrubber. */
  labels?: readonly string[];
  /** Series name. Default: the chart series label, else "Series". */
  label?: string;
  /** Inside a <Chart>: the series to play. Default: the first visible one. */
  seriesId?: string;
  /** Inside a <Chart>: which legend slot. Default "bottom". */
  position?: "top" | "bottom";
  /** Standalone: draw the series with a moving playhead. Default true. */
  preview?: boolean;
  /** Standalone preview height, px. Default 72. */
  previewHeight?: number;
  format?: NumberFormat;
  /** Show the speed and instrument pickers. Default true. */
  settings?: boolean;
  /** Inside a <Chart>: play a tone for each point reached with the chart's arrow keys. Default false. */
  hearNavigation?: boolean;
  onIndexChange?: (index: number | null) => void;
  className?: string;
}
const SPEEDS = [0.5, 1, 2] as const;
const INSTRUMENTS: SonifyInstrument[] = ["sine", "triangle", "square", "sawtooth"];
function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(blockReset, "size-4")} aria-hidden="true">
      {playing ? (
        <g fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1.2" />
          <rect x="14" y="5" width="4" height="14" rx="1.2" />
        </g>
      ) : (
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
      )}
    </svg>
  );
}
function SonifyPanel({ values, labels, label, format, preview, previewHeight, settings, hearNavigation, onIndexChange, className, inChart, ...audioOptions }: Omit<ChartSonifyProps, "seriesId" | "position" | "values"> & { values: readonly Num[]; inChart: boolean }) {
  const chart = useOptionalChart();
  const reducedMotion = usePrefersReducedMotion();
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const [instrument, setInstrument] = React.useState<SonifyInstrument>(audioOptions.instrument ?? "sine");
  const [hear, setHear] = React.useState(hearNavigation ?? false);
  const [message, setMessage] = React.useState("");
  const name = label ?? "Series";
  const n = values.length;
  const fmt = (v: number) => formatNumber(v, format ?? { notation: "compact", maximumFractionDigits: 1 }, chart?.locale);
  const xLabel = (i: number) => labels?.[i] ?? (chart && inChart ? chart.model.formatX(i) : `Point ${i + 1}`);
  const sonify = useSonify({
    ...audioOptions,
    instrument,
    values,
    durationMs: (audioOptions.durationMs ?? 4000) / speed,
    onIndexChange: (i) => {
      onIndexChange?.(i);
      if (chart && inChart) {
        const s = chart.store.getState();
        if (!s.pointer) chart.store.setActiveIndex(i);
      }
    },
    onEnd: () => setMessage(`Finished playing ${name}.`),
  });
  // Tones for the chart's own keyboard navigation (opt-in).
  const focusIndex = useFocusIndex();
  const lastFocus = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!hear || focusIndex === null || focusIndex === lastFocus.current || sonify.playing) {
      lastFocus.current = focusIndex;
      return;
    }
    lastFocus.current = focusIndex;
    sonify.playPoint(focusIndex);
  }, [hear, focusIndex, sonify]);
  const current = sonify.index ?? 0;
  const describe = (i: number) => {
    const v = values[i];
    return `${xLabel(i)}: ${finite(v) ? fmt(v) : "no data"}`;
  };
  const toggle = () => {
    if (!sonify.playing) setMessage(`Playing ${name}. Higher pitch means a higher value; left to right in stereo.`);
    else setMessage("Paused.");
    sonify.toggle();
  };
  const step = (delta: number) => {
    if (n < 1) return;
    const next = Math.max(0, Math.min(n - 1, (sonify.index ?? (delta > 0 ? -1 : n)) + delta));
    if (sonify.playing) sonify.pause();
    sonify.seek(n > 1 ? next / (n - 1) : 0);
    sonify.playPoint(next);
    setMessage(describe(next));
  };
  const onScrubKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") step(e.shiftKey ? 5 : 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") step(e.shiftKey ? -5 : -1);
    else if (e.key === "Home") step(-n);
    else if (e.key === "End") step(n);
    else if (e.key === " " || e.key === "Enter") toggle();
    else return;
    e.preventDefault();
  };
  // Pitch bars for the scrubber: the shape of the sound.
  const bars = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      if (!finite(v)) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const count = Math.min(n, 64);
    return Array.from({ length: count }, (_, k) => {
      const i = count > 1 ? Math.round((k / (count - 1)) * (n - 1)) : 0;
      const v = values[i];
      return finite(v) && hi > lo ? 0.18 + 0.82 * ((v - lo) / (hi - lo)) : finite(v) ? 0.5 : 0;
    });
  }, [values, n]);
  const disabled = !sonify.supported || n < 2;
  const color = chart && inChart ? (chart.model.series.find((s) => s.label === label)?.color ?? categoricalColor(0)) : categoricalColor(0);
  const selectClass = cn(controlReset, focusRing, "h-8 rounded-pui-md border border-pui-border bg-pui-background px-2 text-xs");
  return (
    <div className={cn(blockReset, "flex w-full min-w-0 flex-col gap-2 text-pui-foreground", className)}>
      {!inChart && preview ? <SonifyPreview values={values} position={sonify.index === null ? null : sonify.position} height={previewHeight ?? 72} color={color} label={name} reducedMotion={reducedMotion} /> : null}
      <div role="group" aria-label={`Listen to ${name}`} className={cn(blockReset, "flex w-full min-w-0 flex-wrap items-center gap-2")}>
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={sonify.playing ? `Pause ${name}` : `Play ${name} as sound`}
          className={cn(
            controlReset,
            focusRing,
            "relative inline-flex size-9 shrink-0 items-center justify-center rounded-pui-full bg-pui-primary text-pui-primary-foreground shadow-pui-sm transition-transform active:scale-95 disabled:opacity-50",
          )}
        >
          {sonify.playing && !reducedMotion ? (
            <motion.span
              aria-hidden="true"
              className={cn(blockReset, "absolute inset-0 rounded-pui-full border-2 border-pui-primary")}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
          ) : null}
          <PlayIcon playing={sonify.playing} />
        </button>
        <button
          type="button"
          onClick={() => {
            sonify.stop();
            setMessage("Stopped.");
            if (chart && inChart && !chart.store.getState().pointer && !chart.store.getState().focus) chart.store.setActiveIndex(null);
          }}
          disabled={disabled || (sonify.index === null && !sonify.playing)}
          aria-label="Stop"
          className={cn(controlReset, focusRing, "inline-flex size-8 shrink-0 items-center justify-center rounded-pui-full border border-pui-border text-pui-muted-foreground hover:bg-pui-muted disabled:opacity-40")}
        >
          <svg viewBox="0 0 24 24" className={cn(blockReset, "size-3.5")} aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        </button>
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${name} playhead`}
          aria-valuemin={1}
          aria-valuemax={Math.max(1, n)}
          aria-valuenow={current + 1}
          aria-valuetext={n ? describe(current) : "No data"}
          aria-disabled={disabled || undefined}
          onKeyDown={onScrubKey}
          onPointerDown={(e) => {
            if (disabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const p = rect.width ? (e.clientX - rect.left) / rect.width : 0;
            const i = Math.round(Math.max(0, Math.min(1, p)) * (n - 1));
            sonify.seek(n > 1 ? i / (n - 1) : 0);
            if (!sonify.playing) sonify.playPoint(i);
          }}
          className={cn(blockReset, focusRing, "relative flex h-9 min-w-40 flex-1 cursor-pointer items-center gap-px rounded-pui-md px-1", disabled ? "cursor-not-allowed opacity-50" : "")}
        >
          {bars.map((h, k) => {
            const done = sonify.index !== null && bars.length > 1 && k / (bars.length - 1) <= sonify.position + 1e-9;
            return (
              <span
                key={k}
                aria-hidden="true"
                className={cn(blockReset, "min-w-px flex-1 rounded-pui-full transition-colors duration-150")}
                style={{ height: `${Math.max(8, h * 100)}%`, background: done ? color : "color-mix(in oklab, var(--pui-muted-foreground) 30%, transparent)" }}
              />
            );
          })}
          {sonify.index !== null ? (
            <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-y-0.5 w-0.5 rounded-pui-full bg-pui-foreground")} style={{ left: `calc(4px + (100% - 8px) * ${sonify.position})` }} />
          ) : null}
        </div>
        {settings !== false ? (
          <>
            <label className={cn(blockReset, "inline-flex items-center gap-1 text-xs text-pui-muted-foreground")}>
              <span className={cn(blockReset, "sr-only")}>Speed</span>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])} className={selectClass} aria-label="Speed">
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {`${s}\u00d7`}
                  </option>
                ))}
              </select>
            </label>
            <label className={cn(blockReset, "inline-flex items-center gap-1 text-xs text-pui-muted-foreground")}>
              <span className={cn(blockReset, "sr-only")}>Sound</span>
              <select value={instrument} onChange={(e) => setInstrument(e.target.value as SonifyInstrument)} className={selectClass} aria-label="Sound">
                {INSTRUMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s[0]?.toUpperCase()}
                    {s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        {inChart ? (
          <button
            type="button"
            aria-pressed={hear}
            onClick={() => setHear((h) => !h)}
            className={cn(controlReset, focusRing, "inline-flex h-8 items-center gap-1.5 rounded-pui-md border px-2.5 text-xs transition-colors", hear ? "border-transparent bg-pui-muted font-semibold" : "border-pui-border text-pui-muted-foreground")}
          >
            <svg viewBox="0 0 24 24" className={cn(blockReset, "size-3.5")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
            </svg>
            Hear arrow keys
          </button>
        ) : null}
      </div>
      {!sonify.supported ? <p className={cn(blockReset, "text-xs text-pui-muted-foreground")}>Audio playback needs Web Audio, which this browser does not provide.</p> : null}
      <ChartLiveRegion text={message} />
    </div>
  );
}
const noopSubscribe = () => () => {};
const nothing = () => null;
/** The enclosing chart's keyboard-focused index (null outside a chart). */
function useFocusIndex(): number | null {
  const chart = useOptionalChart();
  const subscribe = chart ? chart.store.subscribe : noopSubscribe;
  const read = chart ? () => chart.store.getState().focus?.index ?? null : nothing;
  return React.useSyncExternalStore(subscribe, read, nothing);
}
function SonifyPreview({ values, position, height, color, label, reducedMotion }: { values: readonly Num[]; position: number | null; height: number; color: string; label: string; reducedMotion: boolean }) {
  const W = 320;
  const pad = 6;
  const geo = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      if (!finite(v)) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const n = values.length;
    const xAt = (i: number) => pad + (n > 1 ? (i / (n - 1)) * (W - pad * 2) : (W - pad * 2) / 2);
    const yAt = (v: number) => (hi > lo ? pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2) : height / 2);
    const pts = values.map((v, i) => (finite(v) ? ([xAt(i), yAt(v)] as const) : null));
    return { d: linePath(pts, { curve: "monotone" }), xAt, yAt, n };
  }, [values, height]);
  const i = position === null || geo.n < 1 ? null : Math.round(position * (geo.n - 1));
  const v = i === null ? undefined : values[i];
  const px = position === null ? 0 : pad + position * (W - pad * 2);
  const clipId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={cn(blockReset, "block h-auto w-full overflow-visible")} role="img" aria-label={`${label} preview`}>
      <defs>
        <clipPath id={`${clipId}-played`}>
          <rect x={0} y={-4} width={position === null ? 0 : px} height={height + 8} />
        </clipPath>
      </defs>
      <path d={geo.d} fill="none" stroke="color-mix(in oklab, var(--pui-muted-foreground) 45%, transparent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <path d={geo.d} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" clipPath={`url(#${clipId}-played)`} />
      {position !== null ? (
        <g>
          <line x1={px} x2={px} y1={0} y2={height} stroke="var(--pui-foreground)" strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
          {finite(v) ? (
            <motion.circle initial={false} animate={{ cx: geo.xAt(i ?? 0), cy: geo.yAt(v) }} transition={reducedMotion ? instant : { type: "spring", stiffness: 600, damping: 40 }} r={4.5} fill={color} stroke="var(--pui-background)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}
/**
 * "Listen to the chart": a play / pause / stop toolbar with a pitch-shaped scrubber. Pitch follows
 * the value, stereo pan follows x, thresholds click, and inside a <Chart> the playhead drives the
 * crosshair and tooltip. Arrow keys on the scrubber play single points. Never autoplays.
 */
export function ChartSonify({ values, seriesId, position = "bottom", label, ...rest }: ChartSonifyProps) {
  const chart = useOptionalChart();
  const layer = useChartLayer();
  if (chart) {
    if (layer !== `legend-${position}`) return null;
    const series = (seriesId ? chart.model.series.find((s) => s.id === seriesId) : chart.model.series.find((s) => !s.hidden)) ?? null;
    return <SonifyPanel key={series?.id ?? "none"} values={series?.values ?? []} label={label ?? series?.label} inChart {...rest} />;
  }
  return <SonifyPanel values={values ?? []} label={label} inChart={false} {...rest} />;
}
