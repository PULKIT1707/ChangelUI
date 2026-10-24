import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "../../src/components/input-group";

describe("InputGroup", () => {
  it("renders a labelled group and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(
      <InputGroup ref={ref} aria-label="Website" className="mt-4">
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput ref={inputRef} aria-label="Domain" />
      </InputGroup>,
    );
    const group = screen.getByRole("group", { name: "Website" });
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute("data-size", "md");
    expect(group.className).toContain("mt-4");
    expect(inputRef.current?.tagName).toBe("INPUT");
  });

  it("focuses the control when addon text is pressed", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );
    fireEvent.mouseDown(screen.getByText("USD"));
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  });

  it("passes invalid and disabled down", () => {
    const onClick = vi.fn();
    render(
      <InputGroup invalid disabled>
        <InputGroupTextarea aria-label="Message" />
        <InputGroupAddon align="block-end">
          <InputGroupButton onClick={onClick}>Send</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("renders on the server", () => {
    const html = renderToString(
      <InputGroup>
        <InputGroupInput aria-label="Search" placeholder="Search" />
      </InputGroup>,
    );
    expect(html).toContain('data-slot="input-group-control"');
  });
});
