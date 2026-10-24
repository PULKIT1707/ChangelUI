"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useElementSize } from "../hooks/use-element-size";
import { cn } from "../lib/cn";
import { RotateCcwIcon, RotateCwIcon, ZoomInIcon, ZoomOutIcon } from "../lib/icons";
import { durations, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Slider } from "./slider";

export type CropRotation = 0 | 90 | 180 | 270;

export interface ImageCrop {
  /** Crop rectangle in source pixels of the image after rotation. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: CropRotation;
  zoom: number;
}

export interface CropAspect {
  label: string;
  /** width / height. */
  value: number;
}

export interface ImageCropperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  src: string;
  /** Default "Image to crop". */
  alt?: string;
  crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];
  /** width / height of the frame (aspect/defaultAspect/onAspectChange). Default: the first preset, else 1. */
  aspect?: number;
  defaultAspect?: number;
  onAspectChange?: (aspect: number) => void;
  /** Aspect presets shown as toggles in the toolbar. */
  aspects?: CropAspect[];
  /** "round" shows a circular mask (avatars); the crop is still the bounding square. Default "rect". */
  shape?: "rect" | "round";
  zoom?: number;
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  /** Default 1 (the image just covers the frame). */
  minZoom?: number;
  /** Default 4. */
  maxZoom?: number;
  rotation?: CropRotation;
  defaultRotation?: CropRotation;
  onRotationChange?: (rotation: CropRotation) => void;
  /** Fires whenever the visible crop changes (after the image loads). */
  onCropChange?: (crop: ImageCrop) => void;
  /** Rule-of-thirds grid. Default "interacting" (while dragging or zooming). */
  grid?: "interacting" | "always" | "never";
  /** Zoom slider, rotate, aspect toggles and reset. Default true. */
  showControls?: boolean;
  /** Classes for the stage (the dark area); set its height here. Default h-80. */
  stageClassName?: string;
  disabled?: boolean;
}

interface Pan {
  x: number;
  y: number;
}

const ZERO: Pan = { x: 0, y: 0 };
const FRAME_PAD = 28;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const nextRotation = (r: CropRotation, dir: 1 | -1) => (((r + dir * 90 + 360) % 360) as CropRotation);

export interface CropImageOptions {
  /** Output width in px; height follows the crop's aspect. Default: the crop width. */
  width?: number;
  /** Default "image/png". */
  type?: string;
  /** 0–1 for lossy types. */
  quality?: number;
}

/**
 * Draws `crop` of the image to a canvas and resolves a Blob. Cross-origin images need CORS
 * (crossOrigin="anonymous") or the canvas is tainted and this rejects.
 */
export async function cropImage(source: string | HTMLImageElement, crop: ImageCrop, options: CropImageOptions = {}): Promise<Blob> {
  const img =
    typeof source === "string"
      ? await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("cropImage: the image failed to load"));
          el.src = source;
        })
      : source;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const outW = Math.max(1, Math.round(options.width ?? crop.width));
  const ratio = outW / crop.width;
  const outH = Math.max(1, Math.round(crop.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cropImage: no 2D context");
  const turned = crop.rotation % 180 !== 0;
  const rw = turned ? nh : nw;
  const rh = turned ? nw : nh;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(ratio, ratio);
  ctx.translate(-crop.x, -crop.y);
  // Rotate the source about the center of its rotated bounding box.
  ctx.translate(rw / 2, rh / 2);
  ctx.rotate((crop.rotation * Math.PI) / 180);
  ctx.drawImage(img, -nw / 2, -nh / 2);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("cropImage: export failed"))), options.type ?? "image/png", options.quality),
  );
}

/**
 * Crop like a phone photo editor: the frame stays put and the image moves under it. Drag to pan,
 * scroll or pinch to zoom toward the pointer, rotate in 90° steps, switch aspect presets, and the
 * image always covers the frame (no empty edges). A rule-of-thirds grid appears while you work,
 * a round mask suits avatars, and the frame is keyboard operable (arrows pan, + / − zoom, R
 * rotates). onCropChange reports the crop in source pixels; cropImage() turns it into a Blob.
 */
