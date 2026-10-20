import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "../../src/components/input";

describe("Input", () => {
  it("ref and className go to the native input; no wrapper without icons", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(<Input ref={ref} aria-label="Name" className="w-40" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(ref.current).toBe(input);
    expect(container.firstElementChild).toBe(input);
    expect(input.className).toContain("w-40");
    expect(input.className).not.toContain("w-full");
    expect(input.className).toContain("h-9");
    expect(input.className).toContain("focus-visible:shadow-");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("renders a wrapper with wrapperClassName only when an icon is present", () => {
    const { container } = render(
      <Input aria-label="Search" size="lg" leadingIcon={<span data-testid="lead" />} trailingIcon={<span data-testid="trail" />} wrapperClassName="max-w-xs" />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.className).toContain("max-w-xs");
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("ps-10");
    expect(input.className).toContain("pe-10");
    expect(screen.getByTestId("lead").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });

  it("invalid sets aria-invalid and the danger boundary", () => {
    render(<Input aria-label="x" invalid size="sm" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-pui-danger");
    expect(input.className).not.toContain("border-pui-input");
  });

  it("accepts typing", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="x" defaultValue="a" />);
    await user.type(screen.getByRole("textbox"), "bc");
    expect(screen.getByRole("textbox")).toHaveValue("abc");
  });
});
