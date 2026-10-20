import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  type ContextMenuContentProps,
  type ContextMenuProps,
} from "changelui";
import { motion } from "motion/react";
import { useState } from "react";
import {
  ArchiveIcon,
  CopyGlyph,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  LayersIcon,
  LinkIcon,
  PencilIcon,
  RefreshIcon,
  ScissorsIcon,
  SendIcon,
  StarGlyph,
  TrashIcon,
} from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  longPressMs: number;
  loop: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { longPressMs: 500, loop: true, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "longPressMs", label: "Long press (ms)", min: 200, max: 1000, step: 50 },
  { type: "boolean", prop: "loop", label: "Loop" },
  { type: "boolean", prop: "disabled", label: "Disabled (native menu)" },
];

function Preview({ props }: { props: DemoProps }) {
  const [bookmarks, setBookmarks] = useState(true);
  const [urls, setUrls] = useState(false);
  const [zoom, setZoom] = useState("100");
  const [last, setLast] = useState<string | null>(null);
  return (
    <ContextMenu disabled={props.disabled} longPressMs={props.longPressMs}>
      <ContextMenuTrigger
        tabIndex={0}
        aria-label="Canvas. Right-click, long-press or press Shift+F10 for actions."
        className="flex h-52 w-full max-w-md select-none flex-col items-center justify-center gap-2 rounded-pui-xl border-2 border-dashed border-pui-border bg-pui-muted/30 text-sm text-pui-muted-foreground outline-none transition-colors focus-visible:border-pui-ring data-[state=open]:border-pui-primary/60 data-[state=open]:bg-pui-primary/5"
      >
        <span className="font-medium text-pui-foreground">Right-click anywhere in here</span>
        <span className="text-xs">Long-press on touch · Shift+F10 on the keyboard</span>
        <span className="mt-2 font-mono text-[11px]" aria-live="polite">
          {last ? `ran: ${last}` : `zoom ${zoom}% · bookmarks ${bookmarks ? "on" : "off"}`}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent loop={props.loop} label="Canvas actions" className="w-56">
        <ContextMenuItem shortcut="⌘[" onSelect={() => setLast("Back")}>
          Back
        </ContextMenuItem>
        <ContextMenuItem shortcut="⌘]" disabled>
          Forward
        </ContextMenuItem>
        <ContextMenuItem shortcut="⌘R" icon={<RefreshIcon />} onSelect={() => setLast("Reload")}>
          Reload
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger icon={<LayersIcon />}>More tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem shortcut="⇧⌘S" onSelect={() => setLast("Save page as")}>
              Save page as…
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => setLast("Create shortcut")}>Create shortcut…</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => setLast("Developer tools")}>Developer tools</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks} shortcut="⇧⌘B">
          Show bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={urls} onCheckedChange={setUrls}>
          Show full URLs
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Zoom</ContextMenuLabel>
        <ContextMenuRadioGroup value={zoom} onValueChange={setZoom} aria-label="Zoom">
          <ContextMenuRadioItem value="75">75%</ContextMenuRadioItem>
          <ContextMenuRadioItem value="100">100%</ContextMenuRadioItem>
          <ContextMenuRadioItem value="125">125%</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-28 w-48 rounded-pui-lg border border-dashed border-pui-border bg-pui-muted/30">
      <div className="absolute left-10 top-6 flex w-28 flex-col gap-1 rounded-pui-md border border-pui-border bg-pui-surface p-1 shadow-pui-lg">
        <div className="h-4 rounded-pui-sm bg-pui-muted px-1.5 text-[9px] leading-4 text-pui-foreground">Copy</div>
        <div className="h-4 px-1.5 text-[9px] leading-4 text-pui-muted-foreground">Paste</div>
        <div className="h-px bg-pui-border" />
        <div className="h-4 px-1.5 text-[9px] leading-4 text-pui-danger-text">Delete</div>
      </div>
      <svg viewBox="0 0 16 16" className="absolute left-8 top-4 size-3.5 text-pui-foreground" fill="currentColor">
        <path d="M2 1l11 6-5 1.5L6 14z" />
      </svg>
    </div>
  );
}

type FileEntry = { id: string; name: string; kind: "folder" | "image" | "doc"; starred: boolean };
const initialFiles: FileEntry[] = [
  { id: "f1", name: "Brand assets", kind: "folder", starred: false },
  { id: "f2", name: "hero-final.png", kind: "image", starred: true },
  { id: "f3", name: "Roadmap.md", kind: "doc", starred: false },
  { id: "f4", name: "Screenshots", kind: "folder", starred: false },
  { id: "f5", name: "avatar@2x.png", kind: "image", starred: false },
  { id: "f6", name: "Changelog.md", kind: "doc", starred: false },
];

