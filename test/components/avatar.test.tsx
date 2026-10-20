import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Avatar, AvatarGroup } from "../../src/components/avatar";
import { Tooltip } from "../../src/components/tooltip";
import { setupFakeTimers } from "../utils/timers";

describe("Avatar", () => {
  it("shows up to two uppercase initials and is named by name", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar ref={ref} name="ada king lovelace" />);
    const avatar = screen.getByRole("img", { name: "ada king lovelace" });
    expect(ref.current).toBe(avatar);
    expect(avatar).toHaveTextContent("AL");
    expect(avatar).toHaveAttribute("data-size", "md");
    expect(avatar.className).toContain("size-10");
  });

  it("is decorative without alt or name", () => {
    const { container } = render(<Avatar fallback="?" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("?");
  });

  it("fades the image in on load and falls back on error", () => {
    const { container } = render(<Avatar src="/a.png" alt="Ada" name="Ada Lovelace" shape="square" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    expect(img?.className).toContain("opacity-0");
    expect(img?.className).toContain("block shrink-0");
    expect(container.querySelector("[data-pui-avatar-fallback]")).toHaveTextContent("AL");
    expect(screen.getByRole("img", { name: "Ada" })).toBeInTheDocument();
    fireEvent.load(img as HTMLImageElement);
    expect(img?.className).toContain("opacity-100");
    expect(container.querySelector("[data-pui-avatar-fallback]")).toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-pui-avatar-fallback]")).toHaveTextContent("AL");
  });

  it("resets the image state when src changes", () => {
    const { container, rerender } = render(<Avatar src="/a.png" name="A B" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    rerender(<Avatar src="/b.png" name="A B" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/b.png");
  });

  it("tints name initials with a stable token gradient; a custom fallback stays muted", () => {
    const { container, rerender } = render(<Avatar name="Grace Hopper" />);
    const fallback = () => container.querySelector("[data-pui-avatar-fallback]") as HTMLElement;
    const first = fallback().className;
    expect(first).toMatch(/bg-linear-to-br from-pui-(aurora|gradient)-\d\/25 to-pui-(aurora|gradient)-\d\/25/);
    expect(first).toContain("text-pui-foreground");
    const tint = fallback().dataset.tint;
    rerender(<Avatar name="Ada Lovelace" />);
    rerender(<Avatar name="Grace Hopper" />);
    expect(fallback().className).toBe(first);
    expect(fallback().dataset.tint).toBe(tint);
    rerender(<Avatar name="Grace Hopper" fallback="GH" />);
    expect(fallback().className).not.toContain("bg-linear-to-br");
    expect(fallback()).not.toHaveAttribute("data-tint");
  });

  it("includes the status in the accessible name", () => {
    const { container } = render(<Avatar name="Ada" status="busy" />);
    expect(screen.getByRole("img", { name: "Ada (Busy)" })).toBeInTheDocument();
    expect(container.querySelector("[data-pui-avatar-status='busy']")?.className).toContain("bg-pui-danger");
  });
});

describe("AvatarGroup", () => {
  it("provides its size, overflows to +N with overflowLabel", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AvatarGroup ref={ref} max={2} size="lg" spacing="tight" overflowLabel={(n) => `and ${n} others`}>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
        <Avatar name="Alan Turing" />
        <Avatar name="Linus Torvalds" />
      </AvatarGroup>,
    );
    const group = screen.getByRole("group");
    expect(ref.current).toBe(group);
    const named = screen.getAllByRole("img");
    expect(named).toHaveLength(3);
    expect(named[0]).toHaveAttribute("data-size", "lg");
    expect(named[0]?.className).toContain("ring-2");
    const overflow = screen.getByRole("img", { name: "and 2 others" });
    expect(overflow).toHaveTextContent("+2");
    expect(screen.queryByText("AT")).toBeNull();
    expect(document.querySelector("[title]")).toBeNull();
  });

  it("renders no tooltip unless renderTooltip is passed", async () => {
    const user = setupFakeTimers();
    render(
      <AvatarGroup>
        <Avatar name="Ada Lovelace" />
      </AvatarGroup>,
    );
    await user.hover(screen.getByRole("img", { name: "Ada Lovelace" }));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renderTooltip receives each lifted avatar and its name", () => {
    const renderTooltip = vi.fn((avatar: ReactElement, name: string) => <span data-name={name}>{avatar}</span>);
    render(
      <AvatarGroup renderTooltip={renderTooltip}>
        <Avatar name="Ada Lovelace" />
        <Avatar alt="Grace" />
      </AvatarGroup>,
    );
    expect(renderTooltip.mock.calls.map(([, name]) => name)).toEqual(["Ada Lovelace", "Grace"]);
    const [avatar] = renderTooltip.mock.calls[0] ?? [];
    expect((avatar as ReactElement | undefined)?.type).toBeDefined();
    expect(screen.getByRole("img", { name: "Ada Lovelace" }).closest("[data-name]")).toHaveAttribute(
      "data-name",
      "Ada Lovelace",
    );
  });

  it("shows each name in a Tooltip on hover with renderTooltip", async () => {
    const user = setupFakeTimers();
    render(
      <AvatarGroup
        renderTooltip={(avatar, name) => (
          <Tooltip content={name} side="top">
            {avatar}
          </Tooltip>
        )}
      >
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
      </AvatarGroup>,
    );
    const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
    await user.hover(avatar);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Ada Lovelace");
    expect(avatar.parentElement).toHaveAttribute("aria-describedby", tooltip.id);
    await user.unhover(avatar);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("an explicit Avatar size wins and tooltips can be turned off", () => {
    const renderTooltip = vi.fn((avatar: ReactElement) => avatar);
    render(
      <AvatarGroup tooltips={false} renderTooltip={renderTooltip}>
        <Avatar name="Ada" size="xs" />
      </AvatarGroup>,
    );
    expect(screen.getByRole("img")).toHaveAttribute("data-size", "xs");
    expect(screen.getByRole("img").parentElement).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/^\+/)).toBeNull();
    expect(renderTooltip).not.toHaveBeenCalled();
  });
});
