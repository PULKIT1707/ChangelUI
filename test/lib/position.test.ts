import { describe, expect, it } from "vitest";
import { computePosition, type Rect } from "../../src/lib/position";

const viewport = { width: 1000, height: 800 };
const anchor: Rect = { x: 400, y: 300, width: 100, height: 40 };
const floating = { width: 200, height: 100 };

describe("computePosition", () => {
  it("places on each side with sideOffset", () => {
    expect(computePosition(anchor, floating, viewport, { side: "bottom", align: "center" })).toMatchObject({
      x: 350,
      y: 348,
      side: "bottom",
    });
    expect(computePosition(anchor, floating, viewport, { side: "top", align: "center", sideOffset: 4 })).toMatchObject({
      x: 350,
      y: 196,
      side: "top",
    });
    expect(computePosition(anchor, floating, viewport, { side: "right", align: "center" })).toMatchObject({
      x: 508,
      y: 270,
    });
    expect(computePosition(anchor, floating, viewport, { side: "left", align: "center" })).toMatchObject({
      x: 192,
      y: 270,
    });
  });

  it("aligns start, center and end with alignOffset", () => {
    const opts = { side: "bottom" as const };
    expect(computePosition(anchor, floating, viewport, { ...opts, align: "start" }).x).toBe(400);
    expect(computePosition(anchor, floating, viewport, { ...opts, align: "end" }).x).toBe(300);
    expect(computePosition(anchor, floating, viewport, { ...opts, align: "start", alignOffset: 10 }).x).toBe(410);
    expect(computePosition(anchor, floating, viewport, { ...opts, align: "end", alignOffset: 10 }).x).toBe(290);
    expect(computePosition(anchor, floating, viewport, { side: "right", align: "start" }).y).toBe(300);
  });

  it("flips when the side overflows and the opposite has more room", () => {
    const nearBottom: Rect = { x: 400, y: 720, width: 100, height: 40 };
    expect(computePosition(nearBottom, floating, viewport, { side: "bottom", align: "center" })).toMatchObject({
      side: "top",
      y: 612,
    });
    const nearRight: Rect = { x: 900, y: 300, width: 80, height: 40 };
    expect(computePosition(nearRight, floating, viewport, { side: "right", align: "center" }).side).toBe("left");
  });

  it("keeps the side when the opposite has less room", () => {
    const tall = { width: 200, height: 700 };
    const nearTop: Rect = { x: 400, y: 50, width: 100, height: 40 };
    expect(computePosition(nearTop, tall, viewport, { side: "bottom", align: "center" }).side).toBe("bottom");
  });

  it("shifts on the cross axis to stay inside collisionPadding", () => {
    const left: Rect = { x: 0, y: 300, width: 40, height: 40 };
    expect(computePosition(left, floating, viewport, { side: "bottom", align: "center" }).x).toBe(8);
    const right: Rect = { x: 980, y: 300, width: 20, height: 40 };
    expect(computePosition(right, floating, viewport, { side: "bottom", align: "center", collisionPadding: 16 }).x).toBe(
      784,
    );
  });

  it("clamps the arrow to arrowPadding and centers it on the anchor", () => {
    const arrow = { width: 10, height: 10 };
    const centered = computePosition(anchor, floating, viewport, { side: "bottom", align: "center", arrow });
    expect(centered.arrowX).toBe(95);
    expect(centered.arrowY).toBeUndefined();
    const left: Rect = { x: 0, y: 300, width: 10, height: 40 };
    expect(computePosition(left, floating, viewport, { side: "bottom", align: "center", arrow }).arrowX).toBe(8);
    const side = computePosition(anchor, floating, viewport, { side: "right", align: "start", arrow });
    expect(side.arrowX).toBeUndefined();
    expect(side.arrowY).toBe(15);
    expect(computePosition(anchor, floating, viewport, { side: "bottom", align: "center" }).arrowX).toBeUndefined();
  });
});
