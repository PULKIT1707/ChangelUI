"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/use-click-outside";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { ChevronDownIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import { easings, springs } from "../lib/motion";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type NavigationMenuIndicator = "pill" | "underline" | "none";

export interface NavigationMenuProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  /** Value of the open item; "" when closed. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** ms the pointer rests on a trigger before the first panel opens. Moving between triggers is instant. Default 150. */
  delayMs?: number;
  /** ms after the pointer leaves before the panel closes. Default 250. */
  closeDelayMs?: number;
  /** Hover highlight that slides between items. Default "pill". */
  indicator?: NavigationMenuIndicator;
  /** Small arrow on the panel pointing at the open trigger. Default true. */
  arrow?: boolean;
  /** Classes for the floating panel surface. */
  viewportClassName?: string;
  /** Accessible name of the nav landmark. Default "Main". */
  label?: string;
}

export type NavigationMenuListProps = React.HTMLAttributes<HTMLUListElement>;

export interface NavigationMenuItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Identifies the item; defaults to a generated id. */
  value?: string;
}

export type NavigationMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export interface NavigationMenuContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
}

export interface NavigationMenuLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The current page: sets aria-current="page". */
  active?: boolean;
  /** Render your router's link component as the child. */
  asChild?: boolean;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface IndicatorState {
  rect: Rect | null;
  shown: boolean;
  /** Slide from the previous position (false: appear in place). */
  slide: boolean;
}

interface NavContextValue {
  baseId: string;
  value: string;
  direction: number;
  reduced: boolean;
  viewportEl: HTMLDivElement | null;
  openItem: (value: string, via: "pointer" | "keyboard" | "click") => void;
  closeMenu: (focusTrigger?: boolean) => void;
  toggleItem: (value: string) => void;
  pointerEnterTrigger: (value: string) => void;
  pointerLeave: () => void;
  cancelClose: () => void;
  highlight: (el: HTMLElement | null) => void;
  setPanelSize: (size: { width: number; height: number }) => void;
  triggerId: (value: string) => string;
  contentId: (value: string) => string;
  listWrapRef: React.RefObject<HTMLDivElement | null>;
  indicator: NavigationMenuIndicator;
  indicatorState: IndicatorState;
}

const NavContext = React.createContext<NavContextValue | null>(null);
const ItemContext = React.createContext<{ value: string; hasContent: boolean } | null>(null);
const InContentContext = React.createContext(false);

function useNav(part: string): NavContextValue {
  const context = React.useContext(NavContext);
  if (!context) throw new Error(`${part} must be used inside <NavigationMenu>.`);
  return context;
}

function useItem(part: string) {
  const context = React.useContext(ItemContext);
  if (!context) throw new Error(`${part} must be used inside <NavigationMenuItem>.`);
  return context;
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function tabbables(root: Element | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)) : [];
}

/** Top-level focusable controls in the list (triggers and links), in DOM order. */
function topLevel(list: Element | null): HTMLElement[] {
  return list ? Array.from(list.querySelectorAll<HTMLElement>("[data-pui-nav-top]")) : [];
}

/**
 * Stripe-style top navigation. A highlight slides between items, and one floating panel morphs
 * its width, height and position to each item's content while the content slides in from the
 * direction of travel. Disclosure pattern (not a menu): triggers are buttons with aria-expanded,
 * links stay real links, Escape closes and Tab moves into the open panel.
 */
