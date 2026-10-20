import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { describe, expect, it } from "vitest";
import { useFocusTrap, type UseFocusTrapOptions } from "../../src/hooks/use-focus-trap";

function Trap({
  active,
  options,
  children,
  initialRef,
}: {
  active: boolean;
  options?: Omit<UseFocusTrapOptions, "active">;
  children?: ReactNode;
  initialRef?: RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, ...options, ...(initialRef ? { initialFocus: initialRef } : {}) });
  return (
    <div ref={ref} data-testid="trap">
      {children}
    </div>
  );
}

function Harness(props: { options?: Omit<UseFocusTrapOptions, "active">; children?: ReactNode; withRef?: boolean }) {
  const [active, setActive] = useState(false);
  const initialRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setActive(true)}>
        open
      </button>
      <button type="button">outside</button>
      <Trap active={active} options={props.options} initialRef={props.withRef ? initialRef : undefined}>
        {props.children ?? (
          <>
            <button type="button">first</button>
            <button type="button" ref={initialRef}>
              second
            </button>
            <button type="button" onClick={() => setActive(false)}>
              last
            </button>
          </>
        )}
      </Trap>
    </>
  );
}

describe("useFocusTrap", () => {
  it("focuses the first tabbable, wraps both ways and returns focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open"));
    expect(screen.getByText("first")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("last")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("first")).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByText("last")).toHaveFocus();
    await user.click(screen.getByText("last"));
    expect(screen.getByText("open")).toHaveFocus();
  });

  it("follows the initial focus order: ref, then [data-autofocus], then first, then container", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness withRef />);
    await user.click(screen.getByText("open"));
    expect(screen.getByText("second")).toHaveFocus();
    unmount();

    render(
      <Harness>
        <button type="button">a</button>
        <button type="button" data-autofocus="">
          auto
        </button>
      </Harness>,
    );
    await user.click(screen.getByText("open"));
    expect(screen.getByText("auto")).toHaveFocus();
  });

  it("focuses the container when there is nothing tabbable", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <span>text only</span>
        <button type="button" disabled>
          disabled
        </button>
        <div hidden>
          <button type="button">hidden</button>
        </div>
        <div style={{ display: "none" }}>
          <button type="button">display-none</button>
        </div>
      </Harness>,
    );
    await user.click(screen.getByText("open"));
    const trap = screen.getByTestId("trap");
    expect(trap).toHaveFocus();
    expect(trap.getAttribute("tabindex")).toBe("-1");
    await user.tab();
    expect(trap).toHaveFocus();
  });

  it("supports initialFocus container and returnFocus false", async () => {
    const user = userEvent.setup();
    render(<Harness options={{ initialFocus: "container", returnFocus: false }} />);
    await user.click(screen.getByText("open"));
    expect(screen.getByTestId("trap")).toHaveFocus();
    await user.tab();
    await user.click(screen.getByText("last"));
    expect(screen.getByText("open")).not.toHaveFocus();
  });

  it("pulls focus back when it moves outside", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open"));
    await user.tab();
    expect(screen.getByText("second")).toHaveFocus();
    act(() => screen.getByText("outside").focus());
    expect(screen.getByText("second")).toHaveFocus();
  });

  it("returns focus to a ref when given", async () => {
    function RefHarness() {
      const [active, setActive] = useState(true);
      const target = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button type="button" ref={target}>
            target
          </button>
          <Trap active={active} options={{ returnFocus: target }}>
            <button type="button" onClick={() => setActive(false)}>
              close
            </button>
          </Trap>
        </>
      );
    }
    const user = userEvent.setup();
    render(<RefHarness />);
    expect(screen.getByText("close")).toHaveFocus();
    await user.click(screen.getByText("close"));
    expect(screen.getByText("target")).toHaveFocus();
  });
});