export const ImageCropper = React.forwardRef<HTMLDivElement, ImageCropperProps>(function ImageCropper(
  {
    src,
    alt = "Image to crop",
    crossOrigin,
    aspect: aspectProp,
    defaultAspect,
    onAspectChange,
    aspects,
    shape = "rect",
    zoom: zoomProp,
    defaultZoom = 1,
    onZoomChange,
    minZoom = 1,
    maxZoom = 4,
    rotation: rotationProp,
    defaultRotation = 0,
    onRotationChange,
    onCropChange,
    grid = "interacting",
    showControls = true,
    stageClassName,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const { width: W, height: H } = useElementSize(stageRef);
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = useControllableState({ value: aspectProp, defaultValue: defaultAspect ?? aspects?.[0]?.value ?? 1, onChange: onAspectChange, name: "aspect" });
  const [zoomRaw, setZoomRaw] = useControllableState({ value: zoomProp, defaultValue: defaultZoom, onChange: onZoomChange, name: "zoom" });
  const [rotation, setRotation] = useControllableState<CropRotation>({ value: rotationProp, defaultValue: defaultRotation, onChange: onRotationChange, name: "rotation" });
  const [panRaw, setPan] = React.useState<Pan>(ZERO);
  // Cumulative angle for the transform, so 270° → 0° turns forward instead of spinning back.
  const [spin, setSpin] = React.useState<number>(defaultRotation);
  const [active, setActive] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");
  const zoom = clamp(zoomRaw, minZoom, maxZoom);
  const effectiveAspect = shape === "round" ? 1 : aspect > 0 ? aspect : 1;

  // Geometry (screen px for the frame, source px for the image).
  const maxW = Math.max(0, W - FRAME_PAD * 2);
  const maxH = Math.max(0, H - FRAME_PAD * 2);
  const fw = maxW / maxH > effectiveAspect ? maxH * effectiveAspect : maxW;
  const fh = fw / effectiveAspect;
  const turned = rotation % 180 !== 0;
  const rw = natural ? (turned ? natural.h : natural.w) : 1;
  const rh = natural ? (turned ? natural.w : natural.h) : 1;
  const base = natural && fw > 0 ? Math.max(fw / rw, fh / rh) : 1;
  const scale = base * zoom;
  const limX = Math.max(0, (rw - fw / scale) / 2);
  const limY = Math.max(0, (rh - fh / scale) / 2);
  const pan: Pan = { x: clamp(panRaw.x, -limX, limX), y: clamp(panRaw.y, -limY, limY) };
  const ready = natural !== null && fw > 0;

  const crop: ImageCrop | null = ready
    ? {
        x: Math.round(rw / 2 + pan.x - fw / scale / 2),
        y: Math.round(rh / 2 + pan.y - fh / scale / 2),
        width: Math.round(fw / scale),
        height: Math.round(fh / scale),
        rotation,
        zoom: Math.round(zoom * 1000) / 1000,
      }
    : null;

  const onCropRef = useLatestRef(onCropChange);
  const cropKey = crop ? `${crop.x},${crop.y},${crop.width},${crop.height},${crop.rotation},${crop.zoom}` : "";
  const cropRef = useLatestRef(crop);
  React.useEffect(() => {
    if (cropKey && cropRef.current) onCropRef.current?.(cropRef.current);
  }, [cropKey, cropRef, onCropRef]);

  // Latest geometry for the native wheel listener and pointer handlers.
  const live = useLatestRef({ zoom, scale, base, pan, minZoom, maxZoom, disabled, ready });

  const zoomTo = React.useCallback(
    (nextZoom: number, focus?: { x: number; y: number }) => {
      const g = live.current;
      const z = clamp(nextZoom, g.minZoom, g.maxZoom);
      if (focus && g.ready) {
        // Keep the source point under the pointer fixed while the scale changes.
        const s2 = g.base * z;
        setPan({ x: g.pan.x + focus.x * (1 / g.scale - 1 / s2), y: g.pan.y + focus.y * (1 / g.scale - 1 / s2) });
      }
      setZoomRaw(z);
    },
    [live, setZoomRaw],
  );

  const activeTimer = React.useRef<number | undefined>(undefined);
  const pulseActive = React.useCallback(() => {
    setActive(true);
    window.clearTimeout(activeTimer.current);
    activeTimer.current = window.setTimeout(() => setActive(false), 700);
  }, []);
  React.useEffect(() => () => window.clearTimeout(activeTimer.current), []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const g = live.current;
      if (g.disabled || !g.ready) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const focus = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      zoomTo(g.zoom * factor, focus);
      pulseActive();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [live, zoomTo, pulseActive]);

  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ pan: Pan; zoom: number; dist: number; mid: { x: number; y: number } } | null>(null);

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const g = live.current;
    const a = pts[0];
    const b = pts[1];
    if (!a) {
      gesture.current = null;
      return;
    }
    const mid = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    gesture.current = { pan: g.pan, zoom: g.zoom, dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, mid };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !ready || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startGesture();
    setActive(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    if (!start) return;
    const pts = [...pointers.current.values()];
    const a = pts[0];
    const b = pts[1];
    if (!a) return;
    const g = live.current;
    if (b && start.dist > 0) {
      const z = clamp((start.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / start.dist, g.minZoom, g.maxZoom);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s2 = g.base * z;
      setZoomRaw(z);
      setPan({ x: start.pan.x - (mid.x - start.mid.x) / s2, y: start.pan.y - (mid.y - start.mid.y) / s2 });
    } else {
      setPan({ x: start.pan.x - (a.x - start.mid.x) / g.scale, y: start.pan.y - (a.y - start.mid.y) / g.scale });
    }
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    startGesture();
    if (pointers.current.size === 0) setActive(false);
  };

  const rotate = (dir: 1 | -1) => {
    const next = nextRotation(rotation, dir);
    setRotation(next);
    setSpin((a) => a + dir * 90);
    // Keep the same source point centered: rotate the pan vector with the image.
    setPan((p) => (dir === 1 ? { x: -p.y, y: p.x } : { x: p.y, y: -p.x }));
    setAnnounce(`Rotated to ${next}°`);
  };

  const reset = () => {
    setPan(ZERO);
    setZoomRaw(clamp(defaultZoom, minZoom, maxZoom));
    setRotation(defaultRotation);
    setSpin((a) => a + ((((defaultRotation - a) % 360) + 540) % 360) - 180);
    setAnnounce("Crop reset");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !ready) return;
    const step = (event.shiftKey ? 50 : 10) / scale;
    const moves: Record<string, Pan> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      // Arrow keys move the image, so the crop window travels the other way.
      setPan({ x: pan.x - move.x, y: pan.y - move.y });
      pulseActive();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(zoom * 1.1);
      pulseActive();
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomTo(zoom / 1.1);
      pulseActive();
    } else if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      rotate(event.shiftKey ? -1 : 1);
    } else if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      reset();
    }
  };

  useIsomorphicLayoutEffect(() => {
    const img = stageRef.current?.querySelector("img");
    // A cached image can finish before hydration attaches onLoad.
    if (img && img.complete && img.naturalWidth > 0) setNatural((n) => (n && n.w === img.naturalWidth && n.h === img.naturalHeight ? n : { w: img.naturalWidth, h: img.naturalHeight }));
  }, [src]);

  const angle = (((spin % 360) + 360) % 360) === rotation ? spin : rotation;
  const showGrid = grid === "always" || (grid === "interacting" && active);
  const pctX = limX > 0 ? Math.round(((pan.x + limX) / (2 * limX)) * 100) : 50;
  const pctY = limY > 0 ? Math.round(((pan.y + limY) / (2 * limY)) * 100) : 50;
  const hintId = `${id}-hint`;
  const imgTransform = `translate(-50%, -50%) translate(${-pan.x * scale}px, ${-pan.y * scale}px) rotate(${angle}deg) scale(${scale})`;

  return (
    <div ref={ref} data-disabled={disabled ? "" : undefined} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-3", disabled && "opacity-60", className)}>
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(
          blockReset,
          "relative h-80 w-full touch-none overflow-hidden rounded-pui-xl bg-pui-muted select-none",
          ready && !disabled ? (active ? "cursor-grabbing" : "cursor-grab") : "",
          stageClassName,
        )}
      >
        {/* The image gets its natural size; the transform does the fitting, so the math stays in source px. */}
        <img
          src={src}
          alt={alt}
          crossOrigin={crossOrigin}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            setPan(ZERO);
          }}
          style={natural ? { width: natural.w, height: natural.h, transform: imgTransform } : undefined}
          className={cn(
            blockReset,
            "pointer-events-none absolute top-1/2 left-1/2 max-w-none origin-center",
            !active && !reduced && "transition-transform duration-(--pui-duration-base) ease-pui-out",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
        {!ready ? <span aria-hidden="true" className={cn(blockReset, "absolute inset-0 animate-pulse bg-pui-skeleton motion-reduce:animate-none")} /> : null}
        {ready ? (
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label="Crop position"
            aria-roledescription="crop frame"
            aria-describedby={hintId}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pctX}
            aria-valuetext={`${pctX}% across, ${pctY}% down, zoom ${Math.round(zoom * 100)}%, rotated ${rotation}°`}
            aria-disabled={disabled || undefined}
            onKeyDown={onKeyDown}
            style={{ width: fw, height: fh, marginLeft: -fw / 2, marginTop: -fh / 2 }}
            className={cn(
              blockReset,
              "absolute top-1/2 left-1/2 outline-hidden",
              "shadow-[0_0_0_9999px_var(--pui-overlay)] ring-2 ring-pui-surface/90 ring-inset transition-[width,height,margin,border-radius] duration-(--pui-duration-slow) ease-pui-out motion-reduce:transition-none",
              "focus-visible:ring-pui-ring focus-visible:[box-shadow:0_0_0_9999px_var(--pui-overlay),0_0_0_4px_color-mix(in_oklab,var(--pui-ring)_45%,transparent)]",
              shape === "round" ? "rounded-pui-full" : "rounded-pui-sm",
            )}
          >
            <AnimatePresence>
              {showGrid ? (
                <motion.span
                  key="grid"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : durations.base }}
                  className={cn(blockReset, "pointer-events-none absolute inset-0 overflow-hidden", shape === "round" ? "rounded-pui-full" : "rounded-pui-sm")}
                >
                  <span className={cn(blockReset, "absolute inset-y-0 left-1/3 w-px bg-pui-surface/60")} />
                  <span className={cn(blockReset, "absolute inset-y-0 left-2/3 w-px bg-pui-surface/60")} />
                  <span className={cn(blockReset, "absolute inset-x-0 top-1/3 h-px bg-pui-surface/60")} />
                  <span className={cn(blockReset, "absolute inset-x-0 top-2/3 h-px bg-pui-surface/60")} />
                </motion.span>
              ) : null}
            </AnimatePresence>
            {shape === "rect"
              ? (["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-pui-sm", "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-pui-sm", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-pui-sm", "bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-pui-sm"] as const).map((c) => (
                  <span key={c} aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute size-4 border-pui-surface", c)} />
                ))
              : null}
          </div>
        ) : null}
        {crop ? (
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 4 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
            className={cn(blockReset, "pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-pui-full bg-pui-background/85 px-2 py-0.5 font-mono text-[0.6875rem] text-pui-foreground tabular-nums shadow-pui-sm backdrop-blur-sm")}
          >
            {crop.width} × {crop.height}
          </motion.span>
        ) : null}
        <span id={hintId} className={cn(blockReset, "sr-only")}>
          Drag or use arrow keys to move the image. Plus and minus zoom, R rotates, 0 resets.
        </span>
      </div>
      {showControls ? (
        <div className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-2")}>
          <div className={cn(blockReset, "flex min-w-48 flex-1 items-center gap-2")}>
            <button type="button" aria-label="Zoom out" disabled={disabled || zoom <= minZoom} onClick={() => zoomTo(zoom / 1.25)} className={cn(controlReset, toolButton)}>
              <ZoomOutIcon />
            </button>
            <Slider
              aria-label="Zoom"
              className="flex-1"
              size="sm"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              disabled={disabled || !ready}
              onValueChange={(z) => {
                setZoomRaw(z);
                setActive(true);
              }}
              onValueCommit={() => setActive(false)}
              formatValue={(z) => `${Math.round(z * 100)}%`}
            />
            <button type="button" aria-label="Zoom in" disabled={disabled || zoom >= maxZoom} onClick={() => zoomTo(zoom * 1.25)} className={cn(controlReset, toolButton)}>
              <ZoomInIcon />
            </button>
          </div>
          <div className={cn(blockReset, "flex items-center gap-1")}>
            {aspects && aspects.length > 0 && shape !== "round" ? (
              <div role="group" aria-label="Aspect ratio" className={cn(blockReset, "me-1 inline-flex rounded-pui-md bg-pui-muted p-0.5")}>
                {aspects.map((a) => {
                  const on = Math.abs(a.value - aspect) < 1e-6;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => setAspect(a.value)}
                      className={cn(
                        controlReset,
                        focusRing,
                        "relative inline-flex h-7 cursor-pointer items-center rounded-pui-sm px-2.5 text-xs font-medium tabular-nums transition-colors disabled:cursor-not-allowed",
                        on ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                      )}
                    >
                      {on ? (
                        <motion.span layoutId={`${id}-aspect`} transition={reduced ? { duration: 0 } : springs.snappy} className={cn(blockReset, "absolute inset-0 rounded-pui-sm bg-pui-background shadow-pui-xs")} />
                      ) : null}
                      <span className={cn(blockReset, "relative")}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <button type="button" aria-label="Rotate 90° clockwise" title="Rotate (R)" disabled={disabled || !ready} onClick={() => rotate(1)} className={cn(controlReset, toolButton)}>
              <motion.span aria-hidden="true" key={rotation} initial={reduced ? false : { rotate: -90 }} animate={{ rotate: 0 }} transition={springs.smooth} className={cn(blockReset, "inline-flex")}>
                <RotateCwIcon />
              </motion.span>
            </button>
            <button type="button" aria-label="Reset crop" title="Reset (0)" disabled={disabled || !ready} onClick={reset} className={cn(controlReset, toolButton)}>
              <RotateCcwIcon />
            </button>
          </div>
        </div>
      ) : null}
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announce}
      </span>
    </div>
  );
});

const toolButton = cn(
  controlReset,
  focusRing,
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4",
);
