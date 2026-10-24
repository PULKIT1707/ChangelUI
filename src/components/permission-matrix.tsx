"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { ArrowUpIcon, ChevronDownIcon, LockIcon, TriangleAlertIcon } from "../lib/icons";
import { easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./dropdown-menu";
export interface PermissionRole {
  id: string;
  name: string;
  description?: string;
  /** Can't be edited (e.g. Owner); its cells are read-only. */
  locked?: boolean;
  /** Why the role is locked, shown in its header. */
  lockedReason?: string;
}
export interface PermissionResource {
  id: string;
  name: string;
  description?: string;
  /** Granting the top two levels here is flagged in the change summary. */
  sensitive?: boolean;
}
export interface PermissionLevel {
  value: string;
  label: string;
  description?: string;
}
/** role id → resource id → level value. Missing cells are the lowest level. */
export type PermissionValue = Readonly<Record<string, Readonly<Record<string, string>>>>;
export interface PermissionChange {
  roleId: string;
  resourceId: string;
  from: string;
  to: string;
  /** "grant" raises access, "revoke" lowers it. */
  direction: "grant" | "revoke";
  /** A grant of one of the top two levels on a sensitive resource. */
  sensitive: boolean;
}
export interface PermissionMatrixProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  roles: readonly PermissionRole[];
  resources: readonly PermissionResource[];
  /** Levels from least to most access. Default none / read / write / admin. */
  levels?: readonly PermissionLevel[];
  value?: PermissionValue;
  defaultValue?: PermissionValue;
  onValueChange?: (value: PermissionValue) => void;
  /** The saved state that changes are counted against. Default: the value at mount, then each save. */
  baseline?: PermissionValue;
  /** Shows the change bar with Save; a returned promise shows a pending state. */
  onSave?: (changes: PermissionChange[], value: PermissionValue) => void | Promise<void>;
  /** Called by Discard after the value resets to the baseline. */
  onDiscard?: () => void;
  /** Accessible name of the grid. Default "Permissions". */
  label?: string;
  /** Heading of the first column. Default "Resource". */
  resourceHeader?: React.ReactNode;
}
export const DEFAULT_PERMISSION_LEVELS: readonly PermissionLevel[] = [
  { value: "none", label: "No access" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
  { value: "admin", label: "Admin" },
];
// Tone per level index, low to high. The bar count carries the same information without color.
const levelColors = ["var(--pui-muted-foreground)", "var(--pui-info)", "var(--pui-primary)", "var(--pui-warning)"];
const levelColor = (index: number, count: number) => {
  if (index <= 0) return levelColors[0];
  const slot = Math.round((index / Math.max(1, count - 1)) * 3);
  return levelColors[Math.min(3, Math.max(1, slot))];
};
const EMPTY: PermissionValue = {};
/** Every cell whose level differs from the baseline, in role then resource order. */
export function diffPermissions(
  roles: readonly PermissionRole[],
  resources: readonly PermissionResource[],
  levels: readonly PermissionLevel[],
  baseline: PermissionValue,
  value: PermissionValue,
): PermissionChange[] {
  const lowest = levels[0]?.value ?? "";
  const rank = (v: string) => Math.max(0, levels.findIndex((l) => l.value === v));
  const changes: PermissionChange[] = [];
  for (const role of roles) {
    for (const resource of resources) {
      const from = baseline[role.id]?.[resource.id] ?? lowest;
      const to = value[role.id]?.[resource.id] ?? lowest;
      if (from === to) continue;
      const direction = rank(to) > rank(from) ? "grant" : "revoke";
      changes.push({
        roleId: role.id,
        resourceId: resource.id,
        from,
        to,
        direction,
        sensitive: direction === "grant" && resource.sensitive === true && rank(to) >= levels.length - 2,
      });
    }
  }
  return changes;
}
function LevelBars({ index, count, reduced }: { index: number; count: number; reduced: boolean }) {
  const color = levelColor(index, count);
  return (
    <span aria-hidden="true" className={cn(blockReset, "flex items-end gap-0.5")}>
      {Array.from({ length: count - 1 }, (_, i) => (
        <motion.span
          key={i}
          data-level={i + 1}
          initial={false}
          animate={{ backgroundColor: i < index ? color : "var(--pui-muted)" }}
          transition={reduced ? { duration: 0 } : { duration: 0.18, ease: easings.out, delay: i * 0.03 }}
          className={cn(blockReset, "block w-1.5 rounded-[2px]")}
          style={{ height: `${8 + i * 3}px` }}
        />
      ))}
    </span>
  );
}
/**
 * Roles × resources access grid for settings pages. Each cell shows its level as bars plus a word
 * (never color alone); click a bar to set that level or the word to step up, and set a whole row or
 * column from its header. Changed cells are marked, and a change bar lists every grant and revoke
 * (flagging risky grants on sensitive resources) before Save. Keyboard: arrows move between cells,
 * Space raises, Shift+Space lowers, digits pick a level.
 */
export const PermissionMatrix = React.forwardRef<HTMLDivElement, PermissionMatrixProps>(function PermissionMatrix(
  {
    roles,
    resources,
    levels = DEFAULT_PERMISSION_LEVELS,
    value: valueProp,
    defaultValue = EMPTY,
    onValueChange,
    baseline: baselineProp,
    onSave,
    onDiscard,
    label = "Permissions",
    resourceHeader = "Resource",
    className,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const hintId = React.useId();
  const [value, setValue] = useControllableState<PermissionValue>({ value: valueProp, defaultValue, onChange: onValueChange });
  const [savedBaseline, setSavedBaseline] = React.useState<PermissionValue>(value);
  const baseline = baselineProp ?? savedBaseline;
  const [pending, setPending] = React.useState(false);
  const [showList, setShowList] = React.useState(false);
  const [focus, setFocus] = React.useState({ r: 0, c: 0 });
  const cells = React.useRef(new Map<string, HTMLButtonElement>());
  const lowest = levels[0]?.value ?? "";
  const rankOf = (v: string) => Math.max(0, levels.findIndex((l) => l.value === v));
  const levelOf = (roleId: string, resourceId: string) => value[roleId]?.[resourceId] ?? lowest;
  const baseOf = (roleId: string, resourceId: string) => baseline[roleId]?.[resourceId] ?? lowest;
  const changes = React.useMemo(() => diffPermissions(roles, resources, levels, baseline, value), [roles, resources, levels, baseline, value]);
  const update = (edits: { roleId: string; resourceId: string; level: string }[]) => {
    const next: Record<string, Record<string, string>> = { ...value };
    for (const { roleId, resourceId, level } of edits) {
      if (roles.find((r) => r.id === roleId)?.locked) continue;
      next[roleId] = { ...next[roleId], [resourceId]: level };
    }
    setValue(next);
  };
  const setCell = (roleId: string, resourceId: string, index: number) => {
    const level = levels[Math.min(levels.length - 1, Math.max(0, index))];
    if (level) update([{ roleId, resourceId, level: level.value }]);
  };
  const moveFocus = (r: number, c: number) => {
    const rr = Math.min(resources.length - 1, Math.max(0, r));
    const cc = Math.min(roles.length - 1, Math.max(0, c));
    setFocus({ r: rr, c: cc });
    cells.current.get(`${rr}:${cc}`)?.focus();
  };
  const onCellKey = (event: React.KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const role = roles[c];
    const resource = resources[r];
    if (!role || !resource) return;
    const rank = rankOf(levelOf(role.id, resource.id));
    const { key } = event;
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = moves[key];
    if (move) {
      event.preventDefault();
      const rtl = typeof getComputedStyle === "function" && getComputedStyle(event.currentTarget).direction === "rtl";
      moveFocus(r + move[0], c + (rtl ? -move[1] : move[1]));
    } else if (key === "Home") {
      event.preventDefault();
      moveFocus(event.ctrlKey ? 0 : r, 0);
    } else if (key === "End") {
      event.preventDefault();
      moveFocus(event.ctrlKey ? resources.length - 1 : r, roles.length - 1);
    } else if (key === " " || key === "Enter") {
      event.preventDefault();
      if (role.locked) return;
      setCell(role.id, resource.id, event.shiftKey ? rank - 1 : (rank + 1) % levels.length);
    } else if (/^[0-9]$/.test(key) && Number(key) < levels.length) {
      event.preventDefault();
      if (!role.locked) setCell(role.id, resource.id, Number(key));
    }
  };
  const save = () => {
    if (!onSave || pending || changes.length === 0) return;
    const snapshot = value;
    const done = () => {
      setPending(false);
      setSavedBaseline(snapshot);
      setShowList(false);
    };
    const result = onSave(changes, snapshot);
    if (result && typeof result.then === "function") {
      setPending(true);
      result.then(done, () => setPending(false));
    } else done();
  };
  const discard = () => {
    setValue(baseline);
    setShowList(false);
    onDiscard?.();
  };
  const nameOf = (list: readonly { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const labelOfLevel = (v: string) => levels.find((l) => l.value === v)?.label ?? v;
  const grants = changes.filter((ch) => ch.direction === "grant").length;
  const risky = changes.filter((ch) => ch.sensitive).length;
  return (
    <div ref={ref} {...props} className={cn(blockReset, "flex w-full min-w-0 flex-col gap-3 text-pui-foreground", className)}>
      <div className={cn(blockReset, "w-full overflow-x-auto rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground")}>
        <table role="grid" aria-label={label} aria-describedby={hintId} className={cn(blockReset, "w-full border-collapse text-sm")}>
          <thead>
            <tr className={cn(blockReset, "border-b border-pui-border")}>
              <th scope="col" className={cn(blockReset, "sticky start-0 z-10 bg-pui-surface px-4 py-2.5 text-start text-xs font-medium text-pui-muted-foreground")}>
                {resourceHeader}
              </th>
              {roles.map((role) => (
                <th key={role.id} scope="col" className={cn(blockReset, "px-2 py-2 text-start align-bottom font-medium")}>
                  {role.locked ? (
                    <span className={cn(blockReset, "flex flex-col px-2")} title={role.lockedReason}>
                      <span className={cn(blockReset, "flex items-center gap-1.5")}>
                        {role.name}
                        <LockIcon className="size-3.5 text-pui-muted-foreground" />
                        <span className={cn(blockReset, "sr-only")}>(locked{role.lockedReason ? `: ${role.lockedReason}` : ""})</span>
                      </span>
                      {role.description ? <span className={cn(blockReset, "text-xs font-normal text-pui-muted-foreground")}>{role.description}</span> : null}
                    </span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`${role.name}: set access for every resource`}
                        className={cn(
                          controlReset,
                          focusRing,
                          "group flex w-full cursor-pointer flex-col rounded-pui-md px-2 py-1 text-start transition-colors hover:bg-pui-muted data-[state=open]:bg-pui-muted",
                        )}
                      >
                        <span className={cn(blockReset, "flex items-center gap-1")}>
                          {role.name}
                          <ChevronDownIcon className="size-3.5 text-pui-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                        </span>
                        {role.description ? <span className={cn(blockReset, "text-xs font-normal text-pui-muted-foreground")}>{role.description}</span> : null}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Set all for {role.name}</DropdownMenuLabel>
                        {levels.map((level) => (
                          <DropdownMenuItem
                            key={level.value}
                            onSelect={() => update(resources.map((res) => ({ roleId: role.id, resourceId: res.id, level: level.value })))}
                          >
                            {level.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource, r) => (
              <tr key={resource.id} className={cn(blockReset, "border-b border-pui-border last:border-b-0")}>
                <th scope="row" className={cn(blockReset, "sticky start-0 z-10 bg-pui-surface px-2 py-1.5 text-start font-normal")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`${resource.name}: set access for every role`}
                      className={cn(
                        controlReset,
                        focusRing,
                        "group flex w-full min-w-40 cursor-pointer flex-col rounded-pui-md px-2 py-1 text-start transition-colors hover:bg-pui-muted data-[state=open]:bg-pui-muted",
                      )}
                    >
                      <span className={cn(blockReset, "flex items-center gap-1.5 font-medium")}>
                        {resource.name}
                        {resource.sensitive ? (
                          <span className={cn(blockReset, "rounded-pui-sm bg-pui-warning/15 px-1 text-[0.625rem] font-medium text-pui-warning-text")}>Sensitive</span>
                        ) : null}
                        <ChevronDownIcon className="size-3.5 text-pui-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                      </span>
                      {resource.description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{resource.description}</span> : null}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Set all for {resource.name}</DropdownMenuLabel>
                      {levels.map((level) => (
                        <DropdownMenuItem
                          key={level.value}
                          onSelect={() => update(roles.map((role) => ({ roleId: role.id, resourceId: resource.id, level: level.value })))}
                        >
                          {level.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>
                {roles.map((role, c) => {
                  const current = levelOf(role.id, resource.id);
                  const rank = rankOf(current);
                  const changed = current !== baseOf(role.id, resource.id);
                  const tabbable = focus.r === r && focus.c === c;
                  return (
                    <td key={role.id} role="gridcell" className={cn(blockReset, "px-2 py-1.5")}>
                      <button
                        ref={(node) => {
                          if (node) cells.current.set(`${r}:${c}`, node);
                          else cells.current.delete(`${r}:${c}`);
                        }}
                        type="button"
                        tabIndex={tabbable ? 0 : -1}
                        aria-disabled={role.locked || undefined}
                        aria-label={`${resource.name}, ${role.name}: ${labelOfLevel(current)}${changed ? " (changed)" : ""}`}
                        data-level={current}
                        data-changed={changed ? "" : undefined}
                        onFocus={() => setFocus({ r, c })}
                        onKeyDown={(event) => onCellKey(event, r, c)}
                        onClick={(event) => {
                          if (role.locked) return;
                          const bar = (event.target as HTMLElement).closest<HTMLElement>("[data-level]");
                          const picked = bar && bar !== event.currentTarget ? Number(bar.dataset.level) : NaN;
                          if (Number.isFinite(picked)) setCell(role.id, resource.id, picked === rank ? picked - 1 : picked);
                          else setCell(role.id, resource.id, (rank + 1) % levels.length);
                        }}
                        className={cn(
                          controlReset,
                          focusRing,
                          "relative flex h-9 w-full min-w-28 cursor-pointer items-center gap-2 rounded-pui-md border px-2.5 text-start text-xs transition-[background-color,border-color] duration-(--pui-duration-fast)",
                          changed ? "border-pui-primary/50 bg-pui-primary/6" : "border-transparent hover:border-pui-border hover:bg-pui-muted/60",
                          role.locked && "cursor-not-allowed opacity-70 hover:border-transparent hover:bg-transparent",
                        )}
                      >
                        <LevelBars index={rank} count={levels.length} reduced={reduced} />
                        <span className={cn(blockReset, "relative min-w-0 flex-1 overflow-hidden")}>
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              key={current}
                              initial={reduced ? false : { y: 8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: -8, opacity: 0 }}
                              transition={springs.snappy}
                              className={cn(blockReset, "block truncate", rank === 0 ? "text-pui-muted-foreground" : "font-medium text-pui-foreground")}
                            >
                              {labelOfLevel(current)}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                        {changed ? <span aria-hidden="true" className={cn(blockReset, "absolute -top-1 -end-1 size-2 rounded-pui-full bg-pui-primary ring-2 ring-pui-surface")} /> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p id={hintId} className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
        Click a bar to set a level. Keyboard: arrows move, Space raises, Shift+Space lowers, 0–{levels.length - 1} pick a level.
      </p>
      <AnimatePresence initial={false}>
        {changes.length > 0 ? (
          <motion.div
            key="changes"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 8 }}
            transition={springs.snappy}
            className={cn(blockReset, "flex flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-sm")}
          >
            <div className={cn(blockReset, "flex flex-wrap items-center gap-3")}>
              <span role="status" className={cn(blockReset, "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm")}>
                <span className={cn(blockReset, "font-medium")}>
                  {changes.length} unsaved {changes.length === 1 ? "change" : "changes"}
                </span>
                <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>
                  {grants} granted · {changes.length - grants} revoked
                </span>
                {risky > 0 ? (
                  <span className={cn(blockReset, "flex items-center gap-1 text-xs font-medium text-pui-warning-text")}>
                    <TriangleAlertIcon className="size-3.5" />
                    {risky} on sensitive resources
                  </span>
                ) : null}
              </span>
              <Button size="sm" variant="ghost" aria-expanded={showList} onClick={() => setShowList((s) => !s)}>
                {showList ? "Hide changes" : "Review changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={discard} disabled={pending}>
                Discard
              </Button>
              {onSave ? (
                <Button size="sm" loading={pending} onClick={save}>
                  Save changes
                </Button>
              ) : null}
            </div>
            <AnimatePresence initial={false}>
              {showList ? (
                <motion.ul
                  key="list"
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: easings.out }}
                  aria-label="Unsaved changes"
                  className={cn(listReset, "flex max-h-48 flex-col gap-1 overflow-y-auto border-t border-pui-border pt-2 text-xs")}
                >
                  {changes.map((ch) => (
                    <li key={`${ch.roleId}:${ch.resourceId}`} className={cn(blockReset, "flex items-center gap-2")}>
                      <ArrowUpIcon
                        aria-hidden="true"
                        className={cn("size-3.5", ch.direction === "grant" ? "text-pui-success-text" : "rotate-180 text-pui-danger-text")}
                      />
                      <span className={cn(blockReset, "sr-only")}>{ch.direction === "grant" ? "Granted" : "Revoked"}:</span>
                      <span className={cn(blockReset, "min-w-0 flex-1 truncate")}>
                        <span className={cn(blockReset, "font-medium")}>{nameOf(roles, ch.roleId)}</span>
                        <span className={cn(blockReset, "text-pui-muted-foreground")}> · {nameOf(resources, ch.resourceId)}</span>
                      </span>
                      <span className={cn(blockReset, "shrink-0 tabular-nums text-pui-muted-foreground")}>
                        {labelOfLevel(ch.from)} → <span className={cn(blockReset, "text-pui-foreground")}>{labelOfLevel(ch.to)}</span>
                      </span>
                      {ch.sensitive ? <TriangleAlertIcon aria-label="Sensitive" className="size-3.5 text-pui-warning-text" /> : null}
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
