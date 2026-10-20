import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Stagger, StaggerItem } from "../../src/effects/stagger";

describe("Stagger", () => {
  // Design 11.3 "Stagger root reset": the only check that the dynamic tag picks the right reset branch.
  it('as="ul" renders a <ul> root with the list reset', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Stagger ref={ref} as="ul">
        <StaggerItem as="li">a</StaggerItem>
      </Stagger>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("UL");
    expect(ref.current).toBe(root);
    const classes = root.className.split(" ");
    expect(classes).toContain("list-none");
    expect(classes).toContain("p-0");
    expect(root.querySelector("li")?.className).toContain("box-border");
  });

  it("the default root is a <div> with the block reset and no list reset", () => {
    const { container } = render(
      <Stagger>
        <StaggerItem>a</StaggerItem>
      </Stagger>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.className.split(" ")).toContain("box-border");
    expect(root.className).not.toContain("list-none");
  });

  it('as="ol" also gets the list reset; consumer classes win', () => {
    const { container } = render(
      <Stagger as="ol" className="p-4">
        <StaggerItem as="li">a</StaggerItem>
      </Stagger>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("OL");
    expect(root.className).toContain("list-none");
    expect(root.className).toContain("p-4");
    expect(root.className).not.toMatch(/\bp-0\b/);
  });

  it("items inherit the container preset unless they override it", () => {
    const { getByText } = render(
      <Stagger preset="scale" trigger="mount">
        <StaggerItem>inherits</StaggerItem>
        <StaggerItem preset="fade-left" as="span">
          overrides
        </StaggerItem>
      </Stagger>,
    );
    expect(getByText("inherits")).toHaveAttribute("data-preset", "scale");
    expect(getByText("overrides")).toHaveAttribute("data-preset", "fade-left");
    expect(getByText("overrides").tagName).toBe("SPAN");
    expect(getByText("inherits").parentElement).toHaveAttribute("data-state", "visible");
  });

  it("renders its items visible under reduced motion", () => {
    const { getByText } = render(
      <MotionConfig reducedMotion="always">
        <Stagger trigger="mount">
          <StaggerItem>calm</StaggerItem>
        </Stagger>
      </MotionConfig>,
    );
    expect(getByText("calm")).toBeInTheDocument();
  });
});
