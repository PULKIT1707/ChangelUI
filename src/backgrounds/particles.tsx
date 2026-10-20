"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { devWarn } from "../lib/dev";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type ParticlesVariant = "dots" | "links";

export interface ParticlesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of particles (0..500). Default 80. */
  quantity?: number;
  /** Higher values react less to the pointer. Default 50. */
  staticity?: number;
  /** Pointer follow easing (higher is slower). Default 50. */
  ease?: number;
  /** Particle radius factor. Default 0.4. */
  particleSize?: number;
  /** CSS color. Default: the root's computed color (token class). */
  color?: string;
  /** Constant drift per frame. Default 0. */
  vx?: number;
  vy?: number;
  /** Pointer parallax. Default true. */
  interactive?: boolean;
  /** Default "none". */
  mask?: PatternMask;
  /** "links" joins nearby particles with faint lines (a constellation). Default "dots". */
  variant?: ParticlesVariant;
  /** Links: maximum distance in px between joined particles. Default 100. */
  linkDistance?: number;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

function createParticle(width: number, height: number, particleSize: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    tx: 0,
    ty: 0,
    size: Math.floor(Math.random() * 2) + particleSize,
    alpha: 0,
    targetAlpha: Number((Math.random() * 0.6 + 0.25).toFixed(2)),
    dx: (Math.random() - 0.5) * 0.1,
    dy: (Math.random() - 0.5) * 0.1,
    magnetism: 0.1 + Math.random() * 4,
  };
}

/** Floating canvas particles with pointer parallax (design 7.4 #56). */
export const Particles = React.forwardRef<HTMLDivElement, ParticlesProps>(function Particles(
  {
    quantity = 80,
    staticity = 50,
    ease = 50,
    particleSize = 0.4,
    color,
    vx = 0,
    vy = 0,
    interactive = true,
    mask = "none",
    variant = "dots",
    linkDistance = 100,
    style,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const count = Math.min(Math.max(Math.floor(Number.isFinite(quantity) ? quantity : 0), 0), 500);
  if (count !== quantity) devWarn("particles:quantity", "Particles quantity must be an integer in 0..500; clamping.");

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      devWarn("particles:context", "Particles could not get a 2D canvas context; rendering an empty background.");
      return;
    }
    const particles = particlesRef.current;
    let width = 0;
    let height = 0;
    let fill = getComputedStyle(root).color;
    let frame = 0;
    let inView = true;
    const mouse = { x: 0, y: 0 };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.length = 0;
      for (let i = 0; i < count; i++) particles.push(createParticle(width, height, particleSize));
    };

    const draw = (p: Particle) => {
      ctx.save();
      ctx.translate(p.tx, p.ty);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    };

    const links = variant === "links" && linkDistance > 0;
    const maxSq = linkDistance * linkDistance;
    // O(n²) over at most 500 particles; lines fade with distance and with the dimmer endpoint.
    const drawLinks = () => {
      ctx.save();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i] as Particle;
        const ax = a.x + a.tx;
        const ay = a.y + a.ty;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j] as Particle;
          const dx = ax - b.x - b.tx;
          const dy = ay - b.y - b.ty;
          const sq = dx * dx + dy * dy;
          if (sq >= maxSq) continue;
          ctx.globalAlpha = (1 - Math.sqrt(sq) / linkDistance) * 0.35 * Math.min(a.alpha, b.alpha);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(b.x + b.tx, b.y + b.ty);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const step = (animate: boolean) => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i] as Particle;
        if (!animate) {
          p.alpha = p.targetAlpha;
          draw(p);
          continue;
        }
        // Fade near the edges.
        const edge = Math.min(p.x + p.tx - p.size, width - p.x - p.tx - p.size, p.y + p.ty - p.size, height - p.y - p.ty - p.size);
        const fade = Math.min(Math.max(edge / 20, 0), 1);
        p.alpha = fade < 1 ? p.targetAlpha * fade : Math.min(p.alpha + 0.02, p.targetAlpha);
        p.x += p.dx + vx;
        p.y += p.dy + vy;
        p.tx += (mouse.x / (staticity / p.magnetism) - p.tx) / ease;
        p.ty += (mouse.y / (staticity / p.magnetism) - p.ty) / ease;
        draw(p);
        if (p.x < -p.size || p.x > width + p.size || p.y < -p.size || p.y > height + p.size) {
          particles[i] = createParticle(width, height, particleSize);
        }
      }
      if (links) drawLinks();
    };

    const running = () => !reduced && inView && !document.hidden;
    const loop = () => {
      step(true);
      frame = running() ? requestAnimationFrame(loop) : 0;
    };
    const restart = () => {
      if (running() && !frame) frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      mouse.x = event.clientX - rect.left - width / 2;
      mouse.y = event.clientY - rect.top - height / 2;
    };
    // The window pointermove listener exists only while the canvas is on screen.
    const pointer = interactive && !reduced;
    let listening = false;
    const listen = (on: boolean) => {
      if (!pointer || on === listening) return;
      listening = on;
      if (on) window.addEventListener("pointermove", onPointerMove, { passive: true });
      else window.removeEventListener("pointermove", onPointerMove);
    };

    resize();
    if (reduced) step(false);
    else restart();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            resize();
            if (reduced) step(false);
          });
    resizeObserver?.observe(root);

    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry?.isIntersecting ?? true;
            listen(inView);
            restart();
          });
    intersection?.observe(root);
    if (!intersection) listen(true);

    const onVisibility = () => restart();
    document.addEventListener("visibilitychange", onVisibility);

    // Re-read the color when the theme changes.
    const themeObserver = new MutationObserver(() => {
      fill = getComputedStyle(root).color;
      if (reduced) step(false);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersection?.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      listen(false);
    };
  }, [count, staticity, ease, particleSize, vx, vy, interactive, reduced, color, variant, linkDistance]);

  return (
    <div
      ref={mergedRef}
      data-pui-particles=""
      data-variant={variant}
      aria-hidden="true"
      {...props}
      style={{ color, ...style }}
      className={cn(blockReset, backgroundBase, "text-pui-particle", patternMasks[mask], className)}
    >
      <canvas ref={canvasRef} className={cn(blockReset, "block size-full")} />
    </div>
  );
});
