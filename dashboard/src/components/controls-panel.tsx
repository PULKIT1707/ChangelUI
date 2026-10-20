import { Button, Input, SegmentedControl, SegmentedControlItem, Slider, Switch } from "changelui";
import { useId } from "react";
import type { ControlSpec } from "../registry/types";

type Values = Record<string, unknown>;

export interface ControlsPanelProps {
  controls: readonly ControlSpec<Values>[];
  values: Values;
  onChange: (prop: string, value: unknown) => void;
  onReset: () => void;
}

const TEXT_MAX = 60;

function Control({ spec, value, onChange, id }: { spec: ControlSpec<Values>; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const labelId = `${id}-label`;
  const labelClass = "text-xs font-medium text-pui-muted-foreground";
  switch (spec.type) {
    case "select":
      if (spec.options.length <= 4) {
        return (
          <div className="flex flex-col gap-1.5">
            <span id={labelId} className={labelClass}>
              {spec.label}
            </span>
            <SegmentedControl aria-labelledby={labelId} size="sm" value={String(value)} onValueChange={onChange} fullWidth>
              {spec.options.map((option) => (
                <SegmentedControlItem key={option} value={option}>
                  {option}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className={labelClass}>
            {spec.label}
          </label>
          <select
            id={id}
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-full rounded-pui-md border border-pui-input bg-pui-background px-2 text-sm text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            {spec.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm text-pui-foreground">
            {spec.label}
          </label>
          <Switch id={id} size="sm" checked={value === true} onCheckedChange={onChange} />
        </div>
      );
    case "number":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span id={labelId} className={labelClass}>
              {spec.label}
            </span>
            <span className="font-mono text-xs tabular-nums text-pui-foreground">{String(value)}</span>
          </div>
          <Slider
            aria-labelledby={labelId}
            size="sm"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={typeof value === "number" ? value : spec.min}
            onValueChange={(next) => onChange(Number(next.toFixed(6)))}
          />
        </div>
      );
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className={labelClass}>
            {spec.label}
          </label>
          <Input
            id={id}
            size="sm"
            value={String(value ?? "")}
            maxLength={Math.min(spec.maxLength ?? TEXT_MAX, TEXT_MAX)}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
  }
}

/** One labeled control per ControlSpec plus Reset (design 10.3). Controls cannot produce invalid values. */
export function ControlsPanel({ controls, values, onChange, onReset }: ControlsPanelProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-heading`}
      data-testid="controls-panel"
      className="flex flex-col gap-4 rounded-pui-lg border border-pui-border bg-pui-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-sm font-semibold">
          Controls
        </h3>
        <Button size="sm" variant="ghost" tone="neutral" onClick={onReset} disabled={controls.length === 0}>
          Reset
        </Button>
      </div>
      {controls.length === 0 ? (
        <p className="text-sm text-pui-muted-foreground">This item has no live controls.</p>
      ) : (
        controls.map((spec, index) => (
          <Control
            key={spec.prop}
            id={`${id}-control-${index}`}
            spec={spec}
            value={values[spec.prop]}
            onChange={(value) => onChange(spec.prop, value)}
          />
        ))
      )}
    </section>
  );
}
