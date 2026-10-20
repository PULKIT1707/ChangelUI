import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RangeSlider, Slider } from "../../src/components/slider";

afterEach(() => {
  vi.restoreAllMocks();
});

const thumbs = () => screen.getAllByRole("slider");
const lower = () => thumbs()[0] as HTMLElement;
const upper = () => thumbs()[1] as HTMLElement;

function mockTrack(width = 200, left = 0) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: left, y: 0, width, height: 20 }),
  );
}

describe("RangeSlider", () => {
  it("is a labelled group of two named thumbs whose bounds stop at each other", () => {
    const ref = createRef<HTMLDivElement>();
    render(<RangeSlider ref={ref} aria-label="Price" defaultValue={[20, 70]} aria-describedby="hint" />);
    const group = screen.getByRole("group", { name: "Price" });
    expect(ref.current).toBe(group);
    expect(screen.getByRole("slider", { name: "Minimum" })).toBe(lower());
    expect(screen.getByRole("slider", { name: "Maximum" })).toBe(upper());
    expect(lower()).toHaveAttribute("aria-valuemin", "0");
    expect(lower()).toHaveAttribute("aria-valuemax", "70");
    expect(lower()).toHaveAttribute("aria-valuenow", "20");
    expect(upper()).toHaveAttribute("aria-valuemin", "20");
    expect(upper()).toHaveAttribute("aria-valuemax", "100");
    expect(lower()).toHaveAttribute("aria-describedby", "hint");
    const fill = group.querySelector<HTMLElement>("[data-pui-slider-range]");
    expect(fill?.style.left).toBe("20%");
    expect(fill?.style.width).toBe("50%");
  });

  it("combines aria-labelledby with each thumb's label", () => {
    render(
      <>
        <span id="price-label">Price</span>
        <RangeSlider aria-labelledby="price-label" thumbLabels={["From", "To"]} />
      </>,
    );
    expect(screen.getByRole("group", { name: "Price" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Price From" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Price To" })).toBeInTheDocument();
  });

  it("keys move each thumb and stop at the other one (Arrow, Page, Home, End)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <RangeSlider
        aria-label="r"
        defaultValue={[40, 50]}
        step={5}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    lower().focus();
    await user.keyboard("{ArrowRight}");
    expect(lower()).toHaveAttribute("aria-valuenow", "45");
    expect(onValueChange).toHaveBeenLastCalledWith([45, 50]);
    expect(onValueCommit).toHaveBeenLastCalledWith([45, 50]);
    await user.keyboard("{PageUp}");
    expect(lower()).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{End}");
    expect(lower()).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{Home}");
    expect(lower()).toHaveAttribute("aria-valuenow", "0");
    upper().focus();
    await user.keyboard("{Home}");
    expect(upper()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{End}{PageDown}");
    expect(upper()).toHaveAttribute("aria-valuenow", "50");
  });

  it("minStepsBetweenThumbs keeps the thumbs apart", async () => {
    const user = userEvent.setup();
    render(<RangeSlider aria-label="r" defaultValue={[10, 30]} step={2} minStepsBetweenThumbs={5} />);
    expect(lower()).toHaveAttribute("aria-valuemax", "20");
    lower().focus();
    await user.keyboard("{End}");
    expect(lower()).toHaveAttribute("aria-valuenow", "20");
    upper().focus();
    await user.keyboard("{Home}");
    expect(upper()).toHaveAttribute("aria-valuenow", "30");
  });

  it("a pointerdown moves the nearest thumb, and ties pick by the click side", () => {
    mockTrack(200, 0);
    const onValueCommit = vi.fn();
    const { rerender } = render(<RangeSlider aria-label="r" defaultValue={[20, 80]} onValueCommit={onValueCommit} />);
    const group = screen.getByRole("group");
    fireEvent.pointerDown(group, { clientX: 140, button: 0, pointerId: 1 });
    expect(upper()).toHaveAttribute("aria-valuenow", "70");
    expect(upper()).toHaveFocus();
    fireEvent.pointerMove(group, { clientX: 20, pointerId: 1 });
    // The dragged upper thumb stops at the lower one.
    expect(upper()).toHaveAttribute("aria-valuenow", "20");
    fireEvent.pointerUp(group, { clientX: 20, pointerId: 1 });
    expect(onValueCommit).toHaveBeenLastCalledWith([20, 20]);
    rerender(<RangeSlider key="tie" aria-label="r" defaultValue={[50, 50]} />);
    fireEvent.pointerDown(screen.getByRole("group"), { clientX: 120, button: 0, pointerId: 2 });
    expect(upper()).toHaveAttribute("aria-valuenow", "60");
    expect(lower()).toHaveAttribute("aria-valuenow", "50");
    fireEvent.pointerUp(screen.getByRole("group"), { pointerId: 2 });
    fireEvent.pointerDown(screen.getByRole("group"), { clientX: 60, button: 0, pointerId: 3 });
    expect(lower()).toHaveAttribute("aria-valuenow", "30");
  });

  it("submits two values under one name and restores the default on form reset", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <RangeSlider aria-label="r" name="price" defaultValue={[10, 90]} />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).getAll("price")).toEqual(["10", "90"]);
    lower().focus();
    await user.keyboard("{ArrowRight}");
    expect(new FormData(form).getAll("price")).toEqual(["11", "90"]);
    act(() => form.reset());
    expect(lower()).toHaveAttribute("aria-valuenow", "10");
    expect(new FormData(form).getAll("price")).toEqual(["10", "90"]);
  });

  it("controlled values stay until the parent updates", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RangeSlider aria-label="r" value={[10, 20]} onValueChange={onValueChange} />);
    upper().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith([10, 21]);
    expect(upper()).toHaveAttribute("aria-valuenow", "20");
  });

  it("renders a reduced-motion bubble per thumb", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <RangeSlider aria-label="r" defaultValue={[5, 9]} showValue="always" />
      </MotionConfig>,
    );
    const bubbles = [...container.querySelectorAll("[data-pui-slider-value]")].map((el) => el.textContent);
    expect(bubbles).toEqual(["5", "9"]);
  });
});

