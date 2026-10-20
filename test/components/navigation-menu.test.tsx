import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../../src/components/navigation-menu";

function Nav() {
  return (
    <NavigationMenu label="Site">
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#analytics">Analytics</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing" active>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("renders a labelled nav landmark and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <NavigationMenu ref={ref} className="mt-4">
        <NavigationMenuList />
      </NavigationMenu>,
    );
    expect(ref.current?.tagName).toBe("NAV");
    expect(ref.current?.className).toContain("mt-4");
  });

  it("uses the disclosure pattern (a11y)", async () => {
    render(<Nav />);
    const trigger = screen.getByRole("button", { name: "Products" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("link", { name: "Analytics" })).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders links on the server with panels closed", () => {
    const html = renderToString(<Nav />);
    expect(html).toContain("Pricing");
    expect(html).not.toContain("Analytics");
  });
});
