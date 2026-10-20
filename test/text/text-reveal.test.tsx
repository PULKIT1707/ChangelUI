import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { TextReveal } from "../../src/text/text-reveal";

describe("TextReveal", () => {
  it("splits words into inline-block spans and keeps the text sr-only", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<TextReveal ref={ref}>{"Hello  big world"}</TextReveal>);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("P");
    expect(root.querySelector(".sr-only")).toHaveTextContent("Hello big world");
    const visual = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(visual.querySelectorAll(":scope > span")).toHaveLength(3);
    // whitespace (including the double space) is preserved as text
    expect(visual.textContent).toBe("Hello  big world");
    expect(visual.className).toContain("whitespace-pre-wrap");
  });

  it("splits characters inside non-breaking word wrappers", () => {
    const { container } = render(
      <TextReveal split="char" as="h2" trigger="mount">
        ab cd
      </TextReveal>,
    );
    const visual = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    const words = visual.querySelectorAll(":scope > span");
    expect(words).toHaveLength(2);
    expect(words[0]?.className).toContain("whitespace-nowrap");
    expect(words[0]?.querySelectorAll("span")).toHaveLength(2);
    expect(container.firstElementChild?.tagName).toBe("H2");
    expect(container.firstElementChild).toHaveAttribute("data-state", "visible");
  });
});
