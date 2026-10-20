"use client";
// Chart size: the server and the first client render use the initial size (so SSR HTML is a real
// chart at a known viewBox); afterwards a ResizeObserver reports the real size. State is only set
// from the observer callback, never synchronously in the effect body (design 6).
// TODO(track-f): delegate to the W1 `use-element-size` hook once it lands with its `initial` option.
import { useEffect, useState, type RefObject } from "react";

export interface ChartSize {
  width: number;
  height: number;
  /** false until the first observation (server, hydration and the first client frame). */
  measured: boolean;
}

export interface UseChartSizeOptions {
  /** Width before measuring (SSR viewBox). Default 640. */
  initialWidth?: number;
  /** Fixed height in px. Default: the observed height, else 300. */
  height?: number;
  /** width / height; overrides height. */
  aspectRatio?: number;
  minHeight?: number;
}

const half = (v: number) => Math.round(v * 2) / 2;

/** Height for a width: aspect ratio first, then the fixed height, then the observed one, then 300. */
export function chartHeight(width: number, observed: number, options: Pick<UseChartSizeOptions, "height" | "aspectRatio" | "minHeight">): number {
  const { height, aspectRatio, minHeight = 0 } = options;
  const h = aspectRatio && aspectRatio > 0 ? width / aspectRatio : (height ?? (observed > 0 ? observed : 300));
  return Math.max(minHeight, half(h));
}

export function useChartSize(ref: RefObject<Element | null>, options: UseChartSizeOptions = {}): ChartSize {
  const { initialWidth = 640, height, aspectRatio, minHeight } = options;
  const [size, setSize] = useState<ChartSize>(() => ({
    width: initialWidth,
    height: chartHeight(initialWidth, 0, { height, aspectRatio, minHeight }),
    measured: false,
  }));

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      const width = box ? half(box.width) : 0;
      if (!box || !(width > 0)) return;
      const h = chartHeight(width, box.height, { height, aspectRatio, minHeight });
      setSize((prev) => (prev.measured && prev.width === width && prev.height === h ? prev : { width, height: h, measured: true }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, height, aspectRatio, minHeight]);

  return size;
}
