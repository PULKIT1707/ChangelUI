import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollArea } from "../../src/components/scroll-area";

describe("ScrollArea", () => {
  it("renders a labelled region with native scrolling", () => {
    render(
      <ScrollArea label="Members" className="h-10">
        Content
      </ScrollArea>,
    );
    const region = screen.getByRole("region", { name: "Members" });
    expect(region.className).toContain("overflow-y-auto");
    expect(region).toHaveTextContent("Content");
  });
  it("renders on the server", () => {
    expect(renderToString(<ScrollArea>Server</ScrollArea>)).toContain("Server");
  });
});
