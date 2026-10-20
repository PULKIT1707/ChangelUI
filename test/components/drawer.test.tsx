import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  type DrawerProps,
} from "../../src/components/drawer";

function Example({ content, ...props }: Partial<DrawerProps> & { content?: React.ComponentProps<typeof DrawerContent> }) {
  return (
    <Drawer {...props}>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent {...content}>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Adjust preferences.</DrawerDescription>
        </DrawerHeader>
        <button type="button">First</button>
        <DrawerFooter>
          <DrawerClose>Done</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

const trigger = () => screen.getByRole("button", { name: "Open" });

describe("Drawer", () => {
  it("is a labelled modal dialog that traps focus and returns it on Escape", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(<Example content={{ ref }} />);
    await user.click(trigger());
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Adjust preferences.");
    expect(dialog).toHaveAttribute("data-side", "right");
    expect(dialog.className).toContain("max-w-[25rem]");
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it.each([
    ["left", "max-w-[20rem]", "sm"],
    ["top", "h-[80dvh]", "lg"],
    ["bottom", "h-dvh", "full"],
  ] as const)("side %s maps to data-side and its size classes", async (side, sizeClass, size) => {
    const user = userEvent.setup();
    render(<Example content={{ side, size }} />);
    await user.click(trigger());
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-side", side);
    expect(dialog).toHaveAttribute("data-size", size);
    expect(dialog.className).toContain(sizeClass);
  });

  it("bottom drawers show a grab handle only when swipeable", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example content={{ side: "bottom" }} />);
    await user.click(trigger());
    expect(document.querySelector("[data-pui-drawer-handle]")).not.toBeNull();
    unmount();
    render(<Example content={{ side: "bottom", swipeToDismiss: false }} />);
    await user.click(trigger());
    expect(document.querySelector("[data-pui-drawer-handle]")).toBeNull();
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "a %s drawer leaves the panel's touch-action and user-select to the browser",
    async (side) => {
      const user = userEvent.setup();
      render(<Example content={{ side }} />);
      await user.click(trigger());
      const dialog = screen.getByRole("dialog");
      expect(dialog.style.touchAction).toBe("");
      expect(dialog.style.userSelect).toBe("");
      expect(dialog.style.getPropertyValue("-webkit-user-select")).toBe("");
    },
  );
  it("top drawers mirror the bottom grab handle to their bottom edge", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example content={{ side: "bottom" }} />);
    await user.click(trigger());
    const bottom = document.querySelector("[data-pui-drawer-handle]") as HTMLElement;
    expect(bottom).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("dialog").firstElementChild).toBe(bottom);
    const bottomClasses = bottom.className.replace("-mt-3 mb-4", "").trim();
    unmount();
    render(<Example content={{ side: "top" }} />);
    await user.click(trigger());
    const top = document.querySelector("[data-pui-drawer-handle]") as HTMLElement;
    expect(top).toHaveAttribute("aria-hidden", "true");
    expect(top.className).toContain("mt-4 -mb-3");
    expect(top.className.replace("mt-4 -mb-3", "").trim()).toBe(bottomClasses);
    // Last before the close button: after the content, at the bottom edge.
    expect(top.nextElementSibling).toBe(screen.getByRole("button", { name: "Close" }));
    expect(top.className).toContain("touch-none");
  });
  it.each([
    ["right", "left-0"],
    ["left", "right-0"],
  ] as const)("a %s drawer has an invisible, unfocusable inner-edge strip", async (side, edgeClass) => {
    const user = userEvent.setup();
    render(<Example content={{ side }} />);
    await user.click(trigger());
    const strip = document.querySelector("[data-pui-drawer-edge]") as HTMLElement;
    expect(strip).toHaveAttribute("aria-hidden", "true");
    expect(strip).not.toHaveAttribute("tabindex");
    expect(strip.className).toContain("touch-pan-y");
    expect(strip.className).toContain("w-6");
    expect(strip.className).toContain(edgeClass);
    expect(strip.className).not.toMatch(/\b(bg|border|shadow)-/);
    expect(document.querySelector("[data-pui-drawer-handle]")).toBeNull();
    // Painted below the close button (earlier in the DOM), so it never covers it.
    expect(screen.getByRole("dialog").firstElementChild).toBe(strip);
    // Stays pinned to the visible area while the panel scrolls.
    const dialog = screen.getByRole("dialog");
    dialog.scrollTop = 120;
    fireEvent.scroll(dialog);
    expect(strip.style.transform).toBe("translateY(120px)");
  });
  it("no swipe zones without swipeToDismiss", async () => {
    const user = userEvent.setup();
    render(<Example content={{ side: "right", swipeToDismiss: false }} />);
    await user.click(trigger());
    expect(document.querySelector("[data-pui-drawer-edge]")).toBeNull();
    expect(document.querySelector("[data-pui-drawer-handle]")).toBeNull();
  });
  it("DrawerClose closes; controlled drawers report the request", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = render(<Example />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    unmount();
    render(<Example open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("uses opacity only under reduced motion", async () => {
    const user = userEvent.setup();
    render(
      <MotionConfig reducedMotion="always">
        <Example />
      </MotionConfig>,
    );
    await user.click(trigger());
    // Swipe and slide need real layout and animation frames (design 11.4: Playwright).
    expect(screen.getByRole("dialog").style.transform).not.toMatch(/translate/);
  });
});
