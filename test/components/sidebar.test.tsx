import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarInset,
  SidebarItem,
  SidebarProvider,
  SidebarTrigger,
} from "../../src/components/sidebar";

function Shell({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar label="Main">
        <SidebarContent>
          <SidebarGroup label="Workspace">
            <SidebarItem href="#inbox" active>
              Inbox
            </SidebarItem>
            <SidebarItem href="#drafts">Drafts</SidebarItem>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}

describe("Sidebar", () => {
  it("is a nav landmark with aria-current and a toggling trigger (a11y)", () => {
    render(<Shell />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    const trigger = screen.getByRole("button", { name: "Toggle sidebar" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("server-renders defaultOpen", () => {
    expect(renderToString(<Shell defaultOpen={false} />)).toContain('data-state="collapsed"');
  });
});
