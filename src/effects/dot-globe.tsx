"use client";

import * as React from "react";
import { useCanvasLoop, type CanvasFrame } from "../lib/canvas-loop";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { useDrag } from "../lib/drag";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { isLand } from "../lib/world";

export interface GlobePoint {
  /** Degrees, -90 (south) to 90 (north). */
  lat: number;
  /** Degrees, -180 (west) to 180 (east). */
  lon: number;
}

export interface DotGlobeMarker extends GlobePoint {
  /** Drawn next to the marker when `showLabels` is on. Keep it short. */
  label?: string;
  /** Marker radius in px. Default 3. */
  size?: number;
}

export interface DotGlobeArc {
  from: GlobePoint;
  to: GlobePoint;
}

export interface DotGlobeProps extends React.HTMLAttributes<HTMLDivElement> {
  markers?: readonly DotGlobeMarker[];
  /** Great-circle arcs, lifted off the surface, with a comet that travels along each. */
  arcs?: readonly DotGlobeArc[];
  /** Auto-rotation in radians per second. 0 stops it. Default 0.15. */
  speed?: number;
  /** "land" draws continents only; "sphere" covers the whole globe. Default "land". */
  dots?: "land" | "sphere";
  /** Sample points over the sphere (500..20000); land keeps about 30% of them. Default 6000. */
  density?: number;
  /** Dot radius in px at the center of the globe. Default 1.1. */
  dotSize?: number;
  /** CSS color of the dots. Default var(--pui-foreground). */
  dotColor?: string;
  /** CSS color of arcs and the rim glow. Default var(--pui-primary). */
  arcColor?: string;
  /** CSS color of markers. Default: arcColor. */
  markerColor?: string;
  /** Drag to spin, with inertia. Default true. */
  draggable?: boolean;
  /** Longitude facing the viewer at first, degrees. Default 10. */
  initialLon?: number;
  /** Degrees the north pole tilts toward the viewer. Default 18. */
  tilt?: number;
  /** Draw marker labels. Default true. */
  showLabels?: boolean;
  /** Soft rim glow in arcColor. Default true. */
  glow?: boolean;
  /** Accessible description. When set the globe is role="img"; otherwise it is decorative (aria-hidden). */
  label?: string;
  /** Decorative overlay drawn above the canvas (position it yourself). */
  children?: React.ReactNode;
}

const DEG = Math.PI / 180;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const BUCKETS = 5;
const dotCache = new Map<string, Float32Array>();

/** Fibonacci-sphere points as packed unit vectors [x, y, z, ...] (x faces lon 0, z is north). */
function buildDots(mode: "land" | "sphere", density: number): Float32Array {
  const key = `${mode}:${density}`;
  const cached = dotCache.get(key);
  if (cached) return cached;
  const out: number[] = [];
  for (let i = 0; i < density; i++) {
    const z = 1 - (2 * i + 1) / density;
    const r = Math.sqrt(1 - z * z);
    const theta = GOLDEN * i;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    if (mode === "land" && !isLand(Math.atan2(y, x) / DEG, Math.asin(z) / DEG)) continue;
    out.push(x, y, z);
  }
  const packed = new Float32Array(out);
  dotCache.set(key, packed);
  return packed;
}

