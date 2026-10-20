// A focusable scroll box for scroll-linked demos. The library items take it as `container`, so the
// demo scrolls inside the preview instead of needing the whole page to scroll.
import { useRef, type ReactNode, type RefObject } from "react";

export function ScrollStage({
  children,
  height = "h-96",
  hint = "Scroll inside",
  lead = "h-48",
  tail = "h-48",
  className = "",
}: {
  children: (ref: RefObject<HTMLDivElement | null>) => ReactNode;
  /** Tailwind height class of the box. */
  height?: string;
  hint?: string;
  /** Spacer heights before and after the content (Tailwind classes); "h-0" for none. */
  lead?: string;
  tail?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label={`Scrollable demo: ${hint}`}
      className={`relative w-full overflow-y-auto overscroll-contain rounded-pui-lg border border-pui-border bg-pui-background outline-none focus-visible:outline-2 focus-visible:outline-pui-ring ${height} ${className}`}
    >
      {lead !== "h-0" ? (
        <div className={`flex items-end justify-center pb-6 text-xs text-pui-muted-foreground ${lead}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pui-border bg-pui-surface px-3 py-1 shadow-pui-xs">
            {hint} <span aria-hidden="true">↓</span>
          </span>
        </div>
      ) : null}
      {children(ref)}
      {tail !== "h-0" ? <div className={tail} /> : null}
    </div>
  );
}
