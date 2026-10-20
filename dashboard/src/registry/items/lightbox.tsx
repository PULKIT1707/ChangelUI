import { Lightbox, LightboxTrigger, type LightboxImage, type LightboxProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  loop: boolean;
  showThumbnails: boolean;
};

const defaults: DemoProps = { loop: true, showThumbnails: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "loop", label: "Loop" },
  { type: "boolean", prop: "showThumbnails", label: "Filmstrip" },
];

const CAPTIONS = [
  "First light over the ridge, 5:52 am",
  "Midday haze on the northern trail",
  "The dunes turn copper at dusk",
  "Clear skies over the valley",
  "Low tide at the lagoon",
  "Rose hills after the rain",
  "Fresh snow on the pass",
  "Green ribbons over the fjord",
];

function useGallery(aspect: [number, number] = [1200, 800]): LightboxImage[] {
  return useMemo(
    () =>
      SCENES.map((scene, i) => ({
        src: landscape(scene, i + 1, aspect[0], aspect[1]),
        alt: scene.name,
        caption: CAPTIONS[i],
      })),
    [aspect],
  );
}

const LANDSCAPE: [number, number] = [1200, 800];
const PORTRAIT: [number, number] = [800, 1000];

function Preview({ props }: { props: DemoProps }) {
  const images = useGallery(LANDSCAPE);
  const [index, setIndex] = useState(0);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <Lightbox images={images} {...props} onIndexChange={setIndex} className="grid-cols-4 [&>button]:aspect-square" />
      <p className="m-0 text-center text-xs text-pui-muted-foreground">
        Last viewed: {images[index]?.alt} · swipe, arrow keys or the filmstrip inside
      </p>
    </div>
  );
}

function Featured() {
  const images = useGallery(LANDSCAPE).slice(0, 5);
  return (
    <Lightbox images={images} className="grid h-72 grid-cols-4 grid-rows-2 gap-2">
      {images.map((_, i) => (
        <LightboxTrigger key={i} index={i} className={i === 0 ? "col-span-2 row-span-2" : undefined} />
      ))}
    </Lightbox>
  );
}

function Product() {
  const images = useGallery(PORTRAIT).slice(3, 7);
  const [active, setActive] = useState(0);
  return (
    <Lightbox images={images} index={active} onIndexChange={setActive} className="flex flex-col gap-2">
      <LightboxTrigger index={active} className="aspect-[4/5] w-full" />
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Choose an image">
        {images.map((image, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show ${image.alt}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className="aspect-square cursor-pointer overflow-hidden rounded-pui-md border-2 border-transparent bg-pui-muted p-0 aria-pressed:border-pui-primary"
          >
            <img src={image.src} alt="" className="block size-full object-cover" />
          </button>
        ))}
      </div>
    </Lightbox>
  );
}

function Mini() {
  const images = useGallery(LANDSCAPE).slice(0, 6);
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <Lightbox images={images} className="grid-cols-3 [&>button]:aspect-square" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const images = [\n  { src: "/trip/1.jpg", alt: "Ridge at dawn", caption: "First light, 5:52 am" },\n  { src: "/trip/2.jpg", alt: "Northern trail" },\n];\n\n` +
    toJsx<Record<string, unknown>>("Lightbox", { images: "{images}", ...props }, { loop: true, showThumbnails: true }, undefined, controls as ControlSpec<Record<string, unknown>>[]).replace(
      'images="{images}"',
      "images={images}",
    ),
  propsTable: propDocs<LightboxProps>()([
    { name: "images", type: "{ src, alt, caption?, thumbnail? }[]", description: "The gallery.", required: true },
    { name: "children", type: "ReactNode", description: "Custom layout of LightboxTrigger index={i}. Default a thumbnail grid." },
    { name: "open", type: "boolean", description: "Controlled viewer state." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Start open." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Viewer opens or closes." },
    { name: "index", type: "number", description: "Controlled image index." },
    { name: "defaultIndex", type: "number", default: "0", description: "Initial index." },
    { name: "onIndexChange", type: "(index: number) => void", description: "Navigation inside the viewer." },
    { name: "loop", type: "boolean", default: "true", description: "Wrap around at the ends." },
    { name: "showThumbnails", type: "boolean", default: "true", description: "Filmstrip under the viewer." },
    { name: "label", type: "string", default: '"Image viewer"', description: "Accessible name of the dialog." },
    { name: "counterLabel", type: "(position, total) => string", default: "`${i} of ${n}`", description: "Live counter text." },
    { name: "closeLabel", type: "string", default: '"Close"', description: "Name of the close button." },
    { name: "previousLabel", type: "string", default: '"Previous image"', description: "Name of the previous button." },
    { name: "nextLabel", type: "string", default: '"Next image"', description: "Name of the next button." },
    { name: "container", type: "Element | DocumentFragment | null", description: "Portal target. Default document.body." },
  ]),
  keyboard: [
    { keys: "ArrowLeft / ArrowRight", action: "Previous / next image" },
    { keys: "Home / End", action: "First / last image" },
    { keys: "Escape", action: "Close; the image flies back and focus returns to its thumbnail" },
  ],
  a11y: [
    "The viewer is a modal dialog with a focus trap and scroll lock.",
    "A polite live counter announces “3 of 8” as you move.",
    "Thumbnails are buttons named “Open <alt>”; the filmstrip marks the current image with aria-current.",
  ],
  reducedMotion: "No zoom from the thumbnail and no slide or drag; images crossfade.",
  examples: [
    { title: "Featured layout", description: "Custom triggers in a bento grid.", Demo: Featured },
    { title: "Product gallery", description: "Controlled index shared with a picker.", Demo: Product },
  ],
};

export default item;
