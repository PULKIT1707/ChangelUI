import {
  cn,
  Dialog,
  DialogContent,
  Input,
  Kbd,
  toast,
  useCopyToClipboard,
  useMediaQuery,
} from "changelui";
import { useLatestRef } from "@pui-src/lib/use-latest-ref";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { CATEGORIES, type Category } from "../../../scripts/entries";
import { fuzzySearch } from "../lib/fuzzy";
import { CATEGORY_LABELS, INSTALL_COMMAND } from "../lib/nav";
import { addRecent, readRecent } from "../lib/recent";
import { registryMeta } from "../registry/meta";
import { templateMeta } from "../registry/templates";
import { categoryHref, docHref, homeHref, itemHref, navigate, templateHref, templatesHref } from "../router";

type GroupName = "Recent" | "Pages" | "Templates" | "Components" | "Text" | "Effects" | "Backgrounds" | "Charts" | "Hooks" | "Actions";

interface Command {
  key: string;
  group: GroupName;
  title: string;
  subtitle: string;
  fields: string[];
  run: () => void;
}

const GROUP_ORDER: readonly GroupName[] = ["Recent", "Pages", "Templates", "Components", "Text", "Effects", "Backgrounds", "Charts", "Hooks", "Actions"];
const categoryGroup: Record<Category, GroupName> = {
  components: "Components",
  text: "Text",
  effects: "Effects",
  backgrounds: "Backgrounds",
  charts: "Charts",
  hooks: "Hooks",
};
const validSlugs: ReadonlySet<string> = new Set(registryMeta.map((meta) => meta.slug));

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

interface PaletteBodyProps {
  inputRef: RefObject<HTMLInputElement | null>;
  close: () => void;
  toggleTheme: () => void;
  copyInstall: () => void;
}

