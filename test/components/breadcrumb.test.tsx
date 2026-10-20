import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumb, BreadcrumbItem } from "../../src/components/breadcrumb";

function Trail() {
  return (
    <Breadcrumb maxItems={3}>
      <BreadcrumbItem href="#a">Home</BreadcrumbItem>
      <BreadcrumbItem href="#b">Docs</BreadcrumbItem>
      <BreadcrumbItem href="#c">Components</BreadcrumbItem>
      <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("is a labelled nav with aria-current and a collapsed middle (a11y)", () => {
    render(<Trail />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByText("Breadcrumb").closest("[aria-current]")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Show 1 more" })).toBeInTheDocument();
    expect(screen.queryByText("Docs")).toBeNull();
  });

  it("renders on the server", () => {
    expect(renderToString(<Trail />)).toContain("Components");
  });
});
