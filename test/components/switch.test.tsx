import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "../../src/components/switch";

describe("Switch", () => {
  it("click and Space toggle aria-checked and data-state and call onCheckedChange", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<Switch ref={ref} aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Wi-Fi" });
    expect(ref.current).toBe(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(sw).toHaveAttribute("data-state", "unchecked");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(sw).toHaveAttribute("data-state", "checked");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    await user.keyboard("{Enter}");
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("disabled ignores input", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="x" disabled onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("controlled stays fixed until the parent updates; the callback still fires", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(<Switch aria-label="x" checked={false} onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<Switch aria-label="x" checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("widens the thumb while pressed", () => {
    const { container } = render(<Switch aria-label="x" size="lg" />);
    const sw = screen.getByRole("switch");
    const thumb = container.querySelector("span[data-state]") as HTMLElement;
    expect(thumb.className).toContain("size-5");
    fireEvent.pointerDown(sw);
    expect(thumb.className).toContain("w-6");
    fireEvent.pointerUp(sw);
    expect(thumb.className).not.toContain("w-6");
    fireEvent.keyDown(sw, { key: " " });
    expect(thumb.className).toContain("w-6");
    fireEvent.keyUp(sw, { key: " " });
    fireEvent.pointerDown(sw);
    fireEvent.pointerLeave(sw);
    expect(thumb.className).not.toContain("w-6");
  });

  it("with name renders a hidden readOnly checkbox that reflects the state and restores on form reset", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Switch aria-label="Wi-Fi" name="wifi" value="yes" defaultChecked />
      </form>,
    );
    const input = container.querySelector("input[name='wifi']") as HTMLInputElement;
    expect(input.type).toBe("checkbox");
    expect(input.readOnly).toBe(true);
    expect(input).toHaveAttribute("aria-hidden", "true");
    expect(input.tabIndex).toBe(-1);
    expect(input.value).toBe("yes");
    expect(input.checked).toBe(true);
    await user.click(screen.getByRole("switch"));
    expect(input.checked).toBe(false);
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(input.checked).toBe(true);
  });

  it("no hidden input without name", () => {
    const { container } = render(<Switch aria-label="x" />);
    expect(container.querySelector("input")).toBeNull();
  });

  it("a controlled Switch receives onCheckedChange(defaultChecked === true) on form reset", () => {
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [on, setOn] = useState(true);
      return (
        <form>
          <Switch
            aria-label="x"
            checked={on}
            defaultChecked={false}
            onCheckedChange={(next) => {
              onCheckedChange(next);
              setOn(next);
            }}
          />
        </form>
      );
    }
    const { container } = render(<Controlled />);
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    // Already at the target: no callback.
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it("warns in development when unnamed, but not inside a label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <label>
        Airplane <Switch />
      </label>,
    );
    expect(warn).not.toHaveBeenCalled();
    render(<Switch />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Switch needs an aria-label"));
    warn.mockRestore();
  });

  it("wrapping label toggles on label click", async () => {
    const user = userEvent.setup();
    render(
      <label>
        Airplane <Switch />
      </label>,
    );
    await user.click(screen.getByText("Airplane"));
    expect(screen.getByRole("switch", { name: "Airplane" })).toHaveAttribute("aria-checked", "true");
  });
});
