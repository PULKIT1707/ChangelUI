import { Badge, Button, DirectionAwareCard, type CardEdge, type DirectionAwareCardProps } from "changelui";
import { useMemo, useState } from "react";
import { landscape, SCENES } from "../../lib/demo-art";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  mode: NonNullable<DirectionAwareCardProps["mode"]>;
  focusEdge: CardEdge;
  showOnTouch: boolean;
};
const defaults: DemoProps = { mode: "push", focusEdge: "bottom", showOnTouch: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mode", label: "Mode", options: ["push", "slide"] },
  { type: "select", prop: "focusEdge", label: "Keyboard edge", options: ["bottom", "top", "left", "right"] },
  { type: "boolean", prop: "showOnTouch", label: "Show on touch devices" },
];
function useScenes(w: number, h: number, offset = 0) {
  return useMemo(() => SCENES.map((scene, i) => ({ name: scene.name, src: landscape(scene, i + 1 + offset, w, h) })), [w, h, offset]);
}
const STAYS = [
  { place: "Dawn ridge cabin", price: "$184", rating: "4.92", tags: ["Hot tub", "Mountain view"] },
  { place: "High noon loft", price: "$129", rating: "4.81", tags: ["Workspace", "Fast wifi"] },
  { place: "Desert dusk dome", price: "$212", rating: "4.97", tags: ["Stargazing", "Fire pit"] },
];
function Preview({ props }: { props: DemoProps }) {
  const scenes = useScenes(640, 480);
  const [edge, setEdge] = useState("—");
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="m-0 text-lg font-semibold tracking-tight text-pui-foreground">Stays this weekend</p>
          <p className="m-0 text-sm text-pui-muted-foreground">Hover a card from any side, or Tab to a card.</p>
        </div>
        <span className="text-xs text-pui-muted-foreground tabular-nums">3 of 128</span>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
        {STAYS.map((stay, i) => (
          <li key={stay.place}>
            <DirectionAwareCard
              {...props}
              className="aspect-4/3 w-full"
              onEdgeChange={(e, phase) => setEdge(`${phase} from ${e}`)}
              overlay={
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <a href={`#stay-${i}`} onClick={(e) => e.preventDefault()} className="min-w-0 truncate text-sm font-semibold text-inherit no-underline after:absolute after:inset-0">
                      {stay.place}
                    </a>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums">★ {stay.rating}</span>
                  </div>
                  <p className="m-0 text-sm text-pui-muted-foreground">
                    <span className="font-semibold text-pui-foreground">{stay.price}</span> / night
                  </p>
                  <div className="flex gap-1.5">
                    {stay.tags.map((t) => (
                      <Badge key={t} size="sm">{t}</Badge>
                    ))}
                  </div>
                </div>
              }
            >
              <img src={scenes[i]?.src} alt={stay.place} />
            </DirectionAwareCard>
          </li>
        ))}
      </ul>
      <p className="m-0 h-5 text-center text-xs text-pui-muted-foreground tabular-nums" aria-live="off">
        Last move: {edge}
      </p>
    </div>
  );
}
/** Dense portfolio grid: sweep the pointer across rows and the overlays follow your hand. */
function GalleryDemo() {
  const scenes = useScenes(400, 400, 20);
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
      {scenes.map((s) => (
        <li key={s.name}>
          <DirectionAwareCard
            mode="slide"
            className="aspect-square w-full rounded-pui-lg"
            overlayClassName="justify-center items-center bg-pui-primary/85 bg-none text-pui-primary-foreground"
            overlay={<span className="text-sm font-semibold">{s.name}</span>}
          >
            <img src={s.src} alt="" />
          </DirectionAwareCard>
        </li>
      ))}
    </ul>
  );
}
/** A team card with actions: buttons inside the overlay are reachable with Tab. */
function TeamDemo() {
  const scenes = useScenes(480, 600, 40);
  const people = [
    { name: "Avery Chen", role: "Design lead" },
    { name: "Sam Okafor", role: "Staff engineer" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {people.map((p, i) => (
        <DirectionAwareCard
          key={p.name}
          className="aspect-4/5 w-full"
          focusEdge="bottom"
          overlay={
            <div className="flex flex-col gap-2">
              <div>
                <p className="m-0 text-sm font-semibold">{p.name}</p>
                <p className="m-0 text-xs text-pui-muted-foreground">{p.role}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1">
                  Message
                </Button>
                <Button size="sm" variant="outline" tone="neutral">
                  Profile
                </Button>
              </div>
            </div>
          }
        >
          <img src={scenes[i + 2]?.src} alt={`Portrait placeholder for ${p.name}`} />
        </DirectionAwareCard>
      ))}
    </div>
  );
}
function Mini() {
  const scenes = useScenes(320, 240, 60);
  return (
    <div className="grid w-full max-w-60 grid-cols-2 gap-2" aria-hidden="true">
      {scenes.slice(0, 2).map((s, i) => (
        <div key={s.name} className="relative aspect-square overflow-hidden rounded-pui-lg">
          <img src={s.src} alt="" className="block size-full object-cover" />
          {i === 1 ? (
            <div className="absolute inset-0 flex items-end bg-linear-to-t from-pui-surface/95 to-pui-surface/0 p-2 text-[10px] font-semibold text-pui-surface-foreground">
              {s.name} →
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ mode, focusEdge, showOnTouch }) => {
    const attrs = [mode !== "push" ? `mode="${mode}"` : "", focusEdge !== "bottom" ? `focusEdge="${focusEdge}"` : "", showOnTouch ? "" : "showOnTouch={false}"].filter(Boolean);
    return `<DirectionAwareCard${attrs.map((a) => ` ${a}`).join("")}
  className="aspect-4/3"
  overlay={<a href="/stays/dawn-ridge">Dawn ridge cabin · $184 / night</a>}
>
  <img src="/stays/dawn-ridge.jpg" alt="Dawn ridge cabin" />
</DirectionAwareCard>`;
  },
  propsTable: propDocs<DirectionAwareCardProps>()([
    { name: "overlay", type: "ReactNode", required: true, description: "Content that slides in from the edge the pointer entered." },
    { name: "children", type: "ReactNode", description: "The media; an <img> child fills the card with object-cover." },
    { name: "mode", type: '"push" | "slide"', default: '"push"', description: "push also nudges and zooms the media away from the overlay." },
    { name: "focusEdge", type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', description: "Edge used when keyboard focus opens the overlay." },
    { name: "showOnTouch", type: "boolean", default: "true", description: "Keep the overlay visible on devices that cannot hover." },
    { name: "overlayClassName", type: "string", description: "Class for the overlay layer (background, padding, alignment)." },
    { name: "onEdgeChange", type: '(edge, phase: "enter" | "leave") => void', description: "Called with the edge on every enter and leave." },
  ]),
  a11y: [
    "The overlay is never hidden from assistive tech: it is only moved off the card, so links and buttons inside it stay in the reading and tab order.",
    "Keyboard focus anywhere inside the card opens the overlay from focusEdge, and it stays open while focus is inside.",
    "Phones (hover: none) see the overlay at rest instead of hiding information behind a hover.",
    "Give the media real alt text when it carries meaning; use alt=\"\" when the overlay already names it.",
  ],
  reducedMotion: "The overlay fades in place and the media stays still.",
  examples: [
    { title: "Portfolio grid", description: "Sweep across the grid: each overlay enters and leaves with your hand.", Demo: GalleryDemo, wide: true },
    { title: "Team cards with actions", description: "Tab into a card to open it; its buttons are reachable.", Demo: TeamDemo },
  ],
};
export default item;
