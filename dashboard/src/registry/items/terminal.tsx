import { Terminal, TerminalLine, type TerminalProps } from "changelui";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  title: string;
  prompt: string;
  typeSpeedMs: number;
  appearance: NonNullable<TerminalProps["appearance"]>;
  copyable: boolean;
  loop: boolean;
};

const defaults: DemoProps = {
  title: "~/projects/my-app",
  prompt: "$",
  typeSpeedMs: 45,
  appearance: "dark",
  copyable: true,
  loop: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "title", label: "Title", maxLength: 40 },
  { type: "text", prop: "prompt", label: "Prompt", maxLength: 12 },
  { type: "number", prop: "typeSpeedMs", label: "Type speed (ms)", min: 10, max: 140, step: 5 },
  { type: "select", prop: "appearance", label: "Appearance", options: ["dark", "auto"] },
  { type: "boolean", prop: "copyable", label: "Copy buttons" },
  { type: "boolean", prop: "loop", label: "Loop" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <Terminal {...props} trigger="mount" className="max-w-xl">
      <TerminalLine type="command">npm install changelui</TerminalLine>
      <TerminalLine type="progress" duration={1.4}>
        Installing
      </TerminalLine>
      <TerminalLine tone="success">✓ added 4 packages in 1.4s</TerminalLine>
      <TerminalLine type="command">npm run dev</TerminalLine>
      <TerminalLine delay={0.4}>VITE ready in 212 ms</TerminalLine>
      <TerminalLine tone="primary">➜ Local: http://127.0.0.1:5173/</TerminalLine>
    </Terminal>
  );
}

function DeployDemo() {
  return (
    <Terminal title="deploy — production" prompt="❯" typeSpeedMs={35} className="max-w-xl">
      <TerminalLine type="command">git push origin main</TerminalLine>
      <TerminalLine>Enumerating objects: 18, done.</TerminalLine>
      <TerminalLine type="progress" duration={1}>
        Uploading
      </TerminalLine>
      <TerminalLine type="command" delay={0.6}>
        npx deploy --prod
      </TerminalLine>
      <TerminalLine tone="info">▲ Building 42 pages…</TerminalLine>
      <TerminalLine tone="warning" delay={0.5}>
        ! 1 image larger than 500 kB (hero.png)
      </TerminalLine>
      <TerminalLine tone="success" delay={0.6}>
        ✓ Deployed to https://example.com in 18s
      </TerminalLine>
    </Terminal>
  );
}

function TestDemo() {
  return (
    <Terminal
      title="tests"
      appearance="auto"
      copyable={false}
      loop
      loopDelayMs={4000}
      className="max-w-md"
      lines={[
        { type: "command", children: "npm test" },
        { children: "PASS  src/button.test.tsx", tone: "success", delay: 0.5 },
        { children: "PASS  src/dialog.test.tsx", tone: "success", delay: 0.3 },
        { children: "FAIL  src/toast.test.tsx", tone: "danger", delay: 0.3 },
        { children: "  expected 3 toasts, received 2", tone: "muted" },
        { children: "Tests: 1 failed, 41 passed, 42 total", delay: 0.4 },
      ]}
    />
  );
}

function OnboardingDemo() {
  return (
    <div className="grid w-full items-center gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-widest text-pui-primary-text uppercase">Quick start</span>
        <h3 className="m-0 font-pui-display text-2xl font-bold tracking-tight text-pui-foreground">Up and running in a minute</h3>
        <p className="m-0 text-sm text-pui-muted-foreground">
          One install, one import. Hover a command to copy it, or press replay in the title bar.
        </p>
      </div>
      <Terminal title="zsh" prompt="%" typeSpeedMs={30}>
        <TerminalLine type="command">npx create-app@latest my-app</TerminalLine>
        <TerminalLine tone="muted">? Pick a template › dashboard</TerminalLine>
        <TerminalLine type="progress" duration={1.2}>
          Scaffolding
        </TerminalLine>
        <TerminalLine type="command">cd my-app && npm run dev</TerminalLine>
        <TerminalLine tone="success">ready on http://127.0.0.1:3000</TerminalLine>
      </Terminal>
    </div>
  );
}

function Mini() {
  return (
    <Terminal title="zsh" trigger="mount" copyable={false} replayable={false} className="w-56 text-[11px] [&>div:last-child]:p-3">
      <TerminalLine type="command">npm i changelui</TerminalLine>
      <TerminalLine tone="success">✓ done</TerminalLine>
    </Terminal>
  );
}

