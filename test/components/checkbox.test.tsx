import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "../../src/components/checkbox";

describe("Checkbox", () => {
  it("click and Space toggle; Enter does not", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<Checkbox ref={ref} aria-label="Accept" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept" });
    expect(ref.current).toBe(box);
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(box).toHaveAttribute("data-state", "checked");
    expect(box.querySelector("[data-pui-check]")).not.toBeNull();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.keyboard("{Enter}");
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it('indeterminate -> aria-checked="mixed" -> click -> true', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="All" defaultChecked="indeterminate" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("aria-checked", "mixed");
    expect(box).toHaveAttribute("data-state", "indeterminate");
    expect(box.querySelector("[data-pui-indeterminate]")).not.toBeNull();
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("wrapping in a label toggles on label click", async () => {
    const user = userEvent.setup();
    render(
      <label>
        <Checkbox /> Remember me
      </label>,
    );
    await user.click(screen.getByText("Remember me"));
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toHaveAttribute("aria-checked", "true");
  });

  it("controlled stays fixed until the parent updates; the callback still fires", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(<Checkbox aria-label="x" checked="indeterminate" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
    rerender(<Checkbox aria-label="x" checked onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("disabled ignores input", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="x" disabled />);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  it("with name renders a hidden readOnly checkbox and restores the default on form reset", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Checkbox aria-label="x" name="terms" required />
      </form>,
    );
    const input = container.querySelector("input[name='terms']") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.checked).toBe(false);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-required", "true");
    await user.click(screen.getByRole("checkbox"));
    expect(input.checked).toBe(true);
    act(() => (container.querySelector("form") as HTMLFormElement).reset());
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  it("warns in development when unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Checkbox />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Checkbox needs an aria-label"));
    warn.mockRestore();
  });
});
