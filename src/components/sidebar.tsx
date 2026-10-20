"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import { ChevronDownIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Drawer, DrawerContent } from "./drawer";
import { Tooltip } from "./tooltip";

export type SidebarCollapsible = "icon" | "offcanvas" | "none";
export type SidebarSide = "left" | "right";

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Desktop expanded state (controlled). */
  open?: boolean;
  /** Server-rendered expanded state. Default true. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Collapsed look on desktop: a 56 px icon rail, fully hidden, or never collapses. Default "icon". */
  collapsible?: SidebarCollapsible;
  /** Default "left". */
  side?: SidebarSide;
  /** Expanded width in px. Default 260. */
  width?: number;
  /** Icon rail width in px. Default 56. */
  collapsedWidth?: number;
  /** Below this viewport width (px) the sidebar becomes an off-canvas drawer. 0 disables. Default 768. */
  mobileBreakpoint?: number;
  /** Toggle with Cmd/Ctrl + this key, e.g. "b". Default off. */
  shortcut?: string;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Landmark name. Default "Sidebar". */
  label?: string;
  /** "sidebar" sits flush with a border; "floating" is an inset rounded card. Default "sidebar". */
  variant?: "sidebar" | "floating";
}

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small heading above the items; fades out on the icon rail. */
  label?: React.ReactNode;
  /** Trailing control next to the label (e.g. an add button). Hidden on the icon rail. */
  action?: React.ReactNode;
}

export interface SidebarItemProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  icon?: React.ReactNode;
  /** The current page: shows the sliding active pill and sets aria-current="page" on links. */
  active?: boolean;
  /** Trailing count or tag; becomes a dot on the icon rail. */
  badge?: React.ReactNode;
  disabled?: boolean;
  /** Tooltip on the icon rail. Default: the children when they are a string. */
  tooltip?: string;
  /** Render the single child element (e.g. a router Link) as the item; put icon/label inside it. */
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface SidebarSubProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "onToggle"> {
  label: React.ReactNode;
  icon?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tooltip on the icon rail. Default: the label when it is a string. */
  tooltip?: string;
}

export interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export type SidebarSectionProps = React.HTMLAttributes<HTMLDivElement>;

export interface SidebarState {
  /** Desktop expanded state. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Off-canvas drawer state below the mobile breakpoint. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Toggles the drawer on mobile, otherwise the desktop state. */
  toggle: () => void;
  isMobile: boolean;
  /** "expanded" or "collapsed" (desktop look). */
  state: "expanded" | "collapsed";
  collapsible: SidebarCollapsible;
  side: SidebarSide;
}

