import { Badge, contrast, contrastPairs, cn, type BuiltTheme, type ThemeTokens } from "changelui";
import { ThemeSample } from "./theme-sample";

/**
 * Inlines generated theme CSS. The CSS only ever comes from buildThemeCss with numeric and
 * enumerated options and a sanitized name, never from free text.
 */
export function ThemeStyle({ css }: { css: string }) {
  return <style>{css}</style>;
}

/** The same sample UI in a light and a dark island of one theme. */
export function ThemePreviewPair({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {(["light", "dark"] as const).map((mode) => (
        <figure key={mode} className="m-0 flex flex-col gap-1.5">
          <div data-pui-theme={name} className="overflow-hidden rounded-pui-xl border border-pui-border shadow-pui-md">
            <div data-theme={mode}>
              <ThemeSample />
            </div>
          </div>
          <figcaption className="text-center text-xs capitalize text-pui-muted-foreground">{mode}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Rows({ tokens }: { tokens: ThemeTokens }) {
  return (
    <>
      {contrastPairs.map((pair) => {
        const value = contrast(tokens[pair.token], tokens[pair.against].replace(/\s*\/\s*[\d.]+\s*\)$/, ")"));
        const pass = value >= pair.min;
        return (
          <li key={`${pair.token}-${pair.against}`} className="flex items-center gap-2 py-1">
            <span
              aria-hidden="true"
              className="grid h-6 w-9 shrink-0 place-items-center rounded-pui-sm border border-pui-border text-[11px] font-semibold"
              style={{ background: tokens[pair.against], color: tokens[pair.token] }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-pui-muted-foreground">
              {pair.token} / {pair.against}
            </span>
            <span className="font-mono text-xs tabular-nums">{value.toFixed(2)}</span>
            <Badge size="sm" tone={pass ? "success" : "danger"} variant="soft">
              {pass ? "Pass" : `< ${pair.min}`}
            </Badge>
          </li>
        );
      })}
    </>
  );
}

/** Every WCAG pair in both modes with its measured ratio. */
export function ContrastReport({ theme }: { theme: BuiltTheme }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["light", "dark"] as const).map((mode) => (
        <section key={mode} aria-label={`${mode} contrast`} className="rounded-pui-lg border border-pui-border p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground">{mode}</h3>
          <ul className="m-0 list-none p-0">
            <Rows tokens={theme[mode]} />
          </ul>
        </section>
      ))}
    </div>
  );
}