export const NavigationMenu = React.forwardRef<HTMLElement, NavigationMenuProps>(function NavigationMenu(
  {
    value: valueProp,
    defaultValue = "",
    onValueChange,
    delayMs = 150,
    closeDelayMs = 250,
    indicator = "pill",
    arrow = true,
    viewportClassName,
    label = "Main",
    className,
    children,
    onKeyDown,
    onBlur,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const baseId = toIdPart(React.useId());
  const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
  const rootRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const listWrapRef = React.useRef<HTMLDivElement>(null);
  const [viewportEl, setViewportEl] = React.useState<HTMLDivElement | null>(null);
  const [direction, setDirection] = React.useState(0);
  const [anchor, setAnchor] = React.useState({ center: 0, rootLeft: 0, vw: 0 });
  const [panelSize, setPanelSizeState] = React.useState<{ width: number; height: number } | null>(null);
  const [indicatorState, setIndicatorState] = React.useState<IndicatorState>({ rect: null, shown: false, slide: false });
  const timersRef = React.useRef({ open: 0, close: 0, openedAt: 0 });

  const clearTimers = () => {
    window.clearTimeout(timersRef.current.open);
    window.clearTimeout(timersRef.current.close);
  };
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      window.clearTimeout(timers.open);
      window.clearTimeout(timers.close);
    };
  }, []);

  const triggerId = (v: string) => `${baseId}-trigger-${toIdPart(v)}`;
  const contentId = (v: string) => `${baseId}-content-${toIdPart(v)}`;
  const triggerFor = (v: string) => document.getElementById(triggerId(v));

  const measureAnchor = (v: string) => {
    const root = rootRef.current;
    const trigger = triggerFor(v);
    if (!root || !trigger) return;
    const r = root.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    setAnchor({ center: t.left - r.left + t.width / 2, rootLeft: r.left, vw: document.documentElement.clientWidth });
  };

  const rectOf = (el: HTMLElement): Rect | null => {
    const wrap = listWrapRef.current;
    if (!wrap) return null;
    const w = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { left: r.left - w.left, top: r.top - w.top, width: r.width, height: r.height };
  };

  const highlight = (el: HTMLElement | null) => {
    const rect = el ? rectOf(el) : null;
    setIndicatorState((prev) => ({ rect: rect ?? prev.rect, shown: rect !== null, slide: prev.shown && rect !== null }));
  };

  const openItem = (next: string, via: "pointer" | "keyboard" | "click") => {
    clearTimers();
    if (next === value) return;
    const order = topLevel(listWrapRef.current).map((el) => el.dataset.value);
    const from = order.indexOf(value);
    const to = order.indexOf(next);
    setDirection(value === "" || from === -1 || to === -1 ? 0 : Math.sign(to - from));
    if (value === "") setPanelSizeState(null);
    if (via !== "click") timersRef.current.openedAt = Date.now();
    measureAnchor(next);
    setValue(next);
  };

  const closeMenu = (focusTrigger = false) => {
    clearTimers();
    if (value === "") return;
    setIndicatorState((prev) => ({ ...prev, shown: false, slide: false }));
    if (focusTrigger) triggerFor(value)?.focus();
    setDirection(0);
    setValue("");
  };

  const toggleItem = (v: string) => {
    if (value === v) {
      // A click right after hover-open would otherwise close the panel the pointer just opened.
      if (Date.now() - timersRef.current.openedAt < 500) return;
      clearTimers();
      setDirection(0);
      setValue("");
    } else openItem(v, "click");
  };

  const pointerEnterTrigger = (v: string) => {
    clearTimers();
    if (value !== "") openItem(v, "pointer");
    else timersRef.current.open = window.setTimeout(() => openItem(v, "pointer"), delayMs);
  };

  const pointerLeave = () => {
    clearTimers();
    if (value !== "") timersRef.current.close = window.setTimeout(() => closeMenu(), closeDelayMs);
  };

  const cancelClose = () => window.clearTimeout(timersRef.current.close);

  const setPanelSize = (size: { width: number; height: number }) =>
    setPanelSizeState((prev) => (prev && prev.width === size.width && prev.height === size.height ? prev : size));

  useClickOutside(rootRef, () => closeMenu(), { enabled: value !== "" });

  // Keep the panel under its trigger when the window resizes.
  const latestValue = value;
  React.useEffect(() => {
    if (latestValue === "") return;
    const onResize = () => {
      const root = rootRef.current;
      const trigger = document.getElementById(`${baseId}-trigger-${toIdPart(latestValue)}`);
      if (!root || !trigger) return;
      const r = root.getBoundingClientRect();
      const t = trigger.getBoundingClientRect();
      setAnchor({ center: t.left - r.left + t.width / 2, rootLeft: r.left, vw: document.documentElement.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [latestValue, baseId]);

  const context: NavContextValue = {
    baseId,
    value,
    direction,
    reduced,
    viewportEl,
    openItem,
    closeMenu,
    toggleItem,
    pointerEnterTrigger,
    pointerLeave,
    cancelClose,
    highlight,
    setPanelSize,
    triggerId,
    contentId,
    listWrapRef,
    indicator,
    indicatorState,
  };

  const width = panelSize?.width ?? 0;
  const gutter = 8;
  const minX = gutter - anchor.rootLeft;
  const maxX = anchor.vw ? anchor.vw - anchor.rootLeft - width - gutter : Infinity;
  const x = Math.round(Math.min(Math.max(anchor.center - width / 2, minX), Math.max(minX, maxX)));
  const arrowX = Math.min(Math.max(anchor.center - x, 16), Math.max(16, width - 16));
  // Opening from closed appears in place; only moves between items spring.
  const sizeTransition = reduced || direction === 0 ? { duration: 0 } : springs.layout;

  return (
    <NavContext.Provider value={context}>
      <nav
        ref={mergedRef}
        aria-label={label}
        data-state={value ? "open" : "closed"}
        {...props}
        onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLElement>) => {
          if (event.key === "Escape" && value !== "") {
            event.preventDefault();
            closeMenu(true);
          }
        })}
        onBlur={composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLElement>) => {
          const next = event.relatedTarget as Node | null;
          if (value !== "" && next && !event.currentTarget.contains(next)) closeMenu();
        })}
        className={cn(blockReset, "relative z-(--pui-z-popover) flex", className)}
      >
        {children}
        <AnimatePresence>
          {value !== "" ? (
            <motion.div
              key="viewport"
              className={cn(blockReset, "absolute left-0 top-full pt-2")}
              initial={{ x }}
              animate={{ x }}
              transition={sizeTransition}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") cancelClose();
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") pointerLeave();
              }}
            >
              <motion.div
                className={cn(
                  blockReset,
                  "relative origin-top overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) text-pui-surface-foreground shadow-pui-xl",
                  viewportClassName,
                )}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  ...(panelSize ? { width: panelSize.width, height: panelSize.height } : {}),
                }}
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.14, ease: easings.inQuint } }
                }
                transition={{
                  opacity: { duration: 0.16, ease: easings.out },
                  scale: reduced ? { duration: 0 } : springs.layout,
                  y: reduced ? { duration: 0 } : springs.layout,
                  width: sizeTransition,
                  height: sizeTransition,
                }}
              >
                <div ref={setViewportEl} className={cn(blockReset, "relative")} />
              </motion.div>
              {arrow && panelSize ? (
                <motion.span
                  aria-hidden="true"
                  className={cn(
                    blockReset,
                    "pointer-events-none absolute top-[calc(0.5rem-5px)] size-2.5 -translate-x-1/2 rotate-45 rounded-tl-[2px] border-l border-t border-pui-border bg-pui-surface",
                  )}
                  initial={{ left: arrowX, opacity: 0 }}
                  animate={{ left: arrowX, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ left: sizeTransition, opacity: { duration: 0.16 } }}
                />
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </NavContext.Provider>
  );
});

