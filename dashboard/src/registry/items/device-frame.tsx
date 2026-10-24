import { Avatar, Badge, Button, DeviceFrame, Sparkline, type DeviceFrameProps } from "changelui";
import { useRef } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  device: NonNullable<DeviceFrameProps["device"]>;
  url: string;
  glow: boolean;
  scrollTilt: boolean;
};

const defaults: DemoProps = { device: "browser", url: "app.example.com", glow: true, scrollTilt: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "device", label: "Device", options: ["browser", "laptop", "phone"] },
  { type: "text", prop: "url", label: "URL", maxLength: 40 },
  { type: "boolean", prop: "glow", label: "Glow" },
  { type: "boolean", prop: "scrollTilt", label: "Scroll tilt (scroll the stage)" },
];

const REVENUE = [12, 14, 13, 17, 19, 18, 22, 24, 23, 27, 29, 31];

/** Live UI that fills a desktop screen. */
function AppScreen() {
  return (
    <div className="flex h-full text-[11px]">
      <aside className="hidden w-[22%] flex-col gap-1.5 border-r border-pui-border bg-pui-surface p-3 sm:flex">
        <span className="mb-2 text-xs font-semibold text-pui-foreground">Northwind</span>
        {["Overview", "Customers", "Invoices", "Reports", "Settings"].map((label, i) => (
          <span
            key={label}
            className={`rounded-pui-md px-2 py-1 ${i === 0 ? "bg-pui-primary/12 font-medium text-pui-primary-text" : "text-pui-muted-foreground"}`}
          >
            {label}
          </span>
        ))}
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-pui-foreground">Overview</span>
          <Badge size="sm" variant="soft" tone="success">
            +18% this month
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["MRR", "$48.2k"],
            ["Customers", "1,284"],
            ["Churn", "1.9%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-pui-lg border border-pui-border bg-pui-surface p-2">
              <p className="m-0 text-pui-muted-foreground">{label}</p>
              <p className="m-0 text-sm font-semibold text-pui-foreground tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-2">
          <span className="text-pui-muted-foreground">Revenue</span>
          <Sparkline data={REVENUE} variant="area" fluid height={150} className="mt-2" aria-label="Revenue trend" />
        </div>
      </main>
    </div>
  );
}

/** Live UI that fills a phone screen. */
function PhoneScreen() {
  return (
    <div className="flex h-full flex-col gap-3 px-4 pt-11 pb-6 text-xs">
      <div className="flex items-center gap-2">
        <Avatar name="Ada Park" size="sm" />
        <div>
          <p className="m-0 text-pui-muted-foreground">Good morning</p>
          <p className="m-0 text-sm font-semibold text-pui-foreground">Ada</p>
        </div>
      </div>
      <div className="rounded-pui-xl bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 p-4 text-pui-primary-foreground">
        <p className="m-0 text-[11px] opacity-90">Balance</p>
        <p className="m-0 text-2xl font-bold tabular-nums">$4,820.10</p>
      </div>
      <div className="flex flex-col gap-2">
        {[
          ["Coffee Lab", "−$4.50"],
          ["Salary", "+$3,200.00"],
          ["Metro card", "−$30.00"],
          ["Bookshop", "−$18.20"],
        ].map(([name, amount]) => (
          <div key={name} className="flex items-center justify-between rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2">
            <span className="text-pui-foreground">{name}</span>
            <span className={`tabular-nums ${amount?.startsWith("+") ? "text-pui-success-text" : "text-pui-muted-foreground"}`}>{amount}</span>
          </div>
        ))}
      </div>
      <Button size="sm" className="mt-auto w-full">
        Send money
      </Button>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const box = useRef<HTMLDivElement>(null);
  const screen = props.device === "phone" ? <PhoneScreen /> : <AppScreen />;
  const frame = (
    <DeviceFrame {...props} container={props.scrollTilt ? box : undefined} className={props.device === "phone" ? "mx-auto w-64" : "mx-auto max-w-2xl"}>
      {screen}
    </DeviceFrame>
  );
  if (!props.scrollTilt) return <div className="w-full py-4">{frame}</div>;
  return (
    <div ref={box} tabIndex={0} role="region" aria-label="Scroll to settle the device" className="h-[440px] w-full overflow-y-auto rounded-pui-lg outline-none focus-visible:ring-2 focus-visible:ring-pui-ring">
      <div className="flex h-56 items-end justify-center pb-6 text-sm text-pui-muted-foreground">Scroll down ↓</div>
      {frame}
      <div className="h-64" />
    </div>
  );
}

function ScreenshotDemo() {
  return (
    <DeviceFrame url="docs.example.com/getting-started" className="mx-auto max-w-lg">
      <div className="flex h-full flex-col gap-2 p-4">
        <span className="h-3 w-1/3 rounded-pui-sm bg-pui-foreground/70" />
        <span className="h-2 w-5/6 rounded-pui-sm bg-pui-muted" />
        <span className="h-2 w-4/6 rounded-pui-sm bg-pui-muted" />
        <div className="mt-2 rounded-pui-md bg-pui-muted p-3 font-mono text-[10px] text-pui-muted-foreground">npm create example@latest</div>
        <span className="mt-2 h-2 w-3/4 rounded-pui-sm bg-pui-muted" />
        <span className="h-2 w-2/3 rounded-pui-sm bg-pui-muted" />
      </div>
    </DeviceFrame>
  );
}

function PairDemo() {
  return (
    <div className="flex items-end justify-center gap-4">
      <DeviceFrame device="laptop" url="app.example.com" className="max-w-sm flex-1">
        <AppScreen />
      </DeviceFrame>
      <DeviceFrame device="phone" time="" className="w-28 shrink-0">
        <div className="flex h-full flex-col gap-1.5 px-2 pt-8 text-[8px]">
          <span className="h-10 rounded-pui-md bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3" />
          <span className="h-4 rounded-pui-sm bg-pui-muted" />
          <span className="h-4 rounded-pui-sm bg-pui-muted" />
          <span className="h-4 rounded-pui-sm bg-pui-muted" />
        </div>
      </DeviceFrame>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-52">
      <DeviceFrame url="app.example.com">
        <div className="flex h-full flex-col gap-1.5 p-2">
          <span className="h-2 w-1/3 rounded-pui-sm bg-pui-foreground/60" />
          <div className="grid flex-1 grid-cols-3 gap-1.5">
            <span className="rounded-pui-sm bg-pui-primary/20" />
            <span className="rounded-pui-sm bg-pui-muted" />
            <span className="rounded-pui-sm bg-pui-muted" />
          </div>
        </div>
      </DeviceFrame>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>("DeviceFrame", props, { ...defaults, glow: false }, "<Dashboard />", controls as ControlSpec<Record<string, unknown>>[]),
  propsTable: propDocs<DeviceFrameProps>()([
    { name: "device", type: '"browser" | "phone" | "laptop"', default: '"browser"', description: "Frame style." },
    { name: "url", type: "string", default: '"app.example.com"', description: "Address bar text (browser, laptop)." },
    { name: "time", type: "string", default: '"9:41"', description: "Status bar time (phone)." },
    { name: "scrollTilt", type: "boolean", default: "false", description: "Leans back in 3D and settles flat as it scrolls into view." },
    { name: "tiltAngle", type: "number", default: "20", description: "Starting tilt in degrees." },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll container for scrollTilt; default the window." },
    { name: "aspectRatio", type: "string", default: '"16 / 10" | "9 / 19.5"', description: "Screen aspect ratio." },
    { name: "glow", type: "boolean", default: "false", description: "Soft gradient glow behind the device." },
    { name: "screenClassName", type: "string", description: "Classes for the screen area." },
  ]),
  a11y: [
    "Chrome (dots, address bar, status bar, notch) is aria-hidden; only your screen content is exposed.",
    "Live content inside stays fully interactive and keyboard reachable.",
  ],
  reducedMotion: "scrollTilt is ignored: the device renders flat.",
  examples: [
    { title: "Docs screenshot", description: "A browser frame around a static mockup.", Demo: ScreenshotDemo, wide: true },
    { title: "Laptop and phone", description: "Pair devices for responsive launches.", Demo: PairDemo, wide: true },
  ],
};

export default item;
