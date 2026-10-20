import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle, type ThemeName } from "../../src/components/theme-toggle";
import { getThemeInitScript } from "../../src/lib/theme-script";
import { setMediaQuery } from "../utils/env";

const html = document.documentElement;
const button = () => screen.getByRole("button");
const DARK = "(prefers-color-scheme: dark)";

afterEach(() => {
  html.className = "";
  html.removeAttribute("data-theme");
  html.removeAttribute("data-pui-theme-transition");
  localStorage.clear();
  vi.restoreAllMocks();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

describe("ThemeToggle", () => {
  it("a click toggles .dark and data-theme on <html> and persists the choice", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onThemeChange = vi.fn();
    render(<ThemeToggle ref={ref} defaultTheme="light" onThemeChange={onThemeChange} />);
    expect(ref.current).toBe(button());
    expect(button()).toHaveAccessibleName("Dark mode");
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(html.classList.contains("light")).toBe(true);
    expect(html.getAttribute("data-theme")).toBe("light");
    await user.click(button());
    expect(html.classList.contains("dark")).toBe(true);
    expect(html.classList.contains("light")).toBe(false);
    expect(html.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("pui-theme")).toBe("dark");
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("renders both icons and omits aria-pressed in server HTML", () => {
    const markup = renderToString(<ThemeToggle />);
    expect(markup).not.toContain("aria-pressed");
    expect(markup).toContain('data-pui-theme-icon="sun"');
    expect(markup).toContain('data-pui-theme-icon="moon"');
    expect(markup).toContain("in-[.dark]:scale-0");
    expect(markup).toContain("in-data-[theme=dark]:scale-100");
  });

  it("the stored choice drives getThemeInitScript() on the next load", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeToggle defaultTheme="light" />);
    await user.click(button());
    unmount();
    html.className = "";
    html.removeAttribute("data-theme");
    new Function(getThemeInitScript())();
    expect(html.className).toBe("dark");
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("reads a valid stored theme and ignores an invalid one", () => {
    localStorage.setItem("pui-theme", "dark");
    const { unmount } = render(<ThemeToggle />);
    expect(button()).toHaveAttribute("aria-pressed", "true");
    unmount();
    localStorage.setItem("pui-theme", "purple");
    render(<ThemeToggle defaultTheme="light" />);
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("storageKey={null} does not persist; applyToDocument={false} leaves <html> alone", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(<ThemeToggle storageKey={null} applyToDocument={false} defaultTheme="light" onThemeChange={onThemeChange} />);
    await user.click(button());
    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("pui-theme")).toBeNull();
    expect(html.className).toBe("");
    expect(html).not.toHaveAttribute("data-theme");
  });

  it("a throwing localStorage falls back to memory", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeToggle defaultTheme="light" storageKey="pui-theme-blocked" />);
    await user.click(button());
    expect(html.getAttribute("data-theme")).toBe("dark");
    await user.click(button());
    expect(html.getAttribute("data-theme")).toBe("light");
  });

  it("system follows prefers-color-scheme and tracks changes", () => {
    setMediaQuery(DARK, true);
    render(<ThemeToggle storageKey={null} />);
    expect(html.getAttribute("data-theme")).toBe("dark");
    act(() => setMediaQuery(DARK, false));
    expect(html.getAttribute("data-theme")).toBe("light");
  });

  it("three themes cycle and name the current and next theme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle themes={["light", "dark", "system"]} defaultTheme="light" storageKey={null} />);
    expect(button()).toHaveAccessibleName("Theme: light. Switch to dark");
    expect(button()).not.toHaveAttribute("aria-pressed");
    await user.click(button());
    expect(button()).toHaveAccessibleName("Theme: dark. Switch to system");
    await user.click(button());
    expect(button()).toHaveAccessibleName("Theme: system. Switch to light");
  });

  it('attribute="class" and "data-theme" set only their own marker', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeToggle attribute="class" defaultTheme="light" storageKey={null} />);
    await user.click(button());
    expect(html.className).toBe("dark");
    expect(html).not.toHaveAttribute("data-theme");
    unmount();
    html.className = "";
    render(<ThemeToggle attribute="data-theme" defaultTheme="light" storageKey={null} />);
    expect(html.getAttribute("data-theme")).toBe("light");
    expect(html.className).toBe("");
  });

  it("runs a view transition with the scoped attribute when supported", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const animate = vi.fn();
    html.animate = animate as unknown as typeof html.animate;
    const start = vi.fn((update: () => void) => {
      expect(html).toHaveAttribute("data-pui-theme-transition");
      update();
      return { ready: Promise.resolve(), finished };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = start;
    render(<ThemeToggle defaultTheme="light" storageKey={null} />);
    await user.click(button());
    expect(start).toHaveBeenCalledTimes(1);
    expect(html.getAttribute("data-theme")).toBe("dark");
    await waitFor(() => expect(animate).toHaveBeenCalled());
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 450, pseudoElement: "::view-transition-new(root)" });
    expect(html).toHaveAttribute("data-pui-theme-transition");
    act(() => finish());
    await waitFor(() => expect(html).not.toHaveAttribute("data-pui-theme-transition"));
  });

  it("skips the view transition under reduced motion", async () => {
    const user = userEvent.setup();
    const start = vi.fn();
    (document as { startViewTransition?: unknown }).startViewTransition = start;
    render(
      <MotionConfig reducedMotion="always">
        <ThemeToggle defaultTheme="light" storageKey={null} />
      </MotionConfig>,
    );
    await user.click(button());
    expect(start).not.toHaveBeenCalled();
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  describe("controlled vs uncontrolled", () => {
    it("controlled without an update stays fixed but reports the request", async () => {
      const user = userEvent.setup();
      const onThemeChange = vi.fn();
      render(<ThemeToggle theme="light" onThemeChange={onThemeChange} />);
      await user.click(button());
      expect(onThemeChange).toHaveBeenCalledWith("dark");
      expect(html.getAttribute("data-theme")).toBe("light");
      expect(localStorage.getItem("pui-theme")).toBeNull();
    });

    it("reflects the parent's updates", async () => {
      const user = userEvent.setup();
      function Parent() {
        const [theme, setTheme] = useState<ThemeName>("dark");
        return <ThemeToggle theme={theme} onThemeChange={setTheme} />;
      }
      render(<Parent />);
      expect(html.getAttribute("data-theme")).toBe("dark");
      await user.click(button());
      expect(html.getAttribute("data-theme")).toBe("light");
    });
  });
});
