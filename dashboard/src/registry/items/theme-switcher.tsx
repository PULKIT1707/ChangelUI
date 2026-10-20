import {
  ThemeSwitcher,
  ThemeToggle,
  cn,
  useThemePreset,
  type ThemeSwitcherProps,
} from "changelui";
import { useRef, useState } from "react";
import { ThemeSample } from "../../components/theme-sample";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<ThemeSwitcherProps["size"]>;
  showLabels: boolean;
  transition: NonNullable<ThemeSwitcherProps["transition"]>;
};

const defaults: DemoProps = { size: "md", showLabels: false, transition: "circle" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "showLabels", label: "Show labels" },
  { type: "select", prop: "transition", label: "Transition", options: ["circle", "fade", "none"] },
];

/** Drives the whole dashboard: same storage key as the header picker and the init script. */
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5">
      <ThemeSwitcher {...props} className={props.showLabels ? "justify-center" : undefined} />
      <p className="text-center text-xs text-pui-muted-foreground">
        This picker themes the whole site. Pair it with the light/dark toggle in the header.
      </p>
      <ThemeSample compact className="w-full max-w-sm rounded-pui-xl border border-pui-border shadow-pui-md" />
    </div>
  );
}

function Mini() {
  return (
    <ThemeSwitcher
      presets={["default", "sunset", "forest", "neon", "pastel", "ocean"]}
      storageKey={null}
      target={null}
      transition="none"
      size="sm"
      tabIndex={-1}
    />
  );
}

/** A preset scoped to one card: target is a ref, storage is off. */
function ScopedDemo() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="flex w-full flex-col gap-3">
      <ThemeSwitcher target={ref} storageKey={null} transition="none" size="sm" defaultValue="sunset" aria-label="Card preset" />
      <div ref={ref} data-pui-theme="sunset" className="overflow-hidden rounded-pui-xl border border-pui-border shadow-pui-md">
        <ThemeSample />
      </div>
    </div>
  );
}

const chipPresets = ["midnight", "forest", "mono", "rose"] as const;

/** useThemePreset powers any picker UI, here a row of named pills. */
function HookDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { preset, setPreset } = useThemePreset({ target: ref, storageKey: null, defaultValue: "midnight", transition: "none" });
  return (
    <div className="flex w-full flex-col gap-3">
      <div role="group" aria-label="Preview preset" className="flex flex-wrap gap-1.5">
        {chipPresets.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={preset === name}
            onClick={() => setPreset(name)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-pui-full border px-3 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring",
              preset === name
                ? "border-pui-foreground bg-pui-foreground text-pui-background"
                : "border-pui-border text-pui-muted-foreground hover:text-pui-foreground",
            )}
          >
            <span data-pui-theme={name} aria-hidden="true" className="size-2.5 rounded-pui-full bg-pui-primary" />
            {name}
          </button>
        ))}
      </div>
      <div ref={ref} data-pui-theme="midnight" className="dark overflow-hidden rounded-pui-xl border border-pui-border">
        <ThemeSample compact />
      </div>
    </div>
  );
}

/** A settings row: light/dark and the preset side by side, both controlled locally. */
function SettingsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  return (
    <div
      ref={ref}
      data-pui-theme="ocean"
      data-theme={dark ? "dark" : "light"}
      className="w-full rounded-pui-xl border border-pui-border bg-pui-background p-4 text-pui-foreground"
    >
      <p className="font-(family-name:--pui-font-display) text-sm font-semibold">Appearance</p>
      <p className="mb-4 text-xs text-pui-muted-foreground">Choose how the workspace looks on this device.</p>
      <div className="flex items-center justify-between gap-3 border-t border-pui-border py-3">
        <span className="text-sm">Mode</span>
        <ThemeToggle
          theme={dark ? "dark" : "light"}
          onThemeChange={(t) => setDark(t === "dark")}
          applyToDocument={false}
          storageKey={null}
          variant="outline"
          tone="neutral"
          size="sm"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pui-border pt-3">
        <span className="text-sm">Accent</span>
        <ThemeSwitcher
          target={ref}
          storageKey={null}
          transition="none"
          size="sm"
          defaultValue="ocean"
          presets={["ocean", "forest", "sunset", "rose", "pastel", "mono"]}
          aria-label="Accent preset"
        />
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `// app.css (after theme.css): @import "changelui/themes.css";
// <head>: getThemeInitScript({ presetStorageKey: "pui-theme-preset" }) applies the stored preset before paint
import { ThemeSwitcher } from "changelui";

${toJsx<Record<string, unknown>>("ThemeSwitcher", props, defaults, undefined, controls)}`,
  propsTable: propDocs<ThemeSwitcherProps>()([
    { name: "presets", type: "(string | { name; label? })[]", default: "THEME_PRESETS", description: "Presets to offer. Custom names work when your CSS defines them." },
    { name: "value", type: "string", description: "Controlled preset." },
    { name: "defaultValue", type: "string", default: '"default"', description: "Used when nothing is stored." },
    { name: "onValueChange", type: "(preset: string) => void", description: "Called with the chosen preset." },
    { name: "target", type: '"html" | HTMLElement | RefObject | null', default: '"html"', description: "Where data-pui-theme is set; null only reports the value." },
    { name: "storageKey", type: "string | null", default: '"pui-theme-preset"', description: "localStorage key; null disables persistence. Instances with the same key stay in sync." },
    { name: "transition", type: '"circle" | "fade" | "none"', default: '"circle"', description: "View-transition reveal from the chosen swatch, a crossfade, or an instant swap." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Swatch size (20 / 28 / 36 px)." },
    { name: "showLabels", type: "boolean", default: "false", description: "Visible names under the swatches instead of tooltips." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every swatch." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Moves focus to the selected swatch." },
    { keys: "Arrow keys", action: "Moves to the previous or next preset and applies it." },
    { keys: "Home / End", action: "Jumps to the first or last preset." },
  ],
  a11y: [
    "A radiogroup (aria-label, default \"Theme preset\") of radios named after each preset.",
    "Swatches are aria-hidden islands of the preset itself, so they always show its real colors.",
    "Pairs with ThemeToggle: presets are orthogonal to light and dark.",
  ],
  reducedMotion: "The preset switches instantly: no view transition, no ring slide and no hover scale.",
  examples: [
    { title: "Scoped to one surface", description: "target accepts a ref, so a card can preview a preset without touching the page.", Demo: ScopedDemo },
    { title: "Build your own picker", description: "useThemePreset gives you the value, storage and transitions; render any UI.", Demo: HookDemo },
    { title: "Settings panel", description: "ThemeToggle for the mode and ThemeSwitcher for the accent, both local.", Demo: SettingsDemo, wide: true },
  ],
};

export default item;
