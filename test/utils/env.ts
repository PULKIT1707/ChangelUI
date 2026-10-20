// Controllable browser-API mocks installed by test/setup.ts (design 11.1).
// Tests import the control functions from here; setup.ts installs and resets them.

type MediaListener = (event: MediaQueryListEvent) => void;

const mediaMatches = new Map<string, boolean>();
const mediaListeners = new Map<string, Set<MediaListener>>();

/** Sets whether `query` matches and notifies listeners with a change event. */
export function setMediaQuery(query: string, matches: boolean): void {
  mediaMatches.set(query, matches);
  for (const listener of mediaListeners.get(query) ?? []) {
    listener({ matches, media: query } as MediaQueryListEvent);
  }
}

export function resetMediaQueries(): void {
  mediaMatches.clear();
  mediaListeners.clear();
}

export function matchMediaMock(query: string): MediaQueryList {
  const listeners = mediaListeners.get(query) ?? new Set<MediaListener>();
  mediaListeners.set(query, listeners);
  const list = {
    get matches() {
      return mediaMatches.get(query) ?? false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  return list as unknown as MediaQueryList;
}

let resizeObserverMode: "sync" | "async" = "sync";

/** "sync" (default): observe() notifies immediately. "async": notifies on a later macrotask. */
export function setResizeObserverMode(mode: "sync" | "async"): void {
  resizeObserverMode = mode;
}

const liveResizeObservers = new Set<MockResizeObserver>();

/** Re-notifies every live ResizeObserver for all observed targets. */
export function triggerResizeObservers(): void {
  for (const observer of liveResizeObservers) observer.notifyAll();
}

function entryFor(target: Element): ResizeObserverEntry {
  const rect = target.getBoundingClientRect();
  const size = [{ inlineSize: rect.width, blockSize: rect.height }];
  return {
    target,
    contentRect: rect,
    borderBoxSize: size,
    contentBoxSize: size,
    devicePixelContentBoxSize: size,
  } as unknown as ResizeObserverEntry;
}

export class MockResizeObserver implements ResizeObserver {
  private readonly targets = new Set<Element>();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    this.targets.add(target);
    liveResizeObservers.add(this);
    const notify = () => {
      if (this.targets.has(target)) this.callback([entryFor(target)], this);
    };
    if (resizeObserverMode === "sync") notify();
    else setTimeout(notify, 0);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    liveResizeObservers.delete(this);
  }

  notifyAll(): void {
    if (this.targets.size > 0) this.callback([...this.targets].map(entryFor), this);
  }
}

export class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  /** Reports the target as intersecting as soon as it is observed. */
  observe(target: Element): void {
    const rect = target.getBoundingClientRect();
    this.callback(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: 0,
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

export function resetEnv(): void {
  resetMediaQueries();
  resizeObserverMode = "sync";
  liveResizeObservers.clear();
}
