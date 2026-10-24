import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StoryViewer, type Story } from "../../src/components/story-viewer";

const STORIES: Story[] = [
  { id: "a", label: "Dark mode", content: <p>Dark mode is here</p> },
  { id: "b", label: "Faster search", content: <p>Search is faster</p> },
  { id: "c", label: "New API", content: <p>Meet the API</p> },
];

describe("StoryViewer", () => {
  it("renders a labelled region with one segment per story and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StoryViewer ref={ref} stories={STORIES} label="What's new" className="mt-4" />);
    const region = screen.getByRole("region", { name: "What's new" });
    expect(ref.current).toBe(region);
    expect(region.className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Story 1 of 3: Dark mode" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Dark mode is here")).toBeInTheDocument();
  });
  it("navigates with arrow keys and segment buttons (a11y)", () => {
    const onIndexChange = vi.fn();
    render(<StoryViewer stories={STORIES} onIndexChange={onIndexChange} autoPlay={false} />);
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Story 3 of 3: New API" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledTimes(2);
  });
  it("toggles the pause button", () => {
    render(<StoryViewer stories={STORIES} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause stories" }));
    expect(screen.getByRole("button", { name: "Play stories" })).toHaveAttribute("aria-pressed", "true");
  });
  it("renders on the server", () => {
    expect(renderToString(<StoryViewer stories={STORIES} />)).toContain("Dark mode is here");
  });
});
