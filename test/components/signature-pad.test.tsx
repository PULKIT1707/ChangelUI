import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SignaturePad, signatureToSVG } from "../../src/components/signature-pad";
describe("SignaturePad", () => {
  it("starts empty with Undo and Clear disabled", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SignaturePad ref={ref} className="mt-4" />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("group", { name: "Signature" })).toHaveAttribute("data-empty");
    expect(screen.getByRole("img", { name: /empty/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });
  it("undoes saved strokes and reports null when empty", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} defaultStrokes={[[{ x: 10, y: 10, w: 2 }, { x: 40, y: 20, w: 2 }]]} />);
    expect(screen.getByRole("img", { name: /signed, 1 stroke/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
  it("signs by typing", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} defaultMode="type" />);
    fireEvent.change(screen.getByRole("textbox", { name: /type your full name/ }), { target: { value: "Ana Diaz" } });
    const value = onChange.mock.lastCall?.[0];
    expect(value).toMatchObject({ mode: "type", text: "Ana Diaz" });
    expect(value.svg).toContain("Ana Diaz");
  });
  it("exports strokes as SVG", () => {
    const svg = signatureToSVG({ strokes: [[{ x: 1, y: 2, w: 2 }, { x: 5, y: 6, w: 2 }], [{ x: 9, y: 9, w: 3 }]] }, 100, 50);
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).toContain("<path");
    expect(svg).toContain("<circle");
  });
  it("renders on the server", () => {
    expect(renderToString(<SignaturePad />)).toContain("Sign here");
  });
});
