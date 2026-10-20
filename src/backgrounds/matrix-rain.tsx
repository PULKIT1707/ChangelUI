"use client";
import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { useCanvasPalette } from "../lib/canvas-palette";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { mulberry32 } from "../lib/random";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export type MatrixRainCharset = "katakana" | "binary" | "hex" | "latin";
export interface MatrixRainProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A preset or your own string of glyphs. Default "katakana". */
  charset?: MatrixRainCharset | (string & {});
  /** Glyph size in px (8..48); also the column width. Default 14. */
  fontSize?: number;
  /** Fall speed multiplier (0.1..5). Default 1. */
  speed?: number;
  /** Share of columns raining at once (0.05..1). Default 0.85. */
  density?: number;
  /** Trail fade per frame (0.01..0.5): small values leave long trails. Default 0.06. */
  fade?: number;
  /** Trail glyph color. Default the root's text color (`text-pui-success`). */
  color?: string;
  /** Leading glyph color. Default `var(--pui-foreground)`. */
  headColor?: string;
  /** A word that "decodes" out of the rain and stays lit. Decorative: render the real text too. */
  text?: string;
  /** Frames per second (the classic look is choppy). Default 24. */
  fps?: number;
  /** Default "none". */
  mask?: PatternMask;
}
const CHARSETS: Record<MatrixRainCharset, string> = {
  katakana: "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+-<>",
  binary: "01",
  hex: "0123456789ABCDEF",
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
interface Rain {
  cols: number;
  rows: number;
  head: Float32Array;
  speed: Float32Array;
  wait: Float32Array;
  /** Message glyph per cell (col * rows + row), "" when none. */
  message: Map<number, string>;
  revealed: Set<number>;
}
const emptyRain: Rain = {
  cols: 0,
  rows: 0,
  head: new Float32Array(0),
  speed: new Float32Array(0),
  wait: new Float32Array(0),
  message: new Map(),
  revealed: new Set(),
};
/**
 * Falling glyph columns with bright heads, fading trails, flickering glyphs and an optional word that
 * decodes out of the rain. Trails fade to transparent, so any surface shows through.
 */
export const MatrixRain = React.forwardRef<HTMLDivElement, MatrixRainProps>(function MatrixRain(
  {
    charset = "katakana",
    fontSize = 14,
    speed = 1,
    density = 0.85,
    fade = 0.06,
    color,
    headColor = "var(--pui-foreground)",
    text,
    fps = 24,
    mask = "none",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const palette = useCanvasPalette(rootRef, [color, headColor]);
  const rain = React.useRef<Rain>(emptyRain);
  const glyphs = Array.from(CHARSETS[charset as MatrixRainCharset] ?? (charset || CHARSETS.katakana));
  const size = Math.round(clamp(fontSize, 8, 48));
  const rate = clamp(speed, 0.1, 5);
  const share = clamp(density, 0.05, 1);
  const fadeAmount = clamp(fade, 0.01, 0.5);
  const message = (text ?? "").trim();
  const shapeKey = `${size}|${message}`;
  const builtKey = React.useRef("");
  const random = React.useRef(Math.random);
  const pick = () => glyphs[Math.floor(random.current() * glyphs.length)] ?? "0";
  const restart = (r: Rain, c: number, initial: boolean) => {
    const rnd = random.current;
    r.speed[c] = (7 + rnd() * 14) * rate;
    r.head[c] = initial ? -rnd() * r.rows * 1.2 : -rnd() * 6;
    // Idle columns wait longer at low density, which keeps roughly `share` of them raining.
    r.wait[c] = initial ? 0 : rnd() < share ? rnd() * 0.6 : 1 + rnd() * 4 * (1 - share);
  };
  const build = (frame: CanvasFrame) => {
    builtKey.current = shapeKey;
    random.current = reduced ? mulberry32(size * 131 + message.length) : Math.random;
    const cols = Math.ceil(frame.width / size);
    const rows = Math.ceil(frame.height / size);
    const r: Rain = {
      cols,
      rows,
      head: new Float32Array(cols),
      speed: new Float32Array(cols),
      wait: new Float32Array(cols),
      message: new Map(),
      revealed: new Set(),
    };
    for (let c = 0; c < cols; c++) restart(r, c, true);
    const letters = Array.from(message);
    if (letters.length) {
      // Center the word on the middle row, one glyph per column (spaces stay empty).
      const start = Math.floor((cols - letters.length) / 2);
      const row = Math.floor(rows / 2);
      letters.forEach((ch, i) => {
        const c = start + i;
        if (c >= 0 && c < cols && ch !== " ") r.message.set(c * rows + row, ch);
      });
    }
    rain.current = r;
    frame.ctx.clearRect(0, 0, frame.width, frame.height);
  };
  const glyph = (ctx: CanvasRenderingContext2D, ch: string, c: number, row: number) => {
    ctx.clearRect(c * size, row * size, size, size);
    ctx.fillText(ch, c * size + size / 2, row * size + size / 2);
  };
  const setFont = (frame: CanvasFrame) => {
    const host = rootRef.current;
    const family = host ? getComputedStyle(host).fontFamily : "ui-monospace, monospace";
    frame.ctx.font = `${size}px ${family}`;
    frame.ctx.textAlign = "center";
    frame.ctx.textBaseline = "middle";
  };
  const drawStatic = (frame: CanvasFrame) => {
    build(frame);
    const { ctx } = frame;
    const r = rain.current;
    const [body = frame.color, head = frame.color] = palette(frame.color);
    setFont(frame);
    const rnd = random.current;
    for (let c = 0; c < r.cols; c++) {
      if (rnd() > share) continue;
      const end = Math.floor(rnd() * r.rows * 1.3);
      const length = 6 + Math.floor(rnd() * 18);
      for (let k = length; k >= 0; k--) {
        const row = end - k;
        if (row < 0 || row >= r.rows) continue;
        ctx.globalAlpha = k === 0 ? 1 : Math.max(0.08, 1 - k / length) * 0.85;
        ctx.fillStyle = k === 0 ? head : body;
        glyph(ctx, pick(), c, row);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = head;
    for (const [cell, ch] of r.message) glyph(ctx, ch, Math.floor(cell / r.rows), cell % r.rows);
  };
  const draw = (frame: CanvasFrame) => {
    if (reduced) {
      drawStatic(frame);
      return;
    }
    if (builtKey.current !== shapeKey || rain.current.cols === 0) build(frame);
    const { ctx, width: w, height: h } = frame;
    const dt = frame.delta || 1 / fps;
    const r = rain.current;
    const [body = frame.color, head = frame.color] = palette(frame.color);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${fadeAmount})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    setFont(frame);
    const rnd = random.current;
    for (let c = 0; c < r.cols; c++) {
      if ((r.wait[c] as number) > 0) {
        r.wait[c] = (r.wait[c] as number) - dt;
        continue;
      }
      const before = Math.floor(r.head[c] as number);
      r.head[c] = (r.head[c] as number) + (r.speed[c] as number) * dt;
      const now = Math.floor(r.head[c] as number);
      for (let row = before + 1; row <= now; row++) {
        // The old head steps back into the trail color, and a new bright head lands below it.
        if (row - 1 >= 0 && row - 1 < r.rows) {
          ctx.fillStyle = body;
          glyph(ctx, pick(), c, row - 1);
        }
        if (row >= 0 && row < r.rows) {
          ctx.fillStyle = head;
          glyph(ctx, pick(), c, row);
          if (r.message.has(c * r.rows + row)) r.revealed.add(c * r.rows + row);
        }
      }
      // Glyphs inside the trail flicker to new characters now and then.
      if (rnd() < 0.05) {
        const row = now - 2 - Math.floor(rnd() * 10);
        if (row >= 0 && row < r.rows) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = body;
          glyph(ctx, pick(), c, row);
          ctx.globalAlpha = 1;
        }
      }
      if (now > r.rows + 4) restart(r, c, false);
    }
    if (r.revealed.size) {
      ctx.fillStyle = head;
      for (const cell of r.revealed) glyph(ctx, r.message.get(cell) ?? "", Math.floor(cell / r.rows), cell % r.rows);
    }
  };
  useCanvasLoop(canvasRef, draw, {
    running: !reduced,
    fps: clamp(fps, 1, 60),
    onResize: build,
    redrawKey: `${shapeKey}|${glyphs.join("")}|${share}|${color}|${headColor}`,
  });
  return (
    <div
      ref={mergedRef}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden font-pui-mono text-pui-success", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
    </div>
  );
});
