import { Toggle, ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from "changelui";
import { motion } from "motion/react";
import { useState } from "react";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BellIcon,
  BellOffIcon,
  BoardIcon,
  BoldIcon,
  BookmarkIcon,
  EyeIcon,
  GridIcon,
  ItalicIcon,
  ListIcon,
  StarGlyph,
  StrikeIcon,
  UnderlineIcon,
} from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  type: "single" | "multiple";
  variant: "soft" | "outline" | "ghost";
  size: "sm" | "md" | "lg";
  orientation: "horizontal" | "vertical";
  labels: boolean;
  fullWidth: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  type: "single",
  variant: "soft",
  size: "md",
  orientation: "horizontal",
  labels: false,
  fullWidth: false,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "type", label: "Type", options: ["single", "multiple"] },
  { type: "select", prop: "variant", label: "Variant", options: ["soft", "outline", "ghost"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
  { type: "boolean", prop: "labels", label: "Text labels" },
  { type: "boolean", prop: "fullWidth", label: "Full width" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const align = [
  { value: "left", label: "Left", icon: <AlignLeftIcon /> },
  { value: "center", label: "Center", icon: <AlignCenterIcon /> },
  { value: "right", label: "Right", icon: <AlignRightIcon /> },
  { value: "justify", label: "Justify", icon: <AlignJustifyIcon /> },
];
const formats = [
  { value: "bold", label: "Bold", icon: <BoldIcon /> },
  { value: "italic", label: "Italic", icon: <ItalicIcon /> },
  { value: "underline", label: "Underline", icon: <UnderlineIcon /> },
  { value: "strike", label: "Strikethrough", icon: <StrikeIcon /> },
];

function Preview({ props }: { props: DemoProps }) {
  const [single, setSingle] = useState<string | null>("left");
  const [multiple, setMultiple] = useState<string[]>(["bold"]);
  const items = props.type === "single" ? align : formats;
  const shared = {
    variant: props.variant,
    size: props.size,
    orientation: props.orientation,
    fullWidth: props.fullWidth,
    disabled: props.disabled,
    "aria-label": props.type === "single" ? "Text alignment" : "Text formatting",
  } as const;
  const children = items.map((item) => (
    <ToggleGroupItem key={item.value} value={item.value} icon={item.icon} aria-label={props.labels ? undefined : item.label}>
      {props.labels ? item.label : null}
    </ToggleGroupItem>
  ));
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {props.type === "single" ? (
        <ToggleGroup key="single" {...shared} value={single} onValueChange={setSingle}>
          {children}
        </ToggleGroup>
      ) : (
        <ToggleGroup key="multiple" {...shared} type="multiple" value={multiple} onValueChange={setMultiple}>
          {children}
        </ToggleGroup>
      )}
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: {props.type === "single" ? (single ?? "null") : `[${multiple.join(", ")}]`}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex flex-col items-center gap-2">
      <ToggleGroup aria-label="Align" defaultValue="center" size="sm">
        {align.slice(0, 3).map((a) => (
          <ToggleGroupItem key={a.value} value={a.value} icon={a.icon} aria-label={a.label} tabIndex={-1} />
        ))}
      </ToggleGroup>
      <ToggleGroup aria-label="Format" type="multiple" defaultValue={["bold", "italic"]} variant="outline" size="sm">
        {formats.slice(0, 3).map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} icon={f.icon} aria-label={f.label} tabIndex={-1} />
        ))}
      </ToggleGroup>
    </div>
  );
}