interface SidebarContextValue extends SidebarState {
  id: string;
  navId: string;
  width: number;
  collapsedWidth: number;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

/** Inside the rendered panel: whether it shows as the icon rail, and whether it sits in the drawer. */
const PanelContext = React.createContext<{ rail: boolean; inDrawer: boolean }>({ rail: false, inDrawer: false });

function useSidebarContext(part: string): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside SidebarProvider`);
  return context;
}

/** Sidebar state for custom triggers and layouts. */
export function useSidebar(): SidebarState {
  return useSidebarContext("useSidebar");
}

/** Holds the sidebar state and lays out Sidebar and SidebarInset side by side. */
export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(function SidebarProvider(
  {
    open: openProp,
    defaultOpen = true,
    onOpenChange,
    collapsible = "icon",
    side = "left",
    width = 260,
    collapsedWidth = 56,
    mobileBreakpoint = 768,
    shortcut,
    className,
    style,
    ...props
  },
  ref,
) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileQuery = mobileBreakpoint > 0 ? `(max-width: ${mobileBreakpoint - 0.02}px)` : "not all";
  const isMobile = useMediaQuery(mobileQuery);
  const effectiveOpen = collapsible === "none" ? true : open;

  const context = React.useMemo<SidebarContextValue>(
    () => ({
      id,
      navId: `${id}-nav`,
      open: effectiveOpen,
      setOpen,
      mobileOpen: isMobile && mobileOpen,
      setMobileOpen,
      toggle: () => {
        if (isMobile) setMobileOpen((v) => !v);
        else if (collapsible !== "none") setOpen(!effectiveOpen);
      },
      isMobile,
      state: effectiveOpen ? "expanded" : "collapsed",
      collapsible,
      side,
      width,
      collapsedWidth,
    }),
    [id, effectiveOpen, setOpen, isMobile, mobileOpen, collapsible, side, width, collapsedWidth],
  );

  const toggleRef = useLatestRef(context.toggle);
  React.useEffect(() => {
    if (!shortcut) return;
    const key = shortcut.toLowerCase();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== key) return;
      event.preventDefault();
      toggleRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggleRef]);

  return (
    <SidebarContext.Provider value={context}>
      <div
        ref={ref}
        data-pui-sidebar-provider=""
        data-state={context.state}
        data-collapsible={collapsible}
        data-side={side}
        data-mobile={isMobile ? "" : undefined}
        {...props}
        style={
          {
            "--pui-sidebar-width": `${width}px`,
            "--pui-sidebar-collapsed-width": `${collapsedWidth}px`,
            ...style,
          } as React.CSSProperties
        }
        className={cn(blockReset, "flex min-h-0 w-full", side === "right" && "flex-row-reverse", className)}
      />
    </SidebarContext.Provider>
  );
});

/** The panel: animated width on desktop, an off-canvas Drawer below the mobile breakpoint. */
export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { label = "Sidebar", variant = "sidebar", className, style, children, ...props },
  ref,
) {
  const sidebar = useSidebarContext("Sidebar");
  const reduced = usePrefersReducedMotion();
  const { open, collapsible, side, width, collapsedWidth } = sidebar;
  const rail = !open && collapsible === "icon";
  const hidden = !open && collapsible === "offcanvas";

  const floating = variant === "floating";
  const panelClasses = cn(
    blockReset,
    "flex h-full min-h-0 flex-col overflow-hidden bg-pui-surface text-pui-surface-foreground backdrop-blur-(--pui-surface-blur)",
    floating
      ? "rounded-pui-xl border border-pui-border shadow-pui-md"
      : side === "left"
        ? "border-e border-pui-border"
        : "border-s border-pui-border",
  );

  if (sidebar.isMobile) {
    return (
      <Drawer open={sidebar.mobileOpen} onOpenChange={sidebar.setMobileOpen}>
        <DrawerContent side={side} size="sm" aria-label={label} className="p-0">
          <PanelContext.Provider value={{ rail: false, inDrawer: true }}>
            <nav
              ref={ref}
              id={sidebar.navId}
              aria-label={label}
              data-state="expanded"
              data-variant={variant}
              {...props}
              style={style}
              className={cn(blockReset, "flex h-full min-h-0 flex-col text-pui-surface-foreground", className)}
            >
              {children}
            </nav>
          </PanelContext.Provider>
        </DrawerContent>
      </Drawer>
    );
  }

  const target = open ? width : rail ? collapsedWidth : collapsible === "offcanvas" ? 0 : width;
  const gutter = floating ? 16 : 0;
  return (
    <motion.div
      data-pui-sidebar=""
      data-state={sidebar.state}
      data-collapsible={collapsible}
      initial={false}
      animate={
        hidden
          ? { width: 0, transitionEnd: { visibility: "hidden" } }
          : { width: target + gutter, visibility: "visible" }
      }
      transition={reduced ? { duration: 0 } : springs.heavy}
      className={cn(blockReset, "relative h-full shrink-0 overflow-hidden")}
    >
      <PanelContext.Provider value={{ rail, inDrawer: false }}>
        <nav
          ref={ref}
          id={sidebar.navId}
          aria-label={label}
          data-state={sidebar.state}
          data-variant={variant}
          {...props}
          style={{ width: hidden ? width : undefined, ...style }}
          className={cn(
            panelClasses,
            floating ? "absolute inset-y-2" : "absolute inset-y-0",
            hidden
              ? side === "left"
                ? floating
                  ? "right-2"
                  : "right-0"
                : floating
                  ? "left-2"
                  : "left-0"
              : floating
                ? "inset-x-2"
                : "inset-x-0",
            className,
          )}
        >
          {children}
        </nav>
      </PanelContext.Provider>
    </motion.div>
  );
});

export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "flex shrink-0 flex-col gap-2 p-2", className)} />;
});

export const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "mt-auto flex shrink-0 flex-col gap-2 p-2", className)} />;
});

/** The scrolling middle section. */
export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(blockReset, "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-1", className)}
    />
  );
});

export const SidebarSeparator = React.forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarSeparator(
  { className, ...props },
  ref,
) {
  return <div ref={ref} role="separator" {...props} className={cn(blockReset, "mx-2 my-1 h-px shrink-0 bg-pui-border", className)} />;
});

/** Fades and blurs labels away on the icon rail; instant under reduced motion. */
function useLabelMotion(rail: boolean) {
  const reduced = usePrefersReducedMotion();
  return {
    initial: false as const,
    animate: rail
      ? { opacity: 0, filter: reduced ? "blur(0px)" : "blur(4px)", x: reduced ? 0 : -4 }
      : { opacity: 1, filter: "blur(0px)", x: 0 },
    transition: reduced ? { duration: 0 } : { duration: 0.2, ease: easings.out },
  };
}

export const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(function SidebarGroup(
  { label, action, className, children, ...props },
  ref,
) {
  const { rail } = React.useContext(PanelContext);
  const labelId = React.useId();
  const labelMotion = useLabelMotion(rail);
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      {...props}
      className={cn(blockReset, "flex flex-col gap-1", className)}
    >
      {label ? (
        <div className={cn(blockReset, "relative flex h-7 items-center gap-2 px-3")}>
          <motion.span
            id={labelId}
            {...labelMotion}
            className={cn(blockReset, "flex-1 truncate whitespace-nowrap text-xs font-medium text-pui-muted-foreground")}
          >
            {label}
          </motion.span>
          {action && !rail ? <span className={cn(blockReset, "inline-flex shrink-0")}>{action}</span> : null}
          {/* On the rail the heading becomes a short divider. */}
          <span
            aria-hidden="true"
            className={cn(
              blockReset,
              "pointer-events-none absolute inset-x-3 top-1/2 h-px bg-pui-border transition-opacity duration-(--pui-duration-base)",
              rail ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}
      <ul className={cn(listReset, "flex flex-col gap-0.5")}>{children}</ul>
    </div>
  );
});

const itemBase =
  "relative isolate flex w-full min-w-0 cursor-pointer select-none items-center gap-3 rounded-pui-md px-3 text-start text-sm no-underline outline-hidden transition-colors duration-(--pui-duration-fast)";

interface ItemInnerProps {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  active: boolean;
  rail: boolean;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}

function ItemInner({ icon, badge, active, rail, trailing, children }: ItemInnerProps) {
  const sidebar = useSidebarContext("SidebarItem");
  const reduced = usePrefersReducedMotion();
  const labelMotion = useLabelMotion(rail);
  return (
    <>
      {active ? (
        <motion.span
          layoutId={`${sidebar.id}-active`}
          transition={reduced ? { duration: 0 } : springs.snappy}
          aria-hidden="true"
          data-pui-sidebar-pill=""
          className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-md bg-pui-muted shadow-pui-sm")}
        >
          <span className={cn(blockReset, "absolute inset-y-2 start-0 block w-0.5 rounded-pui-full bg-pui-primary")} />
        </motion.span>
      ) : null}
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            blockReset,
            "relative inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
            active ? "text-pui-primary" : "text-pui-muted-foreground group-hover/item:text-pui-foreground",
          )}
        >
          {icon}
          {badge !== undefined && badge !== null && rail ? (
            <span className={cn(blockReset, "absolute -end-1 -top-1 block size-2 rounded-pui-full bg-pui-primary ring-2 ring-pui-surface")} />
          ) : null}
        </span>
      ) : null}
      <motion.span {...labelMotion} className={cn(blockReset, "min-w-0 flex-1 truncate whitespace-nowrap")}>
        {children}
      </motion.span>
      {badge !== undefined && badge !== null ? (
        <motion.span
          {...labelMotion}
          className={cn(
            blockReset,
            "ms-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pui-full px-1.5 text-[11px] font-medium tabular-nums",
            active ? "bg-pui-primary text-pui-primary-foreground" : "bg-pui-muted text-pui-muted-foreground",
          )}
        >
          {badge}
        </motion.span>
      ) : null}
      {trailing}
    </>
  );
}

function itemClasses(active: boolean, disabled: boolean, size: "md" | "sm") {
  return cn(
    itemBase,
    "group/item",
    size === "md" ? "h-9" : "h-8",
    active ? "font-medium text-pui-foreground" : "text-pui-muted-foreground hover:bg-pui-muted/60 hover:text-pui-foreground",
    disabled && "pointer-events-none opacity-50",
    focusRing,
    "focus-visible:outline-offset-0",
  );
}

/** Whether an item sits inside a SidebarSub (smaller, no icon slot by default). */
const SubLevelContext = React.createContext(false);

/** A link (href), a button, or your own element (asChild). */
export const SidebarItem = React.forwardRef<HTMLAnchorElement, SidebarItemProps>(function SidebarItem(
  { icon, active = false, badge, disabled = false, tooltip, asChild = false, className, children, onClick, href, ...props },
  ref,
) {
  const sidebar = useSidebarContext("SidebarItem");
  const { rail, inDrawer } = React.useContext(PanelContext);
  const nested = React.useContext(SubLevelContext);
  const tip = tooltip ?? (typeof children === "string" ? children : undefined);
  const classes = cn(itemClasses(active, disabled, nested ? "sm" : "md"), className);
  const handleClick = composeEventHandlers(onClick, () => {
    // Following a link from the drawer closes it.
    if (inDrawer) sidebar.setMobileOpen(false);
  });
  const shared = {
    "aria-current": active ? ("page" as const) : undefined,
    "aria-disabled": disabled || undefined,
    "data-active": active ? "" : undefined,
    ...props,
    onClick: handleClick,
  };

  let element: React.ReactElement;
  if (asChild) {
    element = (
      <Slot ref={ref} {...shared} className={classes}>
        {children}
      </Slot>
    );
  } else if (href !== undefined) {
    element = (
      <a ref={ref} href={disabled ? undefined : href} {...shared} className={cn(blockReset, classes)}>
        <ItemInner icon={icon} badge={badge} active={active} rail={rail}>
          {children}
        </ItemInner>
      </a>
    );
  } else {
    element = (
      <button
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled}
        {...(shared as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        className={cn(controlReset, classes)}
      >
        <ItemInner icon={icon} badge={badge} active={active} rail={rail}>
          {children}
        </ItemInner>
      </button>
    );
  }

  return (
    <li className={cn(blockReset, "relative")}>
      {tip ? (
        <Tooltip content={tip} side={sidebar.side === "left" ? "right" : "left"} disabled={!rail} openDelayMs={150}>
          {element}
        </Tooltip>
      ) : (
        element
      )}
    </li>
  );
});

/** A collapsible group of nested items with its own trigger row. */
export const SidebarSub = React.forwardRef<HTMLLIElement, SidebarSubProps>(function SidebarSub(
  { label, icon, open: openProp, defaultOpen = false, onOpenChange, tooltip, className, children, ...props },
  ref,
) {
  const sidebar = useSidebarContext("SidebarSub");
  const { rail } = React.useContext(PanelContext);
  const reduced = usePrefersReducedMotion();
  const contentId = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const tip = tooltip ?? (typeof label === "string" ? label : undefined);
  const expanded = open && !rail;

  const trigger = (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={() => {
        // On the icon rail the sub list has no room: expand the sidebar and open the list.
        if (rail) {
          sidebar.setOpen(true);
          setOpen(true);
        } else setOpen(!open);
      }}
      className={cn(controlReset, itemClasses(false, false, "md"))}
    >
      <ItemInner
        icon={icon}
        active={false}
        rail={rail}
        trailing={
          rail ? null : (
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0 text-pui-muted-foreground transition-transform duration-(--pui-duration-base) ease-pui-out motion-reduce:transition-none",
                expanded ? "rotate-0" : "-rotate-90 rtl:rotate-90",
              )}
            />
          )
        }
      >
        {label}
      </ItemInner>
    </button>
  );

  return (
    <li ref={ref} data-state={expanded ? "open" : "closed"} {...props} className={cn(blockReset, "flex flex-col", className)}>
      {tip ? (
        <Tooltip content={tip} side={sidebar.side === "left" ? "right" : "left"} disabled={!rail} openDelayMs={150}>
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="sub"
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.25, ease: easings.out }}
            className={cn(blockReset, "overflow-hidden")}
          >
            <SubLevelContext.Provider value>
              <ul className={cn(listReset, "relative ms-5 flex flex-col gap-0.5 border-s border-pui-border py-0.5 ps-2")}>
                {children}
              </ul>
            </SubLevelContext.Provider>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
});

function PanelIcon({ open, side }: { open: boolean; side: SidebarSide }) {
  const reduced = usePrefersReducedMotion();
  const x = side === "left" ? 3.25 : 9.75;
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-4">
      <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="2.25" />
      <motion.rect
        initial={false}
        animate={{ width: open ? 3 : 1.25, opacity: open ? 1 : 0.6 }}
        transition={reduced ? { duration: 0 } : springs.snappy}
        x={x}
        y="4"
        height="8"
        rx="0.75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Toggles the sidebar (the drawer on mobile). */
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(function SidebarTrigger(
  { asChild = false, type, onClick, className, children, "aria-label": ariaLabel, ...props },
  ref,
) {
  const sidebar = useSidebarContext("SidebarTrigger");
  const expanded = sidebar.isMobile ? sidebar.mobileOpen : sidebar.open;
  const shared = {
    "aria-label": ariaLabel ?? (children ? undefined : "Toggle sidebar"),
    "aria-expanded": expanded,
    "aria-controls": sidebar.isMobile ? undefined : sidebar.navId,
    "data-state": expanded ? "open" : "closed",
    ...props,
    onClick: composeEventHandlers(onClick, sidebar.toggle),
  };
  if (asChild) {
    return (
      <Slot ref={ref} {...shared} className={className}>
        {children}
      </Slot>
    );
  }
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      {...shared}
      className={cn(
        controlReset,
        "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-pui-md px-2 text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground",
        focusRing,
        className,
      )}
    >
      {children ?? <PanelIcon open={expanded} side={sidebar.side} />}
    </button>
  );
});

/** The main area next to the sidebar. */
export const SidebarInset = React.forwardRef<HTMLDivElement, SidebarSectionProps>(function SidebarInset(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "flex min-w-0 flex-1 flex-col", className)} />;
});
