"use client";
import { AnimatePresence, motion, useIsPresent, type PanInfo } from "motion/react";
import * as React from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "../hooks/use-controllable-state";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { cn } from "../lib/cn";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "../lib/icons";
import { useLayer } from "../lib/layers";
import { easings, springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { useScrollLock } from "../lib/scroll-lock";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  /** Smaller image for the grid and the filmstrip. Default `src`. */
  thumbnail?: string;
}

export interface LightboxProps extends React.HTMLAttributes<HTMLDivElement> {
  images: LightboxImage[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Index of the image in the viewer. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last image to the first. Default true. */
  loop?: boolean;
  /** Filmstrip of thumbnails under the viewer. Default true when there is more than one image. */
  showThumbnails?: boolean;
  /** Accessible name of the viewer. Default "Image viewer". */
  label?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Default `(i, n) => \`${i} of ${n}\``. */
  counterLabel?: (position: number, total: number) => string;
  /** Portal target. Default document.body. */
  container?: Element | DocumentFragment | null;
  /** Custom grid of `LightboxTrigger`s. Default: a responsive thumbnail grid. */
  children?: React.ReactNode;
}

export interface LightboxTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index: number;
  /** Custom content. Default: the image thumbnail, which morphs into the viewer. */
  children?: React.ReactNode;
}

interface LightboxContextValue {
  id: string;
  images: LightboxImage[];
  open: boolean;
  index: number;
  openAt: (index: number) => void;
  morphIndex: number | null;
  reduced: boolean;
  registerTrigger: (index: number, el: HTMLButtonElement | null) => void;
}

const LightboxContext = React.createContext<LightboxContextValue | null>(null);

function useLightbox(part: string): LightboxContextValue {
  const ctx = React.useContext(LightboxContext);
  if (!ctx) throw new Error(`${part} must be used inside Lightbox.`);
  return ctx;
}

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** A thumbnail button that opens the viewer at `index`. */
export const LightboxTrigger = React.forwardRef<HTMLButtonElement, LightboxTriggerProps>(function LightboxTrigger(
  { index, children, className, onClick, ...props },
  ref,
) {
  const box = useLightbox("LightboxTrigger");
  const image = box.images[index];
  const morphing = !box.reduced && box.open && box.morphIndex === index;
  return (
    <button
      ref={(node) => {
        box.registerTrigger(index, node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      aria-haspopup="dialog"
      aria-label={image ? `Open ${image.alt}` : undefined}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) box.openAt(index);
      }}
      className={cn(
        controlReset,
        "group/thumb relative block cursor-zoom-in overflow-hidden rounded-pui-lg bg-pui-muted",
        focusRing,
        className,
      )}
    >
      {children ??
        (image ? (
          <motion.img
            src={image.thumbnail ?? image.src}
            alt=""
            draggable={false}
            layoutId={box.reduced ? undefined : `${box.id}-img-${index}`}
            transition={springs.layout}
            style={{ visibility: morphing ? "hidden" : undefined }}
            className={cn(
              blockReset,
              "block aspect-square size-full object-cover transition-[scale,filter] duration-(--pui-duration-slow) ease-(--pui-ease-out) group-hover/thumb:scale-105 group-hover/thumb:brightness-110",
            )}
          />
        ) : null)}
    </button>
  );
});

interface ViewerProps {
  box: LightboxContextValue;
  close: () => void;
  go: (delta: number) => void;
  jump: (index: number) => void;
  direction: number;
  loop: boolean;
  showThumbnails: boolean;
  label: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  counterLabel: (position: number, total: number) => string;
  returnRef: React.RefObject<HTMLElement | null>;
}

const slide = {
  enter: (dir: number) => ({ x: `${dir * 40}%`, opacity: 0, scale: 0.96 }),
  center: { x: "0%", opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: `${dir * -40}%`, opacity: 0, scale: 0.96 }),
};

