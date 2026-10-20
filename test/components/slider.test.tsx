import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Slider } from "../../src/components/slider";

afterEach(() => {
  vi.restoreAllMocks();
});

const thumb = () => screen.getByRole("slider");

function mockTrack(width = 200, left = 0) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left,
    top: 0,
    width,
    height: 20,
    right: left + width,
    bottom: 20,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe("Slider", () => {
  it("forwards aria-label/labelledby/describedby to the thumb and the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Slider ref={ref} aria-label="Volume" aria-describedby="hint" defaultValue={30} />);
    expect(ref.current).toBe(container.firstElementChild);
    const t = screen.getByRole("slider", { name: "Volume" });
    expect(t).toHaveAttribute("aria-describedby", "hint");
    expect(t).toHaveAttribute("aria-valuemin", "0");
    expect(t).toHaveAttribute("aria-valuemax", "100");
    expect(t).toHaveAttribute("aria-valuenow", "30");
    expect(t).toHaveAttribute("tabindex", "0");
    expect(t.style.left).toBe("30%");
    expect(t.className).toContain("absolute top-1/2");
    expect(t.className).toContain("size-5");
    expect(t.className).toContain("box-border");
    expect(ref.current).not.toHaveAttribute("aria-label");
  });

  it("keys: Arrow ±step, PageUp/PageDown ±largeStep, Home/End, with clamping and aria-valuetext", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider aria-label="v" defaultValue={50} step={5} min={0} max={100} onValueChange={onValueChange} formatValue={(v) => `${v} dB`} />,
    );
    thumb().focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "55");
    expect(thumb()).toHaveAttribute("aria-valuetext", "55 dB");
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "45");
    await user.keyboard("{PageUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "95");
    await user.keyboard("{PageUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{PageDown}{ArrowDown}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{End}{ArrowUp}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "100");
    expect(onValueChange).toHaveBeenLastCalledWith(100);
  });

  it("onValueCommit fires on a value-changing keydown, not at a bound", async () => {
    const user = userEvent.setup();
    const onValueCommit = vi.fn();
    render(<Slider aria-label="v" defaultValue={99} onValueCommit={onValueCommit} />);
    thumb().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueCommit).toHaveBeenCalledWith(100);
    await user.keyboard("{ArrowRight}{End}{a}");
    expect(onValueCommit).toHaveBeenCalledTimes(1);
  });

  it("pointerdown on the track jumps, drags with capture, scales the thumb, and commits on pointerup", () => {
    mockTrack(200, 0);
    const capture = vi.spyOn(Element.prototype, "setPointerCapture");
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = render(
      <Slider aria-label="v" onValueChange={onValueChange} onValueCommit={onValueCommit} step={10} />,
    );
    const root = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(root, { clientX: 50, button: 0, pointerId: 1 });
    expect(capture).toHaveBeenCalledWith(1);
    expect(thumb()).toHaveAttribute("aria-valuenow", "30");
    expect(thumb()).toHaveFocus();
    expect(thumb().className).toContain("scale-115");
    expect(root).toHaveAttribute("data-dragging", "");
    fireEvent.pointerMove(root, { clientX: 150, pointerId: 1 });
    expect(thumb()).toHaveAttribute("aria-valuenow", "80");
    expect(onValueCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(root, { clientX: 150, pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledWith(80);
    expect(thumb().className).not.toContain("scale-115");
    fireEvent.pointerMove(root, { clientX: 10, pointerId: 1 });
    expect(thumb()).toHaveAttribute("aria-valuenow", "80");
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it("showValue: active shows the bubble while focused", async () => {
    const { container } = render(<Slider aria-label="v" defaultValue={7} formatValue={(v) => `${v}%`} />);
    const bubble = () => container.querySelector("[data-pui-slider-value]");
    expect(bubble()).toBeNull();
    act(() => thumb().focus());
    expect(bubble()).toHaveTextContent("7%");
    act(() => thumb().blur());
    await waitFor(() => expect(bubble()).toBeNull());
  });

  it("showValue: never and always", () => {
    const { container, rerender } = render(<Slider aria-label="v" defaultValue={7} showValue="never" />);
    act(() => thumb().focus());
    expect(container.querySelector("[data-pui-slider-value]")).toBeNull();
    rerender(<Slider aria-label="v" defaultValue={7} showValue="always" size="lg" tone="success" />);
    expect(container.querySelector("[data-pui-slider-value]")).toHaveTextContent("7");
  });

  it("controlled vs uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Slider aria-label="v" value={10} onValueChange={onValueChange} />);
    thumb().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(11);
    expect(thumb()).toHaveAttribute("aria-valuenow", "10");
    rerender(<Slider aria-label="v" value={11} onValueChange={onValueChange} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "11");
  });

  it("defaults to min, clamps out-of-range values and handles step <= 0 with a warning", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<Slider aria-label="v" min={20} max={40} step={0} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "20");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("step must be > 0"));
    thumb().focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb()).toHaveAttribute("aria-valuenow", "21");
    rerender(<Slider aria-label="v" min={20} max={40} value={99} />);
    expect(thumb()).toHaveAttribute("aria-valuenow", "40");
  });

  it("with name mirrors the value in a hidden input and restores the default on form reset", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Slider aria-label="v" name="volume" defaultValue={40} />
      </form>,
    );
    const input = container.querySelector("input[name='volume']") as HTMLInputElement;
    expect(input.type).toBe("hidden");
    expect(input.value).toBe("40");
    thumb().focus();
    await user.keyboard("{End}");
    expect(input.value).toBe("100");
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(thumb()).toHaveAttribute("aria-valuenow", "40");
    expect(input.value).toBe("40");
  });

  it("disabled ignores keys and pointer, and is not tabbable", async () => {
    const user = userEvent.setup();
    mockTrack();
    const { container } = render(<Slider aria-label="v" disabled defaultValue={5} />);
    expect(thumb()).toHaveAttribute("tabindex", "-1");
    expect(thumb()).toHaveAttribute("aria-disabled", "true");
    thumb().focus();
    await user.keyboard("{End}");
    fireEvent.pointerDown(container.firstElementChild as HTMLElement, { clientX: 150, button: 0 });
    expect(thumb()).toHaveAttribute("aria-valuenow", "5");
  });

  it("warns in development when the thumb is unlabeled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Slider />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Slider needs an aria-label"));
  });
});
