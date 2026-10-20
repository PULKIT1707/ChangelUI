import { Badge, Button, GradientText, Input, Progress, Switch, cn } from "changelui";

const bars = [42, 68, 54, 88, 61, 76, 95];
const charts = ["bg-pui-chart-1", "bg-pui-chart-2", "bg-pui-chart-3", "bg-pui-chart-4", "bg-pui-chart-5"] as const;

/**
 * A small product UI built from library components and tokens only, so any theme island (preset,
 * light/dark, custom CSS) restyles it completely. Used by the Themes page and the ThemeSwitcher demos.
 */
export function ThemeSample({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 bg-pui-background p-4 text-pui-foreground", className)}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-pui-full bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 text-xs font-bold text-pui-primary-foreground"
        >
          AK
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-(family-name:--pui-font-display) text-sm font-semibold">
            <GradientText>Aurora Labs</GradientText>
          </p>
          <p className="truncate text-xs text-pui-muted-foreground">Weekly report · 7 days</p>
        </div>
        <Badge tone="success" size="sm">
          +12.4%
        </Badge>
      </div>
      <div className="rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-sm backdrop-blur-(--pui-surface-blur)">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs text-pui-muted-foreground">Active users</span>
          <span className="font-mono text-sm font-semibold tabular-nums">24,810</span>
        </div>
        <div aria-hidden="true" className="flex h-16 items-end gap-1.5">
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-t-pui-sm", i === bars.length - 1 ? "bg-pui-primary" : "bg-pui-primary/25")}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="mt-3 flex h-1.5 overflow-hidden rounded-pui-full">
          {charts.map((c, i) => (
            <span key={c} className={c} style={{ flex: 5 - i }} />
          ))}
        </div>
      </div>
      {compact ? null : (
        <>
          <Input aria-label="Invite by email" placeholder="teammate@example.com" size="sm" />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-pui-muted-foreground">Email digest</span>
            <Switch aria-label="Email digest" defaultChecked size="sm" />
          </div>
          <Progress value={68} size="sm" label="Quota used" />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Upgrade</Button>
        <Button size="sm" variant="outline" tone="neutral">
          Share
        </Button>
        {compact ? null : (
          <Button size="sm" variant="soft">
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
