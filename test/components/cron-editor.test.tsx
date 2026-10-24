import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CronEditor, describeCron, nextCronRuns, parseCron } from "../../src/components/cron-editor";

describe("CronEditor", () => {
  it("parses, describes and schedules cron expressions", () => {
    expect("error" in parseCron("* * *")).toBe(true);
    expect("error" in parseCron("61 * * * *")).toBe(true);
    expect(describeCron("0 9 * * 1-5")).toBe("At 09:00, Monday through Friday");
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
    expect(describeCron("0 * * * *")).toBe("Every hour");
    expect(describeCron("*/10 9-17 * * 1-5")).toBe("Every 10 minutes, between 09:00 and 17:59, Monday through Friday");
    expect(describeCron("5,35 9-17 * * *")).toBe("At minute 5 and 35 past every hour between 09:00 and 17:59");
    expect(describeCron("30 8 1,15 * *")).toBe("At 08:30, on the 1st and 15th");
    expect(describeCron("0 0 * 1-3 SUN")).toBe("At 00:00, Sunday, in January through March");
    // Friday Oct 23 2026, 10:00 local → next weekday 09:00 runs are Mon 26 and Tue 27.
    const runs = nextCronRuns("0 9 * * 1-5", new Date(2026, 9, 23, 10, 0), 2);
    expect(runs.map((d) => [d.getDate(), d.getHours(), d.getMinutes()])).toEqual([
      [26, 9, 0],
      [27, 9, 0],
    ]);
  });

  it("writes cron from presets, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    render(<CronEditor ref={ref} className="mt-4" onValueChange={onValueChange} now={new Date(2026, 9, 23, 10, 0)} />);
    expect(ref.current?.className).toContain("mt-4");
    fireEvent.click(screen.getByRole("button", { name: "Every 15 minutes" }));
    expect(onValueChange).toHaveBeenCalledWith("*/15 * * * *");
    expect(screen.getByLabelText("Cron expression")).toHaveValue("*/15 * * * *");
    expect(screen.getByText(/Oct 23, 10:15/)).toBeInTheDocument();
  });

  it("flags invalid expressions and keeps the last valid value (a11y)", () => {
    const onValueChange = vi.fn();
    render(<CronEditor defaultValue="0 9 * * *" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Cron expression");
    fireEvent.change(input, { target: { value: "0 25 * * *" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/hour must be between 0 and 23/)).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "0 18 * * *" } });
    expect(onValueChange).toHaveBeenCalledWith("0 18 * * *");
    expect(screen.getByText("At 18:00")).toBeInTheDocument();
  });

  it("renders on the server without upcoming runs", () => {
    const html = renderToString(<CronEditor defaultValue="0 9 * * 1-5" />);
    expect(html).toContain("Monday through Friday");
    expect(html).not.toContain("<time");
  });
});