/** A file grid: one ContextMenu, the right-clicked tile becomes the target. */
function FileManagerDemo() {
  const [files, setFiles] = useState(initialFiles);
  const [target, setTarget] = useState<string | null>(null);
  const [status, setStatus] = useState("Right-click a file");
  const current = files.find((f) => f.id === target);
  const update = (fn: (f: FileEntry) => FileEntry | null) => {
    setFiles((list) => list.flatMap((f) => (f.id === target ? (fn(f) ?? []) : [f])));
  };
  return (
    <ContextMenu onOpenChange={(open) => !open && setTimeout(() => setTarget(null), 150)}>
      <ContextMenuTrigger className="flex w-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-3">
        <div className="grid grid-cols-3 gap-2">
          {files.map((file) => {
            const Icon = file.kind === "folder" ? FolderIcon : file.kind === "image" ? ImageIcon : FileIcon;
            return (
              <motion.button
                layout
                key={file.id}
                type="button"
                onContextMenu={() => setTarget(file.id)}
                onKeyDown={(e) => {
                  if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) setTarget(file.id);
                }}
                onFocus={() => setTarget(file.id)}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className={`relative flex cursor-default flex-col items-center gap-1.5 rounded-pui-lg border p-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-pui-ring ${
                  target === file.id ? "border-pui-primary/50 bg-pui-primary/8 text-pui-foreground" : "border-transparent text-pui-muted-foreground hover:bg-pui-muted/50"
                }`}
              >
                <Icon filled={file.kind === "folder"} className={`size-7 ${file.kind === "folder" ? "text-pui-primary" : ""}`} />
                <span className="w-full truncate text-center">{file.name}</span>
                {file.starred ? <StarGlyph filled className="absolute right-1.5 top-1.5 size-3 text-pui-warning" /> : null}
              </motion.button>
            );
          })}
        </div>
        <p className="m-0 border-t border-pui-border pt-2 text-xs text-pui-muted-foreground" aria-live="polite">
          {status}
        </p>
      </ContextMenuTrigger>
      <ContextMenuContent label={current ? `${current.name} actions` : "File actions"} className="w-52">
        <ContextMenuLabel className="truncate">{current?.name ?? "Files"}</ContextMenuLabel>
        <ContextMenuItem icon={<FileIcon />} shortcut="↵" onSelect={() => setStatus(`Opened ${current?.name}`)}>
          Open
        </ContextMenuItem>
        <ContextMenuItem
          icon={<PencilIcon />}
          shortcut="F2"
          onSelect={() => {
            update((f) => ({ ...f, name: f.name.replace(/(\.\w+)?$/, (ext) => ` (renamed)${ext}`) }));
            setStatus("Renamed");
          }}
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          icon={<StarGlyph />}
          onSelect={() => {
            update((f) => ({ ...f, starred: !f.starred }));
            setStatus(current?.starred ? "Removed star" : "Starred");
          }}
        >
          {current?.starred ? "Unstar" : "Star"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger icon={<SendIcon />}>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem icon={<LinkIcon />} onSelect={() => setStatus("Link copied")}>
              Copy link
            </ContextMenuItem>
            <ContextMenuItem icon={<DownloadIcon />} onSelect={() => setStatus(`Downloading ${current?.name}`)}>
              Download
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem icon={<ArchiveIcon />} onSelect={() => setStatus("Archived")}>
          Archive
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          tone="danger"
          icon={<TrashIcon />}
          shortcut="⌫"
          onSelect={() => {
            setStatus(`Moved ${current?.name} to Trash`);
            update(() => null);
          }}
        >
          Move to Trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const swatches = [
  { value: "var(--pui-chart-1)", label: "Indigo" },
  { value: "var(--pui-chart-2)", label: "Teal" },
  { value: "var(--pui-chart-3)", label: "Amber" },
  { value: "var(--pui-chart-4)", label: "Rose" },
];

type Shape = { id: string; label: string; x: number; y: number; color: string; round: boolean };

/** A design canvas: z-order and fill change from the menu of the shape under the pointer. */
function CanvasDemo() {
  const [shapes, setShapes] = useState<Shape[]>([
    { id: "a", label: "Card", x: 18, y: 22, color: swatches[0]?.value ?? "", round: false },
    { id: "b", label: "Badge", x: 42, y: 38, color: swatches[1]?.value ?? "", round: true },
    { id: "c", label: "Note", x: 64, y: 18, color: swatches[2]?.value ?? "", round: false },
  ]);
  const [target, setTarget] = useState<string>("a");
  const shape = shapes.find((s) => s.id === target);
  const reorder = (to: "front" | "back") =>
    setShapes((list) => {
      const picked = list.find((s) => s.id === target);
      if (!picked) return list;
      const rest = list.filter((s) => s.id !== target);
      return to === "front" ? [...rest, picked] : [picked, ...rest];
    });
  const patch = (next: Partial<Shape>) => setShapes((list) => list.map((s) => (s.id === target ? { ...s, ...next } : s)));
  return (
    <ContextMenu>
      <ContextMenuTrigger className="relative h-56 w-full overflow-hidden rounded-pui-xl border border-pui-border bg-[radial-gradient(var(--pui-border)_1px,transparent_1px)] bg-size-[16px_16px]">
        {shapes.map((s, i) => (
          <motion.button
            key={s.id}
            type="button"
            aria-label={`${s.label} shape`}
            onContextMenu={() => setTarget(s.id)}
            onFocus={() => setTarget(s.id)}
            layout
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: i + 1, backgroundColor: s.color }}
            className={`absolute flex size-24 cursor-default items-end p-2 text-xs font-medium text-white shadow-pui-lg outline-none focus-visible:ring-2 focus-visible:ring-pui-ring focus-visible:ring-offset-2 ${
              s.round ? "rounded-full" : "rounded-pui-lg"
            } ${target === s.id ? "ring-2 ring-pui-foreground/70 ring-offset-2 ring-offset-pui-background" : ""}`}
          >
            {s.label}
          </motion.button>
        ))}
      </ContextMenuTrigger>
      <ContextMenuContent label={`${shape?.label ?? "Shape"} actions`} className="w-52">
        <ContextMenuLabel>{shape?.label}</ContextMenuLabel>
        <ContextMenuItem icon={<CopyGlyph />} shortcut="⌘C">
          Copy
        </ContextMenuItem>
        <ContextMenuItem icon={<ScissorsIcon />} shortcut="⌘X">
          Cut
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem shortcut="⌘]" onSelect={() => reorder("front")}>
          Bring to front
        </ContextMenuItem>
        <ContextMenuItem shortcut="⌘[" onSelect={() => reorder("back")}>
          Send to back
        </ContextMenuItem>
        <ContextMenuCheckboxItem checked={shape?.round ?? false} onCheckedChange={(round) => patch({ round })}>
          Rounded
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Fill</ContextMenuLabel>
        <ContextMenuRadioGroup value={shape?.color} onValueChange={(color) => patch({ color })} aria-label="Fill">
          {swatches.map((sw) => (
            <ContextMenuRadioItem key={sw.value} value={sw.value} icon={<span className="size-3 rounded-full" style={{ backgroundColor: sw.value }} />}>
              {sw.label}
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const root = [p.disabled ? "disabled" : "", p.longPressMs !== 500 ? `longPressMs={${p.longPressMs}}` : ""].filter(Boolean).join(" ");
    return `<ContextMenu${root ? ` ${root}` : ""}>
  <ContextMenuTrigger tabIndex={0} className="h-52 rounded-xl border-2 border-dashed">
    Right-click here
  </ContextMenuTrigger>
  <ContextMenuContent label="Canvas actions"${p.loop ? "" : " loop={false}"}>
    <ContextMenuItem shortcut="⌘R" onSelect={reload}>Reload</ContextMenuItem>
    <ContextMenuSub>
      <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem>Developer tools</ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
    <ContextMenuSeparator />
    <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
      Show bookmarks
    </ContextMenuCheckboxItem>
    <ContextMenuRadioGroup value={zoom} onValueChange={setZoom} aria-label="Zoom">
      <ContextMenuRadioItem value="100">100%</ContextMenuRadioItem>
    </ContextMenuRadioGroup>
    <ContextMenuItem tone="danger">Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`;
  },
  propsTable: propDocs<ContextMenuProps & ContextMenuContentProps>()([
    { name: "disabled", type: "boolean", default: "false", description: "Root: let the browser's native menu show instead." },
    { name: "longPressMs", type: "number", default: "500", description: "Root: touch press time before the menu opens." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Root: called when the menu opens or closes." },
    { name: "label", type: "string", default: '"Context menu"', description: "Content: accessible name of the menu." },
    { name: "loop", type: "boolean", default: "true", description: "Content: wrap arrow navigation." },
    { name: "container", type: "HTMLElement | null", description: "Content: portal target." },
  ]),
  keyboard: [
    { keys: "Shift+F10 / Menu", action: "Open at the focused element and focus the first item" },
    { keys: "Up / Down / Home / End", action: "Move between items" },
    { keys: "Letters", action: "Typeahead to an item" },
    { keys: "Right / Left", action: "Open / close a submenu" },
    { keys: "Escape / Tab", action: "Close and return focus to where it was" },
  ],
  a11y: [
    "Items are the DropdownMenu parts: menuitem, menuitemcheckbox and menuitemradio with aria-checked.",
    "Opened with the pointer, focus goes to the menu; with the keyboard, to its first item. Closing restores focus.",
    "Make the region or its children focusable so keyboard users can reach Shift+F10, and say so in a label or hint.",
    "A long press opens the menu on touch; moving more than 10 px cancels it so scrolling still works.",
  ],
  reducedMotion: "The menu fades in at the pointer without scaling; the highlight jumps.",
  examples: [
    { title: "File manager", description: "One menu for a grid; the right-clicked tile becomes the target.", Demo: FileManagerDemo },
    { title: "Design canvas", description: "Z-order, shape and fill from the menu of the shape under the pointer.", Demo: CanvasDemo },
  ],
};

export default item;
