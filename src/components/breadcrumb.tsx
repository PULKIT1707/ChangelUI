"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronRightIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { Slot } from "../lib/slot";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";

export type BreadcrumbSize = "sm" | "md";

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Collapse the middle once there are more items than this. 0 never collapses. Default 4. */
  maxItems?: number;
  /** Items kept before the ellipsis. Default 1. */
  itemsBeforeCollapse?: number;
  /** Items kept after the ellipsis. Default 2. */
  itemsAfterCollapse?: number;
  /** "menu" lists the hidden items in a dropdown; "expand" reveals them inline. Default "menu". */
  collapse?: "menu" | "expand";
  /** Between items. Default a chevron. */
  separator?: React.ReactNode;
  /** Default "md". */
  size?: BreadcrumbSize;
  /** Landmark name. Default "Breadcrumb". */
  label?: string;
  /** Ellipsis button name; receives the hidden count. Default (n) => `Show ${n} more`. */
  expandLabel?: (hidden: number) => string;
}

export interface BreadcrumbItemProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /** The current page: rendered as text with aria-current="page". */
  current?: boolean;
  icon?: React.ReactNode;
  /** Render the single child element (e.g. a router Link) as the link. */
  asChild?: boolean;
  children?: React.ReactNode;
}

const sizes: Record<BreadcrumbSize, string> = {
  sm: "gap-1 text-xs",
  md: "gap-1.5 text-sm",
};

const linkBase =
  "inline-flex min-w-0 max-w-[14rem] items-center gap-1.5 rounded-pui-sm text-pui-muted-foreground no-underline transition-colors duration-(--pui-duration-fast) hover:text-pui-foreground";

// An underline that grows from the start edge on hover; transforms only, so it stays cheap.
const underline =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-(--pui-duration-base) after:ease-pui-out hover:after:scale-x-100 motion-reduce:after:transition-none rtl:after:origin-right";

/** One crumb: a link, or the current page as plain text. */
export const BreadcrumbItem = React.forwardRef<HTMLAnchorElement, BreadcrumbItemProps>(function BreadcrumbItem(
  { current = false, icon, asChild = false, className, children, ...props },
  ref,
) {
  const content = (
    <>
      {icon ? (
        <span aria-hidden="true" className={cn(blockReset, "inline-flex shrink-0 [&_svg]:size-[1.1em]")}>
          {icon}
        </span>
      ) : null}
      <span className={cn(blockReset, "min-w-0 truncate")}>{children}</span>
    </>
  );
  if (current) {
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        aria-current="page"
        data-current=""
        className={cn(blockReset, "inline-flex min-w-0 max-w-[16rem] items-center gap-1.5 font-medium text-pui-foreground", className)}
      >
        {content}
      </span>
    );
  }
  if (asChild) {
    return (
      <Slot ref={ref} {...props} className={cn(linkBase, underline, focusRing, className)}>
        {children}
      </Slot>
    );
  }
  return (
    <a ref={ref} {...props} className={cn(blockReset, linkBase, underline, focusRing, className)}>
      {content}
    </a>
  );
});

interface Crumb {
  key: React.Key;
  element: React.ReactElement<BreadcrumbItemProps>;
}

function EllipsisIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-4">
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

