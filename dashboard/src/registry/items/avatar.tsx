import { Avatar, AvatarGroup, Tooltip, type AvatarGroupProps, type AvatarProps } from "changelui";
import type { ReactElement } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<AvatarProps["size"]>;
  shape: NonNullable<AvatarProps["shape"]>;
  status: "none" | NonNullable<AvatarProps["status"]>;
  max: number;
  spacing: NonNullable<AvatarGroupProps["spacing"]>;
};

const defaults: DemoProps = { size: "md", shape: "circle", status: "online", max: 3, spacing: "normal" };
const people = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Linus Torvalds"];

const withTooltip = (avatar: ReactElement, name: string) => (
  <Tooltip content={name} side="top">
    {avatar}
  </Tooltip>
);

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Avatar
        name="Ada Lovelace"
        size={props.size}
        shape={props.shape}
        status={props.status === "none" ? undefined : props.status}
      />
      <AvatarGroup
        max={props.max}
        size={props.size}
        spacing={props.spacing}
        aria-label="Team"
        renderTooltip={withTooltip}
      >
        {people.map((name) => (
          <Avatar key={name} name={name} shape={props.shape} />
        ))}
      </AvatarGroup>
    </div>
  );
}

function Mini() {
  return (
    <AvatarGroup max={3} size="sm">
      {people.map((name) => (
        <Avatar key={name} name={name} />
      ))}
    </AvatarGroup>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["xs", "sm", "md", "lg", "xl"] },
    { type: "select", prop: "shape", label: "Shape", options: ["circle", "square"] },
    { type: "select", prop: "status", label: "Status", options: ["none", "online", "offline", "busy", "away"] },
    { type: "number", prop: "max", label: "Group max", min: 1, max: 5, step: 1 },
    { type: "select", prop: "spacing", label: "Group spacing", options: ["tight", "normal"] },
  ],
  snippet: (props) => {
    const avatar = toJsx<Record<string, unknown>>(
      "Avatar",
      { name: "Ada Lovelace", size: props.size, shape: props.shape, status: props.status === "none" ? undefined : props.status },
      { size: "md", shape: "circle" },
    );
    const group = toJsx<Record<string, unknown>>(
      "AvatarGroup",
      { max: props.max, size: props.size, spacing: props.spacing },
      { size: "md", spacing: "normal" },
      people.map((name) => `<Avatar name="${name}" />`).join("\n"),
    ).replace(
      "<AvatarGroup",
      "<AvatarGroup renderTooltip={(avatar, name) => <Tooltip content={name}>{avatar}</Tooltip>}",
    );
    return `${avatar}\n\n${group}`;
  },
  propsTable: propDocs<AvatarProps & AvatarGroupProps>()([
    { name: "src", type: "string", description: "Image URL; fades in on load, falls back on error." },
    { name: "name", type: "string", description: "Initials (max 2) and accessible name fallback." },
    { name: "alt", type: "string", description: "Accessible name; with neither alt nor name the avatar is decorative." },
    { name: "fallback", type: "ReactNode", description: "Overrides the initials." },
    { name: "size", type: '"xs" | "sm" | "md" | "lg" | "xl"', default: '"md"', description: "24 / 32 / 40 / 48 / 64 px; AvatarGroup provides it to children." },
    { name: "shape", type: '"circle" | "square"', default: '"circle"', description: "Corner style." },
    { name: "status", type: '"online" | "offline" | "busy" | "away"', description: "Status dot, included in the accessible name." },
    { name: "statusLabel", type: "string", description: "Status text; defaults to the capitalized status." },
    { name: "max", type: "number", description: "AvatarGroup: extra avatars collapse into +N." },
    { name: "spacing", type: '"tight" | "normal"', default: '"normal"', description: "AvatarGroup overlap." },
    {
      name: "renderTooltip",
      type: "(avatar: ReactElement, name: string) => ReactNode",
      description: "AvatarGroup: wrap each avatar in your tooltip, e.g. <Tooltip content={name}>{avatar}</Tooltip>.",
    },
    { name: "tooltips", type: "boolean", default: "true", description: "AvatarGroup: false skips renderTooltip." },
    { name: "overflowLabel", type: "(count: number) => string", default: "n => `${n} more`", description: "Accessible name of the +N avatar." },
  ]),
  a11y: [
    'Named avatars are role="img" with alt ?? name as the label.',
    "Grouped avatars lift on hover; the +N avatar is labelled by overflowLabel.",
    "Initials sit on a soft token tint picked from the name, with foreground text for contrast.",
  ],
  reducedMotion: "No hover lift; the image still fades in.",
};

export default item;
