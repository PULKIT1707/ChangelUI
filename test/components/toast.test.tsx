import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast, useToast } from "../../src/components/toast";
import { setupFakeTimers } from "../utils/timers";

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const status = () => screen.getByRole("status");
const alertRegion = () => screen.getByRole("alert");
const items = () => [...document.querySelectorAll("ol > li")];
const titles = () => items().map((li) => li.querySelector("[data-pui-toast-title]")?.textContent);

afterEach(() => {
  act(() => toast.dismiss());
});

describe("Toast", () => {
  it("renders a labelled region, a plain <li> per toast and announces it after one frame", () => {
    setupFakeTimers();
    const ref = createRef<HTMLElement>();
    render(<Toaster ref={ref} />);
    const region = screen.getByRole("region", { name: "Notifications (F8)" });
    expect(ref.current).toBe(region);
    expect(region).toHaveAttribute("tabindex", "-1");
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(alertRegion()).toHaveAttribute("aria-live", "assertive");
    expect(status()).toBeEmptyDOMElement();
    act(() => {
      toast({ title: "Saved", description: "All changes stored." });
    });
    const list = region.querySelector("ol");
    expect(list?.className).toContain("list-none");
    expect(items()).toHaveLength(1);
    expect(items()[0]).not.toHaveAttribute("role");
    expect(items()[0]?.className).toContain("box-border");
    expect(status()).toBeEmptyDOMElement();
    advance(16);
    expect(status()).toHaveTextContent("Saved. All changes stored.");
    expect(alertRegion()).toBeEmptyDOMElement();
    advance(1000);
    expect(status()).toBeEmptyDOMElement();
  });

  it("toast.danger announces through the assertive region and shows the tone icon", () => {
    setupFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.danger("Upload failed");
    });
    advance(16);
    expect(alertRegion()).toHaveTextContent("Upload failed");
    expect(status()).toBeEmptyDOMElement();
    expect(items()[0]).toHaveAttribute("data-tone", "danger");
    expect(items()[0]?.querySelector("svg")).not.toBeNull();
  });

  it("joins toasts that become visible in the same frame", () => {
    setupFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.success("One");
      toast.info("Two");
    });
    advance(16);
    expect(status()).toHaveTextContent("One Two");
  });

  it("auto-dismisses after durationMs and pauses while hovered", () => {
    setupFakeTimers();
    const onDismiss = vi.fn();
    render(<Toaster durationMs={1000} />);
    act(() => {
      toast({ title: "Hello", onDismiss });
    });
    advance(600);
    fireEvent.pointerEnter(document.querySelector("ol") as HTMLElement);
    advance(2000);
    expect(titles()).toEqual(["Hello"]);
    fireEvent.pointerLeave(document.querySelector("ol") as HTMLElement);
    advance(300);
    expect(titles()).toEqual(["Hello"]);
    advance(200);
    expect(onDismiss).toHaveBeenCalledWith(expect.stringMatching(/^pui-toast-/));
  });

  it("pauses while focus is inside and while the document is hidden", async () => {
    setupFakeTimers();
    render(<Toaster durationMs={1000} />);
    act(() => {
      toast("Focus me");
    });
    const close = screen.getByRole("button", { name: "Dismiss notification" });
    act(() => close.focus());
    advance(3000);
    expect(titles()).toEqual(["Focus me"]);
    act(() => close.blur());
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(3000);
    expect(titles()).toEqual(["Focus me"]);
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(1100);
    hidden.mockRestore();
    await waitFor(() => expect(items()).toHaveLength(0));
  });

  it("the close button removes the toast and calls onDismiss; toast.dismiss() clears all", async () => {
    const user = setupFakeTimers();
    const onDismiss = vi.fn();
    render(<Toaster />);
    let id = "";
    act(() => {
      id = toast({ title: "A", onDismiss, durationMs: Infinity });
      toast("B");
    });
    await user.click(screen.getAllByRole("button", { name: "Dismiss notification" })[0] as HTMLElement);
    expect(onDismiss).toHaveBeenCalledWith(id);
    await waitFor(() => expect(titles()).toEqual(["B"]));
    act(() => toast.dismiss());
    await waitFor(() => expect(items()).toHaveLength(0));
    act(() => toast.dismiss("unknown"));
  });

  it("queues toasts above max and promotes them when one is dismissed", async () => {
    setupFakeTimers();
    render(<Toaster max={2} />);
    let first = "";
    act(() => {
      first = toast({ title: "1", durationMs: Infinity });
      toast({ title: "2", durationMs: Infinity });
      toast({ title: "3", durationMs: Infinity });
    });
    expect(titles()).toEqual(["1", "2"]);
    act(() => toast.dismiss(first));
    await waitFor(() => expect(titles()).toEqual(["2", "3"]));
  });

  it("re-using an id updates the toast in place and re-announces it", () => {
    setupFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ id: "upload", title: "Uploading…" });
    });
    advance(16);
    act(() => {
      toast.success("Uploaded", { id: "upload" });
    });
    expect(titles()).toEqual(["Uploaded"]);
    expect(items()[0]).toHaveAttribute("data-tone", "success");
    advance(16);
    expect(status()).toHaveTextContent("Uploaded");
  });

  it("shows toasts created before a Toaster mounts", () => {
    setupFakeTimers();
    act(() => {
      toast.warning("Early bird");
    });
    render(<Toaster />);
    expect(titles()).toEqual(["Early bird"]);
  });

  it("F8 focuses the region; the label drops the hotkey when it is null", () => {
    const { unmount } = render(<Toaster />);
    fireEvent.keyDown(document, { key: "F8" });
    expect(screen.getByRole("region", { name: "Notifications (F8)" })).toHaveFocus();
    unmount();
    render(<Toaster hotkey={null} label="Alerts" />);
    expect(screen.getByRole("region", { name: "Alerts" })).toBeInTheDocument();
  });

  it("an action runs and dismisses; dismissible false hides the close button; icon false hides the icon", async () => {
    const user = setupFakeTimers();
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: "Archived", action: { label: "Undo", onClick }, dismissible: false, icon: false, tone: "info" });
    });
    expect(screen.queryByRole("button", { name: "Dismiss notification" })).toBeNull();
    expect(items()[0]?.querySelector("svg")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalled();
    await waitFor(() => expect(items()).toHaveLength(0));
  });

  it("caps the queue at 100, dropping the oldest", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      for (let i = 0; i < 105; i++) toast(`t${i}`);
    });
    expect(result.current.toasts).toHaveLength(100);
    expect(result.current.toasts[0]?.title).toBe("t5");
    expect(result.current.toasts.every((t) => t.state === "queued")).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.toasts).toHaveLength(0);
  });

  it("positions the list", () => {
    render(<Toaster position="top-center" />);
    expect(document.querySelector("ol")?.className).toContain("top-0");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("toast.promise, toast.loading and toast.update", () => {
  it("runs the loading → success lifecycle and resumes the timer", async () => {
    setupFakeTimers();
    render(<Toaster durationMs={1000} />);
    const d = deferred<string>();
    let returned: Promise<string> | undefined;
    act(() => {
      returned = toast.promise(d.promise, { loading: "Uploading…", success: "Uploaded", error: "Failed" });
    });
    expect(returned).toBe(d.promise);
    expect(titles()).toEqual(["Uploading…"]);
    const li = items()[0];
    expect(li).toHaveAttribute("data-loading", "");
    expect(li).toHaveAttribute("aria-busy", "true");
    expect(li?.querySelector("[data-pui-toast-progress]")).toBeNull();
    advance(5000);
    expect(titles()).toEqual(["Uploading…"]);
    await act(async () => {
      d.resolve("ok");
      await d.promise;
    });
    expect(titles()).toEqual(["Uploaded"]);
    expect(items()[0]).toHaveAttribute("data-tone", "success");
    expect(items()[0]).not.toHaveAttribute("data-loading");
    advance(16);
    expect(status()).toHaveTextContent("Uploaded");
    advance(1100);
    await waitFor(() => expect(items()).toHaveLength(0));
  });

  it("turns into a danger toast announced assertively on rejection", async () => {
    setupFakeTimers();
    render(<Toaster />);
    const d = deferred<string>();
    let returned: Promise<string> | undefined;
    act(() => {
      returned = toast.promise(() => d.promise, {
        loading: { title: "Saving", description: "One moment" },
        success: "Saved",
        error: (error) => ({ title: "Save failed", description: String(error) }),
      });
    });
    const caught = returned?.catch((error: unknown) => error);
    await act(async () => {
      d.reject("offline");
      await caught;
    });
    expect(titles()).toEqual(["Save failed"]);
    expect(items()[0]).toHaveAttribute("data-tone", "danger");
    expect(items()[0]?.querySelector("[data-pui-toast-description]")).toHaveTextContent("offline");
    advance(16);
    expect(alertRegion()).toHaveTextContent("Save failed. offline");
  });

  it("passes the resolved data to a success function", async () => {
    render(<Toaster />);
    const d = deferred<number>();
    act(() => {
      toast.promise(d.promise, { loading: "Counting", success: (n) => `${n} files`, error: "Failed" });
    });
    await act(async () => {
      d.resolve(3);
      await d.promise;
    });
    expect(titles()).toEqual(["3 files"]);
  });

  it("a toast dismissed before the promise settles stays dismissed", async () => {
    render(<Toaster />);
    const d = deferred<string>();
    act(() => {
      toast.promise(d.promise, { id: "job", loading: "Working", success: "Done", error: "Failed" });
    });
    act(() => toast.dismiss("job"));
    await waitFor(() => expect(items()).toHaveLength(0));
    await act(async () => {
      d.resolve("x");
      await d.promise;
    });
    expect(items()).toHaveLength(0);
  });

  it("toast.loading has no timeout; toast.update patches in place and ignores unknown ids", () => {
    setupFakeTimers();
    render(<Toaster durationMs={500} />);
    let id = "";
    act(() => {
      id = toast.loading("Syncing");
    });
    advance(2000);
    expect(titles()).toEqual(["Syncing"]);
    expect(items()[0]?.querySelector("svg")).not.toBeNull();
    act(() => toast.update(id, { title: "Synced", loading: false, tone: "success" }));
    expect(titles()).toEqual(["Synced"]);
    expect(items()[0]).toHaveAttribute("data-pui-toast-rev", "1");
    act(() => toast.update("missing", { title: "Nope" }));
    expect(titles()).toEqual(["Synced"]);
  });
});

describe("Toaster layout", () => {
  it("stacks newest in front with indexes and z-order, in chronological DOM order", () => {
    render(<Toaster />);
    act(() => {
      toast({ title: "1", durationMs: Infinity });
      toast({ title: "2", durationMs: Infinity });
      toast({ title: "3", durationMs: Infinity });
    });
    expect(document.querySelector("ol")).toHaveAttribute("data-layout", "stack");
    expect(titles()).toEqual(["1", "2", "3"]);
    const [oldest, , newest] = items() as HTMLElement[];
    expect(newest).toHaveAttribute("data-front", "");
    expect(newest).toHaveAttribute("data-index", "0");
    expect(oldest).toHaveAttribute("data-index", "2");
    expect(oldest).not.toHaveAttribute("data-front");
    expect(Number(newest?.style.zIndex)).toBeGreaterThan(Number(oldest?.style.zIndex));
  });

  it('layout="list" and reduced motion render the plain list', () => {
    const { unmount } = render(<Toaster layout="list" />);
    act(() => {
      toast("A");
    });
    expect(document.querySelector("ol")).toHaveAttribute("data-layout", "list");
    expect(items()[0]).not.toHaveAttribute("data-index");
    unmount();
    render(
      <MotionConfig reducedMotion="always">
        <Toaster />
      </MotionConfig>,
    );
    expect(document.querySelector("ol")).toHaveAttribute("data-layout", "list");
    expect(items()[0]).not.toHaveAttribute("data-index");
    expect(items()[0]?.querySelector("[data-pui-toast-progress]")).toBeNull();
  });

  it("shows the progress hairline only for finite lifetimes", () => {
    render(<Toaster durationMs={4000} />);
    act(() => {
      toast("Timed");
      toast({ title: "Sticky", durationMs: Infinity });
      toast({ title: "Quiet", showProgress: false });
    });
    const [timed, sticky, quiet] = items();
    const bar = timed?.querySelector<HTMLElement>("[data-pui-toast-progress]");
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.style.animationDuration).toBe("4000ms");
    expect(sticky?.querySelector("[data-pui-toast-progress]")).toBeNull();
    expect(quiet?.querySelector("[data-pui-toast-progress]")).toBeNull();
  });

  it("pauses the progress hairline while hovered", () => {
    render(<Toaster />);
    act(() => {
      toast("Hover me");
    });
    const bar = () => items()[0]?.querySelector<HTMLElement>("[data-pui-toast-progress]");
    expect(bar()?.style.animationPlayState).toBe("running");
    fireEvent.pointerEnter(document.querySelector("ol") as HTMLElement);
    expect(bar()?.style.animationPlayState).toBe("paused");
    expect(document.querySelector("ol")).toHaveAttribute("data-expanded", "");
  });
});