function Viewer({
  box,
  close,
  go,
  jump,
  direction,
  loop,
  showThumbnails,
  label,
  closeLabel,
  previousLabel,
  nextLabel,
  counterLabel,
  returnRef,
}: ViewerProps) {
  const isPresent = useIsPresent();
  const ref = React.useRef<HTMLDivElement>(null);
  const { isTopFocusLayer } = useLayer(isPresent, { kind: "modal", onEscape: close, contentEls: () => [ref.current] });
  useFocusTrap(ref, { active: isPresent && isTopFocusLayer, initialFocus: "container", returnFocus: isPresent ? false : returnRef });
  useScrollLock(isPresent);
  const { images, index, reduced } = box;
  const total = images.length;
  const image = images[index];
  const canPrev = loop || index > 0;
  const canNext = loop || index < total - 1;
  const morph = !reduced && box.morphIndex === index;

  // Warm the neighbours so the next slide is ready.
  React.useEffect(() => {
    if (total < 2) return;
    for (const offset of [1, -1]) {
      const next = images[wrap(index + offset, total)];
      if (next) new Image().src = next.src;
    }
  }, [images, index, total]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -80 && canNext) go(1);
    else if (swipe > 80 && canPrev) go(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" && canNext) go(1);
    else if (event.key === "ArrowLeft" && canPrev) go(-1);
    else if (event.key === "Home") jump(0);
    else if (event.key === "End") jump(total - 1);
    else return;
    event.preventDefault();
  };

  const control =
    "grid size-10 cursor-pointer place-items-center rounded-full border border-pui-border bg-pui-surface/85 text-pui-surface-foreground shadow-pui-md backdrop-blur-md transition-[background-color,opacity,scale] duration-(--pui-duration-fast) hover:bg-pui-surface active:scale-95 disabled:pointer-events-none disabled:opacity-0 [&_svg]:size-5";

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-state={isPresent ? "open" : "closed"}
      className={cn(blockReset, "fixed inset-0 z-(--pui-z-overlay) flex flex-col outline-hidden")}
    >
      <motion.div
        aria-hidden="true"
        onClick={close}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.2, ease: easings.out } }}
        exit={{ opacity: 0, transition: { duration: 0.2, ease: easings.out } }}
        className={cn(
          blockReset,
          "absolute inset-0 bg-pui-overlay backdrop-blur-(--pui-overlay-blur) before:absolute before:inset-0 before:bg-pui-overlay",
        )}
      />
      <motion.div
        className={cn(blockReset, "pointer-events-none relative z-10 flex items-center justify-between gap-3 p-3 sm:p-4")}
        initial={{ opacity: 0, y: reduced ? 0 : -8 }}
        animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.08, duration: 0.2, ease: easings.out } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
      >
        <span
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            blockReset,
            "pointer-events-auto rounded-full border border-pui-border bg-pui-surface/85 px-3 py-1 text-xs font-medium tabular-nums text-pui-surface-foreground shadow-pui-sm backdrop-blur-md",
          )}
        >
          {counterLabel(index + 1, total)}
        </span>
        <button type="button" aria-label={closeLabel} onClick={close} className={cn(controlReset, "pointer-events-auto", control, focusRing)}>
          <XIcon aria-hidden="true" />
        </button>
      </motion.div>
      <div className={cn(blockReset, "pointer-events-none relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 sm:px-16")}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {image ? (
            <motion.figure
              key={index}
              custom={direction}
              variants={morph ? undefined : slide}
              initial={morph ? false : reduced ? { opacity: 0 } : "enter"}
              animate={morph ? undefined : reduced ? { opacity: 1 } : "center"}
              exit={morph ? undefined : reduced ? { opacity: 0 } : "exit"}
              transition={reduced ? { duration: 0.15 } : springs.layout}
              drag={total > 1 && !reduced ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              dragSnapToOrigin
              onDragEnd={onDragEnd}
              className={cn(
                blockReset,
                "pointer-events-auto flex max-h-full max-w-full cursor-grab touch-pan-y flex-col items-center gap-3 active:cursor-grabbing",
              )}
            >
              <motion.img
                src={image.src}
                alt={image.alt}
                draggable={false}
                layoutId={morph ? `${box.id}-img-${index}` : undefined}
                transition={springs.layout}
                className={cn(
                  blockReset,
                  "block max-h-[calc(100dvh-13rem)] max-w-[min(100%,72rem)] rounded-pui-lg object-contain shadow-pui-xl select-none",
                )}
              />
              {image.caption ? (
                <motion.figcaption
                  initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.12, duration: 0.2, ease: easings.out } }}
                  className={cn(
                    blockReset,
                    "max-w-xl rounded-pui-md bg-pui-surface/85 px-3 py-1.5 text-center text-sm text-pui-surface-foreground shadow-pui-sm backdrop-blur-md",
                  )}
                >
                  {image.caption}
                </motion.figcaption>
              ) : null}
            </motion.figure>
          ) : null}
        </AnimatePresence>
        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label={previousLabel}
              disabled={!canPrev}
              onClick={() => go(-1)}
              className={cn(controlReset, "pointer-events-auto absolute top-1/2 left-3 -translate-y-1/2 sm:left-4", control, focusRing)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              disabled={!canNext}
              onClick={() => go(1)}
              className={cn(controlReset, "pointer-events-auto absolute top-1/2 right-3 -translate-y-1/2 sm:right-4", control, focusRing)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {showThumbnails && total > 1 ? (
        <motion.div
          className={cn(blockReset, "relative z-10 flex justify-center overflow-x-auto p-3 sm:p-4 [scrollbar-width:none]")}
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : 0.1, duration: 0.24, ease: easings.out } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <div className={cn(blockReset, "flex gap-2 rounded-pui-xl border border-pui-border bg-pui-surface/70 p-1.5 shadow-pui-md backdrop-blur-md")}>
            {images.map((item, i) => (
              <button
                key={item.src + i}
                type="button"
                aria-label={item.alt}
                aria-current={i === index ? "true" : undefined}
                onClick={() => jump(i)}
                className={cn(
                  controlReset,
                  "relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-pui-md opacity-60 transition-opacity duration-(--pui-duration-fast) hover:opacity-100 aria-[current=true]:opacity-100",
                  focusRing,
                )}
              >
                <img src={item.thumbnail ?? item.src} alt="" draggable={false} className={cn(blockReset, "block size-full object-cover")} />
                {i === index ? (
                  <motion.span
                    layoutId={reduced ? undefined : `${box.id}-strip`}
                    transition={springs.snappy}
                    aria-hidden="true"
                    className={cn(blockReset, "absolute inset-0 rounded-[inherit] ring-2 ring-pui-primary ring-inset")}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/**
 * Gallery thumbnails that zoom into a full-screen viewer on a shared-layout spring. Swipe, arrow
 * keys or the filmstrip move between images, Escape flies the image back to its thumbnail and
 * focus returns to it.
 */
export const Lightbox = React.forwardRef<HTMLDivElement, LightboxProps>(function Lightbox(
  {
    images,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    index: indexProp,
    defaultIndex = 0,
    onIndexChange,
    loop = true,
    showThumbnails = true,
    label = "Image viewer",
    closeLabel = "Close",
    previousLabel = "Previous image",
    nextLabel = "Next image",
    counterLabel = (position, total) => `${position} of ${total}`,
    container,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange, name: "open" });
  const [index, setIndex] = useControllableState({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange, name: "index" });
  const [morphIndex, setMorphIndex] = React.useState<number | null>(open ? index : null);
  const [direction, setDirection] = React.useState(1);
  const triggers = React.useRef(new Map<number, HTMLButtonElement>());
  const returnRef = React.useRef<HTMLElement | null>(null);
  const total = images.length;
  const safeIndex = total ? wrap(index, total) : 0;

  React.useEffect(() => {
    returnRef.current = triggers.current.get(safeIndex) ?? null;
  }, [safeIndex, open]);

  const ctx = React.useMemo<LightboxContextValue>(
    () => ({
      id,
      images,
      open,
      index: safeIndex,
      morphIndex,
      reduced,
      openAt: (i) => {
        setMorphIndex(i);
        setIndex(i);
        setOpen(true);
      },
      registerTrigger: (i, el) => {
        if (el) triggers.current.set(i, el);
        else triggers.current.delete(i);
      },
    }),
    [id, images, open, safeIndex, morphIndex, reduced, setIndex, setOpen],
  );

  const jump = (next: number) => {
    if (!total || next === safeIndex) return;
    // Drop the shared layout first, so the outgoing slide doesn't fly back to its thumbnail.
    if (morphIndex !== null) flushSync(() => setMorphIndex(null));
    setDirection(next > safeIndex ? 1 : -1);
    setIndex(next);
  };

  const go = (delta: number) => {
    if (!total) return;
    const raw = safeIndex + delta;
    if (!loop && (raw < 0 || raw >= total)) return;
    if (morphIndex !== null) flushSync(() => setMorphIndex(null));
    setDirection(delta);
    setIndex(wrap(raw, total));
  };

  return (
    <LightboxContext.Provider value={ctx}>
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        {...props}
        className={cn(blockReset, children ? undefined : "grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2", className)}
      >
        {children ?? images.map((image, i) => <LightboxTrigger key={image.src + i} index={i} />)}
      </div>
      <Portal container={container}>
        <AnimatePresence>
          {open && total ? (
            <Viewer
              key="viewer"
              box={ctx}
              close={() => setOpen(false)}
              go={go}
              jump={jump}
              direction={direction}
              loop={loop}
              showThumbnails={showThumbnails}
              label={label}
              closeLabel={closeLabel}
              previousLabel={previousLabel}
              nextLabel={nextLabel}
              counterLabel={counterLabel}
              returnRef={returnRef}
            />
          ) : null}
        </AnimatePresence>
      </Portal>
    </LightboxContext.Provider>
  );
});
