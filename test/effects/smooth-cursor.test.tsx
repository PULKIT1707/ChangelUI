import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { SmoothCursor } from "../../src/effects/smooth-cursor";
import { setMediaQuery } from "../utils/env";

describe("SmoothCursor", () => {
  it("renders nothing and keeps the native cursor without a fine pointer", () => {
    const ref = createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <div data-testid="scope">
        <SmoothCursor ref={ref} />
      </div>,
    );
    expect(ref.current).toBeNull();
    expect(getByTestId("scope").style.cursor).toBe("");
    expect(document.querySelector("[data-pui-cursor]")).toBeNull();
  });

  it("portals a cursor, hides the native cursor on its parent and restores it on unmount", async () => {
    setMediaQuery("(pointer: fine)", true);
    const ref = createRef<HTMLDivElement>();
    const { getByTestId, unmount } = render(
      <div data-testid="scope" style={{ cursor: "crosshair" }}>
        <SmoothCursor ref={ref} cursorSize={30} className="text-pui-primary" />
      </div>,
    );
    const scope = getByTestId("scope");
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.parentElement).toBe(document.body);
    expect(ref.current).toHaveAttribute("aria-hidden", "true");
    expect(ref.current?.className).toContain("pointer-events-none");
    expect(ref.current?.style.width).toBe("30px");
    expect(scope.style.cursor).toBe("none");
    act(() => {
      scope.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 20, bubbles: true }));
    });
    await waitFor(() => expect(ref.current?.style.opacity).toBe("1"));
    unmount();
    expect(scope.style.cursor).toBe("crosshair");
  });

  it('scope="window" uses the document element and can keep the native cursor', () => {
    setMediaQuery("(pointer: fine)", true);
    const { unmount } = render(<SmoothCursor scope="window" hideNativeCursor={false} rotate />);
    expect(document.documentElement.style.cursor).toBe("");
    expect(document.querySelector("[data-pui-cursor]")).not.toBeNull();
    unmount();
    expect(document.querySelector("[data-pui-cursor]")).toBeNull();
  });
});
