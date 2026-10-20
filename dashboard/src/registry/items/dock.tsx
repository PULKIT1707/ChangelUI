import { Dock, DockItem, DockSeparator, type DockProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  itemSize: number;
  magnifiedSize: number;
  distance: number;
};

const defaults: DemoProps = { itemSize: 40, magnifiedSize: 64, distance: 140 };

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const apps = [
  { label: "Home", d: "M3 10.5 12 3l9 7.5V21H3z" },
  { label: "Search", d: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" },
  { label: "Mail", d: "M3 6h18v12H3zM3 6l9 7 9-7" },
  { label: "Calendar", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
];

function Preview({ props }: { props: DemoProps }) {
  const [active, setActive] = useState("Home");
  return (
    <Dock {...props}>
      {apps.map((app) => (
        <DockItem key={app.label} label={app.label} active={active === app.label} onClick={() => setActive(app.label)}>
          <Glyph d={app.d} />
        </DockItem>
      ))}
      <DockSeparator />
      <DockItem label="Settings">
        <Glyph d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2m12 0h2M12 4v2m0 12v2" />
      </DockItem>
    </Dock>
  );
}

function Mini() {
  return (
    <Dock itemSize={32} magnifiedSize={48} distance={100}>
      {apps.slice(0, 3).map((app) => (
        <DockItem key={app.label} label={app.label} active={app.label === "Home"}>
          <Glyph d={app.d} />
        </DockItem>
      ))}
    </Dock>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "number", prop: "itemSize", label: "Item size", min: 28, max: 56, step: 2 },
    { type: "number", prop: "magnifiedSize", label: "Magnified size", min: 40, max: 96, step: 2 },
    { type: "number", prop: "distance", label: "Distance", min: 60, max: 240, step: 10 },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Dock",
      props,
      defaults,
      [
        '<DockItem label="Home" active>',
        "  <HomeIcon />",
        "</DockItem>",
        '<DockItem label="Mail">',
        "  <MailIcon />",
        "</DockItem>",
        "<DockSeparator />",
        '<DockItem label="Settings">',
        "  <SettingsIcon />",
        "</DockItem>",
      ].join("\n"),
    ),
  propsTable: propDocs<DockProps & { label: string; active: boolean; asChild: boolean }>()([
    { name: "itemSize", type: "number", default: "40", description: "Dock: resting item size in px." },
    { name: "magnifiedSize", type: "number", default: "64", description: "Dock: size under the pointer or keyboard focus." },
    { name: "distance", type: "number", default: "140", description: "Dock: pointer influence radius in px." },
    { name: "label", type: "string", description: "DockItem: accessible name and tooltip.", required: true },
    { name: "active", type: "boolean", default: "false", description: "DockItem: show the indicator dot." },
    { name: "asChild", type: "boolean", default: "false", description: "DockItem: render the child (e.g. a link)." },
  ]),
  keyboard: [
    { keys: "Left / Right", action: "Previous / next item" },
    { keys: "Home / End", action: "First / last item" },
  ],
  a11y: ['role=toolbar (default name "Dock") with one tab stop.', "Each item is named by its label, which also shows as a tooltip."],
  reducedMotion: "No magnification.",
};

export default item;
