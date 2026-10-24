import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatNotificationTime, NotificationCenter, NotificationList, notificationGroup } from "../../src/components/notification-center";

const now = new Date(2026, 9, 23, 12, 0).getTime();
const items = [
  { id: "1", title: "Ana commented on Q4 plan", time: now - 5 * 60_000 },
  { id: "2", title: "Deploy finished", time: now - 26 * 3_600_000, read: true },
  { id: "3", title: "Invoice paid", time: now - 3 * 86_400_000 },
];

describe("NotificationList", () => {
  it("groups by day, shows relative times, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<NotificationList ref={ref} className="mt-4" items={items} now={now} />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This week" })).toBeInTheDocument();
    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("filters unread, marks read and marks all read", () => {
    const onMarkRead = vi.fn();
    const onMarkAllRead = vi.fn();
    const onItemClick = vi.fn();
    render(<NotificationList items={items} now={now} onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} onItemClick={onItemClick} />);
    fireEvent.click(screen.getByRole("radio", { name: /Unread/ }));
    expect(screen.queryByText("Deploy finished")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ana commented/ }));
    expect(onMarkRead).toHaveBeenCalledWith("1", true);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(onMarkAllRead).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("All notifications marked as read");
  });

  it("formats times and groups", () => {
    expect(formatNotificationTime(now - 30_000, now)).toBe("now");
    expect(formatNotificationTime(now - 3 * 3_600_000, now)).toBe("3h");
    expect(notificationGroup(now - 10 * 86_400_000, now)).toBe("Earlier");
  });
});

describe("NotificationCenter", () => {
  it("names the bell with the unread count and opens the panel (a11y)", () => {
    render(<NotificationCenter items={items} now={now} />);
    const bell = screen.getByRole("button", { name: "Notifications, 2 unread" });
    expect(bell).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(bell);
    expect(bell).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<NotificationList items={items} />)).toContain("Ana commented");
    expect(renderToString(<NotificationCenter items={items} />)).toContain("2 unread");
  });
});
