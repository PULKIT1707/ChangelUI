import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { citationSite, InlineCitation, Sources } from "../../src/components/inline-citation";

const sources = [
  { title: "Rate limits guide", url: "https://www.example.com/docs/limits", snippet: "Requests are limited per minute." },
  { title: "Status page", url: "https://status.example.org/" },
];

describe("InlineCitation", () => {
  it("renders a link chip with an accessible name, merges className and forwards the ref", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<InlineCitation ref={ref} className="mx-2" index={2} source={sources} />);
    const link = screen.getByRole("link", { name: "Source 2: Rate limits guide, and 1 more" });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute("href", "https://www.example.com/docs/limits");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.className).toContain("mx-2");
    expect(link).toHaveTextContent("2+1");
  });

  it("derives the site from the URL", () => {
    expect(citationSite(sources[0]!)).toBe("example.com");
    expect(citationSite({ title: "x", url: "not a url", site: "Docs" })).toBe("Docs");
  });

  it("Sources toggles a numbered list (a11y)", () => {
    render(<Sources sources={sources} />);
    const button = screen.getByRole("button", { name: /Used 2 sources/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Status page/ })).toHaveAttribute("target", "_blank");
  });

  it("renders on the server", () => {
    expect(renderToString(<InlineCitation index={1} source={sources[0]!} />)).toContain("Source 1");
    expect(renderToString(<Sources sources={sources} />)).toContain("Used 2 sources");
  });
});