function toVector({ lat, lon }: GlobePoint): [number, number, number] {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

interface View {
  lon: number;
  tilt: number;
  vel: number;
  dragging: boolean;
  radius: number;
  start: { lon: number; tilt: number };
}

interface Palette {
  key: string;
  dot: string;
  arc: string;
  marker: string;
  font: string;
}

/**
 * A rotating dotted globe on a 2D canvas: an orthographic projection of a Fibonacci dot sphere,
 * masked to a coarse built-in world outline, with markers and great-circle arcs. No WebGL and no
 * dependencies. Drag to spin with inertia. Pauses off screen; reduced motion draws a still frame.
 */
export const DotGlobe = React.forwardRef<HTMLDivElement, DotGlobeProps>(function DotGlobe(
  {
    markers = [],
    arcs = [],
    speed = 0.15,
    dots = "land",
    density = 6000,
    dotSize = 1.1,
    dotColor = "var(--pui-foreground)",
    arcColor = "var(--pui-primary)",
    markerColor,
    draggable = true,
    initialLon = 10,
    tilt = 18,
    showLabels = true,
    glow = true,
    label,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dotProbe = React.useRef<HTMLSpanElement>(null);
  const arcProbe = React.useRef<HTMLSpanElement>(null);
  const markerProbe = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const viewRef = React.useRef<View>({
    lon: initialLon * DEG,
    tilt: tilt * DEG,
    vel: 0,
    dragging: false,
    radius: 100,
    start: { lon: 0, tilt: 0 },
  });
  const paletteRef = React.useRef<Palette>({ key: "", dot: "", arc: "", marker: "", font: "" });
  const scratchRef = React.useRef(new Float32Array(0));
  const [interacting, setInteracting] = React.useState(false);
  const count = Math.round(Math.min(Math.max(Number.isFinite(density) ? density : 6000, 500), 20000));
  const colorKey = `${dotColor}|${arcColor}|${markerColor ?? ""}`;

  useDrag(
    rootRef,
    {
      onStart: () => {
        const view = viewRef.current;
        view.dragging = true;
        view.vel = 0;
        view.start = { lon: view.lon, tilt: view.tilt };
        setInteracting(true);
      },
      onMove: ({ dx, dy }) => {
        const view = viewRef.current;
        view.lon = view.start.lon - dx / view.radius;
        view.tilt = Math.min(Math.max(view.start.tilt + dy / view.radius, -1.1), 1.1);
      },
      onEnd: ({ vx }) => {
        const view = viewRef.current;
        view.dragging = false;
        view.vel = reduced ? 0 : Math.max(Math.min(-vx / view.radius, 6), -6);
        setInteracting(false);
      },
    },
    { enabled: draggable },
  );

  const draw = ({ ctx, width, height, delta, time, color }: CanvasFrame) => {
    ctx.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) return;
    const view = viewRef.current;
    const palette = paletteRef.current;
    if (palette.key !== `${color}|${colorKey}`) {
      palette.key = `${color}|${colorKey}`;
      palette.dot = dotProbe.current ? getComputedStyle(dotProbe.current).color : color;
      palette.arc = arcProbe.current ? getComputedStyle(arcProbe.current).color : color;
      palette.marker = markerProbe.current ? getComputedStyle(markerProbe.current).color : palette.arc;
      palette.font = rootRef.current ? getComputedStyle(rootRef.current).fontFamily : "sans-serif";
    }
    if (!view.dragging) {
      if (!reduced) view.lon -= speed * delta;
      view.lon += view.vel * delta;
      view.vel *= Math.pow(0.95, delta * 60);
      if (Math.abs(view.vel) < 0.001) view.vel = 0;
    }
    const R = (Math.min(width, height) / 2) * 0.8;
    view.radius = R;
    const cx = width / 2;
    const cy = height / 2;
    const cosL = Math.cos(view.lon);
    const sinL = Math.sin(view.lon);
    const cosT = Math.cos(view.tilt);
    const sinT = Math.sin(view.tilt);
    // Unit vector -> [screen x, screen y, depth] in sphere units (depth > 0 faces the viewer).
    const project = (x: number, y: number, z: number): [number, number, number] => {
      const x1 = x * cosL + y * sinL;
      const y1 = -x * sinL + y * cosL;
      return [y1, cosT * z - sinT * x1, sinT * z + cosT * x1];
    };

    // Body and rim.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = palette.dot;
    ctx.fill();
    if (glow) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.shadowColor = palette.arc;
      ctx.shadowBlur = R * 0.18;
      ctx.strokeStyle = palette.arc;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Dots, batched into depth buckets so each bucket is a single fill.
    const points = buildDots(dots, count);
    if (scratchRef.current.length !== points.length) scratchRef.current = new Float32Array(points.length);
    const projected = scratchRef.current;
    for (let i = 0; i < points.length; i += 3) {
      const [px, py, depth] = project(points[i] as number, points[i + 1] as number, points[i + 2] as number);
      projected[i] = cx + px * R;
      projected[i + 1] = cy - py * R;
      projected[i + 2] = depth;
    }
    ctx.fillStyle = palette.dot;
    for (let bucket = 0; bucket < BUCKETS; bucket++) {
      const lo = bucket / BUCKETS;
      const hi = (bucket + 1) / BUCKETS;
      ctx.beginPath();
      for (let i = 0; i < projected.length; i += 3) {
        const depth = projected[i + 2] as number;
        if (depth <= lo || depth > hi) continue;
        const r = dotSize * (0.45 + 0.55 * depth);
        const sx = projected[i] as number;
        const sy = projected[i + 1] as number;
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.globalAlpha = 0.18 + 0.72 * ((lo + hi) / 2);
      ctx.fill();
    }

    // Arcs: faint full path, then a comet with a fading tail.
    const steps = 48;
    ctx.lineCap = "round";
    ctx.strokeStyle = palette.arc;
    arcs.forEach((arc, index) => {
      const a = toVector(arc.from);
      const b = toVector(arc.to);
      const dot = Math.min(Math.max(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1), 1);
      const omega = Math.acos(dot);
      if (omega < 1e-4) return;
      const sinO = Math.sin(omega);
      const lift = 0.04 + omega * 0.16;
      const sample = (t: number): [number, number, boolean] => {
        const wa = Math.sin((1 - t) * omega) / sinO;
        const wb = Math.sin(t * omega) / sinO;
        const r = 1 + Math.sin(Math.PI * t) * lift;
        const [px, py, depth] = project(a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb);
        const visible = depth > 0 || (px * px + py * py) * r * r > 1;
        return [cx + px * R * r, cy - py * R * r, visible];
      };
      const stroke = (from: number, to: number, alpha: number, lineWidth: number) => {
        if (to <= from) return;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        let pen = false;
        const n = Math.max(2, Math.ceil((to - from) * steps));
        for (let s = 0; s <= n; s++) {
          const [x, y, visible] = sample(from + ((to - from) * s) / n);
          if (!visible) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
      };
      stroke(0, 1, reduced ? 0.55 : 0.22, 1);
      if (reduced) return;
      const cycle = (time / 2.8 + index * 0.31) % 1;
      const head = cycle * 1.5 - 0.1;
      const tail = head - 0.35;
      const segments = 10;
      for (let s = 0; s < segments; s++) {
        const from = Math.max(0, tail + ((head - tail) * s) / segments);
        const to = Math.min(1, tail + ((head - tail) * (s + 1)) / segments);
        stroke(from, to, ((s + 1) / segments) * 0.95, 1.8);
      }
      if (head >= 0 && head <= 1) {
        const [x, y, visible] = sample(head);
        if (visible) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = palette.arc;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Markers with a pulse ring and an optional label.
    ctx.font = `500 11px ${palette.font}`;
    ctx.textBaseline = "middle";
    markers.forEach((marker, index) => {
      const [px, py, depth] = project(...toVector(marker));
      if (depth <= 0) return;
      const x = cx + px * R;
      const y = cy - py * R;
      const size = marker.size ?? 3;
      const fade = Math.min(1, depth * 2.5);
      if (!reduced) {
        const phase = (time * 0.7 + index * 0.37) % 1;
        ctx.globalAlpha = (1 - phase) * 0.6 * fade;
        ctx.strokeStyle = palette.marker;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, size + phase * size * 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      ctx.fillStyle = palette.marker;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      if (showLabels && marker.label && depth > 0.25) {
        ctx.globalAlpha = Math.min(1, (depth - 0.25) * 3);
        ctx.fillStyle = color;
        ctx.fillText(marker.label, x + size + 5, y);
      }
    });
    ctx.globalAlpha = 1;
  };

  useCanvasLoop(canvasRef, draw, { running: !reduced || interacting });

  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  return (
    <div
      ref={mergedRef}
      data-pui-dot-globe=""
      data-state={reduced ? "static" : "animated"}
      {...a11y}
      {...props}
      className={cn(
        blockReset,
        "relative aspect-square w-full select-none overflow-hidden text-pui-foreground",
        draggable && "cursor-grab touch-pan-y active:cursor-grabbing",
        className,
      )}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "absolute inset-0 block size-full")} />
      {children}
      <span ref={dotProbe} className={cn(blockReset, "hidden")} style={{ color: dotColor }} />
      <span ref={arcProbe} className={cn(blockReset, "hidden")} style={{ color: arcColor }} />
      <span ref={markerProbe} className={cn(blockReset, "hidden")} style={{ color: markerColor ?? arcColor }} />
    </div>
  );
});
