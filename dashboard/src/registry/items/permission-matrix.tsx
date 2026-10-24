import { PermissionMatrix, toast, type PermissionMatrixProps, type PermissionValue } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  lockOwner: boolean;
  descriptions: boolean;
  asyncSave: boolean;
};
const defaults: DemoProps = { lockOwner: true, descriptions: true, asyncSave: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "lockOwner", label: "Lock Owner role" },
  { type: "boolean", prop: "descriptions", label: "Descriptions" },
  { type: "boolean", prop: "asyncSave", label: "Async save" },
];
const resources = [
  { id: "projects", name: "Projects", description: "Boards, tasks and docs" },
  { id: "members", name: "Members", description: "Invite and remove people" },
  { id: "billing", name: "Billing", description: "Plans, invoices, cards", sensitive: true },
  { id: "api", name: "API keys", description: "Create and rotate keys", sensitive: true },
  { id: "audit", name: "Audit log", description: "Who did what, when" },
];
const initial: PermissionValue = {
  owner: { projects: "admin", members: "admin", billing: "admin", api: "admin", audit: "admin" },
  admin: { projects: "admin", members: "write", billing: "read", api: "write", audit: "read" },
  member: { projects: "write", members: "read", audit: "none" },
  guest: { projects: "read" },
};
function Preview({ props }: { props: DemoProps }) {
  const roles = [
    { id: "owner", name: "Owner", description: props.descriptions ? "1 person" : undefined, locked: props.lockOwner, lockedReason: "Owners always have full access" },
    { id: "admin", name: "Admin", description: props.descriptions ? "3 people" : undefined },
    { id: "member", name: "Member", description: props.descriptions ? "24 people" : undefined },
  ];
  return (
    <div className="w-full max-w-3xl">
      <PermissionMatrix
        roles={roles}
        resources={props.descriptions ? resources : resources.map(({ id, name, sensitive }) => ({ id, name, sensitive }))}
        defaultValue={initial}
        onSave={(changes) => {
          const done = () => {
            toast.success(`Saved ${changes.length} ${changes.length === 1 ? "change" : "changes"}`);
          };
          if (!props.asyncSave) return done();
          return new Promise<void>((resolve) =>
            setTimeout(() => {
              done();
              resolve();
            }, 900),
          );
        }}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80 origin-top scale-90">
      <PermissionMatrix
        roles={[
          { id: "admin", name: "Admin" },
          { id: "member", name: "Member" },
        ]}
        resources={resources.slice(0, 3).map(({ id, name, sensitive }) => ({ id, name, sensitive }))}
        defaultValue={initial}
      />
    </div>
  );
}
/** The full workspace: four roles, wide layout. */
function WorkspaceDemo() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PermissionMatrix
        label="Workspace roles"
        roles={[
          { id: "owner", name: "Owner", description: "1 person", locked: true, lockedReason: "Owners always have full access" },
          { id: "admin", name: "Admin", description: "3 people" },
          { id: "member", name: "Member", description: "24 people" },
          { id: "guest", name: "Guest", description: "6 people" },
        ]}
        resources={resources}
        defaultValue={initial}
        onSave={(changes) => {
          toast.success(`Saved ${changes.length} ${changes.length === 1 ? "change" : "changes"}`);
        }}
      />
    </div>
  );
}
/** Custom levels for a document: view / comment / edit. */
function LevelsDemo() {
  const [value, setValue] = useState<PermissionValue>({ team: { draft: "edit", final: "comment" }, client: { final: "view" } });
  return (
    <div className="mx-auto w-full max-w-xl">
      <PermissionMatrix
        label="Document sharing"
        resourceHeader="Document"
        roles={[
          { id: "team", name: "Team" },
          { id: "client", name: "Client" },
          { id: "public", name: "Anyone with link" },
        ]}
        resources={[
          { id: "draft", name: "Q4 proposal (draft)" },
          { id: "final", name: "Q4 proposal (final)", sensitive: true },
        ]}
        levels={[
          { value: "none", label: "No access" },
          { value: "view", label: "Can view" },
          { value: "comment", label: "Can comment" },
          { value: "edit", label: "Can edit" },
        ]}
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<PermissionMatrix\n  roles={[\n    { id: "owner", name: "Owner"${props.lockOwner ? ", locked: true" : ""} },\n    { id: "admin", name: "Admin" },\n    { id: "member", name: "Member" },\n  ]}\n  resources={[\n    { id: "projects", name: "Projects" },\n    { id: "billing", name: "Billing", sensitive: true },\n  ]}\n  defaultValue={{ owner: { projects: "admin", billing: "admin" } }}\n  onSave={(changes, value) => ${props.asyncSave ? "api.savePermissions(value)" : "console.log(changes)"}}\n/>`,
  propsTable: propDocs<PermissionMatrixProps>()([
    { name: "roles", type: "{ id, name, description?, locked?, lockedReason? }[]", required: true, description: "Columns. Locked roles are read-only." },
    { name: "resources", type: "{ id, name, description?, sensitive? }[]", required: true, description: "Rows. Sensitive grants are flagged in the summary." },
    { name: "levels", type: "{ value, label }[]", default: "none / read / write / admin", description: "Access levels from least to most." },
    { name: "value", type: "Record<role, Record<resource, level>>", description: "Controlled value (with defaultValue, onValueChange). Missing cells are the lowest level." },
    { name: "baseline", type: "PermissionValue", default: "value at mount, then each save", description: "What changes are counted against." },
    { name: "onSave", type: "(changes, value) => void | Promise", description: "Shows Save in the change bar; a promise shows pending." },
    { name: "onDiscard", type: "() => void", description: "Called after Discard resets to the baseline." },
    { name: "label", type: "string", default: '"Permissions"', description: "Accessible name of the grid." },
    { name: "resourceHeader", type: "ReactNode", default: '"Resource"', description: "First column heading." },
  ]),
  keyboard: [
    { keys: "← → ↑ ↓", action: "Move between cells" },
    { keys: "Space / Enter", action: "Raise the level (wraps to none)" },
    { keys: "Shift + Space", action: "Lower the level" },
    { keys: "0 – 3", action: "Pick a level" },
    { keys: "Home / End", action: "First / last cell in the row (Ctrl: in the grid)" },
  ],
  a11y: [
    'A role="grid" with one tab stop; each cell is a button named "Billing, Admin: Read (changed)".',
    "Levels are shown as a word plus bars, never color alone; row and column headers are menu buttons for bulk set.",
    'The change summary is a role="status" so the count and sensitive warnings are announced.',
  ],
  reducedMotion: "Bars recolor and labels swap instantly; the change bar appears without sliding.",
  examples: [
    { title: "Workspace roles", description: "Four roles including guests, with a locked Owner.", Demo: WorkspaceDemo, wide: true },
    { title: "Custom levels", description: "Document sharing with view / comment / edit, controlled.", Demo: LevelsDemo, wide: true },
  ],
};
export default item;
