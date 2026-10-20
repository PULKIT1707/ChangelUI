import { Button } from "changelui";
import type { ReactNode } from "react";

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Wraps a chart demo with a hint line and a "Randomize data" button (shows the update morph). */
export function ChartDemo({ children, onRandomize, hint }: { children: ReactNode; onRandomize?: () => void; hint?: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {onRandomize || hint ? (
        <div data-chart-demo-head="" className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-pui-muted-foreground">{hint ?? "Hover, use the arrow keys, or toggle the legend."}</p>
          {onRandomize ? (
            <Button size="sm" variant="outline" tone="neutral" onClick={onRandomize}>
              <DiceIcon />
              Randomize data
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