/** A mini editor: alignment (single), formatting (multiple) and standalone toggles drive the text. */
function EditorDemo() {
  const [alignment, setAlignment] = useState<string | null>("left");
  const [marks, setMarks] = useState<string[]>(["bold"]);
  const [saved, setSaved] = useState(false);
  const [watching, setWatching] = useState(true);
  const textAlign = (alignment ?? "left") as React.CSSProperties["textAlign"];
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-2 border-b border-pui-border bg-pui-muted/40 p-2">
        <ToggleGroup type="multiple" aria-label="Text formatting" variant="ghost" size="sm" value={marks} onValueChange={setMarks}>
          {formats.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} icon={f.icon} aria-label={f.label} />
          ))}
        </ToggleGroup>
        <span aria-hidden="true" className="h-5 w-px bg-pui-border" />
        <ToggleGroup aria-label="Text alignment" variant="ghost" size="sm" value={alignment} onValueChange={setAlignment} allowEmpty={false}>
          {align.map((a) => (
            <ToggleGroupItem key={a.value} value={a.value} icon={a.icon} aria-label={a.label} />
          ))}
        </ToggleGroup>
        <span className="ms-auto flex items-center gap-1">
          <Toggle size="sm" variant="ghost" aria-label="Save to reading list" pressed={saved} onPressedChange={setSaved} icon={<BookmarkIcon />} pressedIcon={<BookmarkIcon filled className="size-4 text-pui-primary" />} />
          <Toggle size="sm" variant="ghost" aria-label="Notifications" pressed={watching} onPressedChange={setWatching} icon={<BellOffIcon />} pressedIcon={<BellIcon />} />
        </span>
      </div>
      <motion.p
        layout
        className="m-0 p-5 text-sm leading-relaxed"
        style={{
          textAlign,
          fontWeight: marks.includes("bold") ? 600 : 400,
          fontStyle: marks.includes("italic") ? "italic" : "normal",
          textDecorationLine: [marks.includes("underline") && "underline", marks.includes("strike") && "line-through"].filter(Boolean).join(" ") || "none",
        }}
      >
        Toggle groups keep one tab stop: arrow keys move between buttons, Space or Enter presses them. Single groups slide one pill;
        multiple groups fade each pressed background.
      </motion.p>
      <p className="m-0 border-t border-pui-border px-5 py-2 text-xs text-pui-muted-foreground" aria-live="polite">
        {saved ? "Saved to your reading list" : "Not saved"} · {watching ? "Watching for replies" : "Muted"}
      </p>
    </div>
  );
}

const tiles = [
  { title: "Onboarding flow", tag: "Design", progress: 72 },
  { title: "Billing v2", tag: "Engineering", progress: 40 },
  { title: "Launch post", tag: "Marketing", progress: 90 },
  { title: "Usage alerts", tag: "Engineering", progress: 15 },
  { title: "Help center", tag: "Support", progress: 55 },
  { title: "Theme presets", tag: "Design", progress: 100 },
];

