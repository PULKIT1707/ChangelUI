import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Rating } from "../../src/components/rating";

afterEach(() => {
  vi.restoreAllMocks();
});

const slider = () => screen.getByRole("slider");
const items = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>("[data-pui-rating-item]")];

describe("Rating", () => {
  it("interactive mode is a single slider with value ARIA and the default name", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Rating ref={ref} defaultValue={3} />);
    const s = screen.getByRole("slider", { name: "Rating" });
    expect(ref.current).toBe(s);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(s).toHaveAttribute("aria-valuemin", "0");
    expect(s).toHaveAttribute("aria-valuemax", "5");
    expect(s).toHaveAttribute("aria-valuenow", "3");
    expect(s).toHaveAttribute("aria-valuetext", "3 of 5 stars");
    expect(s).toHaveAttribute("tabindex", "0");
    expect(items(container).map((i) => i.dataset.state)).toEqual(["full", "full", "full", "empty", "empty"]);
  });

  it("keys: arrows ±1, Home/End and digits, clamped", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Rating defaultValue={2} onValueChange={onValueChange} />);
    slider().focus();
    await user.keyboard("{ArrowRight}");
    expect(slider()).toHaveAttribute("aria-valuenow", "3");
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(slider()).toHaveAttribute("aria-valuenow", "1");
    await user.keyboard("{End}{ArrowUp}");
    expect(slider()).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("{Home}{ArrowLeft}");
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("4");
    expect(slider()).toHaveAttribute("aria-valuenow", "4");
    await user.keyboard("9");
    expect(slider()).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("0");
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("allowHalf steps by 0.5 and renders half icons", async () => {
    const user = userEvent.setup();
    const { container } = render(<Rating defaultValue={2} allowHalf />);
    slider().focus();
    await user.keyboard("{ArrowRight}");
    expect(slider()).toHaveAttribute("aria-valuenow", "2.5");
    expect(items(container)[2]?.dataset.state).toBe("half");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(slider()).toHaveAttribute("aria-valuenow", "1.5");
  });

  it("hover previews, click sets, clicking the same value clears", () => {
    const { container } = render(<Rating />);
    const [first, , third] = items(container);
    fireEvent.pointerMove(third as HTMLElement);
    expect(items(container).map((i) => i.dataset.state).slice(0, 4)).toEqual(["full", "full", "full", "empty"]);
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.pointerLeave(slider());
    expect(items(container)[0]?.dataset.state).toBe("empty");
    fireEvent.click(third as HTMLElement);
    expect(slider()).toHaveAttribute("aria-valuenow", "3");
    fireEvent.click(third as HTMLElement);
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.click(first as HTMLElement);
    expect(slider()).toHaveAttribute("aria-valuenow", "1");
  });

  it("allowHalf picks the half from the pointer x", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 20,
      top: 0,
      height: 20,
      right: 20,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const { container } = render(<Rating allowHalf clearable={false} />);
    const second = items(container)[1] as HTMLElement;
    fireEvent.click(second, { clientX: 5 });
    expect(slider()).toHaveAttribute("aria-valuenow", "1.5");
    fireEvent.click(second, { clientX: 15 });
    expect(slider()).toHaveAttribute("aria-valuenow", "2");
    fireEvent.click(second, { clientX: 15 });
    expect(slider()).toHaveAttribute("aria-valuenow", "2");
  });

  it("read-only is role img labelled by getLabel and ignores input", () => {
    const { container } = render(<Rating value={4} max={10} readOnly getLabel={(v, m) => `${v}/${m}`} />);
    const img = screen.getByRole("img", { name: "4/10" });
    expect(screen.queryByRole("slider")).toBeNull();
    expect(img).not.toHaveAttribute("tabindex");
    expect(items(container)).toHaveLength(10);
    fireEvent.click(items(container)[0] as HTMLElement);
    expect(screen.getByRole("img", { name: "4/10" })).toBeInTheDocument();
  });

  it("disabled is not tabbable and ignores keys", async () => {
    const user = userEvent.setup();
    render(<Rating defaultValue={1} disabled />);
    expect(slider()).toHaveAttribute("tabindex", "-1");
    expect(slider()).toHaveAttribute("aria-disabled", "true");
    slider().focus();
    await user.keyboard("{End}");
    expect(slider()).toHaveAttribute("aria-valuenow", "1");
  });

  it("controlled vs uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Rating value={2} onValueChange={onValueChange} aria-labelledby="lbl" />);
    expect(slider()).not.toHaveAttribute("aria-label");
    slider().focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(3);
    expect(slider()).toHaveAttribute("aria-valuenow", "2");
    rerender(<Rating value={3} onValueChange={onValueChange} />);
    expect(slider()).toHaveAttribute("aria-valuenow", "3");
  });

  it("with name mirrors the value and restores the default on form reset; invalid max warns", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <form>
        <Rating name="stars" defaultValue={2} max={0} icon={<span>*</span>} />
      </form>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("max must be >= 1"));
    expect(items(container)).toHaveLength(5);
    const input = container.querySelector("input[name='stars']") as HTMLInputElement;
    expect(input.value).toBe("2");
    slider().focus();
    await user.keyboard("5");
    expect(input.value).toBe("5");
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(slider()).toHaveAttribute("aria-valuenow", "2");
  });
});
