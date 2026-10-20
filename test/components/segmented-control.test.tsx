import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  SegmentedControl,
  SegmentedControlItem,
  type SegmentedControlProps,
} from "../../src/components/segmented-control";

function Control(props: SegmentedControlProps & { disabledItems?: string[]; ref?: Ref<HTMLDivElement> }) {
  const { disabledItems = [], ...rest } = props;
  return (
    <SegmentedControl aria-label="View" {...rest}>
      {["day", "week", "month"].map((v) => (
        <SegmentedControlItem key={v} value={v} disabled={disabledItems.includes(v)} icon={<span data-testid={`icon-${v}`} />}>
          {v}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

const items = () => screen.getAllByRole("radio");
const tabStops = () => items().filter((r) => r.tabIndex === 0).map((r) => r.textContent);
const indicators = () => [...document.querySelectorAll("[data-pui-segment-indicator]")];

describe("SegmentedControl", () => {
  it("renders radiogroup semantics, icons and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Control ref={ref} defaultValue="week" size="lg" fullWidth />);
    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute("aria-orientation", "horizontal");
    expect(group.className).toContain("w-full");
    expect(screen.getByTestId("icon-day")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "week" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "week" }).className).toContain("flex-1");
  });

  it("the indicator exists only under the selected item", async () => {
    const user = userEvent.setup();
    render(<Control defaultValue="day" />);
    expect(indicators()).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "day" }).contains(indicators()[0] ?? null)).toBe(true);
    await user.click(screen.getByRole("radio", { name: "month" }));
    expect(indicators()).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "month" }).contains(indicators()[0] ?? null)).toBe(true);
  });

  it("with no value nothing is selected and the tab stop is the first enabled item", () => {
    render(<Control disabledItems={["day"]} />);
    expect(indicators()).toHaveLength(0);
    expect(tabStops()).toEqual(["week"]);
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("tabindex");
  });

  it("arrow keys move and select, skip disabled items and wrap", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Control defaultValue="day" disabledItems={["week"]} onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "day" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "month" })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith("month");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "day" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "month" })).toHaveAttribute("aria-checked", "true");
    expect(tabStops()).toEqual(["month"]);
  });

  it("does not wrap with loop={false}", async () => {
    const user = userEvent.setup();
    render(<Control defaultValue="month" loop={false} />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "month" })).toHaveAttribute("aria-checked", "true");
  });

  it("a stale value and a disabled-only value each leave one tab stop on the first enabled item", () => {
    const { rerender } = render(<Control value="year" />);
    expect(tabStops()).toEqual(["day"]);
    rerender(<Control value="day" disabledItems={["day"]} />);
    expect(tabStops()).toEqual(["week"]);
  });

  it("controlled vs uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Control value="day" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "week" }));
    expect(onValueChange).toHaveBeenCalledWith("week");
    expect(screen.getByRole("radio", { name: "day" })).toHaveAttribute("aria-checked", "true");
    rerender(<Control value="week" onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "week" })).toHaveAttribute("aria-checked", "true");
  });

  it("uncontrolled defaultValue changes internally", async () => {
    const user = userEvent.setup();
    render(<Control defaultValue="day" />);
    await user.click(screen.getByRole("radio", { name: "month" }));
    expect(screen.getByRole("radio", { name: "month" })).toHaveAttribute("aria-checked", "true");
  });

  it("group disabled disables every item; unlabeled groups warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <SegmentedControl disabled>
        <SegmentedControlItem value="a">a</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(screen.getByRole("radio")).toBeDisabled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SegmentedControl needs an aria-label"));
    warn.mockRestore();
  });

  it("a fully disabled control has no tab stop after mount", () => {
    const { container } = render(<Control disabled />);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("tabindex");
  });
});
