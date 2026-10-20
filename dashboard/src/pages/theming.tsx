import { Button, Card, CardDescription, CardHeader, CardTitle, CopyButton, Skeleton, cn } from "changelui";
import themeCss from "@pui-src/styles/theme.css?raw";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { CodeBlock } from "../components/code-block";
import { contrastRatio } from "../lib/color";
import { DocSection, Prose } from "./installation";

// Token rows: `pair` is the background the token is read against (contrast column).
const tokens: { name: string; pair?: string }[] = [
  { name: "background" },
  { name: "foreground", pair: "background" },
  { name: "surface" },
  { name: "surface-foreground", pair: "surface" },
  { name: "muted" },
  { name: "muted-foreground", pair: "background" },
  { name: "border" },
  { name: "input", pair: "background" },
  { name: "ring", pair: "background" },
  { name: "primary" },
  { name: "primary-foreground", pair: "primary" },
  { name: "primary-text", pair: "background" },
  { name: "success" },
  { name: "success-foreground", pair: "success" },
  { name: "success-text", pair: "background" },
  { name: "warning" },
  { name: "warning-foreground", pair: "warning" },
  { name: "warning-text", pair: "background" },
  { name: "danger" },
  { name: "danger-foreground", pair: "danger" },
  { name: "danger-text", pair: "background" },
  { name: "info" },
  { name: "info-foreground", pair: "info" },
  { name: "info-text", pair: "background" },
];

function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  return () => observer.disconnect();
}

/** All token values as one string, so useSyncExternalStore compares snapshots by value. */
function readTokens(): string {
  const style = getComputedStyle(document.documentElement);
  return tokens.map((t) => style.getPropertyValue(`--pui-${t.name}`).trim()).join("|");
}

