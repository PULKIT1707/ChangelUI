"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { CheckIcon, XIcon } from "../lib/icons";
import { springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Size, Tone } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
/** Built-in share targets. */
export type ShareTargetId = "x" | "linkedin" | "facebook" | "whatsapp" | "reddit" | "email" | "copy";
/** What gets shared, resolved when the menu opens (url falls back to the current page). */
export interface ShareContent {
  url: string;
  title?: string;
  text?: string;
}
/** A custom target: a link built from the content, or an action. */
export interface ShareTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Opens in a new tab (mailto: and other schemes open in place). */
  href?: (content: ShareContent) => string;
  onSelect?: (content: ShareContent) => void;
}
export interface ShareButtonProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "title"> {
  /** Default: the current page URL at the moment of sharing. */
  url?: string;
  title?: string;
  text?: string;
  /** Default ["x", "linkedin", "whatsapp", "email", "copy"]. */
  targets?: ReadonlyArray<ShareTargetId | ShareTarget>;
  /**
   * Use the system share sheet (navigator.share) instead of the menu: true when available,
   * "coarse" only on touch-first devices (phones, tablets), false never. Default "coarse".
   */
  preferNative?: boolean | "coarse";
  /** Trigger label. Default "Share". */
  label?: React.ReactNode;
  /** Accessible name when label is not a string. Default "Share". */
  triggerLabel?: string;
  /** Name of the target group. Default "Share to". */
  menuLabel?: string;
  /** Announced and shown after a copy. Default "Link copied". */
  copiedLabel?: string;
  /** Close after a target is used (after a short beat for copy). Default true. */
  closeOnShare?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fires with the target id ("native" for the system sheet). The component sends nothing anywhere. */
  onShare?: (target: string, content: ShareContent) => void;
  /** Default "outline". */
  variant?: "solid" | "outline" | "soft";
  /** Default "neutral". */
  tone?: Tone;
  /** Default "md". */
  size?: Size;
}
const DEFAULT_TARGETS: readonly ShareTargetId[] = ["x", "linkedin", "whatsapp", "email", "copy"];
const enc = encodeURIComponent;
const glyph = "box-border m-0 block shrink-0";
function ShareGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v12" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  );
}
function LinkGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </svg>
  );
}
// Simplified marks drawn for this component: recognizable shapes, not the official artwork.
const ICONS: Record<Exclude<ShareTargetId, "copy">, React.ReactNode> = {
  x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" className={glyph}>
      <path d="M5 4.5 19 19.5" />
      <path d="M19 4.5 5 19.5" strokeWidth={1.4} />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={glyph}>
      <rect x="4" y="9.5" width="3.2" height="10" rx="0.6" />
      <circle cx="5.6" cy="5.6" r="1.9" />
      <path d="M10 9.5h3v1.5c.6-1 1.8-1.8 3.4-1.8 2.5 0 3.6 1.6 3.6 4.3v6h-3.2v-5.4c0-1.4-.5-2.2-1.7-2.2s-1.9.9-1.9 2.2v5.4H10z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={glyph}>
      <path d="M13.4 21v-7.6H16l.4-3H13.4V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4A21 21 0 0 0 14.3 4.3c-2.4 0-4 1.4-4 4.1v2H7.7v3h2.6V21z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={glyph}>
      <path d="M4.5 19.5 5.6 16A7.8 7.8 0 1 1 8.4 18.6z" />
      <path d="M9.5 9.3c.3 1.9 2.3 4 4.4 4.6l.9-1 1.4.7c-.2 1-.9 1.5-1.9 1.4-2.8-.4-5-2.6-5.5-5.3-.1-1 .5-1.7 1.4-1.9l.7 1.4z" strokeWidth={1.2} />
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true" className={glyph}>
      <ellipse cx="12" cy="14.5" rx="7" ry="5" />
      <path d="m12 9.5 1.2-5 3.6.9" />
      <circle cx="18" cy="5.6" r="1.3" />
      <circle cx="9.4" cy="13.8" r="0.4" fill="currentColor" />
      <circle cx="14.6" cy="13.8" r="0.4" fill="currentColor" />
      <path d="M9.6 16.6c1.4.9 3.4.9 4.8 0" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={glyph}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
};
const BUILT_IN: Record<Exclude<ShareTargetId, "copy">, { label: string; href: (c: ShareContent) => string }> = {
  x: { label: "Share on X", href: (c) => `https://x.com/intent/tweet?url=${enc(c.url)}${c.text || c.title ? `&text=${enc(c.text ?? c.title ?? "")}` : ""}` },
  linkedin: { label: "Share on LinkedIn", href: (c) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(c.url)}` },
  facebook: { label: "Share on Facebook", href: (c) => `https://www.facebook.com/sharer/sharer.php?u=${enc(c.url)}` },
  whatsapp: { label: "Send on WhatsApp", href: (c) => `https://wa.me/?text=${enc([c.text ?? c.title, c.url].filter(Boolean).join(" "))}` },
  reddit: { label: "Post to Reddit", href: (c) => `https://www.reddit.com/submit?url=${enc(c.url)}${c.title ? `&title=${enc(c.title)}` : ""}` },
  email: {
    label: "Send by email",
    href: (c) => `mailto:?subject=${enc(c.title ?? "")}&body=${enc([c.text, c.url].filter(Boolean).join("\n\n"))}`,
  },
};
const heights: Record<Size, string> = { sm: "h-8 text-xs", md: "h-9 text-sm", lg: "h-11 text-base" };
const triggerPad: Record<Size, string> = { sm: "gap-1.5 px-3", md: "gap-2 px-3.5", lg: "gap-2 px-4" };
const targetSizes: Record<Size, string> = { sm: "size-6 [&_svg]:size-3.5", md: "size-7 [&_svg]:size-4", lg: "size-9 [&_svg]:size-[1.15rem]" };
const iconSizes: Record<Size, string> = { sm: "size-3.5", md: "size-4", lg: "size-5" };
const variants = {
  outline: "border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm",
  soft: "border border-transparent bg-(--pui-tone)/12 text-(--pui-tone-text)",
  solid: "border border-transparent bg-(--pui-tone) text-(--pui-tone-fg) shadow-[inset_0_1px_0_var(--pui-solid-highlight),var(--pui-shadow-xs)]",
} as const;
const hoverFill = {
  outline: "hover:bg-(--pui-tone)/8",
  soft: "hover:bg-(--pui-tone)/12",
  solid: "hover:bg-(--pui-tone-fg)/15",
} as const;
function coarsePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}
/**
 * One share button instead of a row of logos. On phones it hands off to the system share sheet;
 * elsewhere the pill grows sideways into share targets and a copy-link action that confirms with
 * a check. Escape or a click outside folds it back. Sharing is reported through onShare only.
 */
