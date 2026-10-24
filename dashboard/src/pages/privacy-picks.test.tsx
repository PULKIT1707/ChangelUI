import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Privacy } from "./privacy";

describe("Privacy page: Developer's Pick", () => {
  it("discloses the Developer's Pick events in the no-consent list", () => {
    render(<Privacy />);
    const item = screen.getByText(/On Developer's Pick/);
    expect(item.closest("section")).toHaveTextContent("Collected without consent");
    expect(item).toHaveTextContent(/whether it was featured/);
    expect(item).toHaveTextContent(/Surprise me/);
  });
});
