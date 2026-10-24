import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PresenceCursors, presenceColor, type PresenceUser } from "../../src/effects/presence-cursors";
const users: PresenceUser[] = [
  { id: "a", name: "Avery Chen", x: 0.2, y: 0.3, status: "Editing title" },
  { id: "b", name: "Sam Okafor", x: 1.4, y: 0.5 },
  { id: "c", name: "Lee", x: 0.6, y: 0.6 },
];
describe("PresenceCursors", () => {
  it("renders children, cursors (hidden from AT) and a labelled avatar list; forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PresenceCursors ref={ref} users={users} className="h-64">
        <p>Board</p>
      </PresenceCursors>,
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-presence-cursor]")).toHaveLength(3);
    expect(container.querySelector('[data-presence-cursor="b"]')).toHaveAttribute("data-offscreen");
    const list = screen.getByRole("list", { name: "People here" });
    expect(list).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spotlight Avery Chen, Editing title" })).toBeInTheDocument();
  });
  it("collapses extra people into +N", () => {
    render(<PresenceCursors users={users} maxAvatars={2} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
  it("pins a spotlight on click (aria-pressed)", () => {
    render(<PresenceCursors users={users} />);
    const button = screen.getByRole("button", { name: /Spotlight Lee/ });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
  it("reports the local pointer as fractions", () => {
    const onLocalMove = vi.fn();
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    const { container } = render(<PresenceCursors users={[]} onLocalMove={onLocalMove} />);
    const root = container.firstElementChild as HTMLElement;
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    act(() => {
      fireEvent.pointerMove(root, { clientX: 50, clientY: 25 });
    });
    expect(onLocalMove).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
    fireEvent.pointerLeave(root);
    expect(onLocalMove).toHaveBeenLastCalledWith(null);
    raf.mockRestore();
  });
  it("picks a stable token color from the id", () => {
    expect(presenceColor({ id: "a" })).toBe(presenceColor({ id: "a" }));
    expect(presenceColor({ id: "a", color: "red" })).toBe("red");
  });
  it("renders on the server", () => {
    expect(renderToString(<PresenceCursors users={users}>Server</PresenceCursors>)).toContain("Server");
  });
});