describe("Slider marks", () => {
  const marks = [0, { value: 25, label: "25%" }, { value: 50, label: "Half" }, 100];

  it("renders aria-hidden ticks, in-range state and labels (with room below)", () => {
    const { container } = render(<Slider aria-label="v" defaultValue={30} marks={marks} />);
    const layer = container.querySelector("[data-pui-slider-marks]");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    const ticks = [...container.querySelectorAll<HTMLElement>("[data-pui-slider-mark]")];
    expect(ticks.map((t) => t.style.left)).toEqual(["0%", "25%", "50%", "100%"]);
    expect(ticks.map((t) => t.hasAttribute("data-in-range"))).toEqual([true, true, false, false]);
    expect([...container.querySelectorAll("[data-pui-slider-mark-label]")].map((l) => l.textContent)).toEqual([
      "25%",
      "Half",
    ]);
    expect(container.firstElementChild).toHaveClass("mb-6");
  });

  it("unlabelled marks add no bottom margin; out-of-range marks are dropped", () => {
    const { container } = render(<Slider aria-label="v" marks={[-10, 10, 20, 500]} />);
    expect(container.querySelectorAll("[data-pui-slider-mark]")).toHaveLength(2);
    expect(container.firstElementChild).not.toHaveClass("mb-6");
  });

  it("snapToMarks: keys move mark to mark and the pointer snaps to the nearest mark", async () => {
    const user = userEvent.setup();
    const { container } = render(<Slider aria-label="v" defaultValue={0} marks={marks} snapToMarks />);
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "25");
    await user.keyboard("{PageUp}");
    expect(thumb).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{End}");
    expect(thumb).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{ArrowLeft}");
    expect(thumb).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{Home}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0");
    mockTrack(200, 0);
    fireEvent.pointerDown(container.firstElementChild as HTMLElement, { clientX: 70, button: 0, pointerId: 1 });
    expect(thumb).toHaveAttribute("aria-valuenow", "25");
    fireEvent.pointerMove(container.firstElementChild as HTMLElement, { clientX: 160, pointerId: 1 });
    expect(thumb).toHaveAttribute("aria-valuenow", "100");
  });

  it("RangeSlider marks are in range between the thumbs", () => {
    const { container } = render(<RangeSlider aria-label="r" defaultValue={[20, 60]} marks={[10, 30, 50, 70]} />);
    const ticks = [...container.querySelectorAll("[data-pui-slider-mark]")];
    expect(ticks.map((t) => t.hasAttribute("data-in-range"))).toEqual([false, true, true, false]);
  });
});
