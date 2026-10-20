import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useClickOutside, type UseClickOutsideOptions } from "../../src/hooks/use-click-outside";

function Harness({
  handler,
  multiple = false,
  options,
}: {
  handler: (e: PointerEvent) => void;
  multiple?: boolean;
  options?: UseClickOutsideOptions;
}) {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useClickOutside(multiple ? [a, b] : a, handler, options);
  return (
    <div>
      <div ref={a}>
        inside-a <span>nested</span>
      </div>
      <div ref={b}>inside-b</div>
      <div>outside</div>
    </div>
  );
}

describe("useClickOutside", () => {
  it("fires for outside pointerdown only", () => {
    const handler = vi.fn();
    render(<Harness handler={handler} />);
    fireEvent.pointerDown(screen.getByText("nested"));
    expect(handler).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("treats every ref in a list as inside", () => {
    const handler = vi.fn();
    render(<Harness handler={handler} multiple />);
    fireEvent.pointerDown(screen.getByText("inside-b"));
    expect(handler).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    const handler = vi.fn();
    render(<Harness handler={handler} options={{ enabled: false }} />);
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("can listen to click instead", () => {
    const handler = vi.fn();
    render(<Harness handler={handler} options={{ event: "click" }} />);
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(handler).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("outside"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores targets that are no longer connected", () => {
    const handler = vi.fn();
    render(<Harness handler={handler} />);
    const detached = document.createElement("div");
    fireEvent.pointerDown(detached);
    expect(handler).not.toHaveBeenCalled();
  });
});
