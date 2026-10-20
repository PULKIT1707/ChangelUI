import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Timeline, TimelineItem } from "../../src/components/timeline";

describe("Timeline", () => {
  it("renders an ordered list with time elements", () => {
    render(
      <Timeline animate="none" aria-label="History">
        <TimelineItem time="Jan" dateTime="2026-01-01" title="Start" />
        <TimelineItem time="Now" title="Today" status="current" />
      </Timeline>,
    );
    expect(screen.getByRole("list", { name: "History" }).tagName).toBe("OL");
    expect(screen.getByText("Jan").tagName).toBe("TIME");
    expect(screen.getByText("Jan")).toHaveAttribute("dateTime", "2026-01-01");
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step");
  });
  it("renders on the server", () => {
    expect(renderToString(<Timeline><TimelineItem title="Server" /></Timeline>)).toContain("Server");
  });
});
