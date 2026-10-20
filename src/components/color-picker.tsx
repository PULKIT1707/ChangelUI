"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import {
  formatColor,
  hsvToRgb,
  parseColor,
  rgbToHsv,
  type ColorFormat,
  type Hsva,
  type Rgba,
} from "../lib/color-convert";
import { fieldClasses, invalidClasses } from "../lib/field-styles";
import { CheckIcon, CopyIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useIsClient } from "../lib/use-is-client";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export { formatColor, parseColor };
export type { ColorFormat, Rgba };

export interface ColorPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Any CSS color string ColorPicker can parse: hex, rgb(), hsl() or oklch(). */
  value?: string;
  /** Default "#6366f1" (indigo). pui-allow-color */
  defaultValue?: string;
  /** Called with the color in `format` on every change (drag, keys, swatch, input). */
  onValueChange?: (value: string) => void;
  /** Fires on pointer up, key commits, swatch clicks and input commits. */
  onValueCommit?: (value: string) => void;
  /** Output format of onValueChange. Default "hex". */
  format?: ColorFormat;
  /** Alpha slider and alpha in the output. Default false. */
  showAlpha?: boolean;
  /** Preset colors shown as a swatch row. */
  swatches?: string[];
  /** Text field with a display-format switch. Default true. */
  showInput?: boolean;
  /** Eyedropper button where the EyeDropper API exists. Default true. */
  showEyeDropper?: boolean;
  /** Copy button next to the field. Default true. */
  showCopy?: boolean;
  disabled?: boolean;
  /** Accessible name of the group. Default "Color picker". */
  label?: string;
}

const checkerboard: React.CSSProperties = {
  backgroundImage: "repeating-conic-gradient(var(--pui-muted) 0 25%, var(--pui-background) 0 50%)",
  backgroundSize: "10px 10px",
};

const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl", "oklch"];
// Thumbs sit on arbitrary colors, so they use a fixed white ring and dark halo instead of tokens.
const thumbRing: React.CSSProperties = {
  borderColor: "#fff", // pui-allow-color
  boxShadow: "0 0 0 1px rgb(0 0 0 / 0.3), 0 2px 6px rgb(0 0 0 / 0.35)", // pui-allow-color
};
const HUE_GRADIENT = "linear-gradient(to right, #f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%)"; // pui-allow-color
const css = (rgba: Rgba, alpha = true) => formatColor(rgba, "rgb", { alpha });

function toHsva(value: string, hue = 0): Hsva {
  const parsed = parseColor(value);
  return parsed ? rgbToHsv(parsed, hue) : { h: 239, s: 0.6, v: 0.95, a: 1 };
}

interface DragOptions {
  disabled: boolean;
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

/** Pointer drag over an element, reporting 0-1 coordinates. */
function useAreaDrag(ref: React.RefObject<HTMLElement | null>, { disabled, onMove, onEnd }: DragOptions) {
  const active = React.useRef(false);
  const report = (event: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onMove(
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    );
  };
  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return;
      active.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      report(event);
      // Move focus to the slider inside so the keyboard continues where the pointer left off.
      (event.currentTarget.querySelector('[role="slider"]') as HTMLElement | null)?.focus({ preventScroll: true });
      event.preventDefault();
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (active.current) report(event);
    },
    onPointerUp: () => {
      if (!active.current) return;
      active.current = false;
      onEnd();
    },
    onPointerCancel: () => {
      active.current = false;
    },
  };
}

function stepKeys(event: React.KeyboardEvent, small: number, large: number): number | "min" | "max" | null {
  const big = event.shiftKey ? large : small;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowUp":
      return big;
    case "ArrowLeft":
    case "ArrowDown":
      return -big;
    case "PageUp":
      return large;
    case "PageDown":
      return -large;
    case "Home":
      return "min";
    case "End":
      return "max";
    default:
      return null;
  }
}

interface ChannelSliderProps {
  label: string;
  value: number;
  max: number;
  background: string;
  thumbColor: string;
  valueText: string;
  disabled: boolean;
  reduced: boolean;
  checker?: boolean;
  onChange: (value: number) => void;
  onCommit: () => void;
}

function ChannelSlider({ label, value, max, background, thumbColor, valueText, disabled, reduced, checker, onChange, onCommit }: ChannelSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const drag = useAreaDrag(trackRef, { disabled, onMove: (x) => onChange(x * max), onEnd: onCommit });
  const percent = (value / max) * 100;
  return (
    <div
      ref={trackRef}
      {...drag}
      className={cn(blockReset, "relative h-3 cursor-pointer touch-none rounded-full", disabled && "cursor-not-allowed")}
      style={checker ? checkerboard : undefined}
    >
      <span aria-hidden="true" className={cn(blockReset, "absolute inset-0 rounded-full ring-1 ring-inset ring-pui-foreground/10")} style={{ background }} />
      <motion.span
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText}
        aria-orientation="horizontal"
        aria-disabled={disabled || undefined}
        initial={false}
        animate={{ left: `${percent}%` }}
        transition={reduced ? { duration: 0 } : springs.snappy}
        onKeyDown={(event) => {
          if (disabled) return;
          const step = stepKeys(event, max / 100, max / 10);
          if (step === null) return;
          event.preventDefault();
          const next = step === "min" ? 0 : step === "max" ? max : Math.min(max, Math.max(0, value + step));
          onChange(next);
          onCommit();
        }}
        className={cn(
          blockReset,
          "absolute top-1/2 block size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
          focusRing,
        )}
        style={{ ...thumbRing, backgroundColor: thumbColor }}
      />
    </div>
  );
}

