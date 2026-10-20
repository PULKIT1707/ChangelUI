import { Avatar, Button, FileDropzone, formatBytes, type DropzoneFile, type FileDropzoneProps } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  accept: string;
  maxSizeMb: number;
  maxFiles: number;
  multiple: boolean;
  size: NonNullable<FileDropzoneProps["size"]>;
  failSome: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { accept: "image/*,.pdf", maxSizeMb: 5, maxFiles: 6, multiple: true, size: "md", failSome: true, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "accept", label: "Accept", maxLength: 60 },
  { type: "number", prop: "maxSizeMb", label: "Max size (MB)", min: 1, max: 50, step: 1 },
  { type: "number", prop: "maxFiles", label: "Max files", min: 1, max: 12, step: 1 },
  { type: "boolean", prop: "multiple", label: "Multiple" },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "boolean", prop: "failSome", label: "Simulate a failed upload" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

let uid = 0;
const nextId = () => `f${++uid}`;

/** Fake uploader: advances each uploading file's progress until done (or error for every 4th file). */
function useFakeUploads(failSome: boolean) {
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  const failRef = useRef(failSome);
  useEffect(() => {
    failRef.current = failSome;
  }, [failSome]);
  const uploading = files.some((f) => f.status === "uploading" || f.status === "queued");
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      setFiles((list) => {
        let started = list.filter((f) => f.status === "uploading").length;
        return list.map((f, i) => {
          if (f.status === "queued" && started < 2) {
            started += 1;
            return { ...f, status: "uploading", progress: 0 };
          }
          if (f.status !== "uploading") return f;
          const progress = Math.min(100, (f.progress ?? 0) + 6 + Math.random() * 16);
          if (failRef.current && i % 4 === 3 && progress > 55) return { ...f, status: "error", error: "Network error. Try again." };
          return progress >= 100 ? { ...f, status: "done", progress: 100 } : { ...f, progress };
        });
      });
    }, 220);
    return () => clearInterval(t);
  }, [uploading]);
  const add = (incoming: File[]) =>
    setFiles((list) => [...list, ...incoming.map((file) => ({ id: nextId(), file, status: "queued" as const, progress: 0 }))]);
  const remove = (id: string) => setFiles((list) => list.filter((f) => f.id !== id));
  return { files, setFiles, add, remove };
}

/** A tiny generated image so the demo can add sample files without a real picker. */
function sampleFile(name: string, hue: number): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 96, 96);
      g.addColorStop(0, `hsl(${hue} 80% 62%)`); // pui-allow-color
      g.addColorStop(1, `hsl(${(hue + 60) % 360} 80% 52%)`); // pui-allow-color
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 96);
    }
    canvas.toBlob((blob) => resolve(new File([blob ?? new Blob()], name, { type: "image/png" })), "image/png");
  });
}

function Preview({ props }: { props: DemoProps }) {
  const { files, add, remove, setFiles } = useFakeUploads(props.failSome);
  const [rejections, setRejections] = useState<string[]>([]);
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <FileDropzone
        accept={props.accept || undefined}
        maxSizeBytes={props.maxSizeMb * 1024 * 1024}
        maxFiles={props.maxFiles}
        multiple={props.multiple}
        size={props.size}
        disabled={props.disabled}
        files={files}
        onRemove={remove}
        onDrop={(_accepted, rejected) => setRejections(rejected.map((r) => r.message))}
        onFilesChange={add}
      />
      {rejections.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs text-pui-danger-text">
          {rejections.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          tone="neutral"
          disabled={props.disabled}
          onClick={async () => {
            const picked = await Promise.all([sampleFile("aurora.png", 260), sampleFile("sunset.png", 10), sampleFile("lagoon.png", 180)]);
            add(picked.slice(0, Math.max(0, props.maxFiles - files.length)));
          }}
        >
          Add sample images
        </Button>
        {files.length > 0 ? (
          <Button size="sm" variant="ghost" tone="neutral" onClick={() => setFiles([])}>
            Clear
          </Button>
        ) : null}
        <span className="text-xs text-pui-muted-foreground">Or drop, paste, or browse your own files (they stay in your browser).</span>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <FileDropzone size="sm" title="Drop files here" description="PNG, PDF · up to 5 MB" />
    </div>
  );
}

/** Single-file avatar upload: the zone becomes the preview once a file is chosen. */
function AvatarDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <div className="flex w-full items-center gap-4">
      <Avatar size="xl" name="New user" src={file && url ? url : undefined} />
      <FileDropzone
        size="sm"
        accept="image/*"
        multiple={false}
        maxSizeBytes={2 * 1024 * 1024}
        title={file ? file.name : "Drop a photo"}
        description={file ? `${formatBytes(file.size)} · drop another to replace` : "JPG or PNG, up to 2 MB"}
        browseLabel={file ? "Replace" : "Choose photo"}
        onFilesChange={(list) => setFile(list[0] ?? null)}
        className="flex-1"
      />
    </div>
  );
}

