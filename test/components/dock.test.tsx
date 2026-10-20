import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dock, DockItem, DockSeparator } from "../../src/components/dock";

function Example(props: React.ComponentProps<typeof Dock>) {
  return (
    <Dock {...props}>
      <DockItem label="Home" active>
        H
      </DockItem>
      <DockItem label="Mail">M</DockItem>
      <DockSeparator />
      <DockItem label="Settings">S</DockItem>
    </Dock>
  );
}

const item = (name: string) => screen.getByRole("button", { name });
const tabStops = () => screen.getAllByRole("button").filter((b) => b.tabIndex === 0).map((b) => b.getAttribute("aria-label"));
const wrapper = (name: string) => item(name).closest("[data-pui-dock-item]") as HTMLElement;

describe("Dock", () => {
  it("is a named toolbar with one tab stop on the first item after mount", () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(<Example ref={ref} />);
    const toolbar = screen.getByRole("toolbar", { name: "Dock" });
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(toolbar).not.toHaveAttribute("tabindex");
    expect(tabStops()).toEqual(["Home"]);
    rerender(<Example aria-label="Apps" itemSize={36} />);
    expect(screen.getByRole("toolbar", { name: "Apps" })).toBeInTheDocument();
    expect(tabStops()).toEqual(["Home"]);
  });

  it("Left/Right/Home/End move focus and skip the separator", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Mail")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Settings")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Settings")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Settings")).toHaveFocus();
    expect(tabStops()).toEqual(["Settings"]);
  });

  it("shows the label in a top tooltip on keyboard focus and magnifies the focused item", async () => {
    // Real timers: Motion's frame loop must keep running for the size spring.
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Home");
    expect(item("Home")).toHaveAttribute("aria-describedby", tooltip.id);
    await waitFor(() => expect(wrapper("Home").style.width).toBe("64px"));
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(wrapper("Home").style.width).toBe("40px"));
  });

  it("magnifies items near the pointer and resets on leave", async () => {
    render(<Example />);
    const toolbar = screen.getByRole("toolbar");
    fireEvent.pointerMove(toolbar, { clientX: 0, pointerType: "mouse" });
    await waitFor(() => expect(wrapper("Mail").style.width).toBe("64px"));
    fireEvent.pointerLeave(toolbar);
    await waitFor(() => expect(wrapper("Mail").style.width).toBe("40px"));
  });

  it("does not magnify under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <Example itemSize={32} />
      </MotionConfig>,
    );
    fireEvent.pointerMove(screen.getByRole("toolbar"), { clientX: 0, pointerType: "mouse" });
    expect(wrapper("Home").style.width).toBe("32px");
  });

  it("renders the active dot, a vertical separator and asChild items", () => {
    render(
      <Dock>
        <DockItem label="Docs" asChild active>
          <a href="#docs">D</a>
        </DockItem>
        <DockSeparator />
      </Dock>,
    );
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("data-roving-item");
    const dot = link.closest("[data-pui-dock-item]")?.querySelector("[data-pui-dock-indicator]");
    expect(dot?.className).toContain("bg-pui-primary");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("warns when a label is empty", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Dock>
        <DockItem label=" ">x</DockItem>
      </Dock>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("DockItem needs a non-empty label"));
    warn.mockRestore();
  });
});