export const ShareButton = React.forwardRef<HTMLDivElement, ShareButtonProps>(function ShareButton(
  {
    url,
    title,
    text,
    targets = DEFAULT_TARGETS,
    preferNative = "coarse",
    label = "Share",
    triggerLabel,
    menuLabel = "Share to",
    copiedLabel = "Link copied",
    closeOnShare = true,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    onShare,
    variant = "outline",
    tone = "neutral",
    size = "md",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: "open" });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const listId = React.useId();
  const { copy, copied, error } = useCopyToClipboard({ timeoutMs: 1800 });
  const [announce, setAnnounce] = React.useState("");
  const focusFirst = React.useRef(false);
  const latest = useLatestRef({ onShare });
  /** The page URL is read when sharing, never during the server render of a closed button. */
  const resolve = (): ShareContent => ({ url: url ?? (typeof window !== "undefined" ? window.location.href : ""), title, text });
  // Links only render while open; pass `url` when rendering an open button on the server.
  const content = open ? resolve() : null;
  useClickOutside(rootRef, () => setOpen(false), { enabled: open });
  React.useEffect(() => {
    if (!open || !focusFirst.current) return;
    focusFirst.current = false;
    const id = requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>("a,button")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  const close = (restoreFocus: boolean) => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };
  const shared = (id: string, c: ShareContent) => latest.current.onShare?.(id, c);
  const onTrigger = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (open) {
      close(false);
      return;
    }
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    const native = preferNative === true ? true : preferNative === "coarse" ? coarsePointer() : false;
    if (native && nav && typeof nav.share === "function") {
      const c = resolve();
      nav.share({ url: c.url, title: c.title, text: c.text }).then(
        () => shared("native", c),
        (err: unknown) => {
          // Dismissing the sheet is not an error; anything else falls back to the menu.
          if (!(err instanceof Error && err.name === "AbortError")) setOpen(true);
        },
      );
      return;
    }
    focusFirst.current = event.detail === 0;
    setAnnounce("");
    setOpen(true);
  };
  const onCopy = async (c: ShareContent) => {
    const ok = await copy(c.url);
    setAnnounce(ok ? copiedLabel : "Copy failed");
    if (!ok) return;
    shared("copy", c);
    if (closeOnShare) {
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setOpen(false), 1100);
    }
  };
  const items = targets.map((t) => {
    if (typeof t !== "string") return { id: t.id, label: t.label, icon: t.icon, href: t.href, onSelect: t.onSelect };
    if (t === "copy") return { id: "copy", label: "Copy link", icon: null, href: undefined, onSelect: undefined };
    return { id: t, label: BUILT_IN[t].label, icon: ICONS[t], href: BUILT_IN[t].href, onSelect: undefined };
  });
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || !open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const focusables = [triggerRef.current, ...Array.from(listRef.current?.querySelectorAll<HTMLElement>("a,button") ?? [])].filter(
      (el): el is HTMLElement => el !== null,
    );
    const index = focusables.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const last = focusables.length - 1;
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? last : event.key === "ArrowRight" ? (index + 1) % (last + 1) : (index - 1 + last + 1) % (last + 1);
    focusables[next]?.focus();
  };
  const name = triggerLabel ?? (typeof label === "string" ? label : "Share");
  const targetClass = cn(
    controlReset,
    focusRing,
    "group/target relative inline-flex cursor-pointer items-center justify-center rounded-pui-full transition-colors duration-(--pui-duration-fast) no-underline text-inherit",
    hoverFill[variant],
    targetSizes[size],
  );
  const tipClass = cn(
    blockReset,
    "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-pui-sm bg-pui-foreground px-1.5 py-0.5 text-[11px] font-medium leading-4 text-pui-background opacity-0 shadow-pui-sm transition-opacity duration-(--pui-duration-fast) group-hover/target:opacity-100 group-focus-visible/target:opacity-100",
  );
  return (
    <div
      ref={refs}
      data-state={open ? "open" : "closed"}
      data-variant={variant}
      data-size={size}
      {...props}
      className={cn(blockReset, "relative inline-flex items-center rounded-pui-full font-medium", heights[size], variants[variant], toneClasses[tone], className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={typeof label === "string" && !triggerLabel ? undefined : name}
        onClick={onTrigger}
        onKeyDown={handleKeyDown}
        className={cn(controlReset, focusRing, "inline-flex h-full shrink-0 cursor-pointer items-center rounded-pui-full font-medium", triggerPad[size])}
      >
        <span className={cn(blockReset, "relative grid place-items-center", iconSizes[size])} aria-hidden="true">
          <motion.span
            className={cn(blockReset, "[grid-area:1/1]")}
            initial={false}
            animate={{ opacity: open ? 0 : 1, rotate: open && !reduced ? 90 : 0, scale: open ? 0.6 : 1 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
          >
            <ShareGlyph className={cn(glyph, iconSizes[size])} />
          </motion.span>
          <motion.span
            className={cn(blockReset, "[grid-area:1/1]")}
            initial={false}
            animate={{ opacity: open ? 1 : 0, rotate: open || reduced ? 0 : -90, scale: open ? 1 : 0.6 }}
            transition={reduced ? { duration: 0 } : springs.snappy}
          >
            <XIcon className={cn(glyph, iconSizes[size])} />
          </motion.span>
        </span>
        <span className={cn(blockReset, "whitespace-nowrap")}>{label}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && content ? (
          <motion.ul
            key="targets"
            ref={listRef}
            id={listId}
            aria-label={menuLabel}
            className={cn(listReset, "flex h-full items-center")}
            initial={reduced ? { opacity: 0, overflow: "hidden" } : { width: 0, opacity: 0, overflow: "hidden" }}
            animate={reduced ? { opacity: 1, transitionEnd: { overflow: "visible" } } : { width: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
            exit={reduced ? { opacity: 0, overflow: "hidden" } : { width: 0, opacity: 0, overflow: "hidden" }}
            transition={reduced ? { duration: 0 } : springs.layout}
          >
            <li aria-hidden="true" className={cn(blockReset, "mr-1 h-1/2 w-px shrink-0 bg-current opacity-20")} />
            {items.map((item, i) => {
              const isCopy = item.id === "copy";
              const tip = isCopy ? (copied ? copiedLabel : error ? "Copy failed" : item.label) : item.label;
              const inner = (
                <>
                  {isCopy ? (
                    <span className={cn(blockReset, "grid place-items-center")} aria-hidden="true">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={copied ? "done" : "link"}
                          className={cn(blockReset, "[grid-area:1/1]")}
                          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                          transition={reduced ? { duration: 0 } : springs.snappy}
                        >
                          {copied ? <CheckIcon className={glyph} /> : <LinkGlyph className={glyph} />}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  ) : (
                    item.icon
                  )}
                  <span aria-hidden="true" className={tipClass}>
                    {tip}
                  </span>
                </>
              );
              const external = item.href ? /^https?:/i.test(item.href(content)) : false;
              return (
                <motion.li
                  key={item.id}
                  className={cn(blockReset, "flex shrink-0 items-center pr-1 last:pr-1.5")}
                  initial={reduced ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduced ? { duration: 0 } : { ...springs.snappy, delay: 0.04 + i * 0.035 }}
                >
                  {item.href ? (
                    <a
                      href={item.href(content)}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      aria-label={item.label}
                      data-target={item.id}
                      className={targetClass}
                      onKeyDown={handleKeyDown}
                      onClick={() => {
                        item.onSelect?.(content);
                        shared(item.id, content);
                        if (closeOnShare) close(false);
                      }}
                    >
                      {inner}
                    </a>
                  ) : (
                    <button
                      type="button"
                      aria-label={isCopy && copied ? copiedLabel : item.label}
                      data-target={item.id}
                      data-copied={isCopy && copied ? "" : undefined}
                      className={targetClass}
                      onKeyDown={handleKeyDown}
                      onClick={() => {
                        if (isCopy) {
                          void onCopy(content);
                          return;
                        }
                        item.onSelect?.(content);
                        shared(item.id, content);
                        if (closeOnShare) close(true);
                      }}
                    >
                      {inner}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
      <span role="status" className={cn(blockReset, "sr-only")}>
        {announce}
      </span>
    </div>
  );
});