/** The row of items. Renders the sliding highlight behind them. */
export const NavigationMenuList = React.forwardRef<HTMLUListElement, NavigationMenuListProps>(function NavigationMenuList(
  { className, onPointerLeave, onBlur, ...props },
  ref,
) {
  const nav = useNav("NavigationMenuList");
  const { rect, shown, slide } = nav.indicatorState;
  const slideTransition = nav.reduced || !slide ? { duration: 0 } : springs.snappy;
  const underline = nav.indicator === "underline";
  return (
    <div ref={nav.listWrapRef} className={cn(blockReset, "relative")}>
      {nav.indicator !== "none" && rect ? (
        <motion.span
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute left-0 top-0",
            underline ? "rounded-pui-full bg-pui-primary" : "rounded-pui-md bg-pui-muted",
          )}
          initial={false}
          animate={{
            x: rect.left + (underline ? 10 : 0),
            y: underline ? rect.top + rect.height - 2 : rect.top,
            width: Math.max(0, rect.width - (underline ? 20 : 0)),
            height: underline ? 2 : rect.height,
            opacity: shown ? 1 : 0,
          }}
          transition={{ x: slideTransition, y: slideTransition, width: slideTransition, height: slideTransition, opacity: { duration: 0.15 } }}
        />
      ) : null}
      <ul
        ref={ref}
        {...props}
        onPointerLeave={composeEventHandlers(onPointerLeave, () =>
          nav.highlight(nav.value ? document.getElementById(nav.triggerId(nav.value)) : null),
        )}
        onBlur={composeEventHandlers(onBlur, (event: React.FocusEvent<HTMLUListElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) nav.highlight(null);
        })}
        className={cn(listReset, "relative flex items-center gap-1", className)}
      />
    </div>
  );
});

