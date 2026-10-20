// DOM particle burst (roadmap I-11) for click sparks, reactions and confetti pops.
// Uses the Web Animations API, so it costs no Motion bytes. Internal: not exported from the package.
// Call it from event handlers or effects only, never during render.
import { easings } from "../hooks/motion-presets";

export type BurstShape = "circle" | "square" | "line" | "star";

export interface BurstOptions {
  /** Origin in px relative to the container's padding box. */
  x: number;
  y: number;
  /** Particles. Default 10. */
  count?: number;
  /** CSS colors, cycled. Default ["currentColor"]. */
  colors?: readonly string[];
  /** Travel range in px [min, max]. Default [24, 40]. */
  distance?: readonly [number, number];
  /** Particle size range in px [min, max]. Default [4, 7]. */
  size?: readonly [number, number];
  /** Seconds. Default 0.5. */
  duration?: number;
  /** Arc in degrees the particles fan over. Default 360. */
  spread?: number;
  /** Center of the arc in degrees (0 = right, -90 = up). Default -90. */
  angle?: number;
  /** Extra downward px at the end, for a confetti-like fall. Default 0. */
  gravity?: number;
  /** Default "circle". */
  shape?: BurstShape;
  /** Random source in [0, 1). Default Math.random (handlers only, never render). */
  random?: () => number;
}

const STAR = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

function shapeStyle(shape: BurstShape, size: number): Partial<CSSStyleDeclaration> {
  switch (shape) {
    case "square":
      return { width: `${size}px`, height: `${size}px`, borderRadius: "2px" };
    case "line":
      return { width: `${size * 0.4}px`, height: `${size * 2}px`, borderRadius: "9999px" };
    case "star":
      return { width: `${size * 1.6}px`, height: `${size * 1.6}px`, clipPath: STAR };
    default:
      return { width: `${size}px`, height: `${size}px`, borderRadius: "9999px" };
  }
}

/**
 * Spawns `count` particles inside `container` (which should be positioned, e.g. `relative`) that
 * fly outward and fade. Nodes remove themselves when done. Returns a function that cancels early.
 * No-ops where Element.animate is missing (jsdom, old engines).
 */
export function burst(container: HTMLElement, options: BurstOptions): () => void {
  const {
    x,
    y,
    count = 10,
    colors = ["currentColor"],
    distance = [24, 40],
    size = [4, 7],
    duration = 0.5,
    spread = 360,
    angle = -90,
    gravity = 0,
    shape = "circle",
    random = Math.random,
  } = options;
  const doc = container.ownerDocument;
  if (typeof container.animate !== "function") return () => {};
  const nodes: HTMLSpanElement[] = [];
  const animations: Animation[] = [];
  const easing = `cubic-bezier(${easings.outExpo.join(", ")})`;
  const full = spread >= 360;
  for (let i = 0; i < count; i++) {
    const node = doc.createElement("span");
    const s = size[0] + random() * (size[1] - size[0]);
    const step = full ? spread / count : spread / Math.max(count - 1, 1);
    const base = full ? angle + step * i : angle - spread / 2 + step * i;
    const theta = ((base + (random() - 0.5) * step * 0.6) * Math.PI) / 180;
    const travel = distance[0] + random() * (distance[1] - distance[0]);
    const dx = Math.cos(theta) * travel;
    const dy = Math.sin(theta) * travel;
    const rotate = shape === "line" ? (theta * 180) / Math.PI + 90 : random() * 360;
    Object.assign(node.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      pointerEvents: "none",
      background: colors[i % colors.length] ?? "currentColor",
      willChange: "transform, opacity",
      ...shapeStyle(shape, s),
    });
    node.setAttribute("aria-hidden", "true");
    container.appendChild(node);
    nodes.push(node);
    const animation = node.animate(
      [
        { transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(1)`, opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + gravity}px)) rotate(${rotate + 90}deg) scale(0.3)`,
          opacity: 0,
        },
      ],
      { duration: duration * 1000 * (0.8 + random() * 0.4), easing, fill: "forwards" },
    );
    animation.onfinish = () => node.remove();
    animations.push(animation);
  }
  return () => {
    for (const animation of animations) animation.cancel();
    for (const node of nodes) node.remove();
  };
}