/** OKLCH-aware color picker: saturation/brightness area, hue and alpha sliders, swatches, eyedropper and copy. */
export const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  {
    value: valueProp,
    defaultValue = "#6366f1", // pui-allow-color
    onValueChange,
    onValueCommit,
    format = "hex",
    showAlpha = false,
    swatches,
    showInput = true,
    showEyeDropper = true,
    showCopy = true,
    disabled = false,
    label = "Color picker",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const isClient = useIsClient();
  const id = React.useId();
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const [hsva, setHsva] = React.useState<Hsva>(() => toHsva(value));
  const [synced, setSynced] = React.useState(value);
  const [displayFormat, setDisplayFormat] = React.useState<ColorFormat>(format);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const output = (next: Hsva) => formatColor(hsvToRgb(next), format, { alpha: showAlpha });

  // A new value from outside (controlled prop) re-seeds the HSV state, keeping the hue at grays.
  if (value !== synced) {
    setSynced(value);
    if (value !== output(hsva)) setHsva(toHsva(value, hsva.h));
  }

  React.useEffect(() => () => clearTimeout(copyTimer.current), []);

  const rgba = hsvToRgb(hsva);
  const opaque = { ...rgba, a: 1 };
  const display = formatColor(rgba, displayFormat, { alpha: showAlpha });

  const update = (next: Hsva) => {
    const clamped: Hsva = {
      h: Math.min(360, Math.max(0, next.h)),
      s: Math.min(1, Math.max(0, next.s)),
      v: Math.min(1, Math.max(0, next.v)),
      a: showAlpha ? Math.min(1, Math.max(0, next.a)) : 1,
    };
    setHsva(clamped);
    const out = output(clamped);
    setSynced(out);
    setValue(out);
    return out;
  };
  const latestHsva = useLatestRef(hsva);
  const commit = () => onValueCommit?.(output(latestHsva.current));

  const areaDrag = useAreaDrag(areaRef, {
    disabled,
    onMove: (x, y) => update({ ...latestHsva.current, s: x, v: 1 - y }),
    onEnd: commit,
  });

  const applyString = (text: string) => {
    const parsed = parseColor(text);
    if (!parsed) return false;
    const next = rgbToHsv(parsed, hsva.h);
    const out = update(showAlpha ? next : { ...next, a: 1 });
    onValueCommit?.(out);
    return true;
  };

  const eyeDropperSupported = isClient && showEyeDropper && typeof window !== "undefined" && "EyeDropper" in window;
  const pickFromScreen = async () => {
    try {
      const Ctor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const result = await new Ctor().open();
      applyString(result.sRGBHex);
    } catch {
      // The user cancelled.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const invalid = draft !== null && parseColor(draft) === null;
  const currentHex = formatColor(rgba, "hex", { alpha: showAlpha });
  const swatchList = React.useMemo(
    () =>
      (swatches ?? [])
        .map((s) => ({ source: s, rgba: parseColor(s) }))
        .filter((s): s is { source: string; rgba: Rgba } => s.rgba !== null),
    [swatches],
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-disabled={disabled ? "" : undefined}
      {...props}
      className={cn(
        blockReset,
        "flex w-64 flex-col gap-3 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-(--pui-shadow-sm)",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div
        ref={areaRef}
        {...areaDrag}
        className={cn(blockReset, "relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-visible rounded-pui-md")}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsva.h} 100% 50%))`, // pui-allow-color
        }}
      >
        <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 rounded-pui-md ring-1 ring-inset ring-pui-foreground/10")} />
        <motion.span
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Saturation and brightness"
          aria-roledescription="2D slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsva.s * 100)}
          aria-valuetext={`Saturation ${Math.round(hsva.s * 100)}%, brightness ${Math.round(hsva.v * 100)}%`}
          initial={false}
          animate={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
          transition={reduced ? { duration: 0 } : springs.snappy}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.01;
            const keys: Record<string, [number, number]> = {
              ArrowRight: [step, 0],
              ArrowLeft: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
              PageUp: [0, 0.1],
              PageDown: [0, -0.1],
            };
            const delta = keys[event.key];
            if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              update({ ...hsva, s: event.key === "Home" ? 0 : 1 });
              commit();
              return;
            }
            if (!delta) return;
            event.preventDefault();
            update({ ...hsva, s: hsva.s + delta[0], v: hsva.v + delta[1] });
            commit();
          }}
          className={cn(
            blockReset,
            "absolute block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
            focusRing,
          )}
          style={{ ...thumbRing, backgroundColor: css(opaque, false) }}
        />
      </div>

      <div className={cn(blockReset, "flex items-center gap-3")}>
        <span
          aria-hidden="true"
          className={cn(blockReset, "relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-pui-foreground/10")}
          style={checkerboard}
        >
          <motion.span
            className={cn(blockReset, "absolute inset-0 block")}
            initial={false}
            animate={{ backgroundColor: css(rgba) }}
            transition={reduced ? { duration: 0 } : { duration: 0.12 }}
          />
        </span>
        <div className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-2.5")}>
          <ChannelSlider
            label="Hue"
            value={hsva.h}
            max={360}
            background={HUE_GRADIENT}
            thumbColor={`hsl(${hsva.h} 100% 50%)`} // pui-allow-color
            valueText={`${Math.round(hsva.h)} degrees`}
            disabled={disabled}
            reduced={reduced}
            onChange={(h) => update({ ...latestHsva.current, h })}
            onCommit={commit}
          />
          {showAlpha ? (
            <ChannelSlider
              label="Alpha"
              value={hsva.a * 100}
              max={100}
              checker
              background={`linear-gradient(to right, ${css({ ...rgba, a: 0 })}, ${css(opaque, false)})`}
              thumbColor={css(rgba)}
              valueText={`${Math.round(hsva.a * 100)}% opacity`}
              disabled={disabled}
              reduced={reduced}
              onChange={(a) => update({ ...latestHsva.current, a: a / 100 })}
              onCommit={commit}
            />
          ) : null}
        </div>
      </div>

      {showInput ? (
        <div className={cn(blockReset, "flex items-center gap-1.5")}>
          <label htmlFor={`${id}-format`} className="sr-only">
            Display format
          </label>
          <select
            id={`${id}-format`}
            value={displayFormat}
            disabled={disabled}
            onChange={(event) => {
              setDisplayFormat(event.currentTarget.value as ColorFormat);
              setDraft(null);
            }}
            className={cn(
              controlReset,
              "h-8 shrink-0 cursor-pointer rounded-pui-md border border-pui-input bg-pui-background px-1.5 text-xs font-medium uppercase text-pui-foreground",
              focusRing,
            )}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
          <input
            aria-label={`Color value (${displayFormat})`}
            spellCheck={false}
            autoComplete="off"
            value={draft ?? display}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={() => {
              if (draft !== null && applyString(draft)) setDraft(null);
              else if (draft !== null && parseColor(draft) === null) setDraft(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && draft !== null) {
                if (applyString(draft)) setDraft(null);
              } else if (event.key === "Escape") {
                setDraft(null);
              }
            }}
            className={cn(controlReset, fieldClasses, "h-8 min-w-0 flex-1 px-2 font-mono text-xs", invalid && invalidClasses)}
          />
          {showCopy ? (
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy color"}
              onClick={copy}
              disabled={disabled}
              className={cn(
                controlReset,
                "grid size-8 shrink-0 cursor-pointer place-items-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
                focusRing,
              )}
            >
              <motion.span key={copied ? "c" : "n"} initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.bouncy}>
                {copied ? <CheckIcon className="size-4 text-pui-success-text" /> : <CopyIcon className="size-4" />}
              </motion.span>
            </button>
          ) : null}
          {eyeDropperSupported ? (
            <button
              type="button"
              aria-label="Pick a color from the screen"
              onClick={pickFromScreen}
              disabled={disabled}
              className={cn(
                controlReset,
                "grid size-8 shrink-0 cursor-pointer place-items-center rounded-pui-md text-pui-muted-foreground transition-colors hover:bg-pui-muted hover:text-pui-foreground",
                focusRing,
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn(blockReset, "block size-4")}>
                <path d="m2 22 1-1h3l9-9" />
                <path d="M3 21v-3l9-9" />
                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3z" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {swatchList.length > 0 ? (
        <ul aria-label="Swatches" className={cn(listReset, "flex flex-wrap gap-1.5")}>
          {swatchList.map((swatch) => {
            const hex = formatColor(swatch.rgba, "hex", { alpha: showAlpha });
            const active = hex === currentHex;
            return (
              <li key={swatch.source}>
                <button
                  type="button"
                  aria-label={swatch.source}
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => applyString(swatch.source)}
                  className={cn(controlReset, "relative grid size-6 cursor-pointer place-items-center rounded-full", focusRing)}
                  style={checkerboard}
                >
                  <span
                    aria-hidden="true"
                    className={cn(blockReset, "absolute inset-0 rounded-full ring-1 ring-inset ring-pui-foreground/15 transition-transform duration-150 hover:scale-110")}
                    style={{ backgroundColor: css(swatch.rgba) }}
                  />
                  {active ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId={reduced ? undefined : `${id}-swatch`}
                      transition={springs.snappy}
                      className={cn(blockReset, "pointer-events-none absolute -inset-[3px] rounded-full border-2 border-pui-foreground")}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {copied ? `Copied ${display}` : ""}
      </span>
    </div>
  );
});
