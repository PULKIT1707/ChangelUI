import { Button, Input, MatrixRain, type MatrixRainProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  charset: "katakana" | "binary" | "hex" | "latin";
  fontSize: number;
  speed: number;
  density: number;
  fade: number;
  text: string;
  fps: number;
  mask: NonNullable<MatrixRainProps["mask"]>;
};
const defaults: DemoProps = { charset: "katakana", fontSize: 14, speed: 1, density: 0.85, fade: 0.06, text: "DECODE", fps: 24, mask: "none" };
const componentDefaults: DemoProps = { ...defaults, text: "" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "charset", label: "Charset", options: ["katakana", "binary", "hex", "latin"] },
  { type: "number", prop: "fontSize", label: "Font size", min: 8, max: 32, step: 1 },
  { type: "number", prop: "speed", label: "Speed", min: 0.2, max: 4, step: 0.1 },
  { type: "number", prop: "density", label: "Density", min: 0.1, max: 1, step: 0.05 },
  { type: "number", prop: "fade", label: "Trail fade", min: 0.02, max: 0.3, step: 0.01 },
  { type: "text", prop: "text", label: "Decoded word", maxLength: 16 },
  { type: "number", prop: "fps", label: "FPS", min: 8, max: 60, step: 2 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];
function Preview({ props }: { props: DemoProps }) {
  const { text, ...rest } = props;
  return (
    <div className="dark relative isolate h-80 w-full max-w-2xl overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <MatrixRain {...rest} text={text || undefined} />
      {text ? <span className="sr-only">{text}</span> : null}
    </div>
  );
}
function LoginDemo() {
  return (
    <div className="dark relative isolate grid h-72 w-full place-items-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-4">
      <MatrixRain charset="binary" color="var(--pui-chart-2)" fontSize={12} density={0.6} fade={0.08} mask="radial" />
      <form
        className="relative flex w-full max-w-xs flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface/80 p-4 backdrop-blur-md"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="matrix-demo-key" className="font-pui-mono text-xs text-pui-muted-foreground">
          access key
        </label>
        <Input id="matrix-demo-key" placeholder="sk-••••••••" autoComplete="off" />
        <Button size="sm" type="submit">
          Jack in
        </Button>
      </form>
    </div>
  );
}
function HexDemo() {
  return (
    <div className="relative isolate flex h-56 w-full flex-col justify-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-5">
      <MatrixRain charset="hex" color="var(--pui-primary)" headColor="var(--pui-primary)" density={0.35} fontSize={13} speed={0.6} fade={0.1} mask="fade-y" className="opacity-60" />
      <p className="relative m-0 font-pui-mono text-xs text-pui-muted-foreground">block 0x7f3a…c21e</p>
      <p className="relative m-0 mt-1 text-xl font-semibold text-pui-foreground">Hashing 2.4 GH/s</p>
    </div>
  );
}
function NotFoundDemo() {
  return (
    <div className="dark relative isolate flex h-56 w-full flex-col items-center justify-end overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background p-5">
      <MatrixRain text="404" fontSize={22} speed={1.4} color="var(--pui-danger)" />
      <p className="relative m-0 text-sm text-pui-muted-foreground">
        <span className="sr-only">404. </span>This page was never in the system.
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div className="dark relative isolate h-24 w-40 overflow-hidden rounded-pui-lg bg-pui-background">
      <MatrixRain fontSize={10} speed={1.4} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) =>
    toJsx<Record<string, unknown>>(
      "MatrixRain",
      text ? { ...props, text } : props,
      componentDefaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<MatrixRainProps>()([
    { name: "charset", type: '"katakana" | "binary" | "hex" | "latin" | string', default: '"katakana"', description: "A preset or your own string of glyphs." },
    { name: "fontSize", type: "number", default: "14", description: "Glyph size in px; also the column width." },
    { name: "speed", type: "number", default: "1", description: "Fall speed multiplier." },
    { name: "density", type: "number", default: "0.85", description: "Share of columns raining at once." },
    { name: "fade", type: "number", default: "0.06", description: "Trail fade per frame; small values leave long trails." },
    { name: "color", type: "string", description: "Trail glyph color; default the root's text color (text-pui-success)." },
    { name: "headColor", type: "string", default: '"var(--pui-foreground)"', description: "Leading glyph color." },
    { name: "text", type: "string", description: "A word that decodes out of the rain and stays lit. Decorative: render the real text too." },
    { name: "fps", type: "number", default: "24", description: "Frames per second." },
    { name: "mask", type: "PatternMask", default: '"none"', description: "Edge mask." },
  ]),
  a11y: [
    "Decorative and aria-hidden canvas. The text prop is visual only, so render the same words as real text (sr-only is fine).",
    "Uses the root's mono font (font-pui-mono); trails fade to transparent so it composes on any surface.",
  ],
  reducedMotion: "One still frame of frozen columns with the decoded word already lit.",
  examples: [
    { title: "Terminal login", description: "Binary rain behind a form, radial mask.", Demo: LoginDemo },
    { title: "Hex stream", description: "Sparse primary-colored hex in light mode.", Demo: HexDemo },
    { title: "404 decoded", description: "The word crystallizes as heads pass over it.", Demo: NotFoundDemo, wide: true },
  ],
};
export default item;
