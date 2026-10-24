import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatTestDuration, summarizeTests, TestResults, type TestSuite } from "../../src/components/test-results";

const suites: TestSuite[] = [
  {
    name: "Cart",
    file: "cart.test.ts",
    tests: [
      { name: "adds an item", status: "passed", duration: 20 },
      { name: "applies promo", status: "failed", duration: 900, error: { message: "Wrong total", expected: "$9", received: "$10" } },
    ],
  },
  { name: "Search", tests: [{ name: "ranks", status: "passed", duration: 5 }, { name: "fuzzy", status: "skipped" }] },
];

describe("TestResults", () => {
  it("summarizes and formats", () => {
    expect(summarizeTests(suites)).toEqual({ total: 4, passed: 2, failed: 1, skipped: 1, running: 0, duration: 925 });
    expect(formatTestDuration(84)).toBe("84 ms");
    expect(formatTestDuration(1240)).toBe("1.24 s");
    expect(formatTestDuration(125_000)).toBe("2m 05s");
  });

  it("opens failing suites, shows the error and reruns", () => {
    const onRerun = vi.fn();
    const ref = createRef<HTMLElement>();
    render(<TestResults ref={ref} suites={suites} onRerun={onRerun} />);
    expect(ref.current?.tagName).toBe("SECTION");
    expect(screen.getByRole("status")).toHaveTextContent("1 test failed");
    expect(screen.getByRole("button", { name: /^Failed: Cart/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^Passed: Search/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Wrong total")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rerun failed" }));
    expect(onRerun).toHaveBeenCalledWith({ type: "failed" });
    fireEvent.click(screen.getByRole("button", { name: "Rerun applies promo" }));
    expect(onRerun).toHaveBeenLastCalledWith(expect.objectContaining({ type: "test" }));
  });

  it("filters to skipped tests", async () => {
    render(<TestResults suites={suites} />);
    fireEvent.click(screen.getByRole("button", { name: /Skipped/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /^Failed: Cart/ })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Passed: Search/ }));
    expect(screen.getByText("fuzzy")).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<TestResults suites={suites} />)).toContain("applies promo");
  });
});
