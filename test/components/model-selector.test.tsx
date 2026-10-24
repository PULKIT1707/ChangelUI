import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ModelSelector, type ModelOption } from "../../src/components/model-selector";
const models: ModelOption[] = [
  { id: "swift", name: "Swift Mini", provider: "Northwind", contextWindow: 128_000, inputPrice: 0.15, outputPrice: 0.6, speed: 3, capabilities: ["tools"] },
  { id: "atlas", name: "Atlas Pro", provider: "Northwind", contextWindow: 200_000, inputPrice: 3, outputPrice: 15, speed: 2, capabilities: ["vision", "tools", "reasoning"] },
  { id: "open", name: "Open 70B", provider: "Open weights", contextWindow: 32_000, speed: 1 },
];
describe("ModelSelector", () => {
  it("lists models with their facts and forwards the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<ModelSelector ref={ref} aria-label="Model" models={models} recommended={["atlas"]} defaultOpen />);
    expect(ref.current?.tagName).toBe("INPUT");
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText(/200K context/)).toBeInTheDocument();
    expect(screen.getAllByRole("option", { hidden: true })).toHaveLength(3);
  });
  it("disables models that miss a required capability", () => {
    render(<ModelSelector aria-label="Model" models={models} requires={["vision"]} defaultOpen />);
    const swift = document.querySelector('[role="option"][data-value="swift"]');
    expect(swift).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(/No vision support/).length).toBeGreaterThan(0);
  });
  it("reports the picked model", () => {
    const onValueChange = vi.fn();
    render(<ModelSelector aria-label="Model" models={models} onValueChange={onValueChange} defaultOpen />);
    fireEvent.click(document.querySelector('[role="option"][data-value="atlas"]') as HTMLElement);
    expect(onValueChange).toHaveBeenCalledWith("atlas", models[1]);
  });
  it("renders on the server", () => {
    expect(renderToString(<ModelSelector aria-label="Model" models={models} defaultValue="atlas" />)).toContain("Atlas Pro");
  });
});
