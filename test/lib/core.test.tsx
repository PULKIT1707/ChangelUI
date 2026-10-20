import { act, fireEvent, render, screen } from "@testing-library/react";
import { Component, createRef, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composeEventHandlers, mergeRefs } from "../../src/lib/compose";
import { devWarn } from "../../src/lib/dev";
import { getGlobal } from "../../src/lib/global";
import { djb2, toIdPart } from "../../src/lib/ids";
import { mulberry32 } from "../../src/lib/random";
import { Portal } from "../../src/lib/portal";
import { Slot } from "../../src/lib/slot";
import { useIsClient } from "../../src/lib/use-is-client";
import { useLatestRef } from "../../src/lib/use-latest-ref";
import { allowConsoleError } from "../utils/console";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ids", () => {
  it("passes safe values through and hashes unsafe ones", () => {
    expect(toIdPart("abc-1_2")).toBe("abc-1_2");
    expect(toIdPart("a b")).not.toBe(toIdPart("a-b"));
    expect(toIdPart("a b")).not.toMatch(/\s/);
    expect(toIdPart("a b")).toMatch(/^a-b-[0-9a-z]+$/);
    expect(toIdPart("ü")).toBe(toIdPart("ü"));
    expect(djb2("")).toBe(5381);
  });
});

describe("mulberry32", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(Array.from({ length: 5 }, mulberry32(7))).not.toEqual(seqA);
  });
});

describe("compose", () => {
  it("calls the child handler first and skips ours when prevented", () => {
    const calls: string[] = [];
    const handler = composeEventHandlers<{ defaultPrevented: boolean }>(
      () => calls.push("theirs"),
      () => calls.push("ours"),
    );
    handler({ defaultPrevented: false });
    expect(calls).toEqual(["theirs", "ours"]);
    calls.length = 0;
    handler({ defaultPrevented: true });
    expect(calls).toEqual(["theirs"]);
    expect(() => composeEventHandlers(undefined, undefined)({ defaultPrevented: false })).not.toThrow();
  });

  it("merges callback and object refs", () => {
    const obj = createRef<string>();
    const fn = vi.fn();
    mergeRefs<string>(obj, fn, undefined, null)("x");
    expect(obj.current).toBe("x");
    expect(fn).toHaveBeenCalledWith("x");
  });
});

describe("getGlobal", () => {
  it("creates lazily once per name", () => {
    const key = Symbol.for("changelui/core-test@1");
    const create = vi.fn(() => ({ n: 1 }));
    expect(getGlobal("core-test", create)).toBe(getGlobal("core-test", create));
    expect(create).toHaveBeenCalledTimes(1);
    delete (globalThis as Record<symbol, unknown>)[key];
  });
});

describe("devWarn", () => {
  it("warns once per key with the [changelui] prefix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    devWarn("core-test-key", "first");
    devWarn("core-test-key", "second");
    devWarn("core-test-other", "third");
    expect(warn.mock.calls).toEqual([["[changelui] first"], ["[changelui] third"]]);
  });
});

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children;
  }
}

describe("Slot", () => {
  it("merges className, style, handlers and refs onto the child", () => {
    const slotRef = createRef<HTMLElement>();
    const childRef = createRef<HTMLButtonElement>();
    const calls: string[] = [];
    render(
      <Slot
        ref={slotRef}
        className="px-2 text-sm"
        style={{ color: "red", margin: 1 }}
        onClick={() => calls.push("slot")}
        data-state="open"
      >
        <button
          ref={childRef}
          type="button"
          className="px-4"
          style={{ color: "blue" }}
          onClick={() => calls.push("child")}
        >
          Go
        </button>
      </Slot>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button.className).toBe("text-sm px-4");
    expect(button.style.color).toBe("blue");
    expect(button.style.margin).toBe("1px");
    expect(button.getAttribute("data-state")).toBe("open");
    fireEvent.click(button);
    expect(calls).toEqual(["child", "slot"]);
    expect(slotRef.current).toBe(button);
    expect(childRef.current).toBe(button);
  });

  it("skips the slot handler when the child prevents default, and works without a child ref", () => {
    const slot = vi.fn();
    const slotRef = createRef<HTMLElement>();
    render(
      <Slot ref={slotRef} onClick={slot}>
        <a href="#x" onClick={(e) => e.preventDefault()}>
          Link
        </a>
      </Slot>,
    );
    fireEvent.click(screen.getByText("Link"));
    expect(slot).not.toHaveBeenCalled();
    expect(slotRef.current).toBe(screen.getByText("Link"));
  });

  it("throws on anything but a single element child", () => {
    // Deliberate: React logs the caught render error; the boundary shows our message.
    allowConsoleError();
    render(
      <Boundary>
        <Slot>
          <span>a</span>
          <span>b</span>
        </Slot>
      </Boundary>,
    );
    expect(screen.getByRole("alert").textContent).toBe("[changelui] asChild expects a single React element child");
    expect(() => renderToString(<Slot>text</Slot>)).toThrow("[changelui] asChild expects a single React element child");
  });
});

function ClientFlag() {
  return <span>{useIsClient() ? "client" : "server"}</span>;
}

describe("useIsClient and Portal", () => {
  it("is false in renderToString and true after mount", () => {
    expect(renderToString(<ClientFlag />)).toContain("server");
    render(<ClientFlag />);
    expect(screen.getByText("client")).toBeInTheDocument();
  });

  it("Portal renders into body (or container) on the client and nothing on the server", () => {
    expect(renderToString(<Portal>hello</Portal>)).toBe("");
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(
      <>
        <Portal>
          <span>in body</span>
        </Portal>
        <Portal container={container}>in container</Portal>
      </>,
    );
    expect(screen.getByText("in body").parentElement).toBe(document.body);
    expect(container.textContent).toBe("in container");
    container.remove();
  });
});

describe("useLatestRef", () => {
  it("holds the latest value after commit", () => {
    const seen: number[] = [];
    function Probe({ value }: { value: number }) {
      const ref = useLatestRef(value);
      return (
        <button type="button" onClick={() => seen.push(ref.current)}>
          read
        </button>
      );
    }
    const { rerender } = render(<Probe value={1} />);
    fireEvent.click(screen.getByText("read"));
    rerender(<Probe value={2} />);
    act(() => {
      fireEvent.click(screen.getByText("read"));
    });
    expect(seen).toEqual([1, 2]);
  });
});
