"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { useControllableState } from "../hooks/use-controllable-state";
import { burst } from "../lib/burst";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, disabledStyles, focusRing, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Size, Tone } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { RollingNumber } from "../text/rolling-number";

export interface ReactionOption {
  value: string;
  /** Emoji or a small node. */
  emoji: React.ReactNode;
  /** Accessible name, e.g. "Love". */
  label: string;
}

export interface ReactionButtonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Reactions from everyone else; the viewer's own reaction adds one. Omit to hide the count. */
  count?: number;
  /** Long-press, right-click or ArrowUp opens a tray with these. */
  reactions?: readonly ReactionOption[];
  /** The chosen reaction's value (shown instead of the icon while pressed). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Icon while no reaction is chosen. Default a heart that fills when pressed. */
  icon?: React.ReactNode;
  /** Button name. Default "Like". */
  label?: string;
  /** Tray name. Default "Reactions". */
  trayLabel?: string;
  /** Screen reader hint when reactions exist. Default "Long press or press Up for more reactions". */
  trayHint?: string;
  /** Particle burst on press. Default true. */
  burst?: boolean;
  /** Default "danger" (a red heart). */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
  /** Default 450. */
  longPressMs?: number;
  disabled?: boolean;
}

const sizes: Record<Size, { button: string; icon: string; emoji: string }> = {
  sm: { button: "h-8 gap-1.5 px-2.5 text-xs", icon: "size-4", emoji: "text-base" },
  md: { button: "h-9 gap-2 px-3 text-sm", icon: "size-[18px]", emoji: "text-lg" },
  lg: { button: "h-11 gap-2 px-4 text-base", icon: "size-5", emoji: "text-xl" },
};

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn(blockReset, className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M12 20s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.6 12 20 12 20Z" />
    </svg>
  );
}

const BURST_COLORS = ["var(--pui-tone)", "var(--pui-warning)", "var(--pui-primary)", "var(--pui-tone)"];

/**
 * Like toggle with an icon pop, a particle burst and a rolling count. Give it `reactions` and a long
 * press (or right-click, or ArrowUp) opens a tray of emoji that magnify under the pointer.
 */
