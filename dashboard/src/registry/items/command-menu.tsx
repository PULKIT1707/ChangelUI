import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandMenu,
  CommandPage,
  CommandSeparator,
  Kbd,
  type CommandMenuProps,
} from "changelui";
import { useState, type ReactNode } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { loop: boolean; sort: boolean; shouldFilter: boolean; placeholder: string };

const defaults: DemoProps = { loop: true, sort: true, shouldFilter: true, placeholder: "Type a command or search…" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "loop", label: "Loop arrows" },
  { type: "boolean", prop: "sort", label: "Sort by score" },
  { type: "boolean", prop: "shouldFilter", label: "Filter" },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 60 },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-pui-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const icons = {
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  palette: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.3-1-1.4-1-2.6 0-.9.8-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
};

const people = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus Torvalds"];

/** Shared items, used inline and inside the dialog. */
function PaletteItems({ onRun }: { onRun: (what: string) => void }) {
  return (
    <>
      <CommandEmpty />
      <CommandGroup heading="Suggestions">
        <CommandItem onSelect={onRun} keywords={["schedule", "events"]}>
          <Icon>{icons.calendar}</Icon>
          Calendar
        </CommandItem>
        <CommandItem onSelect={onRun} keywords={["emoji", "reaction"]}>
          <Icon>{icons.smile}</Icon>
          Search emoji
        </CommandItem>
        <CommandItem onSelect={onRun} disabled>
          <Icon>{icons.calculator}</Icon>
          Calculator
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem onSelect={onRun} shortcut="⌘ P">
          <Icon>{icons.user}</Icon>
          Profile
        </CommandItem>
        <CommandItem onSelect={onRun} shortcut="⌘ B" keywords={["invoice", "plan", "payment"]}>
          <Icon>{icons.card}</Icon>
          Billing
        </CommandItem>
        <CommandItem onSelect={onRun} shortcut="⌘ ,">
          <Icon>{icons.gear}</Icon>
          Settings
        </CommandItem>
        <CommandItem toPage="theme" value="Change theme" keywords={["dark", "light", "appearance"]}>
          <Icon>{icons.palette}</Icon>
          Change theme…
        </CommandItem>
        <CommandItem toPage="assign" value="Assign to" keywords={["owner", "teammate"]}>
          <Icon>{icons.people}</Icon>
          Assign to…
        </CommandItem>
      </CommandGroup>
      <CommandPage name="theme">
        <CommandGroup heading="Theme">
          {["Light", "Dark", "System"].map((theme) => (
            <CommandItem key={theme} value={`${theme} theme`} onSelect={onRun}>
              {theme}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandPage>
      <CommandPage name="assign">
        <CommandGroup heading="Teammates">
          {people.map((person) => (
            <CommandItem key={person} value={person} onSelect={(value) => onRun(`Assigned to ${value}`)}>
              <span className="flex size-6 items-center justify-center rounded-pui-full bg-pui-primary/12 text-[10px] font-semibold text-pui-primary-text" aria-hidden="true">
                {person
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              {person}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandPage>
    </>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Command
        loop={props.loop}
        sort={props.sort}
        shouldFilter={props.shouldFilter}
        label="Commands"
        className="w-full max-w-md rounded-pui-xl border border-pui-border shadow-pui-lg"
      >
        <CommandInput placeholder={props.placeholder} aria-label="Search commands" />
        <CommandList>
          <PaletteItems onRun={setLast} />
        </CommandList>
      </Command>
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {last ? `Ran: ${last}` : "Arrow keys to move, Enter to run, Backspace to go back."}
      </p>
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-3">
        Open command menu
        <span className="flex gap-1" aria-hidden="true">
          <Kbd>⌘</Kbd>
          <Kbd>/</Kbd>
        </span>
      </Button>
      <CommandMenu open={open} onOpenChange={setOpen} hotkey="mod+/" label="Commands">
        <CommandInput aria-label="Search commands" />
        <CommandList>
          <PaletteItems onRun={setLast} />
        </CommandList>
        <div className="flex items-center gap-4 border-t border-pui-border px-4 py-2 text-xs text-pui-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> run
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> back / close
          </span>
        </div>
      </CommandMenu>
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground" aria-live="polite">
        {last ? `Ran: ${last}` : "Ctrl+/ on Windows and Linux."}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="w-40 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface shadow-pui-md">
      <div className="flex items-center gap-1.5 border-b border-pui-border px-2 py-1.5 text-[10px] text-pui-muted-foreground">
        <span className="size-2 rounded-pui-full border border-current" />
        Search…
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {["Calendar", "Profile", "Billing"].map((label, i) => (
          <div key={label} className={`flex items-center justify-between rounded-pui-sm px-1.5 py-1 text-[10px] ${i === 1 ? "bg-pui-muted text-pui-foreground" : "text-pui-muted-foreground"}`}>
            {label}
            {i > 0 ? <span className="rounded-pui-sm border border-pui-border px-1 text-[8px]">⌘{label[0]}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ loop, sort, shouldFilter, placeholder }) => {
    const rootProps = [loop ? "" : "loop={false}", sort ? "" : "sort={false}", shouldFilter ? "" : "shouldFilter={false}"].filter(Boolean).join(" ");
    return [
      "const [open, setOpen] = useState(false);",
      "",
      `<CommandMenu open={open} onOpenChange={setOpen} hotkey="mod+k"${rootProps ? ` ${rootProps}` : ""}>`,
      `  <CommandInput${placeholder !== defaults.placeholder ? ` placeholder="${placeholder}"` : ""} />`,
      "  <CommandList>",
      "    <CommandEmpty />",
      '    <CommandGroup heading="Settings">',
      '      <CommandItem shortcut="⌘ P" onSelect={openProfile}>Profile</CommandItem>',
      '      <CommandItem toPage="theme">Change theme…</CommandItem>',
      "    </CommandGroup>",
      '    <CommandPage name="theme">',
      '      <CommandItem onSelect={() => setTheme("dark")}>Dark</CommandItem>',
      "    </CommandPage>",
      "  </CommandList>",
      "</CommandMenu>",
    ].join("\n");
  },
  propsTable: propDocs<CommandMenuProps>()([
    { name: "open", type: "boolean", description: "CommandMenu: controlled dialog state (defaultOpen, onOpenChange)." },
    { name: "hotkey", type: "string | null", default: '"mod+k"', description: "Global toggle; mod is ⌘ on Apple, Ctrl elsewhere." },
    { name: "closeOnSelect", type: "boolean", default: "true", description: "Close after an item runs (CommandItem keepOpen opts out)." },
    { name: "search", type: "string", description: "Controlled search text (defaultSearch, onSearchChange)." },
    { name: "filter", type: "(value, search, keywords) => number", description: "Custom score; 0 hides the item." },
    { name: "shouldFilter", type: "boolean", default: "true", description: "false shows items as given (async results)." },
    { name: "sort", type: "boolean", default: "true", description: "Order matches and groups by score while searching." },
    { name: "loop", type: "boolean", default: "true", description: "Arrow keys wrap around." },
    { name: "label", type: "string", default: '"Commands"', description: "Accessible name of the results list." },
    { name: "dialogLabel", type: "string", default: '"Command menu"', description: "Accessible name of the dialog." },
  ]).concat([
    { name: "CommandItem value", type: "string", description: "Search text; defaults to the item's text content." },
    { name: "CommandItem keywords", type: "string[]", description: "Extra search terms." },
    { name: "CommandItem onSelect", type: "(value: string) => void", description: "Runs on Enter or click." },
    { name: "CommandItem shortcut", type: "string", description: 'Key hint, space separated: "⌘ P".' },
    { name: "CommandItem toPage", type: "string", description: "Opens the CommandPage with this name." },
    { name: "CommandGroup heading", type: "ReactNode", description: "Group label; hidden when nothing matches." },
    { name: "CommandPage name", type: "string", description: "Nested page shown after an item's toPage." },
    { name: "useCommand()", type: "{ search, setSearch, page, pushPage, popPage }", description: "Drive search and pages from your own code." },
  ]),
  keyboard: [
    { keys: "⌘K / Ctrl+K", action: "Toggle CommandMenu (configurable)" },
    { keys: "ArrowDown / ArrowUp (Ctrl+N / Ctrl+P)", action: "Move the active option" },
    { keys: "Ctrl+Home / Ctrl+End", action: "First / last option" },
    { keys: "Enter", action: "Run the active option or open its page" },
    { keys: "Backspace (empty) / Escape", action: "Back out of a nested page" },
    { keys: "Escape", action: "Close the menu on the root page" },
  ],
  a11y: [
    "Combobox + listbox pattern: focus stays in the input and aria-activedescendant tracks the active option.",
    "Groups are role=group labelled by their heading; disabled options are aria-disabled and skipped.",
    "The empty state is a status region, so “No results” is announced.",
  ],
  reducedMotion: "The highlight jumps instead of sliding; page changes only fade.",
  examples: [{ title: "⌘K dialog", description: "CommandMenu with its own hotkey (⌘/ here, since this site already uses ⌘K) and a footer.", Demo: DialogDemo }],
};

export default item;