function TokenTable() {
  const snapshot = useSyncExternalStore(subscribeTheme, readTokens, () => "");
  const values = new Map(tokens.map((t, i) => [t.name, snapshot.split("|")[i] ?? ""]));
  return (
    <div
      role="region"
      aria-label="Color tokens"
      tabIndex={0}
      className="overflow-x-auto rounded-pui-lg border border-pui-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
    >
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm" data-testid="token-table">
        <caption className="sr-only">Color tokens in the current theme</caption>
        <thead className="bg-pui-muted text-xs uppercase tracking-wide text-pui-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Token
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Swatch
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Value
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Contrast
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const value = values.get(token.name) ?? "";
            const ratio = token.pair ? contrastRatio(value, values.get(token.pair) ?? "") : null;
            return (
              <tr key={token.name} className="border-t border-pui-border">
                <th scope="row" className="whitespace-nowrap px-3 py-2 font-mono text-[13px] font-medium">
                  --pui-{token.name}
                </th>
                <td className="px-3 py-2">
                  <span
                    aria-hidden="true"
                    className="block size-6 rounded-pui-sm border border-pui-border"
                    style={{ background: `var(--pui-${token.name})` }}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-pui-muted-foreground">{value || "–"}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                  {ratio === null ? (
                    <span className="text-pui-muted-foreground">–</span>
                  ) : (
                    <span>
                      {ratio.toFixed(2)}:1 <span className="text-pui-muted-foreground">vs {token.pair}</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const radii = ["rounded-pui-sm", "rounded-pui-md", "rounded-pui-lg", "rounded-pui-xl", "rounded-pui-full"] as const;
const shadows = ["shadow-pui-xs", "shadow-pui-sm", "shadow-pui-md", "shadow-pui-lg", "shadow-pui-xl", "shadow-pui-glow"] as const;
const easings = [
  { name: "ease-pui-out", className: "ease-pui-out" },
  { name: "ease-pui-in-out", className: "ease-pui-in-out" },
  { name: "ease-pui-spring", className: "ease-pui-spring" },
] as const;

function EasingSamples() {
  const [played, setPlayed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-pui-lg border border-pui-border p-4">
        {easings.map((easing) => (
          <div key={easing.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 font-mono text-xs text-pui-muted-foreground">{easing.name}</span>
            <div className="relative h-4 min-w-0 flex-1">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 left-0 size-4 rounded-pui-full bg-pui-primary transition-[left] duration-700 motion-reduce:transition-none",
                  easing.className,
                  played && "left-[calc(100%-1rem)]",
                )}
              />
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setPlayed((p) => !p)} aria-pressed={played}>
          Play easings
        </Button>
      </div>
    </div>
  );
}

/** Island content (design 10.3): library token classes and components only, never dark:. */
function IslandContent({ caption }: { caption: string }) {
  return (
    <>
      <p className="mb-3 text-sm font-medium">{caption}</p>
      <Card data-testid="island-card">
        <CardHeader>
          <CardTitle>Project status</CardTitle>
          <CardDescription>Tokens resolve on this island, not on the page.</CardDescription>
        </CardHeader>
      </Card>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm">Solid</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
      </div>
      <Skeleton className="mt-3 h-3 w-2/3" />
      <div data-testid="island-glow" className="mt-3 rounded-pui-md bg-pui-surface p-3 text-sm shadow-pui-glow">
        Glow
      </div>
    </>
  );
}

const scopeStyle = {
  "--pui-primary": "var(--pui-success)",
  "--pui-primary-foreground": "var(--pui-success-foreground)",
  "--pui-primary-text": "var(--pui-success-text)",
} as CSSProperties;

const darkModeSetup = `// index.html <head> (or your root layout): no theme flash
import { getThemeInitScript } from "changelui/theme-script";
<script dangerouslySetInnerHTML={{ __html: getThemeInitScript({ storageKey: "pui-theme", attribute: "both" }) }} />

// anywhere in the UI
import { ThemeToggle } from "changelui";
<ThemeToggle storageKey="pui-theme" attribute="both" />`;

const islandExample = `<div data-theme="light" className="bg-pui-background text-pui-foreground">…</div>
<div className="dark bg-pui-background text-pui-foreground">…</div>

<div data-pui-scope="" style={{ "--pui-primary": "var(--pui-success)" }}>…</div>`;

export function Theming() {
  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-3">
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          Theming
        </h1>
        <p className="text-base text-pui-muted-foreground">
          Every color, radius, shadow and easing is a <code className="font-mono text-pui-foreground">--pui-*</code> custom
          property. Override them globally, per theme, or on any subtree.
        </p>
        <div className="flex items-center gap-2">
          <CopyButton value={themeCss} label="Copy theme.css" showLabel size="sm" />
          <span className="text-xs text-pui-muted-foreground">The full token file for copy-paste installs.</span>
        </div>
      </header>

      <DocSection id="tokens" title="Color tokens">
        <Prose>
          <p>Values are read live from the page with getComputedStyle. Switch the theme to see them change.</p>
        </Prose>
        <TokenTable />
      </DocSection>

      <DocSection id="radius-shadow" title="Radius, shadow and easing">
        <div className="grid gap-4 sm:grid-cols-5">
          {radii.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-2">
              <div aria-hidden="true" className={cn("size-16 border border-pui-border bg-pui-muted", radius)} />
              <span className="font-mono text-xs text-pui-muted-foreground">{radius}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {shadows.map((shadow) => (
            <div key={shadow} className="flex flex-col items-center gap-2">
              <div aria-hidden="true" className={cn("size-16 rounded-pui-lg bg-pui-surface", shadow)} />
              <span className="font-mono text-xs text-pui-muted-foreground">{shadow}</span>
            </div>
          ))}
        </div>
        <EasingSamples />
      </DocSection>

      <DocSection id="dark-mode" title="Dark mode">
        <Prose>
          <p>
            Dark values apply under <code>.dark</code> or <code>[data-theme="dark"]</code>. The init script sets the stored
            theme before first paint; ThemeToggle keeps it in sync.
          </p>
        </Prose>
        <CodeBlock code={darkModeSetup} copyLabel="Copy dark-mode setup" />
      </DocSection>

      <DocSection id="nested" title="Nested themes">
        <Prose>
          <p>Each island renders its own theme whatever the page theme is, including derived tokens like the glow.</p>
        </Prose>
        <div className="grid gap-4 md:grid-cols-2">
          <div
            data-theme="light"
            data-testid="island-light"
            className="rounded-pui-lg border border-pui-border bg-pui-background p-4 text-pui-foreground"
          >
            <IslandContent caption="Light island" />
          </div>
          <div data-testid="island-dark" className="dark rounded-pui-lg border border-pui-border bg-pui-background p-4 text-pui-foreground">
            <IslandContent caption="Dark island" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="page-card">
            <CardHeader>
              <CardTitle>Page card</CardTitle>
              <CardDescription>Follows the page theme, for comparison.</CardDescription>
            </CardHeader>
          </Card>
          <div data-testid="page-glow" className="rounded-pui-md bg-pui-surface p-3 text-sm shadow-pui-glow">
            Page glow
          </div>
        </div>
        <CodeBlock code={islandExample} copyLabel="Copy island example" />
      </DocSection>

      <DocSection id="scoped" title="Scoped override">
        <Prose>
          <p>
            <code>data-pui-scope</code> re-derives tokens on a subtree without changing its theme. Here the primary
            tokens point at the success tone, so the button and the glow turn green.
          </p>
        </Prose>
        <div data-pui-scope="" data-testid="scope-demo" className="rounded-pui-lg border border-pui-border p-4" style={scopeStyle}>
          <Card data-testid="scope-card">
            <CardHeader>
              <CardTitle>Scoped card</CardTitle>
              <CardDescription>Same theme as the page, different primary.</CardDescription>
            </CardHeader>
          </Card>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm">Scoped primary</Button>
          </div>
          <div data-testid="scope-glow" className="mt-3 rounded-pui-md bg-pui-surface p-3 text-sm shadow-pui-glow">
            Glow
          </div>
        </div>
      </DocSection>
    </article>
  );
}
