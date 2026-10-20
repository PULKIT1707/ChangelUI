import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Textarea } from "../../src/components/textarea";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Textarea", () => {
  it("ref and className go to the native textarea; rows default to minRows", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { container } = render(<Textarea ref={ref} aria-label="Bio" className="min-h-0" invalid />);
    const textarea = screen.getByRole("textbox", { name: "Bio" });
    expect(ref.current).toBe(textarea);
    expect(container.firstElementChild).toBe(textarea);
    expect(textarea).toHaveAttribute("rows", "3");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea.className).toContain("min-h-0");
    expect(textarea.className).toContain("resize-y");
  });

  it("autoResize clamps the height between minRows and maxRows", async () => {
    const user = userEvent.setup();
    let scrollHeight = 10;
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeight);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      lineHeight: "20px",
      fontSize: "14px",
      paddingTop: "8px",
      paddingBottom: "8px",
      borderTopWidth: "1px",
      borderBottomWidth: "1px",
    } as CSSStyleDeclaration);
    render(<Textarea aria-label="x" autoResize minRows={2} maxRows={4} />);
    const textarea = screen.getByRole("textbox");
    // min = 2 * 20 + 16 + 2 = 58
    expect(textarea.style.height).toBe("58px");
    expect(textarea.className).toContain("resize-none");
    scrollHeight = 70;
    await user.type(textarea, "a");
    expect(textarea.style.height).toBe("72px");
    expect(textarea.style.overflowY).toBe("hidden");
    scrollHeight = 500;
    await user.type(textarea, "b");
    // max = 4 * 20 + 18 = 98
    expect(textarea.style.height).toBe("98px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("showCount renders a counter linked through aria-describedby", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <span id="hint">Hint</span>
        <Textarea aria-label="x" showCount maxLength={5} defaultValue="ab" aria-describedby="hint" wrapperClassName="gap-4" />
      </>,
    );
    const textarea = screen.getByRole("textbox");
    const counter = container.querySelector("[data-pui-count]") as HTMLElement;
    expect(counter).toHaveTextContent("2/5");
    expect(textarea.getAttribute("aria-describedby")).toBe(`hint ${counter.id}`);
    expect(counter.parentElement?.className).toContain("gap-4");
    await user.type(textarea, "cde");
    expect(counter).toHaveTextContent("5/5");
    expect(counter.className).toContain("text-pui-danger-text");
  });

  it("counts a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("hi");
      return <Textarea aria-label="x" showCount maxLength={10} value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    const { container } = render(<Controlled />);
    await user.type(screen.getByRole("textbox"), "!");
    expect(container.querySelector("[data-pui-count]")).toHaveTextContent("3/10");
  });

  it("showCount without maxLength warns and renders no counter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<Textarea aria-label="x" showCount />);
    expect(container.querySelector("[data-pui-count]")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("showCount requires maxLength"));
  });
});
