"use client";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { HighlightedText, type ListOption } from "../lib/listbox";
import { blockReset } from "../lib/styles";
import { Combobox, type ComboboxProps } from "./combobox";
/** Built-in capability names get short labels; any other string is shown as given. */
export type ModelCapability = "vision" | "tools" | "reasoning" | "audio" | "files" | "web" | (string & {});
export interface ModelOption {
  id: string;
  name: string;
  /** Groups the list, e.g. "Anthropic" or "Open weights". */
  provider: string;
  /** One line under the name, e.g. "Best for long documents". */
  description?: string;
  /** Context window in tokens. */
  contextWindow?: number;
  /** Price per 1M input tokens. */
  inputPrice?: number;
  /** Price per 1M output tokens. */
  outputPrice?: number;
  /** Relative speed, 1 (slow) to 3 (fast). */
  speed?: 1 | 2 | 3;
  capabilities?: readonly ModelCapability[];
  /** Short tag such as "New" or "Beta". */
  tag?: string;
  disabled?: boolean;
}
export interface ModelSelectorProps
  extends Omit<ComboboxProps, "options" | "value" | "defaultValue" | "onValueChange" | "renderOption" | "creatable" | "onCreate" | "createLabel"> {
  models: readonly ModelOption[];
  /** Selected model id. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null, model: ModelOption | null) => void;
  /** Model ids listed first under `recommendedLabel`, e.g. the best fit for the current task. */
  recommended?: readonly string[];
  /** Default "Recommended". */
  recommendedLabel?: string;
  /** Capabilities the current request needs (e.g. "vision" when an image is attached); other models are disabled with the reason. */
  requires?: readonly ModelCapability[];
  /** ISO currency for prices. Default "USD". */
  currency?: string;
  /** Number formatting locale. Default: the user's locale. */
  locale?: string;
}
const CAPABILITY_LABEL: Record<string, string> = {
  vision: "Vision",
  tools: "Tools",
  reasoning: "Reasoning",
  audio: "Audio",
  files: "Files",
  web: "Web",
};
const capabilityLabel = (c: string) => CAPABILITY_LABEL[c] ?? c;
/** Stable palette slot per provider, so each provider keeps its color. */
function providerColor(provider: string): string {
  let hash = 0;
  for (let i = 0; i < provider.length; i++) hash = (hash * 31 + provider.charCodeAt(i)) >>> 0;
  return `var(--pui-chart-${(hash % 8) + 1})`;
}
function ProviderMark({ provider, className }: { provider: string; className?: string }) {
  const letters = provider
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        blockReset,
        "flex size-6 shrink-0 items-center justify-center rounded-pui-md text-[0.625rem] font-bold tracking-tight text-pui-foreground",
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${providerColor(provider)} 22%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${providerColor(provider)} 40%, transparent)` }}
    >
      {letters}
    </span>
  );
}
function SpeedBars({ speed }: { speed: 1 | 2 | 3 }) {
  return (
    <span aria-hidden="true" className={cn(blockReset, "flex items-end gap-px")}>
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={cn(blockReset, "w-[3px] rounded-pui-full", level <= speed ? "bg-pui-primary" : "bg-pui-border")}
          style={{ height: `${4 + level * 3}px` }}
        />
      ))}
    </span>
  );
}
const SPEED_LABEL = { 1: "Slower", 2: "Balanced", 3: "Fast" } as const;
/**
 * Model picker for AI apps that puts the facts needed to choose in every row: provider, capability
 * badges, context window, input and output price per 1M tokens and relative speed. Search matches
 * names, providers, capabilities and descriptions; recommended models come first; and `requires`
 * disables models that can't handle the current request (no vision for an attached image) and says
 * why. Built on Combobox; the ref goes to the input.
 */
export const ModelSelector = React.forwardRef<HTMLInputElement, ModelSelectorProps>(function ModelSelector(
  {
    models,
    value: valueProp,
    defaultValue = null,
    onValueChange,
    recommended,
    recommendedLabel = "Recommended",
    requires,
    currency = "USD",
    locale,
    placeholder = "Search models…",
    emptyLabel = "No model matches",
    leadingIcon,
    ...props
  },
  ref,
) {
  const [value, setValue] = useControllableState<string | null>({ value: valueProp, defaultValue });
  const byId = React.useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const missingOf = React.useCallback((m: ModelOption) => (requires ?? []).filter((c) => !(m.capabilities ?? []).includes(c)), [requires]);
  const options = React.useMemo<ListOption[]>(() => {
    const pinned = new Set(recommended ?? []);
    const toOption = (m: ModelOption, group: string): ListOption => ({
      value: m.id,
      label: m.name,
      group,
      disabled: m.disabled || missingOf(m).length > 0,
      keywords: [m.provider, ...(m.capabilities ?? []).map(capabilityLabel), ...(m.description ? [m.description] : []), ...(m.tag ? [m.tag] : [])],
    });
    const head = (recommended ?? []).flatMap((id) => {
      const m = byId.get(id);
      return m ? [toOption(m, recommendedLabel)] : [];
    });
    return [...head, ...models.filter((m) => !pinned.has(m.id)).map((m) => toOption(m, m.provider))];
  }, [models, byId, recommended, recommendedLabel, missingOf]);
  const tokens = React.useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale]);
  const money = React.useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }), [locale, currency]);
  const selected = value ? (byId.get(value) ?? null) : null;
  return (
    <Combobox
      ref={ref}
      {...props}
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next, next ? (byId.get(next) ?? null) : null);
      }}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      leadingIcon={leadingIcon ?? (selected ? <ProviderMark provider={selected.provider} className="size-5 rounded-pui-sm text-[0.5625rem]" /> : undefined)}
      renderOption={(option, state) => {
        const m = byId.get(option.value);
        if (!m) return option.label;
        const missing = missingOf(m);
        const facts = [
          m.contextWindow !== undefined ? `${tokens.format(m.contextWindow)} context` : null,
          m.inputPrice !== undefined ? `${money.format(m.inputPrice)}${m.outputPrice !== undefined ? ` / ${money.format(m.outputPrice)}` : ""} per 1M` : null,
        ].filter(Boolean);
        return (
          <span className={cn(blockReset, "flex min-w-0 flex-1 items-center gap-3")}>
            <ProviderMark provider={m.provider} />
            <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-0.5")}>
              <span className={cn(blockReset, "flex min-w-0 items-center gap-1.5")}>
                <span className={cn(blockReset, "truncate font-medium")}>
                  <HighlightedText text={m.name} query={state.query} />
                </span>
                {m.tag ? (
                  <span className={cn(blockReset, "shrink-0 rounded-pui-full bg-pui-primary/12 px-1.5 text-[0.625rem] leading-4 font-semibold text-pui-primary-text")}>{m.tag}</span>
                ) : null}
              </span>
              {missing.length > 0 ? (
                <span className={cn(blockReset, "truncate text-xs text-pui-warning-text")}>No {missing.map(capabilityLabel).join(", ").toLowerCase()} support for this request</span>
              ) : m.description ? (
                <span className={cn(blockReset, "truncate text-xs text-pui-muted-foreground")}>{m.description}</span>
              ) : null}
              {m.capabilities?.length ? (
                <span className={cn(blockReset, "flex min-w-0 flex-wrap items-center gap-1 text-[0.6875rem] text-pui-muted-foreground")}>
                  {m.capabilities.map((c) => (
                    <span
                      key={c}
                      className={cn(
                        blockReset,
                        "rounded-pui-sm border px-1 leading-4",
                        requires?.includes(c) ? "border-pui-success/40 bg-pui-success/10 text-pui-success-text" : "border-pui-border",
                      )}
                    >
                      {capabilityLabel(c)}
                    </span>
                  ))}
                </span>
              ) : null}
              {facts.length > 0 ? (
                <span className={cn(blockReset, "truncate text-[0.6875rem] tabular-nums text-pui-muted-foreground")}>{facts.join(" · ")}</span>
              ) : null}
            </span>
            {m.speed ? (
              <span className={cn(blockReset, "flex shrink-0 flex-col items-end gap-1 text-[0.625rem] text-pui-muted-foreground")}>
                <SpeedBars speed={m.speed} />
                {SPEED_LABEL[m.speed]}
              </span>
            ) : null}
          </span>
        );
      }}
    />
  );
});
