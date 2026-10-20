import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ModalLayer } from "../../src/lib/modal";

function Harness({ dismissible = true, nested = false }: { dismissible?: boolean; nested?: boolean }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <ModalLayer
        open={open}
        onDismiss={() => setOpen(false)}
        dismissible={dismissible}
        aria-label="Outer"
        overlayProps={{ "data-testid": "overlay" } as Record<string, string>}
      >
        <button type="button">first</button>
        {nested ? (
          <button type="button" onClick={() => setInner(true)}>
            open inner
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen(false)}>
          close
        </button>
        <ModalLayer open={inner} onDismiss={() => setInner(false)} aria-label="Inner">
          <button type="button">inner button</button>
        </ModalLayer>
      </ModalLayer>
    </>
  );
}

describe("ModalLayer", () => {
  it("renders a modal dialog, traps focus and returns it on close", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "auto";
    render(<Harness />);
    await user.click(screen.getByText("open"));
    const dialog = screen.getByRole("dialog", { name: "Outer" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(screen.getByText("first")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab();
    await user.tab();
    expect(screen.getByText("first")).toHaveFocus();
    await user.click(screen.getByText("close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("open")).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    document.body.removeAttribute("style");
  });

  it("Escape and a full overlay click dismiss; a drag that ends outside does not", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByText("open"));
    const overlay = screen.getByTestId("overlay");
    fireEvent.pointerDown(screen.getByText("first"));
    fireEvent.pointerUp(overlay);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(screen.getByText("first"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(overlay);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "closed");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("dismissible false ignores Escape and overlay", async () => {
    const user = userEvent.setup();
    render(<Harness dismissible={false} />);
    await user.click(screen.getByText("open"));
    await user.keyboard("{Escape}");
    const overlay = screen.getByTestId("overlay");
    fireEvent.pointerDown(overlay);
    fireEvent.pointerUp(overlay);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Escape closes only the inner modal, and the outer trap pauses while it is on top", async () => {
    const user = userEvent.setup();
    render(<Harness nested />);
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("open inner"));
    expect(screen.getByText("inner button")).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
    expect(screen.getByText("open inner")).toHaveFocus();
  });
});
