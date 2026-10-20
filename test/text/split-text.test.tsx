import { render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SplitText } from "../../src/text/split-text";

describe("SplitText", () => {
  it("renders the requested tag, merges className, forwards the ref and enters in view", async () => {
    const ref = createRef<HTMLElement>();
    render(
      <SplitText ref={ref} as="h2" className="mt-4">
        Hello
      </SplitText>,
    );
    const root = screen.getByText("Hello");
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("H2");
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
    await waitFor(() => expect(root).toHaveAttribute("data-state", "visible"));
  });

  it("keeps the text in the accessibility tree (a11y)", () => {
    render(<SplitText trigger="mount">Readable</SplitText>);
    const text = screen.getByText("Readable");
    expect(text.closest("[aria-hidden='true']")).toBeNull();
    expect(text).toHaveAttribute("data-state", "visible");
  });

  it("shows the final state at once under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <SplitText>Calm</SplitText>
      </MotionConfig>,
    );
    const text = screen.getByText("Calm");
    expect(text).toHaveAttribute("data-state", "visible");
    expect(text.style.opacity).toBe("1");
  });

  it("renders the hidden pre-trigger state on the server", () => {
    const html = renderToString(<SplitText>Server</SplitText>);
    expect(html).toContain("Server");
    expect(html).toContain('data-state="hidden"');
  });
});
