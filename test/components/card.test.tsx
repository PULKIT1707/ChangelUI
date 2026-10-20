import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../src/components/card";
import { cn } from "../../src/lib/cn";
import { blockReset } from "../../src/lib/styles";

describe("Card", () => {
  it("root classes are exactly cn(blockReset, base, variant, className)", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, rerender } = render(<Card ref={ref} className="w-80" />);
    const card = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(card);
    expect(card.className).toBe(
      cn(blockReset, "rounded-pui-lg text-pui-surface-foreground", "bg-pui-surface border border-pui-border", "w-80"),
    );
    expect(card).toHaveAttribute("data-variant", "outline");
    rerender(<Card variant="elevated" />);
    expect(card.className).toBe(cn(blockReset, "rounded-pui-lg text-pui-surface-foreground", "bg-pui-surface shadow-pui-md"));
    rerender(<Card variant="soft" />);
    expect(card.className).toBe(cn(blockReset, "rounded-pui-lg text-pui-surface-foreground", "bg-pui-muted"));
  });

  it("interactive adds a motion-safe hover lift", () => {
    const { container } = render(<Card interactive />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("motion-safe:hover:-translate-y-0.5");
    expect(card.className).toContain("hover:shadow-pui-md");
    expect(card).toHaveAttribute("data-interactive", "");
  });

  it("asChild renders the child element as the card", () => {
    render(
      <Card asChild>
        <a href="#p">Project</a>
      </Card>,
    );
    expect(screen.getByRole("link", { name: "Project" }).className).toContain("rounded-pui-lg");
  });

  it("renders the parts with padding and explicit heading styles", () => {
    const titleRef = createRef<HTMLHeadingElement>();
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle ref={titleRef}>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Body</CardContent>
        <CardFooter data-testid="footer">Foot</CardFooter>
      </Card>,
    );
    const title = screen.getByRole("heading", { level: 3, name: "Title" });
    expect(titleRef.current).toBe(title);
    expect(title.className).toContain("text-lg");
    expect(title.className).toContain("font-semibold");
    expect(title.className).toContain("m-0");
    expect(screen.getByText("Desc").tagName).toBe("P");
    expect(screen.getByTestId("header").className).toContain("p-5");
    expect(screen.getByTestId("content").className).toContain("p-5");
    expect(screen.getByTestId("footer").className).toContain("p-5");
  });

  it("CardTitle as h2/h4", () => {
    const { rerender } = render(<CardTitle as="h2">T</CardTitle>);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<CardTitle as="h4">T</CardTitle>);
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });
});
