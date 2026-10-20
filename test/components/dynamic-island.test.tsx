import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DynamicIsland, DynamicIslandView } from "../../src/components/dynamic-island";

function Island({ state = "idle" }: { state?: string }) {
  return (
    <DynamicIsland state={state}>
      <DynamicIslandView name="idle" label="Idle">
        Idle view
      </DynamicIslandView>
      <DynamicIslandView name="music" label="Now playing" expanded={<p>Track details</p>}>
        Music view
      </DynamicIslandView>
    </DynamicIsland>
  );
}

describe("DynamicIsland", () => {
  it("renders the active view, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DynamicIsland ref={ref} state="idle" className="mt-4">
        <DynamicIslandView name="idle">Idle view</DynamicIslandView>
      </DynamicIsland>,
    );
    expect(screen.getByText("Idle view")).toBeInTheDocument();
    expect(ref.current?.className).toContain("mt-4");
  });
  it("expands a view with expanded content (a11y)", () => {
    render(<Island state="music" />);
    expect(screen.getByRole("status")).toHaveTextContent("Now playing");
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Track details")).toBeInTheDocument();
  });
  it("renders on the server", () => {
    expect(renderToString(<Island />)).toContain("Idle view");
  });
});
