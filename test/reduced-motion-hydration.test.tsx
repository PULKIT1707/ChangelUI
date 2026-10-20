// Hydrating server HTML while the OS asks for reduced motion (design 6, review finding 1).
// The server never knows the OS setting, so the hydration render must take the same full-motion
// branch and switch to reduced motion only afterwards. Its own file: Motion caches
// "(prefers-reduced-motion)" per module graph and resetEnv drops media listeners between tests,
// so the query is turned on exactly once, between the server render and hydration.
// act from Testing Library also sets IS_REACT_ACT_ENVIRONMENT.
import { act } from "@testing-library/react";
import { createRef, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "../src/components/checkbox";
import { ShimmerButton } from "../src/components/shimmer-button";
import { BorderBeam } from "../src/effects/border-beam";
import { Marquee } from "../src/effects/marquee";
import { AuroraBackground } from "../src/backgrounds/aurora-background";
import { TypingText } from "../src/text/typing-text";
import { fixtures } from "./fixtures";
import { setMediaQuery } from "./utils/env";

const named: Array<[string, ReactElement]> = [
  ["TypingText", <TypingText key="t" text="Hello there" />],
  [
    "BorderBeam",
    <div key="b">
      <BorderBeam />
    </div>,
  ],
  ["ShimmerButton", <ShimmerButton key="s">Shimmer</ShimmerButton>],
  [
    "Marquee",
    <Marquee key="m">
      <span>One</span>
      <span>Two</span>
    </Marquee>,
  ],
  ["AuroraBackground", <AuroraBackground key="a">Content</AuroraBackground>],
  // The fixtures cover an indeterminate Checkbox; this covers the drawn check mark.
  ["Checkbox checked", <Checkbox key="c" aria-label="Accept" defaultChecked />],
];

const cases: Array<[string, ReactElement]> = [
  ...named,
  ...fixtures.map((f): [string, ReactElement] => [`fixture ${f.name}`, f.element(createRef<Element>())]),
];

describe("hydration under OS reduced motion", () => {
  it("server HTML hydrates without mismatches, then switches to reduced motion", async () => {
    // Motion warns once (console.warn) that the device prefers reduced motion.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setMediaQuery("(prefers-reduced-motion)", false);
    setMediaQuery("(prefers-reduced-motion: reduce)", false);
    const html = cases.map(([, element]) => renderToString(element));

    setMediaQuery("(prefers-reduced-motion)", true);
    setMediaQuery("(prefers-reduced-motion: reduce)", true);

    const recoverable: string[] = [];
    const errors: string[] = [];
    const errorSpy = vi.mocked(console.error);
    const roots: Root[] = [];
    const containers: HTMLElement[] = [];
    for (const [index, [name, element]] of cases.entries()) {
      const container = document.createElement("div");
      container.innerHTML = html[index] ?? "";
      document.body.append(container);
      containers.push(container);
      const before = errorSpy.mock.calls.length;
      await act(async () => {
        roots.push(
          hydrateRoot(container, element, {
            onRecoverableError: (error) => recoverable.push(`${name}: ${String(error)}`),
          }),
        );
      });
      for (const call of errorSpy.mock.calls.slice(before)) errors.push(`${name}: ${call.map(String).join(" ")}`);
    }

    expect(recoverable).toEqual([]);
    expect(errors).toEqual([]);

    // After hydration the OS preference applies.
    const typing = containers[0]?.querySelector('[aria-hidden="true"]');
    expect(typing?.textContent).toBe("Hello there");
    expect(containers[1]?.firstElementChild?.innerHTML).toBe("");

    act(() => {
      for (const root of roots) root.unmount();
    });
    for (const container of containers) container.remove();
  });
});
