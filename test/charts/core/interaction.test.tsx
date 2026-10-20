// The React interaction state model (charts-roadmap 4): chart store, selectors, controlled keys,
// keyboard map, zoom math, sync groups, sizing and the motion policy / data tween.
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MotionConfig, type MotionValue } from "motion/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { chartKeyAction, keyboardHelp, type ChartKeyContext } from "../../../src/charts/core/keyboard";
import {
  ChartStoreProvider,
  createChartStore,
  isFaded,
  isSelected,
  isSeriesHidden,
  useChartSelector,
  useChartStoreContext,
  type ChartState,
  type ChartStore,
} from "../../../src/charts/core/store";
import { ChartSyncGroup, createSyncStore, useChartSyncGroup, useSyncedDomain, useSyncedHoverX } from "../../../src/charts/core/sync";
import { chartHeight, useChartSize } from "../../../src/charts/core/use-chart-size";
import { barDelay, chartMotion, createTweenEngine, liveTransition, resolveChartAnimation, useChartAnimation, useDataTween } from "../../../src/charts/core/use-chart-motion";
import { brushDomain, clampDomain, isZoomed, keyboardPan, keyboardZoom, panBy, pinchFactor, rubberBand, wheelZoomFactor, zoomAround } from "../../../src/charts/core/zoom";
import { allowConsoleError } from "../../utils/console";
import { setMediaQuery } from "../../utils/env";

const rev = { seriesId: "rev", index: 2 };
const cost = { seriesId: "cost", index: 2 };