export const ReactionButton = React.forwardRef<HTMLDivElement, ReactionButtonProps>(function ReactionButton(
  {
    pressed: pressedProp,
    defaultPressed = false,
    onPressedChange,
    count,
    reactions,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    icon,
    label = "Like",
    trayLabel = "Reactions",
    trayHint = "Long press or press Up for more reactions",
    burst: burstEnabled = true,
    tone = "danger",
    size = "md",
    longPressMs = 450,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [pressed, setPressed] = useControllableState({ value: pressedProp, defaultValue: defaultPressed, onChange: onPressedChange });
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue, onChange: onValueChange });
  const [trayOpen, setTrayOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const trayRef = React.useRef<HTMLUListElement>(null);
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressClick = React.useRef(false);
  const hintId = React.useId();
  const trayId = React.useId();
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const hasTray = (reactions?.length ?? 0) > 0;
  const chosen = pressed && value ? reactions?.find((r) => r.value === value) : undefined;
  const s = sizes[size];

  React.useEffect(() => () => clearTimeout(pressTimer.current), []);
  useClickOutside(rootRef, () => setTrayOpen(false), { enabled: trayOpen });

  // Move focus into the tray when it opens (selected reaction first).
  React.useEffect(() => {
    if (!trayOpen) return;
    const items = trayRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]");
    if (!items?.length) return;
    const selected = [...items].find((el) => el.getAttribute("aria-checked") === "true");
    (selected ?? items[0])?.focus();
  }, [trayOpen]);

  const pop = () => {
    const button = buttonRef.current;
    if (!button || reduced || !burstEnabled) return;
    const iconEl = button.querySelector<HTMLElement>("[data-reaction-icon]");
    const b = button.getBoundingClientRect();
    const i = iconEl?.getBoundingClientRect() ?? b;
    burst(button, {
      x: i.left - b.left + i.width / 2,
      y: i.top - b.top + i.height / 2,
      count: 12,
      colors: BURST_COLORS,
      distance: [18, 34],
      size: [3, 6],
      duration: 0.55,
      shape: "circle",
    });
  };

  const toggle = () => {
    const next = !pressed;
    setPressed(next);
    if (next) pop();
  };

  const choose = (option: ReactionOption) => {
    setValue(option.value);
    if (!pressed) setPressed(true);
    setTrayOpen(false);
    buttonRef.current?.focus();
    // Wait a frame so the burst comes from the newly rendered emoji.
    requestAnimationFrame(pop);
  };

  const closeTray = () => {
    setTrayOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div
      ref={mergedRef}
      data-state={pressed ? "on" : "off"}
      {...props}
      className={cn(blockReset, "relative inline-flex", toneClasses[tone], className)}
    >
      <motion.button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-pressed={pressed}
        aria-haspopup={hasTray ? "menu" : undefined}
        aria-expanded={hasTray ? trayOpen : undefined}
        aria-controls={hasTray && trayOpen ? trayId : undefined}
        aria-describedby={hasTray ? hintId : undefined}
        data-state={pressed ? "on" : "off"}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        transition={springs.press}
        onPointerDown={(event) => {
          if (!hasTray || event.button !== 0) return;
          suppressClick.current = false;
          clearTimeout(pressTimer.current);
          pressTimer.current = setTimeout(() => {
            suppressClick.current = true;
            setTrayOpen(true);
          }, longPressMs);
        }}
        onPointerUp={() => clearTimeout(pressTimer.current)}
        onPointerLeave={() => clearTimeout(pressTimer.current)}
        onPointerCancel={() => clearTimeout(pressTimer.current)}
        onContextMenu={(event) => {
          if (!hasTray) return;
          event.preventDefault();
          suppressClick.current = true;
          setTrayOpen(true);
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          toggle();
        }}
        onKeyDown={(event) => {
          if (hasTray && event.key === "ArrowUp") {
            event.preventDefault();
            setTrayOpen(true);
          }
        }}
        className={cn(
          controlReset,
          "relative inline-flex cursor-pointer select-none items-center rounded-pui-full border font-medium tabular-nums [-webkit-touch-callout:none]",
          "border-pui-border bg-pui-surface text-pui-muted-foreground transition-colors duration-200 hover:text-pui-foreground",
          "data-[state=on]:border-(--pui-tone)/35 data-[state=on]:bg-(--pui-tone)/10 data-[state=on]:text-(--pui-tone-text)",
          s.button,
          focusRing,
          disabledStyles,
        )}
      >
        <span
          data-reaction-icon=""
          aria-hidden="true"
          className={cn(blockReset, "relative grid place-items-center", s.icon)}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={chosen ? `r-${chosen.value}` : pressed ? "on" : "off"}
              className={cn(
                blockReset,
                "grid place-items-center leading-none [grid-area:1/1]",
                chosen ? s.emoji : pressed ? "text-(--pui-tone)" : undefined,
              )}
              initial={reduced ? { opacity: 0 } : { scale: pressed ? 0.3 : 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0, transition: { duration: 0.1 } }}
              transition={reduced ? { duration: 0.12 } : pressed ? springs.wobbly : springs.snappy}
            >
              {chosen ? chosen.emoji : (icon ?? <HeartIcon filled={pressed} className={s.icon} />)}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence>
            {pressed && !reduced ? (
              <motion.span
                key={chosen?.value ?? "ring"}
                className={cn(blockReset, "pointer-events-none absolute -inset-1.5 rounded-pui-full border-2 border-(--pui-tone)")}
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: easings.outExpo }}
              />
            ) : null}
          </AnimatePresence>
        </span>
        <span className={cn(blockReset, "sr-only")}>{chosen ? `${label}: ${chosen.label}` : label}</span>
        {count !== undefined ? <RollingNumber value={count + (pressed ? 1 : 0)} duration={0.5} /> : null}
      </motion.button>
      {hasTray ? (
        <span id={hintId} className={cn(blockReset, "sr-only")}>
          {trayHint}
        </span>
      ) : null}
      <AnimatePresence>
        {trayOpen && reactions ? (
          <motion.ul
            ref={trayRef}
            id={trayId}
            role="menu"
            aria-label={trayLabel}
            aria-orientation="horizontal"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.92, transition: { duration: 0.12, ease: easings.inQuint } }}
            transition={reduced ? { duration: 0.15 } : springs.snappy}
            onKeyDown={(event) => {
              const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]")];
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              let next = -1;
              if (event.key === "ArrowRight") next = (index + 1) % items.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = items.length - 1;
              else if (event.key === "Escape" || event.key === "Tab") {
                if (event.key === "Escape") event.preventDefault();
                closeTray();
                return;
              } else return;
              event.preventDefault();
              items[next]?.focus();
            }}
            className={cn(
              listReset,
              "absolute bottom-full left-0 z-(--pui-z-popover) mb-2 flex origin-bottom-left items-end gap-0.5 rounded-pui-full border border-pui-border bg-pui-surface p-1.5 shadow-pui-lg",
            )}
          >
            {reactions.map((option, index) => (
              <motion.li
                key={option.value}
                role="none"
                className={cn(blockReset, "flex")}
                initial={reduced ? false : { opacity: 0, y: 10, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduced ? { duration: 0 } : { ...springs.bouncy, delay: index * 0.03 }}
              >
                <motion.button
                  type="button"
                  role="menuitemradio"
                  aria-checked={pressed && value === option.value}
                  aria-label={option.label}
                  title={option.label}
                  tabIndex={-1}
                  whileHover={reduced ? undefined : { scale: 1.35, y: -6 }}
                  whileFocus={reduced ? undefined : { scale: 1.35, y: -6 }}
                  whileTap={reduced ? undefined : { scale: 1.1 }}
                  transition={springs.snappy}
                  onClick={() => choose(option)}
                  className={cn(
                    controlReset,
                    "grid size-9 origin-bottom cursor-pointer place-items-center rounded-pui-full text-xl leading-none aria-checked:bg-(--pui-tone)/12",
                    focusRing,
                  )}
                >
                  <span aria-hidden="true">{option.emoji}</span>
                </motion.button>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
