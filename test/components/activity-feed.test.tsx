import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivityFeed, groupActivity, type ActivityEvent } from "../../src/components/activity-feed";

const ana = { id: "ana", name: "Ana Ruiz" };
const ben = { id: "ben", name: "Ben Ito" };
const NOW = Date.UTC(2026, 9, 21, 15, 0);
const MIN = 60_000;

const events: ActivityEvent[] = [
  { id: "1", actor: ana, kind: "create", action: "created the issue", at: NOW - 26 * 60 * MIN },
  { id: "2", actor: ana, action: "changed status", changes: [{ field: "Status", from: "Todo", to: "In progress" }], at: NOW - 30 * MIN },
  { id: "3", actor: ana, action: "set priority", changes: [{ field: "Priority", from: "Low", to: "High" }], at: NOW - 25 * MIN },
  { id: "4", actor: ana, action: "assigned", changes: [{ field: "Assignee", to: "Ben Ito" }], at: NOW - 20 * MIN },
  { id: "5", actor: ben, kind: "comment", comment: "On it.", at: NOW - 10 * MIN },
];

describe("ActivityFeed", () => {
  it("folds back-to-back changes by one person into a burst", () => {
    const days = groupActivity(events, { timeZone: "UTC" });
    expect(days.map((d) => d.key)).toEqual(["2026-10-21", "2026-10-20"]);
    const rows = days[0]?.rows ?? [];
    expect(rows.map((r) => r.type)).toEqual(["single", "burst"]);
    expect(rows[1]?.type === "burst" && rows[1].events.map((e) => e.event.id)).toEqual(["4", "3", "2"]);
  });

  it("keeps bursts apart when collapseBursts is off or the gap is too long", () => {
    expect(groupActivity(events, { timeZone: "UTC", collapseBursts: false })[0]?.rows).toHaveLength(4);
    expect(groupActivity(events, { timeZone: "UTC", burstWindow: 2 * MIN })[0]?.rows).toHaveLength(4);
  });

  it("renders days, expands a burst and filters", async () => {
    const ref = createRef<HTMLElement>();
    const onFilterChange = vi.fn();
    render(<ActivityFeed ref={ref} events={events} now={NOW} timeZone="UTC" onFilterChange={onFilterChange} />);
    expect(ref.current?.tagName).toBe("SECTION");
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();
    expect(screen.getByText(/made 3 changes/)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Show changes/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("High")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Comments/ }));
    expect(onFilterChange).toHaveBeenCalledWith("comments");
    // The burst row leaves through an exit animation.
    await waitFor(() => expect(screen.queryByText(/made 3 changes/)).not.toBeInTheDocument());
    expect(screen.getByText("On it.")).toBeInTheDocument();
  });

  it("renders on the server", () => {
    const html = renderToString(<ActivityFeed events={events} />);
    expect(html).toContain("Ana Ruiz");
  });
});