const quote = (value: string) => (value.includes('"') ? `{${JSON.stringify(value)}}` : `"${value}"`);

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs: string[] = [];
    if (props.title !== "Terminal") attrs.push(`title=${quote(props.title)}`);
    if (props.prompt !== "$") attrs.push(`prompt=${quote(props.prompt)}`);
    if (props.typeSpeedMs !== 45) attrs.push(`typeSpeedMs={${props.typeSpeedMs}}`);
    if (props.appearance !== "dark") attrs.push(`appearance="${props.appearance}"`);
    if (!props.copyable) attrs.push("copyable={false}");
    if (props.loop) attrs.push("loop");
    return [
      `<Terminal${attrs.length ? ` ${attrs.join(" ")}` : ""}>`,
      `  <TerminalLine type="command">npm install changelui</TerminalLine>`,
      `  <TerminalLine type="progress" duration={1.4}>Installing</TerminalLine>`,
      `  <TerminalLine tone="success">✓ added 4 packages in 1.4s</TerminalLine>`,
      `  <TerminalLine type="command">npm run dev</TerminalLine>`,
      `  <TerminalLine delay={0.4}>VITE ready in 212 ms</TerminalLine>`,
      `</Terminal>`,
    ].join("\n");
  },
  propsTable: [
    ...propDocs<TerminalProps>()([
      { name: "children", type: "ReactNode", description: "TerminalLine elements (direct children or inside fragments)." },
      { name: "lines", type: "TerminalLineProps[]", description: "Lines as data, after any children." },
      { name: "title", type: "string", default: '"Terminal"', description: "Window title and accessible name." },
      { name: "prompt", type: "string", default: '"$"', description: "Default prompt for commands." },
      { name: "typeSpeedMs", type: "number", default: "45", description: "Average ms per typed character, with a little human jitter." },
      { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the session starts." },
      { name: "once", type: "boolean", default: "true", description: "Start once, or every time it enters the viewport." },
      { name: "delay", type: "number", default: "0", description: "Seconds before the first line." },
      { name: "loop", type: "boolean", default: "false", description: "Replay after the session ends." },
      { name: "loopDelayMs", type: "number", default: "3000", description: "Pause before a loop restarts." },
      { name: "copyable", type: "boolean", default: "true", description: "Copy buttons on commands." },
      { name: "replayable", type: "boolean", default: "true", description: "Replay button in the title bar." },
      { name: "appearance", type: '"dark" | "auto"', default: '"dark"', description: "Always-dark window, or follow the page theme." },
      { name: "replayLabel", type: "string", default: '"Replay"', description: "Accessible name of the replay button." },
      { name: "onComplete", type: "() => void", description: "Called after the last line." },
    ]),
    { name: "TerminalLine type", type: '"command" | "output" | "progress"', default: '"output"', description: "Typed command, fading output or a filling text progress bar." },
    { name: "TerminalLine tone", type: '"default" | "muted" | "primary" | "success" | "warning" | "danger" | "info"', description: "Line color; output defaults to muted." },
    { name: "TerminalLine delay", type: "number", default: "0.35 / 0.08", description: "Seconds before the line starts (commands / others)." },
    { name: "TerminalLine prompt", type: "string", description: "Prompt override for one command." },
    { name: "TerminalLine duration", type: "number", default: "1.2", description: "Seconds a progress line takes to fill." },
    { name: "TerminalLine copyable", type: "boolean", description: "Per-command copy override." },
  ],
  a11y: [
    "The window is a labelled group; the whole transcript is in an sr-only pre, so screen readers never hear half-typed text.",
    "Copy buttons are named after their command and appear on hover or keyboard focus once the command is typed.",
    "Height is reserved for every line up front, so nothing below the terminal shifts while it plays.",
  ],
  reducedMotion: "Every line is shown at once, progress bars are full and the cursor does not blink.",
  examples: [
    { title: "Deploy log", description: "Custom prompt, info, warning and success tones, per-line delays.", Demo: DeployDemo },
    { title: "Test run", description: 'lines as data, appearance="auto" and loop.', Demo: TestDemo },
    { title: "Quick start section", description: "A landing-page block with copyable commands.", Demo: OnboardingDemo, wide: true },
  ],
};
export default item;