/** Mounted only while the dialog is open, so the query and active option reset on every open. */
function PaletteBody({ inputRef, close, toggleTheme, copyInstall }: PaletteBodyProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [recent, setRecent] = useState(() => readRecent(validSlugs));

  const openItem = (slug: string, category: Category) => {
    setRecent(addRecent(slug, validSlugs));
    close();
    navigate(itemHref(category, slug));
  };
  const itemCommand = (meta: (typeof registryMeta)[number], group: GroupName, keyPrefix: string): Command => ({
    key: `${keyPrefix}-${meta.slug}`,
    group,
    title: meta.title,
    subtitle: meta.description,
    fields: [meta.slug, meta.category, ...meta.keywords],
    run: () => openItem(meta.slug, meta.category),
  });
  const page = (key: string, title: string, subtitle: string, href: string): Command => ({
    key: `page-${key}`,
    group: "Pages",
    title,
    subtitle,
    fields: [key, "docs", "page"],
    run: () => {
      close();
      navigate(href);
    },
  });
  const action = (key: string, title: string, subtitle: string, run: () => void): Command => ({
    key: `action-${key}`,
    group: "Actions",
    title,
    subtitle,
    fields: ["action", subtitle],
    run: () => {
      close();
      run();
    },
  });

  const commands: Command[] = [
    page("home", "Introduction", "Overview and gallery", homeHref()),
    page("installation", "Installation", "Install, peers and styling modes", docHref("installation")),
    page("theming", "Theming", "Tokens, dark mode and nested themes", docHref("theming")),
    page("templates", "Templates", `${templateMeta.length} copy-only page sections`, templatesHref()),
    ...templateMeta.map(
      (meta): Command => ({
        key: `template-${meta.slug}`,
        group: "Templates",
        title: meta.title,
        subtitle: meta.description,
        fields: [meta.slug, "template", meta.group, ...meta.keywords],
        run: () => {
          close();
          navigate(templateHref(meta.slug));
        },
      }),
    ),
    ...CATEGORIES.flatMap((category) => {
      const total = registryMeta.filter((meta) => meta.category === category).length;
      return total > 0
        ? [page(`category-${category}`, `All ${CATEGORY_LABELS[category].toLowerCase()}`, `${total} items, grouped by tag`, categoryHref(category))]
        : [];
    }),
    ...CATEGORIES.flatMap((category) =>
      registryMeta.filter((meta) => meta.category === category).map((meta) => itemCommand(meta, categoryGroup[category], "item")),
    ),
    action("theme", "Toggle theme", "Switch between light and dark", toggleTheme),
    action("copy-install", "Copy install command", INSTALL_COMMAND, copyInstall),
    action("go-installation", "Go to Installation", "Open the installation guide", () => navigate(docHref("installation"))),
    action("go-theming", "Go to Theming", "Open the theming guide", () => navigate(docHref("theming"))),
  ];

  const trimmed = query.trim();
  let visible: Command[];
  let bestKey: string | undefined;
  if (trimmed === "") {
    const recentCommands = recent.flatMap((slug) => {
      const meta = registryMeta.find((m) => m.slug === slug);
      return meta ? [itemCommand(meta, "Recent", "recent")] : [];
    });
    visible = [...recentCommands, ...commands];
  } else {
    const ranked = fuzzySearch(commands, trimmed).map((r) => r.item);
    bestKey = ranked[0]?.key;
    visible = ranked;
  }
  const groups = GROUP_ORDER.map((name) => ({ name, items: visible.filter((c) => c.group === name) })).filter(
    (group) => group.items.length > 0,
  );
  const flat = groups.flatMap((group) => group.items);
  const active = flat.find((c) => c.key === activeKey) ?? flat.find((c) => c.key === bestKey) ?? flat[0];
  const optionId = (key: string) => `${baseId}-opt-${key}`;
  const activeId = active ? optionId(active.key) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const move = (delta: number) => {
    if (flat.length === 0 || !active) return;
    const index = flat.indexOf(active);
    const next = flat[(index + delta + flat.length) % flat.length];
    if (next) setActiveKey(next.key);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      active?.run();
    }
  };

  return (
    <>
      <div className="border-b border-pui-border p-3">
        <Input
          ref={inputRef}
          role="combobox"
          aria-label="Search the docs"
          aria-expanded={flat.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          placeholder="Search components, pages and actions…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveKey(null);
          }}
          onKeyDown={onKeyDown}
          leadingIcon={<SearchIcon />}
          className="border-transparent bg-transparent shadow-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[min(60vh,28rem)] sm:flex-none">
        <div role="listbox" id={listId} aria-label="Results" className="flex flex-col gap-2">
          {groups.map((group) => (
            <div key={group.name} role="group" aria-label={group.name}>
              <div aria-hidden="true" className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-pui-muted-foreground">
                {group.name}
              </div>
              {group.items.map((command) => {
                const selected = command === active;
                return (
                  <div
                    key={command.key}
                    id={optionId(command.key)}
                    role="option"
                    tabIndex={-1}
                    aria-selected={selected}
                    data-active={selected ? "" : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => {
                      if (!selected) setActiveKey(command.key);
                    }}
                    onClick={() => command.run()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") command.run();
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-pui-md px-2 py-2 text-sm",
                      selected ? "bg-pui-muted text-pui-foreground" : "text-pui-foreground",
                    )}
                  >
                    <span className="font-medium">{command.title}</span>
                    <span className="truncate text-xs text-pui-muted-foreground">{command.subtitle}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {flat.length === 0 ? (
          <p role="status" className="px-2 py-8 text-center text-sm text-pui-muted-foreground">
            No results for “{trimmed}”
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4 border-t border-pui-border px-4 py-2 text-xs text-pui-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd size="sm">↑</Kbd>
          <Kbd size="sm">↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd size="sm">↵</Kbd> open
        </span>
        <span className="flex items-center gap-1">
          <Kbd size="sm">esc</Kbd> close
        </span>
      </div>
    </>
  );
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The top-bar ThemeToggle; "Toggle theme" clicks it so storage and the transition stay in one place. */
  themeToggleRef: RefObject<HTMLButtonElement | null>;
}

/** Cmd/Ctrl+K command palette with the combobox pattern (design 10.3). */
export function CommandPalette({ open, onOpenChange, themeToggleRef }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wide = useMediaQuery("(min-width: 640px)");
  const { copy } = useCopyToClipboard();
  const state = useLatestRef({ open, onOpenChange });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      state.current.onOpenChange(!state.current.open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const copyInstall = () => {
    void copy(INSTALL_COMMAND).then((ok) => {
      if (ok) toast.success("Install command copied", { description: INSTALL_COMMAND });
      else toast.danger("Couldn't copy the install command");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label="Command palette"
        size={wide ? "lg" : "full"}
        showClose={false}
        initialFocus={inputRef}
        data-testid="command-palette"
        className={cn("flex flex-col gap-0 overflow-hidden p-0", wide && "mb-auto mt-[15vh]")}
      >
        <PaletteBody
          inputRef={inputRef}
          close={() => onOpenChange(false)}
          toggleTheme={() => themeToggleRef.current?.click()}
          copyInstall={copyInstall}
        />
      </DialogContent>
    </Dialog>
  );
}
