import { ThemeToggle, type ThemeName, type ThemeToggleProps } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  themes: "light, dark" | "light, dark, system";
  size: NonNullable<ThemeToggleProps["size"]>;
  variant: NonNullable<ThemeToggleProps["variant"]>;
};

const defaults: DemoProps = { themes: "light, dark", size: "md", variant: "ghost" };

const themeLists: Record<DemoProps["themes"], ThemeName[]> = {
  "light, dark": ["light", "dark"],
  "light, dark, system": ["light", "dark", "system"],
};

/** The dashboard's resolved page theme (the init script and the header toggle set `.dark` on <html>). */
function pageTheme(): ThemeName {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function Preview({ props }: { props: DemoProps }) {
  // The preview themes a local island (data-theme) so it never changes the dashboard's own theme.
  // It starts from the page theme and follows page changes; the local toggle overrides until then.
  const [theme, setTheme] = useState<ThemeName>(pageTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(pageTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);
  const resolved = theme === "dark" ? "dark" : "light";
  return (
    <div
      data-theme={resolved}
      className="flex w-64 items-center justify-between rounded-pui-lg border border-pui-border bg-pui-background p-4 text-pui-foreground"
    >
      <span className="text-sm">
        Theme: <strong>{theme}</strong>
      </span>
      <ThemeToggle
        theme={theme}
        onThemeChange={setTheme}
        themes={themeLists[props.themes]}
        size={props.size}
        variant={props.variant}
        applyToDocument={false}
        storageKey={null}
      />
    </div>
  );
}

function Mini() {
  return <ThemeToggle applyToDocument={false} storageKey={null} transition="none" variant="outline" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "themes", label: "Themes", options: ["light, dark", "light, dark, system"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "variant", label: "Variant", options: ["ghost", "outline", "soft", "solid"] },
  ],
  snippet: ({ themes, ...props }) =>
    `// <head>: <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />\n${toJsx<Record<string, unknown>>(
      "ThemeToggle",
      { ...props, themes: themes === "light, dark" ? undefined : themeLists[themes] },
      { size: "md", variant: "ghost" },
    )}`,
  propsTable: propDocs<ThemeToggleProps>()([
    { name: "theme", type: '"light" | "dark" | "system"', description: "Controlled theme." },
    { name: "defaultTheme", type: '"light" | "dark" | "system"', default: '"system"', description: "Used when nothing is stored." },
    { name: "onThemeChange", type: "(theme) => void", description: "Called with the next theme on click." },
    { name: "themes", type: "ThemeName[]", default: '["light", "dark"]', description: "Click cycles through the list." },
    { name: "storageKey", type: "string | null", default: '"pui-theme"', description: "localStorage key; null disables persistence." },
    { name: "attribute", type: '"class" | "data-theme" | "both"', default: '"both"', description: "What to set on <html>." },
    { name: "applyToDocument", type: "boolean", default: "true", description: "false: only report the theme." },
    { name: "transition", type: '"view" | "none"', default: '"view"', description: "Circular view-transition reveal when supported." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Switch theme" }],
  a11y: [
    'Two themes: a toggle button named "Dark mode" with aria-pressed.',
    "Three themes: the name says the current and next theme.",
    "Pair with getThemeInitScript() in <head> to avoid a flash on load.",
  ],
  reducedMotion: "No view transition; icons swap without rotating.",
};

export default item;
