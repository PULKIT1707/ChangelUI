import {
  Badge,
  Button,
  CopyButton,
  SegmentedControl,
  SegmentedControlItem,
  Slider,
  Switch,
  ThemeSwitcher,
  buildTheme,
  buildThemeCss,
  cn,
  presetNames,
  reducedVariant,
  stagger,
  themePresets,
  useThemePreset,
  usePrefersReducedMotion,
  variants,
  type ThemeFont,
  type ThemePresetName,
} from "changelui";
import themesCss from "@pui-src/styles/themes.css?raw";
import { springs } from "@pui-src/lib/motion";
import { motion } from "motion/react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { CodeBlock } from "../components/code-block";
import { ContrastReport, ThemePreviewPair, ThemeStyle } from "../components/theme-preview";
import { DocSection, Prose } from "./installation";

const SITE_KEY = "pui-theme-preset";

const toneChips = ["bg-pui-primary", "bg-pui-gradient-2", "bg-pui-gradient-3", "bg-pui-success", "bg-pui-warning", "bg-pui-danger"] as const;

interface PresetCardProps {
  name: ThemePresetName;
  active: boolean;
  onUse: (el: Element) => void;
  onTune: () => void;
}

function PresetCard({ name, active, onUse, onTune }: PresetCardProps) {
  const preset = themePresets[name];
  const reduced = usePrefersReducedMotion();
  return (
    <motion.li variants={reduced ? reducedVariant(variants.fadeUp) : variants.fadeUp} className="relative list-none">
      {active ? (
        <motion.span
          layoutId="themes-active-card"
          transition={reduced ? { duration: 0 } : springs.snappy}
          aria-hidden="true"
          className="absolute -inset-1.5 rounded-[calc(var(--pui-radius-xl)+6px)] border-2 border-pui-primary"
        />
      ) : null}
      <div
        data-pui-theme={name}
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-4 text-pui-foreground shadow-pui-sm transition-[translate,box-shadow] duration-(--pui-duration-base) ease-pui-out hover:-translate-y-0.5 hover:shadow-pui-lg motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-pui-full bg-pui-gradient-2 opacity-20 blur-2xl transition-opacity duration-(--pui-duration-slow) group-hover:opacity-35"
        />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-(family-name:--pui-font-display) text-base font-semibold">{preset.label}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-pui-muted-foreground">{preset.description}</p>
          </div>
          {active ? (
            <Badge size="sm" tone="primary">
              Active
            </Badge>
          ) : null}
        </div>
        <div aria-hidden="true" className="flex gap-1">
          {toneChips.map((chip) => (
            <span key={chip} className={cn("h-6 flex-1 rounded-pui-sm first:flex-[2]", chip)} />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-2 backdrop-blur-(--pui-surface-blur)">
          <span aria-hidden="true" className="size-6 rounded-pui-full bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3" />
          <span className="h-2 flex-1 rounded-pui-full bg-pui-muted" aria-hidden="true">
            <span className="block h-full w-2/3 rounded-pui-full bg-pui-primary" />
          </span>
          <span className="font-mono text-[11px] text-pui-muted-foreground">{preset.radius}</span>
        </div>
        <div className="mt-auto flex gap-2">
          <Button size="sm" className="flex-1" onClick={(e) => onUse(e.currentTarget)} aria-pressed={active}>
            {active ? "In use" : "Use preset"}
          </Button>
          <Button size="sm" variant="outline" tone="neutral" aria-label={`Customize ${preset.label}`} onClick={onTune}>
            Tune
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

function Gallery({ onTune }: { onTune: (name: ThemePresetName) => void }) {
  const { preset, setPreset } = useThemePreset({ storageKey: SITE_KEY });
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: stagger({ each: 0.04 }) } }}
      className="m-0 grid gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
    >
      {presetNames.map((name) => (
        <PresetCard
          key={name}
          name={name}
          active={preset === name}
          onUse={(el) => setPreset(name, el)}
          onTune={() => onTune(name)}
        />
      ))}
    </motion.ul>
  );
}

function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        {value !== undefined ? <span className="font-mono text-xs text-pui-muted-foreground">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

const remToPx = (radius: string) => {
  const n = parseFloat(radius);
  return radius.endsWith("px") ? n : Math.round(n * 16);
};

const fonts: ThemeFont[] = ["system", "rounded", "serif", "mono"];

interface CustomState {
  base: ThemePresetName;
  hue: number;
  chroma: number;
  radius: number;
  font: ThemeFont;
}

function fromPreset(base: ThemePresetName): CustomState {
  const p = themePresets[base];
  return { base, hue: p.hue, chroma: p.chroma, radius: remToPx(p.radius), font: p.font };
}

interface CustomizerProps {
  base: ThemePresetName;
  onBaseChange: (name: ThemePresetName) => void;
  apply: boolean;
  onApplyChange: (apply: boolean) => void;
}

function Customizer({ base, onBaseChange, apply, onApplyChange }: CustomizerProps) {
  const [state, setState] = useState<CustomState>(() => fromPreset(base));
  const [selector, setSelector] = useState<"preset" | "root">("preset");
  const labelId = useId();
  const current = state;

  const preset = themePresets[current.base];
  const options = {
    preset: current.base,
    hue: Math.abs(current.hue - preset.hue) > 0.5 ? current.hue : undefined,
    chroma: Math.abs(current.chroma - preset.chroma) > 0.004 ? current.chroma : undefined,
    radius: current.radius,
    font: current.font,
    name: "custom",
  };
  const key = JSON.stringify(options);
  const theme = useMemo(() => buildTheme(JSON.parse(key) as typeof options), [key]);
  const previewCss = useMemo(() => buildThemeCss(JSON.parse(key) as typeof options), [key]);
  const outputCss = useMemo(
    () => buildThemeCss({ ...(JSON.parse(key) as typeof options), name: "brand", selector }),
    [key, selector],
  );

  const update = (patch: Partial<CustomState>) => setState((s) => ({ ...s, ...patch }));

  return (
    <div id="customizer" className="flex scroll-mt-20 flex-col gap-6">
      <ThemeStyle css={previewCss} />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="flex flex-col gap-5 rounded-pui-xl border border-pui-border bg-pui-surface p-4 shadow-pui-sm">
          <Field label="Start from">
            <ThemeSwitcher
              value={current.base}
              onValueChange={(next) => onBaseChange(next as ThemePresetName)}
              target={null}
              storageKey={null}
              transition="none"
              size="sm"
              aria-label="Base preset"
            />
          </Field>
          <Field
            label="Hue"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-pui-full"
                  style={{ background: `oklch(0.6 ${Math.max(current.chroma, 0.12)} ${current.hue})` }}
                />
                {Math.round(current.hue)}°
              </span>
            }
          >
            <Slider aria-label="Hue" min={0} max={360} step={1} value={current.hue} onValueChange={(hue) => update({ hue })} formatValue={(v) => `${v} degrees`} />
          </Field>
          <Field label="Chroma" value={current.chroma.toFixed(2)}>
            <Slider aria-label="Chroma" min={0} max={0.32} step={0.01} value={current.chroma} onValueChange={(chroma) => update({ chroma })} formatValue={(v) => v.toFixed(2)} />
          </Field>
          <Field label="Radius" value={`${current.radius}px`}>
            <Slider aria-label="Radius" min={0} max={24} step={1} value={current.radius} onValueChange={(radius) => update({ radius })} formatValue={(v) => `${v} pixels`} />
          </Field>
          <Field label="Font">
            <SegmentedControl aria-label="Font" size="sm" fullWidth value={current.font} onValueChange={(font) => update({ font: font as ThemeFont })}>
              {fonts.map((f) => (
                <SegmentedControlItem key={f} value={f} className="capitalize">
                  {f}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Field>
          <div className="flex items-center justify-between gap-3 border-t border-pui-border pt-4">
            <span id={labelId} className="text-sm font-medium">
              Apply to this site
            </span>
            <Switch aria-labelledby={labelId} checked={apply} onCheckedChange={onApplyChange} size="sm" />
          </div>
          <Button size="sm" variant="outline" tone="neutral" onClick={() => setState(fromPreset(current.base))}>
            Reset to {preset.label}
          </Button>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={theme.warnings.length ? "danger" : "success"} variant="soft">
              {theme.warnings.length ? `${theme.warnings.length} contrast warnings` : "WCAG AA: every pair passes"}
            </Badge>
            <span className="text-xs text-pui-muted-foreground">Text 4.5:1, inputs and focus rings 3:1, in both modes.</span>
          </div>
          <ThemePreviewPair name="custom" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl aria-label="CSS output" size="sm" value={selector} onValueChange={(v) => setSelector(v as "preset" | "root")}>
            <SegmentedControlItem value="preset">data-pui-theme="brand"</SegmentedControlItem>
            <SegmentedControlItem value="root">Replace the base theme</SegmentedControlItem>
          </SegmentedControl>
          <CopyButton value={outputCss} label="Copy theme CSS" showLabel size="sm" />
        </div>
        <CodeBlock code={outputCss} copy={false} className="[&_pre]:max-h-80" />
      </div>
      <details className="group rounded-pui-lg border border-pui-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Contrast report</summary>
        <div className="mt-3">
          <ContrastReport theme={theme} />
        </div>
      </details>
    </div>
  );
}

const setupCss = `/* app.css (Tailwind v4) */
@import "tailwindcss";
@import "changelui/theme.css";
@import "changelui/themes.css";   /* opt-in, about 6 kB gzip */

/* or, without Tailwind */
import "changelui/styles.css";
import "changelui/themes.css";`;

const setupHtml = `<!-- pick a preset anywhere; light/dark stays independent -->
<html data-pui-theme="sunset" class="dark">

<!-- presets nest: this card is always "mono" -->
<section data-pui-theme="mono">…</section>`;

const setupReact = `import { ThemeSwitcher, ThemeToggle } from "changelui";
import { getThemeInitScript } from "changelui/theme-script";

// <head>: applies the stored mode and preset before first paint
<script dangerouslySetInnerHTML={{ __html: getThemeInitScript({ presetStorageKey: "pui-theme-preset" }) }} />

<ThemeToggle />
<ThemeSwitcher />   // storageKey defaults to "pui-theme-preset"`;

export function Themes() {
  const [base, setBase] = useState<ThemePresetName>("default");
  const [apply, setApply] = useState(false);
  // Live site preview of the custom theme while this page is open; the stored preset comes back after.
  useEffect(() => {
    if (!apply) return;
    const root = document.documentElement;
    const previous = root.getAttribute("data-pui-theme");
    root.setAttribute("data-pui-theme", "custom");
    return () => {
      if (previous === null) root.removeAttribute("data-pui-theme");
      else root.setAttribute("data-pui-theme", previous);
    };
  }, [apply]);
  return (
    <article className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-8 sm:py-10">
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-64 w-2/3 bg-[radial-gradient(closest-side,var(--pui-gradient-2),transparent)] opacity-25 blur-2xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-10 h-56 w-1/2 bg-[radial-gradient(closest-side,var(--pui-gradient-1),transparent)] opacity-25 blur-2xl"
        />
        <Badge tone="primary" size="sm" className="relative self-start">
          10 presets · light + dark
        </Badge>
        <h1 tabIndex={-1} className="relative text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          Themes
        </h1>
        <p className="relative max-w-2xl text-base text-pui-muted-foreground">
          Every preset recolors all components, effects and charts, keeps light and dark mode, and passes WCAG AA
          contrast. Pick one for the whole site, nest them on any element, or generate your own below.
        </p>
        <div className="relative flex flex-wrap items-center gap-4">
          <ThemeSwitcher size="lg" aria-label="Site theme preset" />
          <CopyButton value={themesCss} label="Copy themes.css" showLabel size="sm" />
        </div>
      </header>

      <DocSection id="presets" title="Presets">
        <Prose>
          <p>
            Each card is an island with its own <code>data-pui-theme</code>, so you see every preset at once in the current
            mode. "Use preset" applies it to the site with a circle reveal.
          </p>
        </Prose>
        <Gallery
          onTune={(name) => {
            setBase(name);
            document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </DocSection>

      <DocSection id="customize" title="Customize">
        <Prose>
          <p>
            Start from a preset and change the hue, chroma, radius and font. Text and control colors are re-tuned for
            contrast as you go. Copy the CSS, or use <code>buildThemeCss</code> from{" "}
            <code>changelui/theme-builder</code> at build time.
          </p>
        </Prose>
        {/* Keyed by the base preset: picking another base (or "Tune" on a card) re-seeds every control. */}
        <Customizer key={base} base={base} onBaseChange={setBase} apply={apply} onApplyChange={setApply} />
      </DocSection>

      <DocSection id="setup" title="Setup">
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeBlock code={setupCss} copyLabel="Copy CSS setup" />
          <CodeBlock code={setupHtml} copyLabel="Copy HTML" />
        </div>
        <CodeBlock code={setupReact} copyLabel="Copy React setup" />
      </DocSection>
    </article>
  );
}
