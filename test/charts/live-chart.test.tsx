import { render } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveChart } from "../../src/charts/live-chart";

const rows = [{ t: 0, value: 3 }, { t: 1000, value: 5 }, { t: 2000, value: 4 }];

describe("LiveChart", () => {
  it("renders its root, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<LiveChart ref={ref} className="max-w-sm" data={rows} />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root?.className).toContain("max-w-sm");
  });

  it("renders on the server", () => {
    const html = renderToString(<LiveChart data={rows} />);
    expect(html).toContain("aria-roledescription");
  });
});
