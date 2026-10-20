import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPage,
} from "../../src/components/command-menu";

function Palette({ onSelect = () => {} }: { onSelect?: (value: string) => void }) {
  return (
    <Command label="Actions">
      <CommandInput aria-label="Search" />
      <CommandList>
        <CommandEmpty>Nothing</CommandEmpty>
        <CommandGroup heading="Files">
          <CommandItem onSelect={onSelect}>New file</CommandItem>
          <CommandItem onSelect={onSelect} keywords={["open"]}>
            Open recent
          </CommandItem>
          <CommandItem toPage="theme">Theme</CommandItem>
        </CommandGroup>
        <CommandPage name="theme">
          <CommandItem onSelect={onSelect}>Dark</CommandItem>
        </CommandPage>
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  it("forwards the ref and wires the combobox to the listbox (a11y)", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Command ref={ref} className="mt-4">
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandItem>One</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(ref.current?.className).toContain("mt-4");
    const input = screen.getByRole("combobox", { name: "Search" });
    expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "One" }).id);
  });

  it("filters, navigates with arrows and selects with Enter", () => {
    const onSelect = vi.fn();
    render(<Palette onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "open" } });
    expect(screen.queryByRole("option", { name: "New file" })).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("Open recent");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing");
  });

  it("opens nested pages and goes back with Backspace", () => {
    render(<Palette />);
    const input = screen.getByRole("combobox");
    fireEvent.click(screen.getByRole("option", { name: "Theme" }));
    expect(screen.getByRole("option", { name: "Dark" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByRole("option", { name: "New file" })).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<Palette />)).toContain("New file");
  });
});