describe("chart store", () => {
  it("merges patches and notifies only on real changes", () => {
    const store = createChartStore({ width: 640 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setSize(640, 0);
    expect(listener).not.toHaveBeenCalled();
    store.setSize(640, 300);
    store.setPointer({ x: 1, y: 2 });
    store.setPointer({ x: 1, y: 2 });
    store.setHighlight({ ...rev });
    store.setHighlight({ ...rev });
    store.setFocus(cost);
    store.announce("hi");
    store.set({ xDomain: [0, 5] });
    store.set({ xDomain: [0, 5] });
    expect(listener).toHaveBeenCalledTimes(6);
    unsubscribe();
    store.setPointer(null);
    expect(listener).toHaveBeenCalledTimes(6);
    expect(store.getState()).toMatchObject({ width: 640, height: 300, pointer: null, highlight: rev, focus: cost, announcement: "hi", xDomain: [0, 5] });
  });

  it("selection: single toggles, multiple adds with Shift/Cmd, none ignores", () => {
    const onSelectionChange = vi.fn();
    const store = createChartStore();
    store.configure({}, { onSelectionChange });
    store.select(rev, "none");
    expect(store.getState().selection).toEqual([]);
    store.select(rev, "single");
    expect(store.getState().selection).toEqual([rev]);
    store.select(rev, "single");
    expect(store.getState().selection).toEqual([]);
    store.select(rev, "multiple");
    store.select(cost, "multiple", true);
    expect(store.getState().selection).toEqual([rev, cost]);
    expect(isSelected(store.getState(), cost)).toBe(true);
    store.select(rev, "multiple", true);
    expect(store.getState().selection).toEqual([cost]);
    store.select(rev, "multiple");
    expect(store.getState().selection).toEqual([rev]);
    store.clearSelection();
    store.clearSelection();
    expect(onSelectionChange).toHaveBeenCalledTimes(7);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("legend: toggle and Alt+click solo with restore", () => {
    const store = createChartStore();
    const offA = store.registerSeries({ id: "a", label: "A", color: "var(--a)" });
    store.registerSeries({ id: "b", label: "B", color: "var(--b)" });
    store.registerSeries({ id: "c", label: "C", color: "var(--c)" });
    store.toggleSeries("c");
    expect(store.getState().hidden).toEqual(["c"]);
    store.soloSeries("a");
    expect(store.getState().hidden).toEqual(["b", "c"]);
    store.soloSeries("b");
    expect(store.getState().hidden).toEqual(["a", "c"]);
    store.soloSeries("b");
    expect(store.getState().hidden).toEqual(["c"]);
    expect(store.getState().solo).toBeNull();
    store.soloSeries("a");
    store.toggleSeries("b");
    expect(store.getState().solo).toBeNull();
    expect(isSeriesHidden(store.getState(), "c")).toBe(true);
    // re-registering replaces; unregistering removes only the same meta
    store.registerSeries({ id: "a", label: "A2", color: "var(--a)" });
    offA();
    expect(store.getState().series.map((s) => s.label)).toEqual(["B", "C", "A2"]);
  });

  it("controlled keys report changes without storing them", () => {
    const onHighlightChange = vi.fn();
    const onHiddenSeriesChange = vi.fn();
    const onXDomainChange = vi.fn();
    const store = createChartStore();
    store.configure({ highlight: true, hidden: true, xDomain: true }, { onHighlightChange, onHiddenSeriesChange, onXDomainChange });
    store.setHighlight(rev);
    expect(onHighlightChange).toHaveBeenCalledWith(rev);
    expect(store.getState().highlight).toBeNull();
    store.toggleSeries("x");
    expect(onHiddenSeriesChange).toHaveBeenCalledWith(["x"]);
    expect(store.getState().hidden).toEqual([]);
    store.setXDomain([1, 2]);
    expect(onXDomainChange).toHaveBeenCalledWith([1, 2]);
    expect(store.getState().xDomain).toBeNull();
    // the owner syncs the prop back in
    store.set({ highlight: rev, hidden: ["x"], xDomain: [1, 2] });
    expect(store.getState()).toMatchObject({ highlight: rev, hidden: ["x"], xDomain: [1, 2] });
    expect(isFaded(store.getState(), "cost")).toBe(true);
    expect(isFaded(store.getState(), "rev")).toBe(false);
  });

  it("selectors re-render only their subscribers, and only on change", () => {
    const store = createChartStore();
    const renders = { highlight: 0, hidden: 0 };
    function Highlight() {
      renders.highlight++;
      const h = useChartSelector(store, (s) => s.highlight);
      return <span data-testid="h">{h ? `${h.seriesId}:${h.index}` : "none"}</span>;
    }
    function HiddenCount() {
      renders.hidden++;
      // fresh array every call, made stable by a structural isEqual
      const ids = useChartSelector(
        store,
        (s: ChartState) => s.hidden.filter((id) => id !== "ignored"),
        (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
      );
      return <span data-testid="n">{ids.length}</span>;
    }
    render(
      <>
        <Highlight />
        <HiddenCount />
      </>,
    );
    const base = { ...renders };
    act(() => store.setPointer({ x: 3, y: 4 }));
    expect(renders).toEqual(base);
    act(() => store.setHighlight(rev));
    expect(screen.getByTestId("h").textContent).toBe("rev:2");
    expect(renders.hidden).toBe(base.hidden);
    act(() => store.toggleSeries("ignored"));
    expect(renders.hidden).toBe(base.hidden);
    act(() => store.toggleSeries("cost"));
    expect(screen.getByTestId("n").textContent).toBe("1");
  });

  it("renders on the server with the initial state", () => {
    const store = createChartStore({ width: 640 });
    function Width() {
      return <i>{useChartSelector(store, (s) => s.width)}</i>;
    }
    expect(renderToString(<Width />)).toBe("<i>640</i>");
  });

  it("context provides the store and throws outside a chart", () => {
    const store: ChartStore = createChartStore({ height: 123 });
    function Read() {
      const s = useChartStoreContext();
      return <b>{s.getState().height}</b>;
    }
    render(
      <ChartStoreProvider store={store}>
        <Read />
      </ChartStoreProvider>,
    );
    expect(screen.getByText("123")).toBeInTheDocument();
    allowConsoleError(); // React logs the deliberate throw below
    expect(() => render(<Read />)).toThrow(/inside a Chart/);
  });
});

describe("keyboard map", () => {
  const ctx: ChartKeyContext = { index: 3, count: 20, seriesIndex: 0, seriesCount: 3, mode: "item" };
  it("moves between points and series", () => {
    expect(chartKeyAction("ArrowRight", {}, ctx)).toEqual({ type: "focus", index: 4, seriesIndex: 0 });
    expect(chartKeyAction("ArrowLeft", {}, { ...ctx, index: 0 })).toEqual({ type: "focus", index: 0, seriesIndex: 0 });
    expect(chartKeyAction("ArrowRight", {}, { ...ctx, index: -1 })).toEqual({ type: "focus", index: 0, seriesIndex: 0 });
    expect(chartKeyAction("ArrowLeft", {}, { ...ctx, index: -1 })).toEqual({ type: "focus", index: 19, seriesIndex: 0 });
    expect(chartKeyAction("ArrowDown", {}, ctx)).toEqual({ type: "focus", index: 3, seriesIndex: 1 });
    expect(chartKeyAction("ArrowUp", {}, { ...ctx, seriesIndex: 0 })).toEqual({ type: "focus", index: 3, seriesIndex: 0 });
    expect(chartKeyAction("ArrowDown", {}, { ...ctx, seriesIndex: 2 })).toEqual({ type: "focus", index: 3, seriesIndex: 2 });
    expect(chartKeyAction("ArrowDown", {}, { ...ctx, seriesIndex: -1, index: -1 })).toEqual({ type: "focus", index: 0, seriesIndex: 0 });
    expect(chartKeyAction("ArrowDown", {}, { ...ctx, mode: "axis" })).toBeNull();
    expect(chartKeyAction("Home", {}, ctx)).toEqual({ type: "focus", index: 0, seriesIndex: 0 });
    expect(chartKeyAction("End", {}, ctx)).toEqual({ type: "focus", index: 19, seriesIndex: 0 });
    expect(chartKeyAction("PageDown", {}, ctx)).toEqual({ type: "focus", index: 5, seriesIndex: 0 });
    expect(chartKeyAction("PageUp", {}, ctx)).toEqual({ type: "focus", index: 1, seriesIndex: 0 });
    expect(chartKeyAction("PageDown", {}, { ...ctx, index: -1 })).toEqual({ type: "focus", index: 1, seriesIndex: 0 });
    expect(chartKeyAction("PageUp", {}, { ...ctx, index: -1 })).toEqual({ type: "focus", index: 0, seriesIndex: 0 });
    expect(chartKeyAction("ArrowRight", {}, { ...ctx, count: 0 })).toBeNull();
  });

  it("selects, escapes in order, zooms, pans and toggles the table", () => {
    expect(chartKeyAction("Enter", {}, ctx)).toEqual({ type: "select", additive: false });
    expect(chartKeyAction(" ", { shiftKey: true }, ctx)).toEqual({ type: "select", additive: true });
    expect(chartKeyAction("Enter", {}, { ...ctx, index: -1 })).toBeNull();
    const full = { ...ctx, hasSelection: true, drilled: true, zoomable: true, zoomed: true };
    expect(chartKeyAction("Escape", {}, full)).toEqual({ type: "clear-selection" });
    expect(chartKeyAction("Escape", {}, { ...full, hasSelection: false })).toEqual({ type: "drill-up" });
    expect(chartKeyAction("Escape", {}, { ...full, hasSelection: false, drilled: false })).toEqual({ type: "reset-zoom" });
    expect(chartKeyAction("Escape", {}, ctx)).toBeNull();
    expect(chartKeyAction("+", {}, full)).toEqual({ type: "zoom", direction: "in" });
    expect(chartKeyAction("=", {}, full)).toEqual({ type: "zoom", direction: "in" });
    expect(chartKeyAction("-", {}, full)).toEqual({ type: "zoom", direction: "out" });
    expect(chartKeyAction("_", {}, ctx)).toBeNull();
    expect(chartKeyAction("0", {}, full)).toEqual({ type: "reset-zoom" });
    expect(chartKeyAction("0", {}, ctx)).toBeNull();
    expect(chartKeyAction("ArrowRight", { shiftKey: true }, full)).toEqual({ type: "pan", direction: 1 });
    expect(chartKeyAction("ArrowLeft", { shiftKey: true }, full)).toEqual({ type: "pan", direction: -1 });
    expect(chartKeyAction("t", {}, ctx)).toEqual({ type: "toggle-table" });
    expect(chartKeyAction("T", { altKey: true }, ctx)).toBeNull();
    expect(chartKeyAction("ArrowRight", { metaKey: true }, ctx)).toBeNull();
    expect(chartKeyAction("q", {}, ctx)).toBeNull();
    expect(keyboardHelp("axis")).not.toContain("up and down");
    expect(keyboardHelp("item", true)).toContain("plus and minus zoom");
  });
});

describe("zoom math", () => {
  it("zooms around an anchor within limits", () => {
    expect(wheelZoomFactor(-100)).toBeCloseTo(Math.exp(0.2));
    expect(wheelZoomFactor(1, 1)).toBeCloseTo(Math.exp(-0.032));
    expect(wheelZoomFactor(1, 2)).toBeCloseTo(Math.exp(-1.6));
    expect(zoomAround([0, 100], 2, 50)).toEqual([25, 75]);
    expect(zoomAround([0, 100], 2, 0)).toEqual([0, 50]);
    expect(zoomAround([0, 100], 0, 50)).toEqual([0, 100]);
    expect(zoomAround([0, 100], 100, 50, { minSpan: 10 })).toEqual([45, 55]);
    expect(zoomAround([0, 100], 0.25, 50, { extent: [0, 100] })).toEqual([0, 100]);
    expect(keyboardZoom([0, 100], "in")).toEqual([10, 90]);
    expect(keyboardZoom([10, 90], "out", 50, { extent: [0, 100] })).toEqual([0, 100]);
  });

  it("pans, clamps, rubber-bands and brushes", () => {
    expect(panBy([10, 20], 5)).toEqual([15, 25]);
    expect(panBy([10, 20], 500, { extent: [0, 100] })).toEqual([90, 100]);
    expect(panBy([10, 20], -500, { extent: [0, 100] })).toEqual([0, 10]);
    expect(keyboardPan([0, 50], 1, { extent: [0, 100] })).toEqual([5, 55]);
    expect(clampDomain([20, 10])).toEqual([10, 20]);
    expect(clampDomain([0, 1], { minSpan: 1000, extent: [0, 10] })).toEqual([0, 10]);
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(1e9)).toBeLessThan(40);
    expect(rubberBand(-20)).toBeLessThan(0);
    expect(Math.abs(rubberBand(-20))).toBeLessThan(20);
    expect(pinchFactor(100, 150)).toBe(1.5);
    expect(pinchFactor(0, 150)).toBe(1);
    expect(brushDomain(300, 100, (px) => px / 10)).toEqual([10, 30]);
    expect(brushDomain(100, 300, (px) => -px)).toEqual([-300, -100]);
    expect(isZoomed(null, [0, 10])).toBe(false);
    expect(isZoomed([0, 10], [0, 10])).toBe(false);
    expect(isZoomed([1, 10], [0, 10])).toBe(true);
  });
});

describe("sync group", () => {
  it("store dedupes updates", () => {
    const store = createSyncStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setHover(5, "a");
    store.setHover(5, "a");
    store.setHover(null, "a");
    expect(store.getState()).toEqual({ hoverX: null, source: null, domain: null });
    store.setDomain([1, 2]);
    store.setDomain([1, 2]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("shares hover x between charts, by value", () => {
    function Probe({ id }: { id: string }) {
      const group = useChartSyncGroup();
      const x = useSyncedHoverX(id);
      const domain = useSyncedDomain();
      return (
        <button type="button" onClick={() => group?.store.setHover(42, id)} data-testid={id}>
          {String(x)}|{domain ? domain.join("-") : "none"}
        </button>
      );
    }
    let store: ReturnType<typeof createSyncStore> | undefined;
    function Grab() {
      store = useChartSyncGroup()?.store;
      return null;
    }
    render(
      <ChartSyncGroup syncZoom>
        <Grab />
        <Probe id="a" />
        <Probe id="b" />
      </ChartSyncGroup>,
    );
    act(() => screen.getByTestId("a").click());
    expect(screen.getByTestId("a").textContent).toBe("null|none");
    expect(screen.getByTestId("b").textContent).toBe("42|none");
    act(() => store?.setDomain([3, 4]));
    expect(screen.getByTestId("b").textContent).toBe("42|3-4");
  });

  it("is inert outside a group and renders no element", () => {
    function Probe() {
      return <i>{`${String(useSyncedHoverX("x"))}|${String(useSyncedDomain())}|${String(useChartSyncGroup())}`}</i>;
    }
    expect(renderToString(<Probe />)).toBe("<i>null|null|null</i>");
    expect(renderToString(<ChartSyncGroup>text</ChartSyncGroup>)).toBe("text");
    function NoZoom() {
      return <i>{String(useSyncedDomain())}</i>;
    }
    expect(renderToString(<ChartSyncGroup>{<NoZoom />}</ChartSyncGroup>)).toBe("<i>null</i>");
  });
});

describe("chart size", () => {
  it("computes heights from aspect ratio, fixed height or the observed size", () => {
    expect(chartHeight(640, 0, {})).toBe(300);
    expect(chartHeight(640, 0, { aspectRatio: 2 })).toBe(320);
    expect(chartHeight(640, 0, { height: 200 })).toBe(200);
    expect(chartHeight(640, 151.3, {})).toBe(151.5);
    expect(chartHeight(640, 0, { height: 50, minHeight: 120 })).toBe(120);
  });

  function Sized({ options }: { options?: Parameters<typeof useChartSize>[1] }) {
    const ref = useRef<HTMLDivElement>(null);
    const size = useChartSize(ref, options);
    return (
      <div ref={ref} data-testid="box">
        {size.width}x{size.height}:{String(size.measured)}
      </div>
    );
  }

  it("server and first render use the initial size; the observer reports the real one", () => {
    expect(renderToString(<Sized options={{ initialWidth: 500, aspectRatio: 2.5 }} />)).toContain("500<!-- -->x<!-- -->200<!-- -->:<!-- -->false");
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 333.3, height: 180, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    render(<Sized options={{ height: 240 }} />);
    expect(screen.getByTestId("box").textContent).toBe("333.5x240:true");
    spy.mockReturnValue({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    render(<Sized />);
    expect(screen.getAllByTestId("box")[1]?.textContent).toBe("640x300:false");
    spy.mockRestore();
  });
});

describe("chart motion", () => {
  it("presets match charts-roadmap 4.3", () => {
    expect(chartMotion.update).toEqual({ type: "spring", stiffness: 170, damping: 26, mass: 1 });
    expect(chartMotion.needle).toEqual({ type: "spring", stiffness: 140, damping: 14 });
    expect(chartMotion.drawLine.duration).toBe(0.9);
    expect(liveTransition(500)).toEqual({ duration: 0.5, ease: "linear" });
    expect(barDelay(4, 10)).toBeCloseTo(0.1);
    expect(barDelay(99, 100)).toBeCloseTo(0.5);
    expect(barDelay(0, 1)).toBe(0);
  });

  it("policy: never and reduced motion disable; auto skips the entrance after SSR", () => {
    expect(resolveChartAnimation("never", { reducedMotion: false, hydrated: false })).toEqual({ entrance: false, updates: false, reducedMotion: false });
    expect(resolveChartAnimation("always", { reducedMotion: true, hydrated: false })).toEqual({ entrance: false, updates: false, reducedMotion: true });
    expect(resolveChartAnimation("auto", { reducedMotion: false, hydrated: true })).toEqual({ entrance: false, updates: true, reducedMotion: false });
    expect(resolveChartAnimation("auto", { reducedMotion: false, hydrated: false })).toEqual({ entrance: true, updates: true, reducedMotion: false });
    expect(resolveChartAnimation("always", { reducedMotion: false, hydrated: true }).entrance).toBe(true);
  });

  it("useChartAnimation: server render means hydrated; client mounts animate; reduced motion wins", () => {
    function Probe() {
      const a = useChartAnimation();
      return <i>{`${a.entrance}/${a.updates}`}</i>;
    }
    expect(renderToString(<Probe />)).toBe("<i>false/true</i>");
    const { container, unmount } = render(<Probe />);
    expect(container.textContent).toBe("true/true");
    unmount();
    const reduced = render(
      <MotionConfig reducedMotion="always">
        <Probe />
      </MotionConfig>,
    );
    expect(reduced.container.textContent).toBe("false/false");
    reduced.unmount();
    setMediaQuery("(prefers-reduced-motion: reduce)", true);
    expect(render(<Probe />).container.textContent).toBe("false/false");
  });

  it("tween engine restarts from the in-between values when interrupted", () => {
    const engine = createTweenEngine([0, 0]);
    expect(engine.retarget([10, 20])).toBe(true);
    const mid = engine.at(0.5);
    expect([...mid]).toEqual([5, 10]);
    const next = engine.at(0.5);
    expect(next).not.toBe(mid); // new identity each frame (MotionValue change detection)
    expect(engine.retarget([0, 0])).toBe(true);
    expect([...engine.at(0)]).toEqual([5, 10]);
    expect(engine.retarget([1])).toBe(false);
    expect([...engine.jump([7])]).toEqual([7]);
    expect([...engine.current()]).toEqual([7]);
  });

  it("useDataTween reaches the target, jumps when disabled or on length changes", async () => {
    let latest: MotionValue<Float64Array> | undefined;
    const a = new Float64Array([0, 0]);
    const b = new Float64Array([4, 8]);
    const c = new Float64Array([1, 2, 3]);
    const { rerender } = renderHook(
      ({ target, enabled }: { target: Float64Array; enabled: boolean }) => {
        latest = useDataTween(target, { enabled });
      },
      { initialProps: { target: a, enabled: true } },
    );
    expect([...(latest?.get() ?? [])]).toEqual([0, 0]);
    rerender({ target: b, enabled: true });
    await waitFor(() => expect([...(latest?.get() ?? [])]).toEqual([4, 8]));
    rerender({ target: a, enabled: false });
    expect([...(latest?.get() ?? [])]).toEqual([0, 0]);
    rerender({ target: c, enabled: true });
    expect([...(latest?.get() ?? [])]).toEqual([1, 2, 3]);
  });
});
