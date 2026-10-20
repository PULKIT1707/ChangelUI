"use client";

import { motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { fuzzyScore } from "../lib/fuzzy";
import { ChevronRightIcon } from "../lib/icons";
import { toIdPart } from "../lib/ids";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Dialog, DialogContent } from "./dialog";
import { Kbd } from "./kbd";

export type CommandFilter = (value: string, search: string, keywords: readonly string[]) => number;

export interface CommandProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The search text. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** Score an item (0 hides it). Default: fuzzy prefix / word / substring / subsequence ranking. */
  filter?: CommandFilter;
  /** false shows every item as given, for results you filter yourself (async search). Default true. */
  shouldFilter?: boolean;
  /** Order matches by score while searching (groups by their best match). Default true. */
  sort?: boolean;
  /** Arrow keys wrap around. Default true. */
  loop?: boolean;
  /** Accessible name of the results list. Default "Commands". */
  label?: string;
}

export interface CommandMenuProps extends CommandProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Global shortcut that toggles the menu, e.g. "mod+k" (mod = ⌘ on Apple, Ctrl elsewhere). null disables it. Default "mod+k". */
  hotkey?: string | null;
  /** Selecting an item closes the menu. Default true. */
  closeOnSelect?: boolean;
  /** Classes for the dialog surface. */
  contentClassName?: string;
  /** Accessible name of the dialog. Default "Command menu". */
  dialogLabel?: string;
}

export interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  /** Accessible name of the Back button shown on nested pages. Default "Back". */
  backLabel?: string;
}

export type CommandListProps = MotionSafeHTMLProps<HTMLDivElement>;

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
}

export interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Text matched by the search. Default: the item's text content. */
  value?: string;
  /** Extra search terms (synonyms, ids). */
  keywords?: readonly string[];
  onSelect?: (value: string) => void;
  disabled?: boolean;
  /** Key hint shown at the end, space separated: "⌘ N". */
  shortcut?: string;
  /** Opens the CommandPage with this name instead of selecting (the item's value becomes the breadcrumb). */
  toPage?: string;
  /** Inside CommandMenu, keep the menu open after selecting. Default false. */
  keepOpen?: boolean;
}

export type CommandEmptyProps = React.HTMLAttributes<HTMLDivElement>;

export interface CommandSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Keep the separator while searching. Default false. */
  alwaysRender?: boolean;
}

export interface CommandPageProps {
  /** Matched against the `toPage` of the item that opens it. */
  name: string;
  children?: React.ReactNode;
}

interface ItemRecord {
  id: string;
  value: string;
  keywords: readonly string[];
  disabled: boolean;
  groupId: string | null;
  el: HTMLElement | null;
  select: () => void;
}

interface Store {
  records: Map<string, ItemRecord>;
  version: number;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  getVersion: () => number;
  set: (record: ItemRecord) => void;
  remove: (id: string) => void;
}

