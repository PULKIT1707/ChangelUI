import { Button, cropImage, ImageCropper, type ImageCrop, type ImageCropperProps } from "changelui";
import { useEffect, useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  shape: NonNullable<ImageCropperProps["shape"]>;
  grid: NonNullable<ImageCropperProps["grid"]>;
  maxZoom: number;
  showControls: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { shape: "rect", grid: "interacting", maxZoom: 4, showControls: true, disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "shape", label: "Shape", options: ["rect", "round"] },
  { type: "select", prop: "grid", label: "Grid", options: ["interacting", "always", "never"] },
  { type: "number", prop: "maxZoom", label: "Max zoom", min: 2, max: 8, step: 1 },
  { type: "boolean", prop: "showControls", label: "Controls" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const ASPECTS = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
];

const scene = (i: number) => SCENES[i % SCENES.length] ?? SCENES[0]!;
const PREFIX = "data:image/svg+xml,";

/** The demo art has only a viewBox; explicit width/height give the <img> a real natural size. */
function photo(i: number, seed: number, w: number, h: number): string {
  const svg = decodeURIComponent(landscape(scene(i), seed, w, h).slice(PREFIX.length));
  return PREFIX + encodeURIComponent(svg.replace("<svg ", `<svg width="${w}" height="${h}" `));
}

function Preview({ props }: { props: DemoProps }) {
  const src = useMemo(() => photo(1, 3, 1600, 1000), []);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <ImageCropper
        src={src}
        alt="Hills at dusk"
        aspects={ASPECTS}
        shape={props.shape}
        grid={props.grid}
        maxZoom={props.maxZoom}
        showControls={props.showControls}
        disabled={props.disabled}
        onCropChange={setCrop}
        stageClassName="h-96"
      />
      <p className="font-mono text-xs text-pui-muted-foreground tabular-nums">
        {crop ? `x ${crop.x} · y ${crop.y} · ${crop.width}×${crop.height} · ${crop.rotation}° · zoom ${crop.zoom.toFixed(2)}` : "Loading image…"}
      </p>
    </div>
  );
}

function Mini() {
  const src = useMemo(() => photo(2, 5, 900, 600), []);
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <ImageCropper src={src} alt="" aspect={4 / 3} defaultZoom={1.4} showControls={false} stageClassName="h-44" grid="always" tabIndex={-1} />
    </div>
  );
}

/** Avatar upload: round mask, then Save crops to a 256px PNG and shows it in the profile row. */
function AvatarDemo() {
  const src = useMemo(() => photo(0, 9, 1200, 900), []);
  const [crop, setCrop] = useState<ImageCrop | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <ImageCropper src={src} alt="Profile photo" shape="round" defaultZoom={1.6} onCropChange={setCrop} stageClassName="h-64" />
      <div className="flex items-center justify-between gap-3 rounded-pui-lg border border-pui-border bg-pui-surface p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="size-10 shrink-0 overflow-hidden rounded-full bg-pui-muted ring-1 ring-pui-border">
            {url ? <img src={url} alt="Cropped avatar" className="size-full object-cover" /> : null}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block font-medium text-pui-foreground">Maya Chen</span>
            <span className="block text-xs text-pui-muted-foreground">{url ? "Saved as 256×256 PNG" : "Not saved yet"}</span>
          </span>
        </div>
        <Button
          size="sm"
          loading={busy}
          disabled={!crop}
          onClick={async () => {
            if (!crop) return;
            setBusy(true);
            try {
              const blob = await cropImage(src, crop, { width: 256 });
              setUrl(URL.createObjectURL(blob));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save photo
        </Button>
      </div>
    </div>
  );
}

/** Cover banner: one wide preset, a taller stage and the grid always on for framing. */
function BannerDemo() {
  const src = useMemo(() => photo(3, 11, 1800, 1200), []);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
      <ImageCropper src={src} alt="Cover image" aspect={3} grid="always" rotation={rotation} onRotationChange={setRotation} stageClassName="h-56" />
      <p className="text-xs text-pui-muted-foreground">
        Profile banner, 3:1. Rotation is controlled: <span className="font-mono tabular-nums">{rotation}°</span>
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [crop, setCrop] = useState<ImageCrop | null>(null);\n\n<ImageCropper\n  src={file}\n  aspects={[{ label: "1:1", value: 1 }, { label: "16:9", value: 16 / 9 }]}${props.shape !== "rect" ? `\n  shape="${props.shape}"` : ""}${props.grid !== "interacting" ? `\n  grid="${props.grid}"` : ""}${props.maxZoom !== 4 ? `\n  maxZoom={${props.maxZoom}}` : ""}${props.showControls ? "" : "\n  showControls={false}"}${props.disabled ? "\n  disabled" : ""}\n  onCropChange={setCrop}\n/>\n\n// Later: const blob = await cropImage(file, crop, { width: 512 });`,
  propsTable: propDocs<ImageCropperProps>()([
    { name: "src", type: "string", required: true, description: "Image URL, object URL or data URL." },
    { name: "alt", type: "string", default: '"Image to crop"', description: "Image description." },
    { name: "aspect", type: "number", description: "Frame width / height (defaultAspect, onAspectChange). Default: first preset or 1." },
    { name: "aspects", type: "{ label, value }[]", description: "Aspect presets as toolbar toggles." },
    { name: "shape", type: '"rect" | "round"', default: '"rect"', description: "Round mask for avatars (forces 1:1)." },
    { name: "zoom", type: "number", description: "Controlled zoom (defaultZoom, onZoomChange); 1 just covers the frame." },
    { name: "minZoom", type: "number", default: "1", description: "Lowest zoom; 1 just covers the frame." },
    { name: "maxZoom", type: "number", default: "4", description: "Highest zoom." },
    { name: "rotation", type: "0 | 90 | 180 | 270", description: "Controlled rotation (defaultRotation, onRotationChange)." },
    { name: "onCropChange", type: "(crop: ImageCrop) => void", description: "{ x, y, width, height, rotation, zoom } in source pixels." },
    { name: "grid", type: '"interacting" | "always" | "never"', default: '"interacting"', description: "Rule-of-thirds grid." },
    { name: "showControls", type: "boolean", default: "true", description: "Zoom slider, aspect toggles, rotate and reset." },
    { name: "stageClassName", type: "string", description: "Classes for the stage; set its height (default h-80)." },
    { name: "crossOrigin", type: '"anonymous" | "use-credentials"', description: "Needed for cropImage on CORS images." },
    { name: "disabled", type: "boolean", default: "false", description: "Locks the crop." },
  ]),
  keyboard: [
    { keys: "Arrow keys", action: "Move the image 10px (Shift: 50px)" },
    { keys: "+ / −", action: "Zoom in / out" },
    { keys: "R / Shift+R", action: "Rotate 90° clockwise / counter-clockwise" },
    { keys: "0 or Home", action: "Reset" },
  ],
  a11y: [
    "The frame is a focusable 2D control (role slider, roledescription “crop frame”) with a value text of position, zoom and rotation.",
    "A hidden hint lists the keys; zoom is a labelled Slider and every tool button has a name.",
    "Rotation and reset are announced in a polite status.",
    "Wheel zoom only captures the wheel over the stage, so the page still scrolls elsewhere.",
  ],
  reducedMotion: "No eased zoom or rotation and no grid fade; the image jumps to its new framing.",
  examples: [
    { title: "Avatar upload", description: "Round mask; Save crops to a 256px PNG.", Demo: AvatarDemo },
    { title: "Cover banner", description: "3:1 frame, grid always on, controlled rotation.", Demo: BannerDemo },
  ],
};

export default item;
