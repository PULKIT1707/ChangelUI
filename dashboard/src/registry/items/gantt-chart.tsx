import { GanttChart, type GanttChartProps, type GanttTask } from "changelui";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { PLAN_TODAY, projectPlan, sprintPlan, useSeed } from "../../lib/chart-data";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { scale: "day" | "week" | "month"; editable: boolean; criticalPath: boolean; dependencies: boolean; rowHeight: number; labelWidth: number };
const defaults: DemoProps = { scale: "week", editable: true, criticalPath: true, dependencies: true, rowHeight: 34, labelWidth: 200 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "scale", label: "Scale", options: ["day", "week", "month"] },
  { type: "boolean", prop: "editable", label: "Editable" },
  { type: "boolean", prop: "criticalPath", label: "Critical path" },
  { type: "boolean", prop: "dependencies", label: "Dependencies" },
  { type: "number", prop: "rowHeight", label: "Row height", min: 26, max: 48, step: 2 },
  { type: "number", prop: "labelWidth", label: "Task column", min: 140, max: 280, step: 10 },
];

function Preview({ props }: { props: DemoProps }) {
  const [seed, randomize] = useSeed(2);
  const tasks = useMemo(() => projectPlan(seed), [seed]);
  const [last, setLast] = useState<string | null>(null);
  return (
    <ChartDemo onRandomize={randomize} hint="Drag a bar to move it or its edges to resize; hover to light the dependency chain; Ctrl/Cmd + wheel zooms.">
      <GanttChart
        tasks={tasks}
        scale={props.scale}
        editable={props.editable}
        criticalPath={props.criticalPath}
        dependencies={props.dependencies}
        rowHeight={props.rowHeight}
        labelWidth={props.labelWidth}
        today={PLAN_TODAY}
        onTasksChange={(_, changed) => setLast(`${changed.name}: ${changed.start} \u2192 ${changed.end}`)}
        title="Launch plan"
        description="Discovery, design, build and launch"
        className="w-full"
      />
      <p className="text-xs text-pui-muted-foreground" aria-live="polite">
        {last ? `Last edit: ${last}` : "No edits yet. Dragging a task past its successor's start flags a conflict."}
      </p>
    </ChartDemo>
  );
}

function Mini() {
  const tasks = useMemo(() => projectPlan(4).slice(0, 7).map((t) => ({ ...t, group: undefined })), []);
  return <GanttChart tasks={tasks} scale="month" labelWidth={70} rowHeight={18} animation="never" className="w-64 [&_[role=row]]:text-[0px] [&_text]:hidden" />;
}

function Sprint() {
  const [seed, randomize] = useSeed(3);
  const tasks = useMemo(() => sprintPlan(seed), [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="Day scale with weekend shading and a milestone; groups collapse from the task column.">
      <GanttChart tasks={tasks} scale="day" editable today="2026-04-09" labelWidth={160} title="Sprint 14" className="w-full" />
    </ChartDemo>
  );
}

function Controlled() {
  const [tasks, setTasks] = useState<GanttTask[]>(() => projectPlan(7).filter((t) => t.group !== "Launch"));
  const [collapsed, setCollapsed] = useState<string[]>(["Discovery"]);
  const total = tasks.reduce((a, t) => (t.end > a ? t.end : a), "");
  return (
    <div className="flex w-full flex-col gap-2">
      <GanttChart
        tasks={tasks}
        onTasksChange={(next) => setTasks(next)}
        editable
        collapsedGroups={collapsed}
        onCollapsedGroupsChange={setCollapsed}
        scale="week"
        dependencies
        today={PLAN_TODAY}
        className="w-full"
      />
      <p className="text-sm" aria-live="polite">
        Ends <strong>{total}</strong> &middot; collapsed: {collapsed.length ? collapsed.join(", ") : "none"}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) =>
    [
      "<GanttChart",
      "  tasks={tasks} // [{ id, name, start, end, progress?, group?, dependsOn?, milestone? }]",
      "  onTasksChange={(next) => setTasks(next)}",
      p.scale !== "week" ? `  scale="${p.scale}"` : null,
      p.editable ? "  editable" : null,
      p.criticalPath ? "  criticalPath" : null,
      p.dependencies ? null : "  dependencies={false}",
      p.rowHeight !== 34 ? `  rowHeight={${p.rowHeight}}` : null,
      p.labelWidth !== 200 ? `  labelWidth={${p.labelWidth}}` : null,
      '  today="2026-04-05"',
      "/>",
    ]
      .filter(Boolean)
      .join("\n"),
  propsTable: propDocs<GanttChartProps>()([
    { name: "tasks", type: "GanttTask[]", required: true, description: "{ id, name, start, end, progress?, group?, dependsOn?, milestone?, color?, assignee? }; dates are inclusive ISO days." },
    { name: "onTasksChange", type: "(tasks, changed) => void", description: "The full next list after a drag or keyboard edit." },
    { name: "scale", type: '"day" | "week" | "month"', default: '"week"', description: "Time scale (Ctrl/Cmd + wheel and the +/- buttons zoom it)." },
    { name: "editable", type: "boolean", default: "false", description: "Drag to move or resize (snaps to days), Alt + arrows." },
    { name: "criticalPath", type: "boolean", default: "false", description: "Highlights the zero-slack chain that ends the project." },
    { name: "dependencies", type: "boolean", default: "true", description: "Elbow-routed arrows; conflicts are dashed red." },
    { name: "today", type: '"YYYY-MM-DD"', description: "Today line (explicit so server and client agree)." },
    { name: "collapsedGroups", type: "string[]", description: "Controlled collapsed groups (defaultCollapsedGroups / onCollapsedGroupsChange)." },
    { name: "rowHeight", type: "number", default: "34", description: "Row height in px." },
    { name: "labelWidth", type: "number", default: "200", description: "Task column width in px." },
    { name: "onTaskClick", type: "(task, event) => void", description: "Click or Enter on a task." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the task list (treegrid)" },
    { keys: "↑ / ↓", action: "Previous / next row (announced with dates, progress and dependencies)" },
    { keys: "← / →", action: "Collapse / expand a group; ← on a task goes to its group" },
    { keys: "Enter / Space", action: "Toggle a group or activate a task" },
    { keys: "Alt + ← / →", action: "Move the task by a day (a week on the month scale)" },
    { keys: "Alt + Shift + ← / →", action: "Resize the task's end" },
    { keys: "+ / −", action: "Zoom the timeline" },
  ],
  a11y: [
    "The task column is a treegrid with levels and expanded states; each row has a full text description.",
    "Dependency conflicts and critical tasks are stated in words, not only in color.",
    "Edits are announced in a live region.",
  ],
  reducedMotion: "Bars appear at full length and edits snap without a settle spring.",
  examples: [
    { title: "Sprint board", description: "Day scale, weekends and a milestone.", Demo: Sprint, wide: true },
    { title: "Controlled", description: "Tasks and collapsed groups held by the parent.", Demo: Controlled, wide: true },
  ],
};
export default item;