function createStore(): Store {
  const store: Store = {
    records: new Map(),
    version: 0,
    listeners: new Set(),
    subscribe: (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    getVersion: () => store.version,
    set: (record) => {
      store.records.set(record.id, record);
      store.version++;
      store.listeners.forEach((l) => l());
    },
    remove: (id) => {
      if (!store.records.delete(id)) return;
      store.version++;
      store.listeners.forEach((l) => l());
    },
  };
  return store;
}

interface PageEntry {
  name: string;
  label: string;
}

interface CommandContextValue {
  rootId: string;
  listId: string;
  store: Store;
  search: string;
  setSearch: (search: string) => void;
  activeId: string | undefined;
  setActiveId: (id: string | null) => void;
  move: (delta: number | "first" | "last") => void;
  selectActive: () => void;
  scores: Map<string, number>;
  order: Map<string, number>;
  groupScores: Map<string, number>;
  visibleCount: number;
  sorting: boolean;
  page: PageEntry | null;
  pages: PageEntry[];
  pushPage: (entry: PageEntry) => void;
  popPage: () => void;
  pageDirection: number;
  reduced: boolean;
  label: string;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);
const GroupContext = React.createContext<string | null>(null);
const PageContext = React.createContext<string | null>(null);
const MenuContext = React.createContext<{ close: () => void; closeOnSelect: boolean } | null>(null);

function useCommandContext(part: string): CommandContextValue {
  const context = React.useContext(CommandContext);
  if (!context) throw new Error(`${part} must be used inside <Command> or <CommandMenu>.`);
  return context;
}

export interface UseCommandResult {
  search: string;
  setSearch: (search: string) => void;
  /** The open CommandPage's name, or null on the root page. */
  page: string | null;
  pushPage: (name: string, label?: string) => void;
  popPage: () => void;
}

/** Read and drive the surrounding Command: search text and nested pages. */
export function useCommand(): UseCommandResult {
  const context = useCommandContext("useCommand");
  return {
    search: context.search,
    setSearch: context.setSearch,
    page: context.page?.name ?? null,
    pushPage: (name, label) => context.pushPage({ name, label: label ?? name }),
    popPage: context.popPage,
  };
}

function sortedRecords(store: Store): ItemRecord[] {
  return Array.from(store.records.values()).sort((a, b) => {
    if (!a.el || !b.el) return 0;
    return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

/**
 * Inline command palette: a search box over grouped, fuzzy-ranked results with keyboard
 * navigation, shortcuts and nested pages. Combobox + listbox pattern with aria-activedescendant,
 * so focus stays in the input. Use CommandMenu for the ⌘K dialog version.
 */
export const Command = React.forwardRef<HTMLDivElement, CommandProps>(function Command(
  {
    search: searchProp,
    defaultSearch = "",
    onSearchChange,
    filter = fuzzyScore,
    shouldFilter = true,
    sort = true,
    loop = true,
    label = "Commands",
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootId = `pui-cmd-${toIdPart(React.useId())}`;
  const [store] = React.useState(createStore);
  React.useSyncExternalStore(store.subscribe, store.getVersion, () => 0);
  const [search, setSearchState] = useControllableState({ value: searchProp, defaultValue: defaultSearch, onChange: onSearchChange });
  const [activeChoice, setActiveChoice] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<PageEntry[]>([]);
  const [pageDirection, setPageDirection] = React.useState(0);
  const page = pages[pages.length - 1] ?? null;

  const query = search.trim();
  const records = sortedRecords(store);
  const scores = new Map<string, number>();
  const groupScores = new Map<string, number>();
  for (const record of records) {
    const score = !shouldFilter || query === "" ? 1 : filter(record.value, query, record.keywords);
    scores.set(record.id, score);
    if (score > 0 && record.groupId) groupScores.set(record.groupId, Math.max(groupScores.get(record.groupId) ?? 0, score));
  }
  const sorting = sort && shouldFilter && query !== "";
  const visible = records.filter((r) => (scores.get(r.id) ?? 0) > 0);
  const navigable = sorting
    ? visible
        .map((record, index) => ({ record, index }))
        .sort((a, b) => {
          const ga = a.record.groupId ? (groupScores.get(a.record.groupId) ?? 0) : (scores.get(a.record.id) ?? 0);
          const gb = b.record.groupId ? (groupScores.get(b.record.groupId) ?? 0) : (scores.get(b.record.id) ?? 0);
          if (ga !== gb) return gb - ga;
          if (a.record.groupId !== b.record.groupId) return a.index - b.index;
          return (scores.get(b.record.id) ?? 0) - (scores.get(a.record.id) ?? 0) || a.index - b.index;
        })
        .map((entry) => entry.record)
    : visible;
  const order = new Map<string, number>();
  navigable.forEach((record, index) => order.set(record.id, index));
  const enabled = navigable.filter((r) => !r.disabled);
  const active = enabled.find((r) => r.id === activeChoice) ?? enabled[0];
  const activeId = active?.id;

  const setSearch = (next: string) => {
    setActiveChoice(null);
    setSearchState(next);
  };
  const move = (delta: number | "first" | "last") => {
    if (enabled.length === 0) return;
    let next: ItemRecord | undefined;
    if (delta === "first") next = enabled[0];
    else if (delta === "last") next = enabled[enabled.length - 1];
    else {
      const index = active ? enabled.indexOf(active) : -1;
      let target = index + delta;
      if (loop) target = (target + enabled.length) % enabled.length;
      else target = Math.min(Math.max(target, 0), enabled.length - 1);
      next = enabled[target];
    }
    if (next) {
      setActiveChoice(next.id);
      next.el?.scrollIntoView?.({ block: "nearest" });
    }
  };
  const pushPage = (entry: PageEntry) => {
    setPageDirection(1);
    setPages((prev) => [...prev, entry]);
    setActiveChoice(null);
    setSearchState("");
  };
  const popPage = () => {
    if (pages.length === 0) return;
    setPageDirection(-1);
    setPages((prev) => prev.slice(0, -1));
    setActiveChoice(null);
    setSearchState("");
  };

  const context: CommandContextValue = {
    rootId,
    listId: `${rootId}-list`,
    store,
    search,
    setSearch,
    activeId,
    setActiveId: setActiveChoice,
    move,
    selectActive: () => active?.select(),
    scores,
    order,
    groupScores,
    visibleCount: visible.length,
    sorting,
    page,
    pages,
    pushPage,
    popPage,
    pageDirection,
    reduced,
    label,
  };

  return (
    <CommandContext.Provider value={context}>
      <div
        ref={ref}
        data-pui-command=""
        {...props}
        className={cn(blockReset, "flex w-full flex-col overflow-hidden bg-pui-surface text-pui-surface-foreground", className)}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
});

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** The search box: role="combobox" controlling the list. Backspace on an empty box goes back a page. */
export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(function CommandInput(
  { backLabel = "Back", placeholder = "Type a command or search…", className, onKeyDown, ...props },
  ref,
) {
  const command = useCommandContext("CommandInput");
  return (
    <div className={cn(blockReset, "flex items-center gap-2 border-b border-pui-border px-3")}>
      {command.page ? (
        <button
          type="button"
          aria-label={`${backLabel} from ${command.page.label}`}
          onClick={command.popPage}
          className={cn(
            controlReset,
            "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-pui-sm bg-pui-muted px-1.5 text-xs font-medium text-pui-muted-foreground hover:text-pui-foreground",
            focusRing,
          )}
        >
          <ChevronRightIcon className="size-3 rotate-180" aria-hidden="true" />
          {command.page.label}
        </button>
      ) : (
        <span className={cn(blockReset, "text-pui-muted-foreground")}>
          <SearchGlyph />
        </span>
      )}
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-expanded={true}
        aria-controls={command.listId}
        aria-activedescendant={command.activeId}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-autofocus=""
        placeholder={placeholder}
        {...props}
        value={command.search}
        onChange={(event) => command.setSearch(event.target.value)}
        onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.nativeEvent.isComposing) return;
          const ctrl = event.ctrlKey && !event.metaKey && !event.altKey;
          if (event.key === "ArrowDown" || (ctrl && event.key === "n")) {
            event.preventDefault();
            command.move(1);
          } else if (event.key === "ArrowUp" || (ctrl && event.key === "p")) {
            event.preventDefault();
            command.move(-1);
          } else if (event.key === "Home" && event.ctrlKey) {
            event.preventDefault();
            command.move("first");
          } else if (event.key === "End" && event.ctrlKey) {
            event.preventDefault();
            command.move("last");
          } else if (event.key === "Enter") {
            event.preventDefault();
            command.selectActive();
          } else if (event.key === "Backspace" && command.search === "" && command.page) {
            event.preventDefault();
            command.popPage();
          } else if (event.key === "Escape" && command.page) {
            // Back out of a nested page before the dialog closes.
            event.preventDefault();
            event.stopPropagation();
            command.popPage();
          }
        })}
        className={cn(
          controlReset,
          "h-12 min-w-0 flex-1 bg-transparent text-sm text-pui-surface-foreground outline-hidden placeholder:text-pui-muted-foreground",
          className,
        )}
      />
    </div>
  );
});

/** The scrolling results listbox. A page change slides the results in. */
export const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(function CommandList(
  { className, children, ...props },
  ref,
) {
  const command = useCommandContext("CommandList");
  const pageKey = command.page?.name ?? "";
  const offset = command.reduced ? 0 : command.pageDirection * 16;
  return (
    <motion.div
      ref={ref}
      layoutScroll
      id={command.listId}
      role="listbox"
      aria-label={command.label}
      {...props}
      className={cn(blockReset, "max-h-80 min-h-0 overflow-y-auto overscroll-contain p-2 outline-hidden", className)}
    >
      <motion.div
        key={pageKey}
        initial={command.pageDirection === 0 ? false : { opacity: 0, x: offset }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: easings.out }}
        className={cn(blockReset, "flex flex-col")}
      >
        {children}
      </motion.div>
    </motion.div>
  );
});

/** Labelled set of items; hidden while none of its items match. */
export const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(function CommandGroup(
  { heading, className, children, style, ...props },
  ref,
) {
  const command = useCommandContext("CommandGroup");
  const pageName = React.useContext(PageContext);
  const groupId = `${command.rootId}-g-${toIdPart(React.useId())}`;
  const inScope = pageName === (command.page?.name ?? null);
  if (!inScope) return null;
  const hasRecords = Array.from(command.store.records.values()).some((r) => r.groupId === groupId);
  const score = command.groupScores.get(groupId) ?? 0;
  const hidden = hasRecords && command.search.trim() !== "" && score === 0;
  return (
    <GroupContext.Provider value={groupId}>
      <div
        ref={ref}
        role="group"
        aria-labelledby={heading ? `${groupId}-h` : undefined}
        hidden={hidden}
        data-pui-command-group=""
        {...props}
        style={command.sorting ? { order: -Math.round(score), ...style } : style}
        className={cn(blockReset, "flex flex-col pb-1", className)}
      >
        {heading ? (
          <div
            id={`${groupId}-h`}
            aria-hidden="true"
            className={cn(blockReset, "select-none px-2 pb-1 pt-2 text-xs font-medium text-pui-muted-foreground")}
          >
            {heading}
          </div>
        ) : null}
        <div className={cn(blockReset, "flex flex-col")}>{children}</div>
      </div>
    </GroupContext.Provider>
  );
});

/** One option. Enter or a click runs onSelect (or opens `toPage`). */
export const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(function CommandItem(
  { value: valueProp, keywords, onSelect, disabled = false, shortcut, toPage, keepOpen = false, className, children, style, ...props },
  ref,
) {
  const command = useCommandContext("CommandItem");
  const groupId = React.useContext(GroupContext);
  const pageName = React.useContext(PageContext);
  const menu = React.useContext(MenuContext);
  const id = `${command.rootId}-i-${toIdPart(React.useId())}`;
  const elRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(elRef, ref), [ref]);
  const inScope = pageName === (command.page?.name ?? null);
  const keywordKey = (keywords ?? []).join("\u0000");

  const select = () => {
    if (disabled) return;
    const value = command.store.records.get(id)?.value ?? valueProp ?? "";
    if (toPage) {
      command.pushPage({ name: toPage, label: value });
      return;
    }
    onSelect?.(value);
    if (menu?.closeOnSelect && !keepOpen) menu.close();
  };
  const selectRef = useLatestRef(select);

  const { store } = command;
  useIsomorphicLayoutEffect(() => {
    if (!inScope) return;
    const el = elRef.current;
    store.set({
      id,
      value: valueProp ?? labelRef.current?.textContent?.trim() ?? "",
      keywords: keywordKey ? keywordKey.split("\u0000") : [],
      disabled,
      groupId,
      el,
      select: () => selectRef.current(),
    });
    return () => store.remove(id);
  }, [store, id, inScope, valueProp, keywordKey, disabled, groupId, selectRef]);

  if (!inScope) return null;
  const registered = store.records.has(id);
  const score = command.scores.get(id) ?? 1;
  const hidden = registered && score === 0;
  const isActive = command.activeId === id;
  const keys = shortcut ? shortcut.split(" ").filter(Boolean) : [];

  return (
    <div
      ref={mergedRef}
      id={id}
      role="option"
      aria-selected={isActive}
      aria-disabled={disabled || undefined}
      hidden={hidden}
      data-active={isActive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-pui-command-item=""
      {...props}
      onPointerMove={() => {
        if (!isActive && !disabled) command.setActiveId(id);
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={select}
      style={command.sorting ? { order: command.order.get(id) ?? 0, ...style } : style}
      className={cn(
        blockReset,
        "relative flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-pui-md px-2.5 py-2 text-sm text-pui-surface-foreground",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        className,
      )}
    >
      {isActive ? (
        <motion.span
          aria-hidden="true"
          layoutId={command.reduced ? undefined : `${command.rootId}-highlight`}
          transition={springs.snappy}
          className={cn(blockReset, "absolute inset-0 rounded-pui-md bg-pui-muted")}
        />
      ) : null}
      <span ref={labelRef} className={cn(blockReset, "relative flex min-w-0 flex-1 items-center gap-3")}>
        {children}
      </span>
      {keys.length > 0 ? (
        <span className={cn(blockReset, "relative ms-auto flex shrink-0 items-center gap-1")} aria-hidden="true">
          {keys.map((key, index) => (
            <Kbd key={`${key}-${index}`}>{key}</Kbd>
          ))}
        </span>
      ) : null}
      {toPage ? <ChevronRightIcon aria-hidden="true" className="relative size-4 shrink-0 text-pui-muted-foreground" /> : null}
    </div>
  );
});

/** Shown when a search matches nothing. */
export const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(function CommandEmpty(
  { className, children = "No results found.", ...props },
  ref,
) {
  const command = useCommandContext("CommandEmpty");
  const show = command.search.trim() !== "" && command.visibleCount === 0;
  return (
    <div
      ref={ref}
      role="status"
      {...props}
      className={cn(blockReset, show ? "py-10 text-center text-sm text-pui-muted-foreground" : "sr-only", className)}
    >
      {show ? children : null}
    </div>
  );
});

/** A rule between groups; hidden while searching unless `alwaysRender`. */
export const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(function CommandSeparator(
  { alwaysRender = false, className, ...props },
  ref,
) {
  const command = useCommandContext("CommandSeparator");
  const pageName = React.useContext(PageContext);
  if (pageName !== (command.page?.name ?? null)) return null;
  if (!alwaysRender && command.search.trim() !== "") return null;
  return <div ref={ref} role="separator" {...props} className={cn(blockReset, "-mx-2 my-1 h-px bg-pui-border", className)} />;
});

/** Items shown only while this nested page is open (opened by an item's `toPage`). */
export function CommandPage({ name, children }: CommandPageProps) {
  return <PageContext.Provider value={name}>{children}</PageContext.Provider>;
}

/** Splits "mod+shift+k" and checks a keyboard event against it. */
function matchesHotkey(event: KeyboardEvent, hotkey: string, apple: boolean): boolean {
  const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  const wantMeta = mods.has("meta") || mods.has("cmd") || (mods.has("mod") && apple);
  const wantCtrl = mods.has("ctrl") || (mods.has("mod") && !apple);
  return (
    event.key.toLowerCase() === key &&
    event.metaKey === wantMeta &&
    event.ctrlKey === wantCtrl &&
    event.shiftKey === mods.has("shift") &&
    event.altKey === (mods.has("alt") || mods.has("option"))
  );
}

/**
 * ⌘K command palette: Command inside a dialog with a global shortcut. The search and pages reset
 * every time it opens; Escape backs out of a nested page first, then closes.
 */
export const CommandMenu = React.forwardRef<HTMLDivElement, CommandMenuProps>(function CommandMenu(
  {
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    hotkey = "mod+k",
    closeOnSelect = true,
    contentClassName,
    dialogLabel = "Command menu",
    className,
    ...commandProps
  },
  ref,
) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const reduced = usePrefersReducedMotion();
  const toggleRef = useLatestRef(() => setOpen(!open));

  React.useEffect(() => {
    if (!hotkey) return;
    const apple = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !matchesHotkey(event, hotkey, apple)) return;
      event.preventDefault();
      toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, toggleRef]);

  const menu = React.useMemo(() => ({ close: () => setOpen(false), closeOnSelect }), [setOpen, closeOnSelect]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-label={dialogLabel}
        size="lg"
        showClose={false}
        className={cn(
          "mb-auto mt-[12vh] flex flex-col gap-0 overflow-hidden p-0",
          !reduced && "origin-top",
          contentClassName,
        )}
      >
        <MenuContext.Provider value={menu}>
          <Command ref={ref} {...commandProps} className={cn("rounded-[inherit]", className)} />
        </MenuContext.Provider>
      </DialogContent>
    </Dialog>
  );
});
