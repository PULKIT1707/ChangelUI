import { Card, CardContent, CardDescription, CardHeader, CardTitle, Reveal, type RevealProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  preset: NonNullable<RevealProps["preset"]>;
  duration: number;
  delay: number;
  distance: number;
};

const defaults: DemoProps = { preset: "fade-up", duration: 0.5, delay: 0, distance: 16 };

const controls: ControlSpec<DemoProps>[] = [
  {
    type: "select",
    prop: "preset",
    label: "Preset",
    options: ["fade", "fade-up", "fade-down", "fade-left", "fade-right", "blur", "scale"],
  },
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.1, max: 2, step: 0.1 },
  { type: "number", prop: "delay", label: "Delay (s)", min: 0, max: 2, step: 0.1 },
  { type: "number", prop: "distance", label: "Distance (px)", min: 0, max: 80, step: 4 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <Reveal {...props} className="w-72">
      <Card>
        <CardHeader>
          <CardTitle>Revealed card</CardTitle>
          <CardDescription>Animates in when it scrolls into view.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-pui-muted-foreground">Use replay to watch it again.</CardContent>
      </Card>
    </Reveal>
  );
}

function Mini() {
  return (
    <Reveal preset="blur" trigger="mount" className="rounded-pui-md bg-pui-muted px-4 py-3 text-sm text-pui-foreground">
      Hello there
    </Reveal>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Reveal", props, defaults, "<Card>...</Card>", controls),
  propsTable: propDocs<RevealProps>()([
    { name: "preset", type: "RevealPreset", default: '"fade-up"', description: "fade, fade-up/down/left/right, blur or scale." },
    { name: "as", type: '"div" | "section" | "article" | "span" | "li"', default: '"div"', description: "Rendered tag." },
    { name: "duration", type: "number", default: "0.5", description: "Seconds." },
    { name: "delay", type: "number", default: "0", description: "Seconds." },
    { name: "distance", type: "number", default: "16", description: "Travel in px for directional presets." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the entrance runs." },
    { name: "once", type: "boolean", default: "true", description: "Animate only the first time." },
    { name: "inViewMargin", type: "string", default: '"0px 0px -10% 0px"', description: "IntersectionObserver rootMargin." },
    { name: "transition", type: "Transition", description: "Merged over the default transition." },
  ]),
  a11y: ["Content is in the DOM from the start; only its opacity and transform animate."],
  reducedMotion: "Fades in over 150ms without movement.",
};

export default item;
