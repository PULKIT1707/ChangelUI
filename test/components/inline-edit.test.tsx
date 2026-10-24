import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InlineEdit } from "../../src/components/inline-edit";
describe("InlineEdit", () => {
  it("renders a labelled trigger, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineEdit ref={ref} className="mt-4" label="Name" defaultValue="Ada" />);
    expect(screen.getByRole("button", { name: "Name: Ada. Edit" })).toBeInTheDocument();
    expect(ref.current?.className).toContain("mt-4");
  });
  it("saves on Enter and reverts on Escape (a11y)", () => {
    const onValueChange = vi.fn();
    render(<InlineEdit label="Name" defaultValue="Ada" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button"));
    const field = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(field, { target: { value: "Grace" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Name: Ada. Edit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Grace" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("Grace");
  });
  it("rolls back and reopens when onSave rejects", async () => {
    render(<InlineEdit label="Name" defaultValue="Ada" onSave={() => Promise.reject(new Error("Taken"))} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Grace" } });
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), { key: "Enter" });
    });
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Grace");
    expect(screen.getByText("Taken")).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<InlineEdit label="Name" defaultValue="Server" />)).toContain("Server");
  });
});
