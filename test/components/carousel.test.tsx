import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../../src/components/carousel";

const carousel = (ref?: React.Ref<HTMLElement>) => (
  <Carousel ref={ref} aria-label="Gallery" className="mt-4">
    <CarouselContent>
      <CarouselItem>One</CarouselItem>
      <CarouselItem>Two</CarouselItem>
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
);

describe("Carousel", () => {
  it("renders a labelled carousel region with slides", () => {
    const ref = createRef<HTMLElement>();
    render(carousel(ref));
    expect(ref.current).toHaveAttribute("aria-roledescription", "carousel");
    expect(ref.current?.className).toContain("mt-4");
    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
  });

  it("renders on the server", () => {
    expect(renderToString(carousel())).toContain("Two");
  });
});