const seeded: DropzoneFile[] = [
  { id: "a", name: "Q3-report.pdf", size: 2_480_000, type: "application/pdf", status: "done" },
  { id: "b", name: "brand-assets.zip", size: 18_200_000, type: "application/zip", status: "uploading", progress: 64 },
  { id: "c", name: "demo-reel.mp4", size: 48_900_000, type: "video/mp4", status: "error", error: "File is larger than 40 MB." },
  { id: "d", name: "notes.md", size: 4_200, type: "text/markdown", status: "queued" },
];

/** Every list state at once, controlled by the parent: done, uploading, failed and queued. */
function StatesDemo() {
  const [files, setFiles] = useState(seeded);
  return (
    <div className="flex w-full flex-col gap-3">
      <FileDropzone size="sm" files={files} onRemove={(id) => setFiles((l) => l.filter((f) => f.id !== id))} title="Attach files" maxFiles={6} />
      {files.length < seeded.length ? (
        <Button size="sm" variant="ghost" tone="neutral" className="self-start" onClick={() => setFiles(seeded)}>
          Restore list
        </Button>
      ) : null}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      p.accept ? `accept="${p.accept}"` : "",
      `maxSizeBytes={${p.maxSizeMb} * 1024 * 1024}`,
      `maxFiles={${p.maxFiles}}`,
      !p.multiple ? "multiple={false}" : "",
      p.size !== "md" ? `size="${p.size}"` : "",
      p.disabled ? "disabled" : "",
      "files={files}",
      "onFilesChange={(added) => upload(added)}",
      "onRemove={(id) => remove(id)}",
    ].filter(Boolean);
    return `// files: { id, file, status: "queued" | "uploading" | "done" | "error", progress? }[]
<FileDropzone
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<FileDropzoneProps>()([
    { name: "accept", type: "string", description: 'Like the input accept attribute: "image/*,.pdf,application/zip".' },
    { name: "maxSizeBytes", type: "number", description: "Larger files are rejected (reason \"size\")." },
    { name: "maxFiles", type: "number", description: "Total limit, counting the current files." },
    { name: "multiple", type: "boolean", default: "true", description: "Allow several files per drop." },
    { name: "onFilesChange", type: "(files: File[]) => void", description: "Accepted files of each drop, paste or browse." },
    { name: "onDrop", type: "(accepted: File[], rejected: FileRejection[]) => void", description: "Both lists, with a reason and a message per rejection." },
    { name: "files", type: "DropzoneFile[]", description: "Rendered list with thumbnails, per-file progress, status and errors." },
    { name: "onRemove", type: "(id: string) => void", description: "Shows a remove button per file." },
    { name: "title", type: "ReactNode", default: '"Drop files here"', description: "Main line of the zone." },
    { name: "description", type: "ReactNode", description: "Second line; built from accept, size and count limits by default." },
    { name: "browseLabel", type: "string", default: '"Browse files"', description: "Text of the browse button." },
    { name: "acceptPaste", type: "boolean", default: "true", description: "Accept files pasted while the zone has focus." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Padding and icon size." },
    { name: "disabled", type: "boolean", default: "false", description: "No drops, paste or browsing." },
  ]),
  keyboard: [
    { keys: "Tab, Enter / Space", action: "Focus the browse button and open the file picker" },
    { keys: "Cmd/Ctrl + V", action: "Paste files while the zone or its button has focus" },
  ],
  a11y: [
    "The native file input stays in the DOM (for forms) behind a labelled browse button that carries the limits as its description.",
    "Accepted counts and rejection reasons are announced in a polite live region.",
    "Each file row has a progressbar while uploading and a remove button named after the file.",
  ],
  reducedMotion: "No glow scale, icon lift, marching border or list entrance; states still change color.",
  examples: [
    { title: "Avatar upload", description: "Single file; the zone text turns into the file summary.", Demo: AvatarDemo },
    { title: "List states", description: "Done, uploading, failed and queued rows from parent state.", Demo: StatesDemo },
  ],
};

export default item;