/** One entry: a trigger plus content, or a single NavigationMenuLink. */
export const NavigationMenuItem = React.forwardRef<HTMLLIElement, NavigationMenuItemProps>(function NavigationMenuItem(
  { value: valueProp, className, children, ...props },
  ref,
) {
  const generated = React.useId();
  const value = valueProp ?? generated;
  const hasContent = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === NavigationMenuContent,
  );
  const item = React.useMemo(() => ({ value, hasContent }), [value, hasContent]);
  return (
    <ItemContext.Provider value={item}>
      <li ref={ref} {...props} className={cn(blockReset, "relative", className)}>
        {children}
      </li>
    </ItemContext.Provider>
  );
});

function moveAcrossList(event: React.KeyboardEvent<HTMLElement>, list: Element | null) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return false;
  const all = topLevel(list);
  const index = all.indexOf(event.currentTarget);
  if (index === -1) return false;
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % all.length;
  else if (event.key === "ArrowLeft") next = (index - 1 + all.length) % all.length;
  else if (event.key === "Home") next = 0;
  else next = all.length - 1;
  event.preventDefault();
  all[next]?.focus();
  return true;
}

const topLevelStyles =
  "relative inline-flex h-9 cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-pui-md px-3 text-sm font-medium text-pui-muted-foreground transition-colors duration-150 hover:text-pui-foreground data-[state=open]:text-pui-foreground aria-[current=page]:text-pui-foreground";

/** Opens its item's panel on hover (after delayMs), click, Enter or Space. */
export const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  function NavigationMenuTrigger(
    { className, children, onPointerEnter, onPointerLeave, onClick, onKeyDown, onFocus, type, ...props },
    ref,
  ) {
    const nav = useNav("NavigationMenuTrigger");
    const item = useItem("NavigationMenuTrigger");
    const open = nav.value === item.value;
    const focusPanel = () => {
      const panel = document.getElementById(nav.contentId(item.value));
      const first = tabbables(panel)[0];
      if (first) first.focus();
      return Boolean(first);
    };
    return (
      <button
        ref={ref}
        id={nav.triggerId(item.value)}
        type={type ?? "button"}
        aria-expanded={open}
        aria-controls={open ? nav.contentId(item.value) : undefined}
        data-state={open ? "open" : "closed"}
        data-value={item.value}
        data-pui-nav-top=""
        {...props}
        onPointerEnter={composeEventHandlers(onPointerEnter, (event: React.PointerEvent<HTMLButtonElement>) => {
          if (event.pointerType === "touch") return;
          nav.highlight(event.currentTarget);
          nav.pointerEnterTrigger(item.value);
        })}
        onPointerLeave={composeEventHandlers(onPointerLeave, (event: React.PointerEvent<HTMLButtonElement>) => {
          if (event.pointerType !== "touch") nav.pointerLeave();
        })}
        onFocus={composeEventHandlers(onFocus, (event: React.FocusEvent<HTMLButtonElement>) => nav.highlight(event.currentTarget))}
        onClick={composeEventHandlers(onClick, () => nav.toggleItem(item.value))}
        onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLButtonElement>) => {
          if (moveAcrossList(event, nav.listWrapRef.current)) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (open) focusPanel();
            else {
              nav.openItem(item.value, "keyboard");
              window.requestAnimationFrame(() => window.requestAnimationFrame(focusPanel));
            }
          } else if (event.key === "Tab" && !event.shiftKey && open) {
            if (focusPanel()) event.preventDefault();
          }
        })}
        className={cn(controlReset, topLevelStyles, focusRing, className)}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "size-3.5 opacity-70 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
    );
  },
);

const panelVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 16 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -16 }),
};

const reducedPanelVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

/** The item's panel. Rendered into the shared floating viewport while its item is open. */
export const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  function NavigationMenuContent({ className, children, onKeyDown, ...props }, ref) {
    const nav = useNav("NavigationMenuContent");
    const item = useItem("NavigationMenuContent");
    const open = nav.value === item.value;
    const panelRef = React.useRef<HTMLDivElement>(null);
    const mergedRef = React.useMemo(() => mergeRefs(panelRef, ref), [ref]);
    const setSizeRef = useLatestRef(nav.setPanelSize);

    React.useEffect(() => {
      const el = panelRef.current;
      if (!open || !el || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => {
        setSizeRef.current({ width: Math.ceil(el.offsetWidth), height: Math.ceil(el.offsetHeight) });
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [open, nav.viewportEl, setSizeRef]);

    if (!nav.viewportEl) return null;
    const transition = nav.reduced
      ? { duration: 0.12 }
      : { x: springs.layout, opacity: { duration: 0.18, ease: easings.out } };

    return createPortal(
      <AnimatePresence initial={nav.direction !== 0} custom={nav.direction} mode="popLayout">
        {open ? (
          <motion.div
            key={item.value}
            ref={mergedRef}
            id={nav.contentId(item.value)}
            role="region"
            aria-labelledby={nav.triggerId(item.value)}
            data-state="open"
            custom={nav.direction}
            variants={nav.reduced ? reducedPanelVariants : panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            {...props}
            onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key !== "Tab") return;
              const items = tabbables(event.currentTarget);
              const first = items[0];
              const last = items[items.length - 1];
              const trigger = document.getElementById(nav.triggerId(item.value));
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                trigger?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                const all = topLevel(nav.listWrapRef.current);
                const next = trigger ? all[all.indexOf(trigger) + 1] : undefined;
                if (next) {
                  event.preventDefault();
                  next.focus();
                }
                nav.closeMenu();
              }
            })}
            className={cn(blockReset, "w-max max-w-[calc(100vw-2rem)] p-2", className)}
          >
            <InContentContext.Provider value>{children}</InContentContext.Provider>
          </motion.div>
        ) : null}
      </AnimatePresence>,
      nav.viewportEl,
    );
  },
);

/**
 * A link: a top-level item on its own, or an entry inside a panel. Clicking it closes the menu.
 * `active` marks the current page.
 */
export const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(function NavigationMenuLink(
  { active = false, asChild = false, className, onClick, onPointerEnter, onFocus, onKeyDown, ...props },
  ref,
) {
  const nav = useNav("NavigationMenuLink");
  const inContent = React.useContext(InContentContext);
  const item = React.useContext(ItemContext);
  const topLevelLink = !inContent && item !== null && !item.hasContent;
  const shared = {
    "aria-current": active ? ("page" as const) : undefined,
    "data-active": active ? "" : undefined,
    "data-value": topLevelLink ? item?.value : undefined,
    "data-pui-nav-top": topLevelLink ? "" : undefined,
    ...props,
    onClick: composeEventHandlers(onClick, () => nav.closeMenu()),
    onPointerEnter: composeEventHandlers(onPointerEnter, (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (!topLevelLink || event.pointerType === "touch") return;
      nav.highlight(event.currentTarget);
      nav.pointerLeave();
    }),
    onFocus: composeEventHandlers(onFocus, (event: React.FocusEvent<HTMLAnchorElement>) => {
      if (topLevelLink) nav.highlight(event.currentTarget);
    }),
    onKeyDown: composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (topLevelLink) moveAcrossList(event, nav.listWrapRef.current);
    }),
  };
  const styles = topLevelLink
    ? topLevelStyles
    : "flex flex-col gap-0.5 rounded-pui-lg p-3 text-sm text-pui-surface-foreground no-underline transition-colors duration-150 hover:bg-pui-muted focus-visible:bg-pui-muted aria-[current=page]:bg-pui-muted";
  if (asChild) return <Slot ref={ref} {...shared} className={cn(styles, focusRing, className)} />;
  return <a ref={ref} {...shared} className={cn(blockReset, styles, focusRing, className)} />;
});
