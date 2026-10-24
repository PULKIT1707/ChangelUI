import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeviceFrame } from "../../src/components/device-frame";

describe("DeviceFrame", () => {
  it("renders a browser frame with the url, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <DeviceFrame ref={ref} url="acme.dev/pricing" className="mt-4">
        Content
      </DeviceFrame>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-device", "browser");
    expect(root?.className).toContain("mt-4");
    expect(screen.getByText("acme.dev/pricing")).toBeInTheDocument();
  });

  it("keeps the chrome out of the accessibility tree (a11y)", () => {
    render(
      <DeviceFrame device="phone">
        <button type="button">Open</button>
      </DeviceFrame>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
    expect(screen.getByText("9:41").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("drops the scroll tilt under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <DeviceFrame device="laptop" scrollTilt>
          Screen
        </DeviceFrame>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-tilt", "none");
  });

  it("renders on the server", () => {
    expect(renderToString(<DeviceFrame scrollTilt>Server</DeviceFrame>)).toContain('data-tilt="scroll"');
  });
});
