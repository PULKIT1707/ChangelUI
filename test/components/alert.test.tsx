import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AnimatePresence } from "motion/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "../../src/components/alert";

describe("Alert", () => {
  it("is a static callout by default with the tone icon and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Alert ref={ref} title="Heads up">
        Body
      </Alert>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).not.toHaveAttribute("role");
    expect(root).toHaveAttribute("data-tone", "info");
    expect(root).toHaveAttribute("data-variant", "soft");
    expect(root).toHaveTextContent("Heads up");
    expect(root).toHaveTextContent("Body");
    expect(root.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("live uses role alert for warning/danger and status otherwise", () => {
    const { rerender } = render(<Alert live tone="danger" title="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    rerender(<Alert live tone="warning" title="Careful" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<Alert live tone="success" title="Saved" />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("icon={false} hides the icon; a custom icon and an action render", () => {
    const { container, rerender } = render(<Alert icon={false}>x</Alert>);
    expect(container.querySelector("svg")).toBeNull();
    rerender(
      <Alert icon={<span data-testid="custom" />} action={<button type="button">Undo</button>} variant="outline">
        x
      </Alert>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("onDismiss renders a labelled IconButton and animates out inside AnimatePresence", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    function Demo() {
      const [open, setOpen] = useState(true);
      return (
        <AnimatePresence>
          {open ? (
            <Alert
              key="a"
              tone="neutral"
              variant="solid"
              dismissLabel="Close notice"
              onDismiss={() => {
                onDismiss();
                setOpen(false);
              }}
            >
              Body
            </Alert>
          ) : null}
        </AnimatePresence>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Close notice" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Body")).toBeNull());
  });
});
