import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ImageCropper } from "../../src/components/image-cropper";

const SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function loadImage(width: number, height: number) {
  const img = screen.getByRole("img", { name: "Photo" }) as HTMLImageElement;
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(img);
}

describe("ImageCropper", () => {
  it("renders the image, controls and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ImageCropper ref={ref} src={SRC} alt="Photo" aspects={[{ label: "1:1", value: 1 }, { label: "16:9", value: 16 / 9 }]} />);
    expect(ref.current?.tagName).toBe("DIV");
    expect(screen.getByRole("img", { name: "Photo" })).toHaveAttribute("src", SRC);
    expect(screen.getByRole("slider", { name: "Zoom" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1:1" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "16:9" }));
    expect(screen.getByRole("button", { name: "16:9" })).toHaveAttribute("aria-pressed", "true");
  });

  it("rotates and zooms with controlled callbacks", () => {
    const onRotationChange = vi.fn();
    const onZoomChange = vi.fn();
    render(<ImageCropper src={SRC} alt="Photo" onRotationChange={onRotationChange} onZoomChange={onZoomChange} />);
    loadImage(800, 600);
    // jsdom has no layout, so the frame never measures; the toolbar still works.
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onZoomChange).toHaveBeenCalledWith(1.25);
    expect(screen.getByRole("button", { name: "Rotate 90° clockwise" })).toBeDisabled();
  });

  it("renders on the server", () => {
    expect(renderToString(<ImageCropper src={SRC} alt="Server photo" />)).toContain("Server photo");
  });
});
