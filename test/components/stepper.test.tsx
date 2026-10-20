import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Stepper, StepperItem } from "../../src/components/stepper";

const steps = (
  <>
    <StepperItem title="Cart" />
    <StepperItem title="Shipping" />
    <StepperItem title="Pay" />
  </>
);

describe("Stepper", () => {
  it("renders an ordered list with the current step marked", () => {
    render(
      <Stepper defaultValue={1} aria-label="Checkout">
        <StepperItem title="Cart" />
        <StepperItem title="Shipping" />
        <StepperItem title="Pay" />
      </Stepper>,
    );
    const list = screen.getByRole("list", { name: "Checkout" });
    expect(list.tagName).toBe("OL");
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-status", "complete");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).toHaveAttribute("data-status", "upcoming");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("makes steps buttons when linear is false", async () => {
    const onValueChange = vi.fn();
    render(
      <Stepper linear={false} onValueChange={onValueChange}>
        {steps}
      </Stepper>,
    );
    await userEvent.click(screen.getAllByRole("button")[2] as HTMLElement);
    expect(onValueChange).toHaveBeenCalledWith(2);
  });
  it("renders on the server", () => {
    expect(renderToString(<Stepper>{steps}</Stepper>)).toContain("Shipping");
  });
});
