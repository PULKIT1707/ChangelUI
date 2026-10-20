import { GridPattern, type GridPatternProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  cellSize: number;
  strokeDasharray: string;
  mask: NonNullable<GridPatternProps["mask"]>;
  highlight: boolean;
};

const defaults: DemoProps = { cellSize: 32, strokeDasharray: "0", mask: "radial", highlight: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "cellSize", label: "Cell size", min: 12, max: 64, step: 4 },
  { type: "select", prop: "strokeDasharray", label: "Dash", options: ["0", "4 2", "2 4"] },
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
  { type: "boolean", prop: "highlight", label: "Highlight squares" },
];

const squares: Array<[number, number]> = [
  [4, 2],
  [6, 3],
  [8, 1],
  [5, 5],
  [10, 4],
];

function Preview({ props }: { props: DemoProps }) {
  const { highlight, ...rest } = props;
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <GridPattern {...rest} squares={highlight ? squares : undefined} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">Grid pattern</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg">
      <GridPattern cellSize={16} squares={[[3, 1], [5, 2]]} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ highlight, ...props }) => {
    const base: Record<string, unknown> = { cellSize: 32, strokeDasharray: "0", mask: "radial" };
    return toJsx<Record<string, unknown>>("GridPattern", highlight ? { ...props, squares } : props, base);
  },
  propsTable: propDocs<GridPatternProps>()([
    { name: "cellSize", type: "number", default: "32", description: "Cell size in px." },
    { name: "strokeDasharray", type: "string", default: '"0"', description: "Line dash pattern." },
    { name: "squares", type: "Array<[x: number, y: number]>", description: "Highlighted cells as [column, row]." },
    { name: "mask", type: "PatternMask", default: '"radial"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden. Lines use currentColor (default text-pui-border)."],
};

export default item;
