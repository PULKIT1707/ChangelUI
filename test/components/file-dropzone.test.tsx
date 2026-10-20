import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FileDropzone, formatBytes } from "../../src/components/file-dropzone";

describe("FileDropzone", () => {
  it("validates dropped files", () => {
    const onDrop = vi.fn();
    render(<FileDropzone accept="image/*" maxSizeBytes={10} onDrop={onDrop} />);
    const zone = screen.getByText("Drop files here").closest("[data-state]") as HTMLElement;
    const ok = new File(["a"], "a.png", { type: "image/png" });
    const bad = new File(["a"], "a.txt", { type: "text/plain" });
    fireEvent.drop(zone, { dataTransfer: { files: [ok, bad], types: ["Files"] } });
    expect(onDrop).toHaveBeenCalledWith([ok], [expect.objectContaining({ reason: "type" })]);
  });
  it("labels the browse button and lists files", () => {
    render(<FileDropzone files={[{ id: "a", name: "a.pdf", size: 2048, status: "done" }]} onRemove={() => {}} />);
    expect(screen.getByRole("button", { name: "Browse files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove a.pdf" })).toBeInTheDocument();
    expect(formatBytes(2048)).toBe("2 KB");
  });
  it("renders on the server", () => {
    expect(renderToString(<FileDropzone />)).toContain("Drop files here");
  });
});
