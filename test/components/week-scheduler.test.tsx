import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { layoutDay, weekStart, WeekScheduler, type ScheduleEvent } from "../../src/components/week-scheduler";

const day = new Date(2026, 9, 21); // Wednesday
const ev = (id: string, h1: number, m1: number, h2: number, m2: number): ScheduleEvent => ({
  id,
  title: id,
  start: new Date(2026, 9, 21, h1, m1),
  end: new Date(2026, 9, 21, h2, m2),
});

describe("WeekScheduler", () => {
  it("finds the start of the week", () => {
    expect(weekStart(day, 1)).toEqual(new Date(2026, 9, 19));
    expect(weekStart(day, 0)).toEqual(new Date(2026, 9, 18));
  });

  it("lays overlapping events side by side", () => {
    const segs = layoutDay([ev("a", 9, 0, 10, 0), ev("b", 9, 30, 11, 0), ev("c", 10, 0, 10, 30), ev("d", 12, 0, 13, 0)], day.getTime());
    const by = Object.fromEntries(segs.map((s) => [s.event.id, s]));
    expect(by.a).toMatchObject({ top: 540, bottom: 600, column: 0, columns: 2 });
    expect(by.b).toMatchObject({ column: 1, columns: 2 });
    expect(by.c).toMatchObject({ column: 0, columns: 2 });
    expect(by.d).toMatchObject({ column: 0, columns: 1 });
  });

  it("moves, resizes and deletes with the keyboard", () => {
    const onEventsChange = vi.fn();
    const ref = createRef<HTMLDivElement>();
    render(<WeekScheduler ref={ref} defaultDate={day} now={new Date(2026, 9, 21, 8).getTime()} defaultEvents={[ev("Standup", 9, 30, 10, 0)]} onEventsChange={onEventsChange} />);
    expect(ref.current?.tagName).toBe("DIV");
    const event = screen.getByRole("button", { name: /^Standup, / });
    fireEvent.keyDown(event, { key: "ArrowDown" });
    expect(onEventsChange.mock.lastCall?.[0][0].start).toEqual(new Date(2026, 9, 21, 9, 45));
    fireEvent.keyDown(screen.getByRole("button", { name: /^Standup, / }), { key: "ArrowDown", shiftKey: true });
    expect(onEventsChange.mock.lastCall?.[0][0].end).toEqual(new Date(2026, 9, 21, 10, 30));
    fireEvent.keyDown(screen.getByRole("button", { name: /^Standup, / }), { key: "ArrowRight" });
    expect(onEventsChange.mock.lastCall?.[0][0].start).toEqual(new Date(2026, 9, 22, 9, 45));
    // The copy in the old day column is still fading out; the new one is last.
    fireEvent.keyDown(screen.getAllByRole("button", { name: /^Standup, / }).at(-1)!, { key: "Delete" });
    expect(onEventsChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole("status")).toHaveTextContent("Deleted Standup");
  });

  it("adds an event at the next free slot and names it", () => {
    const onEventsChange = vi.fn();
    render(<WeekScheduler defaultDate={day} now={new Date(2026, 9, 21, 9, 5).getTime()} defaultEvents={[ev("Busy", 9, 15, 10, 0)]} onEventsChange={onEventsChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Add event" }));
    const created = onEventsChange.mock.lastCall?.[0][1] as ScheduleEvent;
    expect(created.start).toEqual(new Date(2026, 9, 21, 10, 0));
    const input = screen.getByRole("textbox", { name: "Event title" });
    fireEvent.change(input, { target: { value: "Sync" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect((onEventsChange.mock.lastCall?.[0][1] as ScheduleEvent).title).toBe("Sync");
  });

  it("renders on the server without dates", () => {
    const html = renderToString(<WeekScheduler defaultDate={day} defaultEvents={[ev("Standup", 9, 30, 10, 0)]} />);
    expect(html).toContain("Add event");
    expect(html).not.toContain("Standup");
  });
});
