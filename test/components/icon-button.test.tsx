import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "../../src/components/icon-button";

describe("IconButton", () => {
  it("defaults to ghost/neutral md square and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton ref={ref} aria-label="Close">
        x
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-tone", "neutral");
    expect(button.className).toContain("size-9");
    expect(button.className).not.toContain("rounded-pui-full");
  });

  it("shares the button press timing and the solid depth", () => {
    const { rerender } = render(<IconButton aria-label="a" variant="solid" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("active:duration-75", "ease-pui-spring", "active:scale-[0.97]");
    expect(button).toHaveClass("shadow-[inset_0_1px_0_var(--pui-solid-highlight),var(--pui-shadow-xs)]");
    rerender(<IconButton aria-label="a" variant="ghost" />);
    expect(button.className).not.toContain("--pui-solid-highlight");
  });

  it("maps sizes to 32/36/44 px squares and supports circle", () => {
    const { rerender } = render(<IconButton aria-label="a" size="sm" shape="circle" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("size-8");
    expect(button.className).toContain("rounded-pui-full");
    rerender(<IconButton aria-label="a" size="lg" />);
    expect(button.className).toContain("size-11");
  });

  it("warns in development when aria-label is empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<IconButton aria-label=" ">x</IconButton>);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("IconButton needs a non-empty aria-label"));
    warn.mockRestore();
  });

  it("loading replaces the icon with a decorative spinner and ignores clicks", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Save" loading onClick={onClick}>
        <span data-testid="icon" />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(screen.queryByTestId("icon")).toBeNull();
    expect(button).toHaveAttribute("aria-busy", "true");
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("asChild + disabled prevents clicks", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Home" asChild disabled onClick={onClick}>
        <a href="#home">h</a>
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("tabindex", "-1");
    link.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
