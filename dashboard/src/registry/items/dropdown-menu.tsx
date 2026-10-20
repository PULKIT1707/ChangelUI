import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuRadioGroupProps,
  type DropdownMenuSubContentProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<DropdownMenuContentProps["side"]>;
  align: NonNullable<DropdownMenuContentProps["align"]>;
  loop: boolean;
  openOnLoad: boolean;
};

const defaults: DemoProps = { side: "bottom", align: "start", loop: true, openOnLoad: false };

function Preview({ props }: { props: DemoProps }) {
  const { openOnLoad, ...content } = props;
  // key: toggling "Open on load" remounts the root so defaultOpen applies at once.
  return (
    <DropdownMenu key={String(openOnLoad)} defaultOpen={openOnLoad}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" tone="neutral">
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent {...content}>
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem shortcut="⌘P">Profile</DropdownMenuItem>
          <DropdownMenuItem shortcut="⌘,">Settings</DropdownMenuItem>
          <DropdownMenuItem disabled>Billing</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Slack</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup defaultValue="date" aria-label="Sort by">
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem defaultChecked>Email updates</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger">Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const miniRow = "flex h-6 items-center justify-between rounded-pui-sm px-2 text-[11px]";

function Mini() {
  // Static picture of an open menu; a real one would portal out of the bento card.
  return (
    <div aria-hidden="true" className="flex flex-col items-start">
      <Button size="sm" variant="outline" tone="neutral" tabIndex={-1}>
        Options
      </Button>
      <div className="mt-1.5 w-40 rounded-pui-lg border border-pui-border bg-pui-surface p-1 text-pui-surface-foreground shadow-pui-lg">
        <div className={`${miniRow} bg-pui-muted`}>
          Profile <span className="text-pui-muted-foreground">⌘P</span>
        </div>
        <div className={miniRow}>
          Settings <span className="text-pui-muted-foreground">⌘,</span>
        </div>
        <div className={miniRow}>Share ›</div>
        <div className="my-1 h-px bg-pui-border" />
        <div className={`${miniRow} text-pui-danger-text`}>Sign out</div>
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "side", label: "Side", options: ["top", "right", "bottom", "left"] },
    { type: "select", prop: "align", label: "Align", options: ["start", "center", "end"] },
    { type: "boolean", prop: "loop", label: "Loop" },
    { type: "boolean", prop: "openOnLoad", label: "Open on load" },
  ],
  snippet: ({ openOnLoad, ...props }) =>
    [
      openOnLoad ? "<DropdownMenu defaultOpen>" : "<DropdownMenu>",
      "  <DropdownMenuTrigger asChild>",
      "    <Button>Options</Button>",
      "  </DropdownMenuTrigger>",
      toJsx<Record<string, unknown>>(
        "DropdownMenuContent",
        props,
        { side: "bottom", align: "start", loop: true },
        [
          '<DropdownMenuItem shortcut="⌘P">Profile</DropdownMenuItem>',
          "<DropdownMenuSub>",
          "  <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>",
          "  <DropdownMenuSubContent>",
          "    <DropdownMenuItem>Copy link</DropdownMenuItem>",
          "  </DropdownMenuSubContent>",
          "</DropdownMenuSub>",
          '<DropdownMenuRadioGroup value={sort} onValueChange={setSort} aria-label="Sort by">',
          '  <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>',
          '  <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>',
          "</DropdownMenuRadioGroup>",
          "<DropdownMenuCheckboxItem defaultChecked>Email updates</DropdownMenuCheckboxItem>",
          "<DropdownMenuSeparator />",
          '<DropdownMenuItem tone="danger">Sign out</DropdownMenuItem>',
        ].join("\n"),
      )
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      "</DropdownMenu>",
    ].join("\n"),
  propsTable: propDocs<
    DropdownMenuContentProps & DropdownMenuItemProps & DropdownMenuRadioGroupProps & DropdownMenuSubContentProps
  >()([
    { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', description: "Content: preferred side." },
    { name: "align", type: '"start" | "center" | "end"', default: '"start"', description: "Content: cross-axis alignment." },
    { name: "sideOffset", type: "number", default: "6", description: "Content: gap to the trigger in px." },
    { name: "loop", type: "boolean", default: "true", description: "Content: wrap arrow navigation." },
    { name: "onSelect", type: "(event: Event) => void", description: "Item: called on activation; preventDefault() keeps the menu open." },
    { name: "disabled", type: "boolean", default: "false", description: "Item: skipped by keyboard and typeahead." },
    { name: "icon", type: "ReactNode", description: "Item: leading icon." },
    { name: "shortcut", type: "string", description: "Item: shortcut hint." },
    { name: "tone", type: '"neutral" | "danger"', default: '"neutral"', description: "Item: color." },
    { name: "asChild", type: "boolean", default: "false", description: "Item: render the child (e.g. a link) as the item." },
    { name: "value", type: "string", description: "RadioGroup: controlled value. RadioItem: the item's value (required)." },
    { name: "defaultValue", type: "string", description: "RadioGroup: uncontrolled initial value." },
    { name: "onValueChange", type: "(value: string) => void", description: "RadioGroup: called when a radio item is chosen." },
    {
      name: "alignOffset",
      type: "number",
      default: "-5",
      description: "SubContent: shift along the trigger so the first item lines up (sideOffset defaults to -4).",
    },
  ]),
  keyboard: [
    { keys: "Enter / Space / Down", action: "Open from the trigger and focus the first item" },
    { keys: "Up", action: "Open from the trigger and focus the last item" },
    { keys: "Up / Down / Home / End", action: "Move between items" },
    { keys: "Letters", action: "Typeahead to an item" },
    { keys: "Right / Enter / Space", action: "On a SubTrigger: open the submenu and focus its first item" },
    { keys: "Left", action: "In a submenu: close it and return to its SubTrigger" },
    { keys: "Escape / Tab", action: "Close and return focus to the trigger" },
  ],
  a11y: [
    "role=menu labelled by the trigger; items are menuitem, menuitemcheckbox or menuitemradio (aria-checked).",
    "SubTriggers carry aria-haspopup=menu and aria-expanded; the submenu is a role=menu labelled by its trigger.",
    "Moving the pointer diagonally toward an open submenu keeps it open (safe triangle); Escape closes only the submenu.",
    "The trigger stays the only tab stop; focus moves between items.",
  ],
  reducedMotion: "The highlight jumps and the menu fades without scaling.",
};

export default item;
