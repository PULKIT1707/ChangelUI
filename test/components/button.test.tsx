import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../src/components/button";

describe("Button", () => {
  it("renders a type=button with variant/tone/size data attributes and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-variant", "solid");
    expect(button).toHaveAttribute("data-tone", "primary");
    expect(button).toHaveAttribute("data-size", "md");
    expect(button.className).toContain("box-border");
    expect(button.className).toContain("active:scale-[0.97]");
    expect(button.className).toContain("h-9");
  });

  it("keeps an explicit type and merges className last", () => {
    render(
      <Button type="submit" size="lg" className="px-10" fullWidth>
        Go
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
    expect(button.className).toContain("px-10");
    expect(button.className).not.toContain("px-5");
    expect(button.className).toContain("w-full");
  });

  it("presses fast and releases on the spring curve; solid has depth that drops while pressed", () => {
    const { rerender } = render(<Button>Solid</Button>);
    const button = screen.getByRole("button");
    for (const cls of ["active:duration-75", "active:ease-pui-out", "ease-pui-spring", "duration-200"]) {
      expect(button).toHaveClass(cls);
    }
    expect(button).toHaveClass("shadow-[inset_0_1px_0_var(--pui-solid-highlight),var(--pui-shadow-xs)]");
    expect(button).toHaveClass("active:shadow-[inset_0_1px_0_var(--pui-solid-highlight)]");
    rerender(<Button variant="outline">Outline</Button>);
    expect(button).toHaveClass("active:duration-75", "ease-pui-spring");
    expect(button.className).not.toContain("--pui-solid-highlight");
  });

  it("link variant has no press scale", () => {
    render(<Button variant="link">Docs</Button>);
    expect(screen.getByRole("button").className).not.toContain("active:scale");
  });

  it("calls onClick and renders icons", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} leadingIcon={<span data-testid="lead" />} trailingIcon={<span data-testid="trail" />}>
        Go
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });

  it("loading sets aria-busy/aria-disabled, suppresses onClick, keeps focusability and swaps loadingText", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button loading onClick={onClick} leadingIcon={<span data-testid="lead" />}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId("lead")).toBeNull();
    expect(button.querySelector("[data-variant='ring'][aria-hidden='true']")).not.toBeNull();
    expect(button).toHaveTextContent("Save");
    button.focus();
    expect(button).toHaveFocus();
    // pointer-events are off while aria-disabled, so dispatch the click directly.
    button.click();
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <Button loading loadingText="Saving" onClick={onClick}>
        Save
      </Button>,
    );
    expect(button).toHaveTextContent("Saving");
    expect(button).not.toHaveTextContent("Save");
  });

  it("disabled uses the native attribute", () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("asChild renders the child with button classes", () => {
    render(
      <Button asChild variant="outline">
        <a href="#x">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link.className).toContain("inline-flex");
    expect(link).toHaveAttribute("data-variant", "outline");
    expect(link).not.toHaveAttribute("type");
  });

  it("asChild + disabled sets aria-disabled and tabIndex -1 and prevents clicks", () => {
    const onClick = vi.fn();
    render(
      <Button asChild disabled onClick={onClick}>
        <a href="#x">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
