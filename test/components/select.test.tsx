import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../../src/components/select";

function Plans({ defaultValue }: { defaultValue?: string }) {
  return (
    <Select defaultValue={defaultValue} placeholder="Pick a plan">
      <SelectTrigger aria-label="Plan" />
      <SelectContent>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="team" disabled>
          Team
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("renders a combobox trigger with the selected label and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Select defaultValue="pro">
        <SelectTrigger ref={ref} aria-label="Plan" className="mt-4" />
        <SelectContent>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "Plan" });
    expect(ref.current).toBe(trigger);
    expect(trigger).toHaveTextContent("Pro");
    expect(trigger.className).toContain("mt-4");
  });

  it("opens with the keyboard and selects (a11y)", () => {
    render(<Plans />);
    const trigger = screen.getByRole("combobox", { name: "Plan" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveTextContent("Pro");
  });

  it("renders the placeholder on the server", () => {
    expect(renderToString(<Plans />)).toContain("Pick a plan");
  });
});
