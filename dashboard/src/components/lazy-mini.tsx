import { Skeleton } from "changelui";
import { MotionConfig } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import type { ItemModule } from "../registry/types";

const minis = new Map<string, ComponentType>();

/** Gallery-wide "Animate all" switch: true plays every mounted mini instead of poster mode. */
export const PlayAllContext = createContext(false);

export interface LazyMiniProps {
  slug: string;
  load: () => Promise<{ default: ItemModule }>;
  /** The card is hovered or focused: play the mini. */
  active?: boolean;
  /** Entrance-style minis restart when they start playing, so hover shows the animation from frame one. */
  replayOnPlay?: boolean;
}

const noHover = () => typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches === true;

/**
 * Bento mini preview in poster mode (roadmap I-4). It loads when the card comes within 200px of the
 * viewport, shows a Skeleton until then, and unmounts once it is more than 600px out of view.
 * While idle it renders paused: `MotionConfig reducedMotion="always"` puts every item on its
 * reduced-motion branch (final frames, stopped loops, a static canvas frame) and `data-poster="paused"`
 * pauses CSS animations. It plays while its card is hovered or focused; on touch screens (no hover),
 * while the card sits in the middle band of the viewport. The area is inert and pointer-events-none,
 * so the card stays a single link.
 */
export function LazyMini({ slug, load, active = false, replayOnPlay = false }: LazyMiniProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playAll = useContext(PlayAllContext);
  const [near, setNear] = useState(false);
  const [centered, setCentered] = useState(false);
  const [mini, setMini] = useState<ComponentType | null>(() => minis.get(slug) ?? null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer: render immediately (design 9, missing browser APIs).
      const id = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(id);
    }
    const enter = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "200px" },
    );
    const leave = new IntersectionObserver(
      (entries) => {
        if (entries.every((entry) => !entry.isIntersecting)) setNear(false);
      },
      { rootMargin: "600px" },
    );
    // Touch screens have no hover, so the card in the middle band of the viewport plays instead.
    const band = noHover()
      ? new IntersectionObserver((entries) => setCentered(entries.some((entry) => entry.isIntersecting)), {
          rootMargin: "-35% 0px -35% 0px",
        })
      : null;
    enter.observe(el);
    leave.observe(el);
    band?.observe(el);
    return () => {
      enter.disconnect();
      leave.disconnect();
      band?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!near || mini) return;
    let alive = true;
    load().then(
      (module) => {
        minis.set(slug, module.default.Mini);
        if (alive) setMini(() => module.default.Mini);
      },
      () => {
        // A failed chunk keeps the skeleton; the item page shows the real error.
      },
    );
    return () => {
      alive = false;
    };
  }, [near, mini, load, slug]);

  const playing = playAll || active || centered;
  // Count play starts during render (React's "adjust state on prop change" pattern), so a replayable
  // mini remounts at the moment it starts playing and its entrance runs from the first frame.
  const [lastPlaying, setLastPlaying] = useState(playing);
  const [plays, setPlays] = useState(0);
  if (playing !== lastPlaying) {
    setLastPlaying(playing);
    if (playing && replayOnPlay) setPlays((count) => count + 1);
  }

  const Mini = near ? mini : null;
  return (
    <div
      ref={ref}
      inert
      data-loaded={Mini ? "" : undefined}
      data-poster={playing ? "playing" : "paused"}
      className="pointer-events-none relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden"
    >
      {Mini ? (
        <MotionConfig reducedMotion={playing ? "user" : "always"}>
          <Mini key={plays} />
        </MotionConfig>
      ) : (
        <Skeleton className="h-16 w-3/4 max-w-48" />
      )}
    </div>
  );
}
