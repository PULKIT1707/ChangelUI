import {
  Badge,
  buildTheme,
  buildThemeCss,
  presetNames,
  themePresets,
  type ThemeFont,
  type ThemePresetName,
} from "changelui";
import { useMemo } from "react";
import { CodeBlock } from "../../components/code-block";
import { ContrastReport, ThemePreviewPair, ThemeStyle } from "../../components/theme-preview";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  preset: ThemePresetName;
  customHue: boolean;
  hue: number;
  chroma: number;
  radius: number;
  font: ThemeFont;
};

const defaults: DemoProps = { preset: "sunset", customHue: false, hue: 30, chroma: 0.2, radius: 14, font: "system" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "preset", label: "Preset", options: presetNames },
  { type: "boolean", prop: "customHue", label: "Custom hue + chroma" },
  { type: "number", prop: "hue", label: "Hue", min: 0, max: 360, step: 1 },
  { type: "number", prop: "chroma", label: "Chroma", min: 0, max: 0.32, step: 0.01 },
  { type: "number", prop: "radius", label: "Radius (px)", min: 0, max: 24, step: 1 },
  { type: "select", prop: "font", label: "Font", options: ["system", "rounded", "serif", "mono"] },
];

function options(props: DemoProps) {
  return {
    preset: props.preset,
    hue: props.customHue ? props.hue : undefined,
    chroma: props.customHue ? props.chroma : undefined,
    radius: props.radius,
    font: props.font,
    name: "builder-demo",
  };
}

function Preview({ props }: { props: DemoProps }) {
  const key = JSON.stringify(options(props));
  const theme = useMemo(() => buildTheme(JSON.parse(key) as ReturnType<typeof options>), [key]);
  const css = useMemo(() => buildThemeCss(JSON.parse(key) as ReturnType<typeof options>), [key]);
  return (
    <div className="flex w-full flex-col gap-4">
      <ThemeStyle css={css} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{themePresets[props.preset].label}</span>
        <span className="text-pui-muted-foreground">{themePresets[props.preset].description}</span>
        <Badge size="sm" tone={theme.warnings.length ? "danger" : "success"} variant="soft" className="ml-auto">
          {theme.warnings.length ? `${theme.warnings.length} contrast warnings` : "All contrast checks pass"}
        </Badge>
      </div>
      <ThemePreviewPair name="builder-demo" />
    </div>
  );
}

function Mini() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {presetNames.slice(0, 7).map((name) => (
        <span key={name} data-pui-theme={name} className="flex flex-col overflow-hidden rounded-pui-md border border-pui-border shadow-pui-xs">
          <span className="h-5 w-6 bg-pui-primary" />
          <span className="h-2 w-6 bg-pui-gradient-2" />
          <span className="h-2 w-6 bg-pui-background" />
        </span>
      ))}
    </div>
  );
}

function ContrastDemo() {
  const theme = useMemo(() => buildTheme({ preset: "pastel" }), []);
  return <ContrastReport theme={theme} />;
}

function OutputDemo() {
  const css = useMemo(() => buildThemeCss({ preset: "forest", hue: 165, radius: 8, name: "brand" }), []);
  return <CodeBlock code={css} copyLabel="Copy generated CSS" className="[&_pre]:max-h-80" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const o = options(props);
    const args = [
      `preset: "${o.preset}"`,
      o.hue !== undefined ? `hue: ${o.hue}` : null,
      o.chroma !== undefined ? `chroma: ${o.chroma}` : null,
      `radius: ${o.radius}`,
      o.font !== "system" ? `font: "${o.font}"` : null,
      `name: "brand"`,
    ].filter(Boolean);
    return `// Server-safe: run it at build time, in a route handler or in a React Server Component.
import { buildThemeCss, buildTheme } from "changelui/theme-builder";

const css = buildThemeCss({ ${args.join(", ")} });
// <style>{css}</style> then <html data-pui-theme="brand">

const { light, dark, warnings } = buildTheme({ preset: "${o.preset}" });
warnings; // [] when every text pair is at least 4.5:1 and input/ring at least 3:1`;
  },
  propsTable: [
    { name: "preset", type: "ThemePresetName", default: '"default"', description: "Starting preset: its neutrals, accents, radius, font and hand-tuned overrides." },
    { name: "hue", type: "number", description: "Primary hue 0-360. Neutrals and accent hues rotate with it." },
    { name: "chroma", type: "number", description: "Primary chroma 0-0.37. 0 gives a grayscale primary on mono." },
    { name: "radius", type: "string | number", description: 'Base radius, e.g. "0.5rem" or 8 (px).' },
    { name: "font", type: '"system" | "rounded" | "serif" | "mono"', description: "Font pairing (system stacks only, nothing downloads)." },
    { name: "name", type: "string", default: "preset name", description: "The data-pui-theme value. Sanitized to a-z, 0-9 and -." },
    { name: "selector", type: '"preset" | "root"', default: '"preset"', description: '"root" emits :root/.dark blocks that replace the base theme.' },
    { name: "contrast(a, b)", type: "(a: string, b: string) => number", description: "WCAG ratio of two oklch() colors (alpha composited)." },
    { name: "checkContrast(tokens, mode)", type: "ContrastWarning[]", description: "Pairs below 4.5:1 (text) or 3:1 (input, ring)." },
  ],
  a11y: [
    "Every derived text pair is nudged in lightness until it reaches 4.5:1, inputs and rings 3:1.",
    "buildTheme returns any remaining failures as warnings, so CI can fail on them.",
  ],
  examples: [
    { title: "Contrast report", description: "checkContrast pairs for the pastel preset, which puts dark text on a light primary.", Demo: ContrastDemo, wide: true },
    { title: "Generated CSS", description: "buildThemeCss output for a custom brand built from forest.", Demo: OutputDemo, wide: true },
  ],
};

export default item;
