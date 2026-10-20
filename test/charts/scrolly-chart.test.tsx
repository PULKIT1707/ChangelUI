import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrollyChart } from "../../src/charts/scrolly-chart";
const steps = [
  { id: "a", content: "First", state: 1 },
  { id: "b", content: "Second", state: 2 },
];
describe("ScrollyChart", () => {
  it("renders steps and the first state", () => {
    const { getByText } = render(<ScrollyChart steps={steps} render={(s) => <p>state {s}</p>} />);
    expect(getByText("state 1")).toBeTruthy();
    expect(getByText("Second")).toBeTruthy();
  });
  it("renders on the server", () => {
    expect(renderToString(<ScrollyChart steps={steps} render={(s) => <p>state {s}</p>} height={400} />)).toContain("First");
  });
});
