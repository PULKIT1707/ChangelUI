import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../src/components/accordion";

function Items({ disabled = [] }: { disabled?: string[] }) {
  return ["a", "b", "c"].map((v) => (
    <AccordionItem key={v} value={v} disabled={disabled.includes(v)}>
      <AccordionTrigger>Section {v}</AccordionTrigger>
      <AccordionContent>Body {v}</AccordionContent>
    </AccordionItem>
  ));
}

const trigger = (v: string) => screen.getByRole("button", { name: `Section ${v}` });
const expanded = () =>
  screen
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-expanded") === "true")
    .map((b) => b.textContent);

describe("Accordion", () => {
  it("wraps triggers in headings and wires aria-expanded, aria-controls and the region", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion ref={ref} defaultValue="a" headingLevel={4}>
        <Items />
      </Accordion>,
    );
    expect(ref.current).toHaveAttribute("data-variant", "bordered");
    const heading = screen.getAllByRole("heading", { level: 4 })[0];
    expect(heading?.className).toContain("box-border");
    expect(heading?.className).toContain("font-medium");
    expect(heading).toContainElement(trigger("a"));
    expect(trigger("a")).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region", { name: "Section a" });
    expect(trigger("a")).toHaveAttribute("aria-controls", region.id);
    expect(region).toHaveTextContent("Body a");
    expect(trigger("b")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body b")).toBeNull();
  });

  it("single: opening B closes A; the open item collapses by default", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Accordion defaultValue="a" onValueChange={onValueChange}>
        <Items />
      </Accordion>,
    );
    await user.click(trigger("b"));
    expect(expanded()).toEqual(["Section b"]);
    expect(onValueChange).toHaveBeenLastCalledWith("b");
    await waitFor(() => expect(screen.queryByText("Body a")).toBeNull());
    await user.click(trigger("b"));
    expect(expanded()).toEqual([]);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("single with collapsible={false} keeps the last item open", async () => {
    const user = userEvent.setup();
    render(
      <Accordion defaultValue="a" collapsible={false}>
        <Items />
      </Accordion>,
    );
    await user.click(trigger("a"));
    expect(expanded()).toEqual(["Section a"]);
  });

  it("multiple: items toggle independently", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Accordion type="multiple" defaultValue={["a"]} onValueChange={onValueChange}>
        <Items />
      </Accordion>,
    );
    await user.click(trigger("c"));
    expect(expanded()).toEqual(["Section a", "Section c"]);
    expect(onValueChange).toHaveBeenLastCalledWith(["a", "c"]);
    await user.click(trigger("a"));
    expect(expanded()).toEqual(["Section c"]);
  });

  it("Arrow Up/Down wrap and Home/End jump between enabled triggers", async () => {
    const user = userEvent.setup();
    render(
      <Accordion>
        <Items disabled={["b"]} />
      </Accordion>,
    );
    trigger("a").focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger("c")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(trigger("a")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(trigger("c")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(trigger("a")).toHaveFocus();
    await user.keyboard("{End}");
    expect(trigger("c")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(expanded()).toEqual(["Section c"]);
  });

  it("rotates the chevron when open, and icon={null} hides it", () => {
    render(
      <Accordion defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>Section a</AccordionTrigger>
          <AccordionContent>Body a</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger icon={null}>Section b</AccordionTrigger>
          <AccordionContent>Body b</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(trigger("a").querySelector("[data-pui-accordion-icon]")?.className).toContain("rotate-180");
    expect(trigger("b").querySelector("[data-pui-accordion-icon]")).toBeNull();
  });

  it("forceMount keeps closed content mounted and hidden", () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Section a</AccordionTrigger>
          <AccordionContent forceMount>Body a</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText("Body a").closest("[role=region]")).toHaveAttribute("hidden");
  });

  it("disabled disables every trigger", () => {
    render(
      <Accordion disabled>
        <Items />
      </Accordion>,
    );
    expect(trigger("a")).toBeDisabled();
  });

  describe("controlled vs uncontrolled", () => {
    it("null is a controlled value: nothing opens without a parent update", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Accordion value={null} onValueChange={onValueChange}>
          <Items />
        </Accordion>,
      );
      await user.click(trigger("a"));
      expect(onValueChange).toHaveBeenCalledWith("a");
      expect(expanded()).toEqual([]);
    });

    it("reflects the parent's updates", async () => {
      const user = userEvent.setup();
      function Parent() {
        const [value, setValue] = useState<string[]>([]);
        return (
          <Accordion type="multiple" value={value} onValueChange={setValue}>
            <Items />
          </Accordion>
        );
      }
      render(<Parent />);
      await user.click(trigger("b"));
      expect(expanded()).toEqual(["Section b"]);
    });

    it("uncontrolled defaultValue changes internally", async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue={null}>
          <Items />
        </Accordion>,
      );
      await user.click(trigger("c"));
      expect(expanded()).toEqual(["Section c"]);
    });
  });
});
