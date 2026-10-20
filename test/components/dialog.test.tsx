import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../../src/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogProps,
} from "../../src/components/dialog";

afterEach(() => {
  MotionGlobalConfig.skipAnimations = true;
  document.body.removeAttribute("style");
});

function Example({
  content,
  autofocus = false,
  useInitialFocus = false,
  children,
  ...props
}: Partial<DialogProps> & { content?: React.ComponentProps<typeof DialogContent>; autofocus?: boolean; useInitialFocus?: boolean }) {
  const initial = useRef<HTMLInputElement>(null);
  return (
    <Dialog {...props}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent overlayClassName="test-overlay" initialFocus={useInitialFocus ? initial : undefined} {...content}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your details.</DialogDescription>
        </DialogHeader>
        <input aria-label="Name" />
        <input aria-label="Email" ref={initial} />
        {autofocus ? <input aria-label="Auto" data-autofocus /> : null}
        {children}
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Open" }));
  return screen.getByRole("dialog");
};
const overlay = () => document.querySelector(".test-overlay") as HTMLElement;

describe("Dialog", () => {
  it("opens through DialogTrigger asChild with full ARIA wiring and the close button last", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(<Example content={{ ref, size: "lg" }} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const dialog = await open(user);
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-size", "lg");
    expect(dialog).toHaveAccessibleName("Edit profile");
    expect(dialog).toHaveAttribute("aria-labelledby", screen.getByRole("heading", { name: "Edit profile" }).id);
    expect(dialog).toHaveAttribute("aria-describedby", screen.getByText("Update your details.").id);
    expect(screen.getByRole("heading", { level: 2 }).className).toContain("font-semibold");
    const buttons = dialog.querySelectorAll("button");
    expect(buttons[buttons.length - 1]).toHaveAccessibleName("Close");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("focuses the first tabbable, then [data-autofocus], then initialFocus", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await open(user);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    unmount();
    const second = render(<Example autofocus />);
    await open(user);
    expect(screen.getByRole("textbox", { name: "Auto" })).toHaveFocus();
    second.unmount();
    render(<Example autofocus useInitialFocus />);
    await open(user);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
  });

  it("Tab wraps from the last tabbable to the first and Shift+Tab reverses", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open(user);
    const name = screen.getByRole("textbox", { name: "Name" });
    const close = screen.getByRole("button", { name: "Close" });
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab();
    expect(name).toHaveFocus();
  });

  it("Escape closes and returns focus to the trigger; the body scroll lock is restored", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "scroll";
    render(<Example />);
    await open(user);
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("returns focus as soon as it closes, before the exit animation ends", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open(user);
    MotionGlobalConfig.skipAnimations = false;
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open", hidden: true })).toHaveFocus();
    MotionGlobalConfig.skipAnimations = true;
    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).toBeNull());
  });

  it("an overlay click closes; dismissible={false} ignores Escape and the overlay", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await open(user);
    fireEvent.pointerDown(overlay());
    fireEvent.pointerUp(overlay());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    unmount();
    render(<Example dismissible={false} />);
    await open(user);
    await user.keyboard("{Escape}");
    fireEvent.pointerDown(overlay());
    fireEvent.pointerUp(overlay());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("with a nested dialog, Escape closes only the inner one", async () => {
    const user = userEvent.setup();
    render(
      <Example>
        <Dialog>
          <DialogTrigger>Inner</DialogTrigger>
          <DialogContent>
            <DialogTitle>Inner dialog</DialogTitle>
            <button type="button">Inner action</button>
          </DialogContent>
        </Dialog>
      </Example>,
    );
    await open(user);
    await user.click(screen.getByRole("button", { name: "Inner" }));
    expect(screen.getByRole("button", { name: "Inner action" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Inner dialog" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inner" })).toHaveFocus();
  });

  it("the overlay uses the --pui-overlay-blur token", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await open(user);
    expect(overlay()).toHaveClass("backdrop-blur-(--pui-overlay-blur)");
  });

  it("marks the parent dialog data-under-modal while a nested dialog is open", async () => {
    const user = userEvent.setup();
    render(
      <Example>
        <Dialog>
          <DialogTrigger>Inner</DialogTrigger>
          <DialogContent>
            <DialogTitle>Inner dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      </Example>,
    );
    await open(user);
    const parent = screen.getByRole("dialog", { name: "Edit profile" });
    expect(parent).not.toHaveAttribute("data-under-modal");
    await user.click(screen.getByRole("button", { name: "Inner" }));
    expect(parent).toHaveAttribute("data-under-modal", "");
    expect(screen.getByRole("dialog", { name: "Inner dialog" })).not.toHaveAttribute("data-under-modal");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(parent).not.toHaveAttribute("data-under-modal"));
  });

  it("omits aria-labelledby/-describedby without Title/Description and warns when unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Dialog defaultOpen>
        <DialogContent showClose={false}>
          <button type="button">Only</button>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(dialog).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Dialog needs a DialogTitle or an aria-label"));
    warn.mockRestore();
  });

  it("does not warn when named by aria-label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Dialog defaultOpen>
        <DialogContent aria-label="Quick note">
          <button type="button">Only</button>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Quick note" })).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe("controlled vs uncontrolled", () => {
    it("uncontrolled defaultOpen closes internally", async () => {
      const user = userEvent.setup();
      render(<Example defaultOpen />);
      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("controlled without an update stays open but reports the request", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example open onOpenChange={onOpenChange} />);
      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("reflects the parent's updates", async () => {
      const user = userEvent.setup();
      function Parent() {
        const [isOpen, setOpen] = useState(false);
        return <Example open={isOpen} onOpenChange={setOpen} />;
      }
      render(<Parent />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });
  });
});
