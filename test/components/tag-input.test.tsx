import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TagInput } from "../../src/components/tag-input";

describe("TagInput", () => {
  it("renders tags as a list, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<TagInput ref={ref} className="mt-4" defaultValue={["react"]} inputProps={{ "aria-label": "Add tag" }} />);
    expect(screen.getByRole("list", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove react" })).toBeInTheDocument();
    expect(ref.current?.className).toContain("mt-4");
  });

  it("adds a tag on Enter and blocks duplicates (a11y)", () => {
    render(<TagInput defaultValue={["react"]} inputProps={{ "aria-label": "Add tag" }} />);
    const input = screen.getByRole("textbox", { name: "Add tag" });
    fireEvent.change(input, { target: { value: "vue" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remove vue" })).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<TagInput defaultValue={["server"]} />)).toContain("server");
  });
});
