import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseHash } from "../router";
import { NavContent } from "./nav-content";

describe("NavContent: Developer's Pick", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("lists the picks page second in Getting started and marks it current on #/picks", () => {
    render(<NavContent route={parseHash("#/picks?filter=text")} layoutGroup="test" />);
    const start = screen.getByRole("region", { name: "Getting started" });
    const links = within(start).getAllByRole("link");
    const picks = links[1] as HTMLElement;
    expect(picks).toHaveAccessibleName(/Developer's Pick/);
    expect(picks).toHaveAttribute("href", "#/picks");
    expect(picks).toHaveAttribute("aria-current", "page");
    expect(within(picks).getByText("New")).toBeInTheDocument();
  });

  it("is not current elsewhere", () => {
    render(<NavContent route={parseHash("#/")} layoutGroup="test" />);
    expect(screen.getByRole("link", { name: /Developer's Pick/ })).not.toHaveAttribute("aria-current");
  });
});
