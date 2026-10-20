import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Lightbox } from "../../src/components/lightbox";

const images = [
  { src: "one.png", alt: "One" },
  { src: "two.png", alt: "Two" },
];

describe("Lightbox", () => {
  it("renders a thumbnail grid and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Lightbox ref={ref} images={images} className="mt-4" />);
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getByRole("button", { name: "Open One" })).toBeInTheDocument();
  });

  it("opens the viewer at the clicked image", () => {
    render(<Lightbox images={images} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Two" }));
    expect(screen.getByRole("dialog", { name: "Image viewer" })).toHaveTextContent("2 of 2");
  });

  it("renders thumbnails only on the server", () => {
    const html = renderToString(<Lightbox images={images} />);
    expect(html).toContain("Open One");
    expect(html).not.toContain("dialog");
  });
});
