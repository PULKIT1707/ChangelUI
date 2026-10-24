import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PERMISSION_LEVELS, diffPermissions, PermissionMatrix } from "../../src/components/permission-matrix";
const roles = [
  { id: "owner", name: "Owner", locked: true },
  { id: "editor", name: "Editor" },
];
const resources = [
  { id: "docs", name: "Documents" },
  { id: "billing", name: "Billing", sensitive: true },
];
const value = { owner: { docs: "admin", billing: "admin" }, editor: { docs: "write" } };
describe("PermissionMatrix", () => {
  it("renders a labelled grid, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PermissionMatrix ref={ref} className="mt-4" roles={roles} resources={resources} defaultValue={value} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("grid", { name: "Permissions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documents, Editor: Write" })).toBeInTheDocument();
  });
  it("raises a level with Space, lists the change and saves it", () => {
    const onSave = vi.fn();
    render(<PermissionMatrix roles={roles} resources={resources} defaultValue={value} onSave={onSave} />);
    const cell = screen.getByRole("button", { name: "Billing, Editor: No access" });
    fireEvent.keyDown(cell, { key: "3" });
    expect(screen.getByRole("button", { name: "Billing, Editor: Admin (changed)" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 unsaved change");
    expect(screen.getByRole("status")).toHaveTextContent("1 on sensitive resources");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ roleId: "editor", resourceId: "billing", to: "admin", sensitive: true })], expect.anything());
  });
  it("keeps locked roles read-only", () => {
    render(<PermissionMatrix roles={roles} resources={resources} defaultValue={value} />);
    const cell = screen.getByRole("button", { name: "Documents, Owner: Admin" });
    fireEvent.keyDown(cell, { key: "0" });
    expect(screen.getByRole("button", { name: "Documents, Owner: Admin" })).toBeInTheDocument();
  });
  it("diffs values", () => {
    const changes = diffPermissions(roles, resources, DEFAULT_PERMISSION_LEVELS, value, { ...value, editor: { docs: "read" } });
    expect(changes).toEqual([expect.objectContaining({ from: "write", to: "read", direction: "revoke" })]);
  });
  it("renders on the server", () => {
    expect(renderToString(<PermissionMatrix roles={roles} resources={resources} />)).toContain("Documents");
  });
});
