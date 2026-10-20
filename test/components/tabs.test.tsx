import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/components/tabs";

function Example({
  disabled = [],
  listProps,
  forceMount = false,
  ...props
}: React.ComponentProps<typeof Tabs> & { disabled?: string[]; listProps?: React.ComponentProps<typeof TabsList>; forceMount?: boolean }) {
  return (
    <Tabs {...props}>
      <TabsList aria-label="Sections" {...listProps}>
        {["one", "two", "three"].map((v) => (
          <TabsTrigger key={v} value={v} disabled={disabled.includes(v)}>
            {v}
          </TabsTrigger>
        ))}
      </TabsList>
      {["one", "two", "three"].map((v) => (
        <TabsContent key={v} value={v} forceMount={forceMount}>
          panel {v}
        </TabsContent>
      ))}
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });
const tabStops = () => screen.getAllByRole("tab").filter((t) => t.tabIndex === 0).map((t) => t.textContent);

describe("Tabs", () => {
  it("wires tablist, tab and tabpanel semantics and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} defaultValue="two" />);
    expect(ref.current).toHaveAttribute("data-orientation", "horizontal");
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toHaveAttribute("aria-orientation", "horizontal");
    expect(list).not.toHaveAttribute("tabindex");
    expect(tab("two")).toHaveAttribute("aria-selected", "true");
    expect(tab("one")).toHaveAttribute("aria-selected", "false");
    expect(tabStops()).toEqual(["two"]);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("panel two");
    expect(panel).toHaveAttribute("tabindex", "0");
    expect(tab("two")).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab("two").id);
    expect(screen.queryByText("panel one")).toBeNull();
  });

  it("ArrowRight moves focus and selection, wraps, and skips disabled triggers; Home/End jump", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example defaultValue="one" disabled={["two"]} onValueChange={onValueChange} />);
    await user.click(tab("one"));
    await user.keyboard("{ArrowRight}");
    expect(tab("three")).toHaveFocus();
    expect(tab("three")).toHaveAttribute("aria-selected", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("three");
    await user.keyboard("{ArrowRight}");
    expect(tab("one")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tab("three")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tab("one")).toHaveFocus();
    await user.keyboard("{End}");
    expect(tab("three")).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("panel three");
    expect(tabStops()).toEqual(["three"]);
  });

  it("manual mode moves focus only; Enter and Space activate", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue="one" activationMode="manual" />);
    await user.click(tab("one"));
    await user.keyboard("{ArrowRight}");
    expect(tab("two")).toHaveFocus();
    expect(tab("one")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(tab("two")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(tab("three")).toHaveAttribute("aria-selected", "true");
  });

  it("vertical orientation uses Up/Down", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue="one" orientation="vertical" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    await user.click(tab("one"));
    await user.keyboard("{ArrowRight}");
    expect(tab("one")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(tab("two")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(tab("one")).toHaveFocus();
  });

  it("has exactly one tab stop after mount, also with no value, and keeps it across re-renders", () => {
    const { rerender } = render(<Example />);
    expect(tabStops()).toEqual(["one"]);
    expect(screen.getByRole("tablist")).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("tabpanel")).toBeNull();
    rerender(<Example listProps={{ variant: "enclosed" }} />);
    expect(tabStops()).toEqual(["one"]);
  });

  it("an all-disabled tab list has no tab stop after mount, not even the list", () => {
    render(<Example disabled={["one", "two", "three"]} />);
    expect(tabStops()).toEqual([]);
    expect(screen.getByRole("tablist")).not.toHaveAttribute("tabindex");
  });

  it("renders variants, fullWidth and a single indicator under the selected tab", async () => {
    const user = userEvent.setup();
    render(<Example defaultValue="one" listProps={{ variant: "underline", fullWidth: true, size: "lg" }} />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveAttribute("data-variant", "underline");
    expect(list.className).toContain("w-full");
    expect(tab("one").className).toContain("flex-1");
    const indicators = () => [...document.querySelectorAll("[data-pui-tabs-indicator]")];
    expect(indicators()).toHaveLength(1);
    expect(tab("one").contains(indicators()[0] ?? null)).toBe(true);
    await user.click(tab("three"));
    expect(indicators()).toHaveLength(1);
    expect(tab("three").contains(indicators()[0] ?? null)).toBe(true);
  });

  it("pads pill and enclosed lists", () => {
    render(<Example defaultValue="one" />);
    expect(screen.getByRole("tablist").className).toContain("p-1");
  });

  it("forceMount keeps inactive panels mounted and hidden", () => {
    render(<Example defaultValue="one" forceMount />);
    const panels = document.querySelectorAll("[role=tabpanel]");
    expect(panels).toHaveLength(3);
    expect(panels[0]).not.toHaveAttribute("hidden");
    expect(panels[1]).toHaveAttribute("hidden");
  });

  describe("controlled vs uncontrolled", () => {
    it("uncontrolled defaultValue changes internally", async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="one" />);
      await user.click(tab("two"));
      expect(tab("two")).toHaveAttribute("aria-selected", "true");
    });

    it("controlled without an update stays fixed but reports the request", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example value="one" onValueChange={onValueChange} />);
      await user.click(tab("two"));
      expect(onValueChange).toHaveBeenCalledWith("two");
      expect(tab("one")).toHaveAttribute("aria-selected", "true");
    });

    it("reflects the parent's updates", async () => {
      const user = userEvent.setup();
      function Parent() {
        const [value, setValue] = useState("one");
        return <Example value={value} onValueChange={setValue} />;
      }
      render(<Parent />);
      await user.click(tab("three"));
      expect(tab("three")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("panel three");
    });
  });
});