/** View switcher with labels; the cards re-flow between grid, list and board on a layout spring. */
function ViewDemo() {
  const [view, setView] = useState<string | null>("grid");
  const layout = view === "list" ? "flex flex-col gap-2" : view === "board" ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3";
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-pui-foreground">Projects</span>
        <ToggleGroup aria-label="View" variant="outline" size="sm" value={view} onValueChange={setView} allowEmpty={false}>
          <ToggleGroupItem value="grid" icon={<GridIcon />}>
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="list" icon={<ListIcon />}>
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="board" icon={<BoardIcon />}>
            Board
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className={layout}>
        {tiles.map((tile) => (
          <motion.div
            layout
            key={tile.title}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="flex flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground"
          >
            <motion.span layout="position" className="text-sm font-medium">
              {tile.title}
            </motion.span>
            <motion.span layout="position" className="text-xs text-pui-muted-foreground">
              {tile.tag}
            </motion.span>
            <span className="h-1 overflow-hidden rounded-full bg-pui-muted">
              <span className="block h-full rounded-full bg-pui-primary" style={{ width: `${tile.progress}%` }} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const pulls = [
  { title: "Select: typeahead across groups", state: "open", starred: true },
  { title: "Fix toast swipe on Safari", state: "review", starred: false },
  { title: "Charts: brush zoom", state: "merged", starred: true },
  { title: "Docs: theming guide", state: "open", starred: false },
  { title: "Drop legacy tooltip API", state: "closed", starred: false },
  { title: "Calendar RTL", state: "review", starred: true },
];

/** Filter chips: a multiple group with counts plus a standalone starred toggle. */
function FilterDemo() {
  const [states, setStates] = useState<string[]>(["open", "review"]);
  const [starred, setStarred] = useState(false);
  const shown = pulls.filter((p) => (states.length === 0 || states.includes(p.state)) && (!starred || p.starred));
  const count = (state: string) => pulls.filter((p) => p.state === state).length;
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="multiple" aria-label="Pull request state" variant="outline" size="sm" value={states} onValueChange={setStates}>
          {["open", "review", "merged", "closed"].map((state) => (
            <ToggleGroupItem key={state} value={state} className="capitalize">
              {state}
              <span className="rounded-pui-full bg-pui-muted px-1.5 text-[10px] tabular-nums text-pui-muted-foreground">{count(state)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Toggle size="sm" variant="outline" pressed={starred} onPressedChange={setStarred} icon={<StarGlyph />} pressedIcon={<StarGlyph filled className="size-3.5 text-pui-warning" />}>
          Starred
        </Toggle>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-live="polite">
        {shown.map((p) => (
          <li key={p.title} className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 text-sm text-pui-surface-foreground">
            <EyeIcon className="size-3.5 shrink-0 text-pui-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            <span className="text-xs capitalize text-pui-muted-foreground">{p.state}</span>
          </li>
        ))}
        {shown.length === 0 ? <li className="py-4 text-center text-sm text-pui-muted-foreground">Nothing matches these filters.</li> : null}
      </ul>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs: string[] = [];
    if (props.type === "multiple") attrs.push('type="multiple"');
    attrs.push(`aria-label="${props.type === "single" ? "Text alignment" : "Text formatting"}"`, "value={value}", "onValueChange={setValue}");
    if (props.variant !== "soft") attrs.push(`variant="${props.variant}"`);
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.orientation !== "horizontal") attrs.push(`orientation="${props.orientation}"`);
    if (props.fullWidth) attrs.push("fullWidth");
    if (props.disabled) attrs.push("disabled");
    const list = props.type === "single" ? align : formats;
    const items = list
      .map((i) =>
        props.labels
          ? `<ToggleGroupItem value="${i.value}" icon={<${i.label.replace(/\s/g, "")}Icon />}>${i.label}</ToggleGroupItem>`
          : `<ToggleGroupItem value="${i.value}" icon={<${i.label.replace(/\s/g, "")}Icon />} aria-label="${i.label}" />`,
      )
      .join("\n  ");
    const state = props.type === "single" ? 'useState<string | null>("left")' : 'useState<string[]>(["bold"])';
    return `const [value, setValue] = ${state};

<ToggleGroup ${attrs.join(" ")}>
  ${items}
</ToggleGroup>

// Standalone
<Toggle aria-label="Bookmark" icon={<BookmarkIcon />} pressedIcon={<BookmarkFilledIcon />} />`;
  },
  propsTable: propDocs<ToggleGroupProps>()([
    { name: "type", type: '"single" | "multiple"', default: '"single"', description: "One pressed item (string | null) or many (string[])." },
    { name: "value", type: "string | null · string[]", description: "Pressed value(s) (defaultValue, onValueChange)." },
    { name: "allowEmpty", type: "boolean", default: "true", description: "Single: pressing the pressed item clears it." },
    { name: "variant", type: '"soft" | "outline" | "ghost"', default: '"soft"', description: "Muted track, bordered with a tinted pill, or bare." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "28 / 32 / 40 px items." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Layout and arrow-key axis." },
    { name: "fullWidth", type: "boolean", default: "false", description: "Items share the width." },
    { name: "loop", type: "boolean", default: "true", description: "Arrow keys wrap." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every item." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Enter the group (one tab stop: the pressed or first item)" },
    { keys: "Arrow keys", action: "Move focus along the orientation" },
    { keys: "Home / End", action: "First / last item" },
    { keys: "Space / Enter", action: "Press or release the focused item" },
  ],
  a11y: [
    "Each item is a button with aria-pressed; the group is role=group and needs an aria-label.",
    "Icon-only items need an aria-label; Toggle is a single aria-pressed button.",
    "Roving tabindex keeps a toolbar to one tab stop; wrap several groups in role=toolbar.",
  ],
  reducedMotion: "The single-mode pill jumps instead of sliding; backgrounds and Toggle icons swap with a short fade.",
  examples: [
    { title: "Editor toolbar", description: "Multiple + single groups and standalone Toggles with pressed icons.", Demo: EditorDemo, wide: true },
    { title: "View switcher", description: "Labelled outline group; cards re-flow on a layout spring.", Demo: ViewDemo },
    { title: "Filters", description: "Multiple outline group with counts and a starred Toggle.", Demo: FilterDemo },
  ],
};

export default item;
