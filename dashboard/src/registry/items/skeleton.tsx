import { Skeleton, type SkeletonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { animation: NonNullable<SkeletonProps["animation"]>; lines: number };

const defaults: DemoProps = { animation: "shimmer", lines: 3 };

function Preview({ props }: { props: DemoProps }) {
  return (
    <div aria-busy="true" className="flex w-full max-w-sm items-start gap-4">
      <Skeleton shape="circle" animation={props.animation} className="size-12 shrink-0" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton animation={props.animation} className="h-5 w-1/2" />
        <Skeleton shape="text" lines={props.lines} animation={props.animation} />
      </div>
    </div>
  );
}

function Mini() {
  return (
    <div className="flex w-40 items-center gap-3">
      <Skeleton shape="circle" className="size-8" />
      <Skeleton shape="text" lines={2} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "animation", label: "Animation", options: ["shimmer", "pulse", "none"] },
    { type: "number", prop: "lines", label: "Text lines", min: 1, max: 6, step: 1 },
  ],
  snippet: (props) =>
    [
      toJsx<Record<string, unknown>>("Skeleton", { shape: "circle", animation: props.animation, className: "size-12" }, { animation: "shimmer" }),
      toJsx<Record<string, unknown>>("Skeleton", { shape: "text", lines: props.lines, animation: props.animation }, { lines: 1, animation: "shimmer" }),
    ].join("\n"),
  propsTable: propDocs<SkeletonProps>()([
    { name: "shape", type: '"rect" | "circle" | "text"', default: '"rect"', description: "Placeholder shape; size it with className." },
    { name: "lines", type: "number", default: "1", description: "Text lines; the last is 60% wide." },
    { name: "animation", type: '"shimmer" | "pulse" | "none"', default: '"shimmer"', description: "Loading animation." },
  ]),
  a11y: ["Skeletons are aria-hidden. Set aria-busy on the region that is loading."],
  reducedMotion: 'Animation becomes "none".',
};

export default item;