/**
 * Breadcrumb trail with automatic middle collapse into an ellipsis menu (or inline expansion).
 * Collapse uses the static maxItems, so server and client render the same list.
 */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  {
    maxItems = 4,
    itemsBeforeCollapse = 1,
    itemsAfterCollapse = 2,
    collapse = "menu",
    separator,
    size = "md",
    label = "Breadcrumb",
    expandLabel = (n) => `Show ${n} more`,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [expanded, setExpanded] = React.useState(false);
  const listRef = React.useRef<HTMLOListElement>(null);
  const crumbs: Crumb[] = React.Children.toArray(children)
    .filter((child): child is React.ReactElement<BreadcrumbItemProps> => React.isValidElement(child))
    .map((element) => ({ key: element.key ?? "", element }));

  const before = Math.max(0, itemsBeforeCollapse);
  const after = Math.max(1, itemsAfterCollapse);
  const collapsible = maxItems > 0 && crumbs.length > maxItems && before + after < crumbs.length;
  const collapsed = collapsible && !(collapse === "expand" && expanded);
  const head = collapsed ? crumbs.slice(0, before) : crumbs;
  const hidden = collapsed ? crumbs.slice(before, crumbs.length - after) : [];
  const tail = collapsed ? crumbs.slice(crumbs.length - after) : [];

  const sep = separator ?? <ChevronRightIcon className="size-3.5 rtl:-scale-x-100" />;
  const itemMotion = reduced
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, x: -6 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -6, transition: { duration: 0.12, ease: easings.out } },
        transition: { ...springs.layout, opacity: { duration: 0.18 } },
      };

  const renderCrumb = (crumb: Crumb, index: number, total: number, revealIndex?: number) => [
    index > 0 ? (
      <motion.li
        key={`sep-${String(crumb.key)}`}
        layout={reduced ? false : "position"}
        role="presentation"
        aria-hidden="true"
        {...itemMotion}
        className={cn(blockReset, "inline-flex items-center text-pui-muted-foreground/70 [&_svg]:shrink-0")}
      >
        {sep}
      </motion.li>
    ) : null,
    <motion.li
      key={`item-${String(crumb.key)}`}
      layout={reduced ? false : "position"}
      {...itemMotion}
      transition={
        revealIndex !== undefined && !reduced
          ? { ...springs.layout, delay: revealIndex * 0.04, opacity: { duration: 0.18, delay: revealIndex * 0.04 } }
          : itemMotion.transition
      }
      data-last={index === total - 1 ? "" : undefined}
      className={cn(blockReset, "inline-flex min-w-0 items-center")}
    >
      {crumb.element}
    </motion.li>,
  ];

  const count = crumbs.length;
  const nodes: React.ReactNode[] = [];
  head.forEach((crumb, i) => {
    const revealIndex = collapsible && !collapsed && i >= before && i < count - after ? i - before : undefined;
    nodes.push(...renderCrumb(crumb, i, count, revealIndex));
  });
  if (collapsed && hidden.length > 0) {
    nodes.push(
      <motion.li
        key="sep-ellipsis"
        layout={reduced ? false : "position"}
        role="presentation"
        aria-hidden="true"
        {...itemMotion}
        className={cn(blockReset, "inline-flex items-center text-pui-muted-foreground/70")}
      >
        {sep}
      </motion.li>,
      <motion.li key="ellipsis" layout={reduced ? false : "position"} {...itemMotion} className={cn(blockReset, "inline-flex items-center")}>
        {collapse === "expand" ? (
          <button
            type="button"
            aria-label={expandLabel(hidden.length)}
            onClick={() => {
              setExpanded(true);
              // Move focus to the first revealed crumb so keyboard users keep their place.
              requestAnimationFrame(() => {
                const links = listRef.current?.querySelectorAll<HTMLElement>("li > a, li > [href]");
                links?.[before]?.focus({ preventScroll: true });
              });
            }}
            className={cn(
              controlReset,
              "inline-flex h-6 cursor-pointer items-center rounded-pui-sm px-1 text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground",
              focusRing,
            )}
          >
            <EllipsisIcon />
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={expandLabel(hidden.length)}
              className={cn(
                "inline-flex h-6 cursor-pointer items-center rounded-pui-sm px-1 text-pui-muted-foreground transition-colors duration-(--pui-duration-fast) hover:bg-pui-muted hover:text-pui-foreground data-[state=open]:bg-pui-muted data-[state=open]:text-pui-foreground",
                focusRing,
              )}
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {hidden.map((crumb) => {
                const { href, icon, children: text, onClick, target, rel } = crumb.element.props;
                return href ? (
                  <DropdownMenuItem key={String(crumb.key)} asChild>
                    <a href={href} target={target} rel={rel} onClick={onClick}>
                      {icon ? <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden="true">{icon}</span> : null}
                      <span className="flex-1 truncate">{text}</span>
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={String(crumb.key)} icon={icon}>
                    {text}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.li>,
    );
  }
  tail.forEach((crumb, i) => {
    nodes.push(...renderCrumb(crumb, count - after + i, count));
  });

  return (
    <nav ref={ref} aria-label={label} data-size={size} {...props} className={cn(blockReset, "min-w-0", className)}>
      <ol ref={listRef} className={cn(listReset, "flex min-w-0 flex-wrap items-center", sizes[size])}>
        <AnimatePresence initial={false} mode="popLayout">
          {nodes}
        </AnimatePresence>
      </ol>
    </nav>
  );
});
