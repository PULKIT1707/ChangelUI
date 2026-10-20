import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lockScroll, useScrollLock } from "../../src/lib/scroll-lock";

afterEach(() => {
  document.body.removeAttribute("style");
  vi.restoreAllMocks();
});

describe("scroll lock", () => {
  it("nested locks restore the original values on the last unlock", () => {
    document.body.style.overflow = "scroll";
    document.body.style.paddingRight = "3px";
    const a = lockScroll();
    const b = lockScroll();
    expect(document.body.style.overflow).toBe("hidden");
    a();
    a(); // idempotent
    expect(document.body.style.overflow).toBe("hidden");
    b();
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("3px");
  });

  it("compensates for the scrollbar width", () => {
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(window.innerWidth - 15);
    const unlock = lockScroll();
    expect(document.body.style.paddingRight).toBe("15px");
    unlock();
    expect(document.body.style.paddingRight).toBe("");
  });

  it("useScrollLock follows enabled", () => {
    function Lock({ enabled }: { enabled: boolean }) {
      useScrollLock(enabled);
      return null;
    }
    const { rerender, unmount } = render(<Lock enabled={false} />);
    expect(document.body.style.overflow).toBe("");
    rerender(<Lock enabled />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
