import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useLayer, type LayerConfig } from "../../src/lib/layers";

function Layer({
  name,
  open = true,
  config,
  children,
}: {
  name: string;
  open?: boolean;
  config: Omit<LayerConfig, "contentEls">;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { isTop, isTopFocusLayer } = useLayer(open, { ...config, contentEls: () => [ref.current] });
  return (
    <div ref={ref} data-testid={name} data-top={String(isTop)} data-focus={String(isTopFocusLayer)}>
      {name}
      {children}
    </div>
  );
}

const symbol = Symbol.for("changelui/layers@1");

describe("layer stack", () => {
  it("Escape goes to the top-most layer with onEscape only", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { rerender } = render(<Layer name="outer" config={{ kind: "modal", onEscape: outer }} />);
    rerender(
      <Layer name="outer" config={{ kind: "modal", onEscape: outer }}>
        <Layer name="inner" config={{ kind: "modal", onEscape: inner }} />
      </Layer>,
    );
    expect(screen.getByTestId("inner").dataset.top).toBe("true");
    expect(screen.getByTestId("outer").dataset.top).toBe("false");
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(event);
    });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("respects defaultPrevented from an inner widget", () => {
    const onEscape = vi.fn();
    render(
      <Layer name="dialog" config={{ kind: "modal", onEscape }}>
        <input aria-label="combo" onKeyDown={(e) => e.key === "Escape" && e.preventDefault()} />
      </Layer>,
    );
    fireEvent.keyDown(screen.getByLabelText("combo"), { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("dialog"), { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByTestId("dialog"), { key: "Enter" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("skips layers without onEscape", () => {
    const outer = vi.fn();
    render(
      <Layer name="outer" config={{ kind: "modal", onEscape: outer }}>
        <Layer name="tip" config={{ kind: "tooltip" }} />
      </Layer>,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it("only the top layer evaluates outside pointerdown", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { rerender } = render(<Layer name="outer" config={{ kind: "popover", onPointerDownOutside: outer }} />);
    rerender(
      <>
        <Layer name="outer" config={{ kind: "popover", onPointerDownOutside: outer }} />
        <Layer name="inner" config={{ kind: "menu", onPointerDownOutside: inner }} />
        <div>elsewhere</div>
      </>,
    );
    fireEvent.pointerDown(screen.getByText("inner"));
    expect(inner).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("outer"));
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("marks a layer underModal only while a modal sits above it", () => {
    function Probe({ name, kind, children }: { name: string; kind: LayerConfig["kind"]; children?: ReactNode }) {
      const ref = useRef<HTMLDivElement>(null);
      const { underModal } = useLayer(true, { kind, contentEls: () => [ref.current] });
      return (
        <div ref={ref} data-testid={name} data-under={String(underModal)}>
          {children}
        </div>
      );
    }
    const { rerender } = render(<Probe name="lower" kind="modal" />);
    expect(screen.getByTestId("lower").dataset.under).toBe("false");
    rerender(
      <Probe name="lower" kind="modal">
        <Probe key="popover" name="popover" kind="popover" />
      </Probe>,
    );
    expect(screen.getByTestId("lower").dataset.under).toBe("false");
    rerender(
      <Probe name="lower" kind="modal">
        <Probe key="upper" name="upper" kind="modal" />
      </Probe>,
    );
    expect(screen.getByTestId("lower").dataset.under).toBe("true");
    expect(screen.getByTestId("upper").dataset.under).toBe("false");
  });

  it("tracks the top focus layer, skipping tooltips", () => {
    const { rerender } = render(<Layer name="dialog" config={{ kind: "modal" }} />);
    rerender(
      <>
        <Layer name="dialog" config={{ kind: "modal" }} />
        <Layer name="tip" config={{ kind: "tooltip" }} />
      </>,
    );
    expect(screen.getByTestId("tip").dataset.top).toBe("true");
    expect(screen.getByTestId("tip").dataset.focus).toBe("false");
    expect(screen.getByTestId("dialog").dataset.focus).toBe("true");
  });

  it("closed layers are not registered, and listeners detach when the stack empties", () => {
    const onEscape = vi.fn();
    const { rerender, unmount } = render(<Layer name="a" open={false} config={{ kind: "modal", onEscape }} />);
    expect(screen.getByTestId("a").dataset.top).toBe("false");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
    rerender(<Layer name="a" config={{ kind: "modal", onEscape }} />);
    const stack = (globalThis as Record<symbol, { layers: unknown[]; attached: boolean }>)[symbol];
    expect(stack?.layers).toHaveLength(1);
    unmount();
    expect(stack?.layers).toHaveLength(0);
    expect(stack?.attached).toBe(false);
  });
});
