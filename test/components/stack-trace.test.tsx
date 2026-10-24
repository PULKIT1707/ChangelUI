import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StackTrace, parseStackTrace, shortenPath } from "../../src/components/stack-trace";
const v8 = `TypeError: Cannot read properties of undefined (reading 'map')
    at CartTotal (http://localhost:5173/src/cart/total.tsx?t=171:14:22)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom.js:1:2)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/react-dom.js:3:4)
    at async loadCart (src/cart/load.ts:8:3)
    at node:internal/process/task_queues:95:5`;
const gecko = `fetchUser@https://app.example.com/assets/user.js:10:5
@https://app.example.com/assets/main.js:2:1`;
describe("parseStackTrace", () => {
  it("parses V8 stacks with the headline and app frames", () => {
    const parsed = parseStackTrace(v8);
    expect(parsed.name).toBe("TypeError");
    expect(parsed.message).toContain("reading 'map'");
    expect(parsed.frames).toHaveLength(5);
    expect(parsed.frames[0]).toMatchObject({ fn: "CartTotal", line: 14, column: 22, isApp: true });
    expect(parsed.frames[1]?.isApp).toBe(false);
    expect(parsed.frames[3]).toMatchObject({ fn: "async loadCart", file: "src/cart/load.ts", isApp: true });
    expect(parsed.frames[4]?.isApp).toBe(false);
  });
  it("parses Firefox and Safari stacks", () => {
    const parsed = parseStackTrace(gecko);
    expect(parsed.frames).toHaveLength(2);
    expect(parsed.frames[0]).toMatchObject({ fn: "fetchUser", line: 10, column: 5 });
    expect(parsed.frames[1]?.fn).toBeNull();
  });
  it("shortens paths", () => {
    expect(shortenPath("http://localhost:5173/src/cart/total.tsx?t=171")).toBe("src/cart/total.tsx");
    expect(shortenPath("webpack-internal:///./src/a.ts")).toBe("src/a.ts");
  });
});
describe("StackTrace", () => {
  it("marks the likely cause, folds library frames and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<StackTrace ref={ref} className="mt-4" trace={v8} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByText("Likely cause")).toBeInTheDocument();
    const fold = screen.getByRole("button", { name: /2 library frames/ });
    expect(fold).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(fold);
    expect(fold).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("renderWithHooks")).toBeInTheDocument();
  });
  it("opens frames and shows the raw text", () => {
    const onOpenFrame = vi.fn();
    render(<StackTrace trace={v8} onOpenFrame={onOpenFrame} />);
    fireEvent.click(screen.getByRole("button", { name: /Open CartTotal at src\/cart\/total.tsx line 14/ }));
    expect(onOpenFrame).toHaveBeenCalledWith(expect.objectContaining({ fn: "CartTotal" }));
    fireEvent.click(screen.getByRole("button", { name: "Raw" }));
    expect(document.querySelector("pre")?.textContent).toContain("task_queues");
  });
  it("accepts an Error and renders on the server", () => {
    const error = new RangeError("Out of range");
    expect(renderToString(<StackTrace trace={error} />)).toContain("RangeError");
  });
});
