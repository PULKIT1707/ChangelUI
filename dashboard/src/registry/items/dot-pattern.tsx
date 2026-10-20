import { DotPattern, type DotPatternProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  gap: number;
  dotSize: number;
  mask: NonNullable<DotPatternProps["mask"]>;
};

const defaults: DemoProps = { gap: 16, dotSize: 1, mask: "radial" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "gap", label: "Gap (px)", min: 8, max: 48, step: 2 },
  { type: "number", prop: "dotSize", label: "Dot radius", min: 0.5, max: 4, step: 0.5 },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <DotPattern {...props} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">Dot pattern</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg">
      <DotPattern gap={10} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("DotPattern", props, defaults, undefined, controls),
  propsTable: propDocs<DotPatternProps>()([
    { name: "gap", type: "number", default: "16", description: "Distance between dots in px." },
    { name: "dotSize", type: "number", default: "1", description: "Dot radius in px." },
    { name: "offset", type: "number", default: "0", description: "Pattern offset in px." },
    { name: "mask", type: "PatternMask", default: '"radial"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Color it with a text-* class (currentColor)."],
};

export default item;
