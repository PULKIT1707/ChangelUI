// One-shot Web Animations helper for small effects (pop, shake) that need no Motion bytes.
// Internal: not exported from the package. Call it from effects or event handlers, never in render.

const running = new WeakMap<Element, Animation>();

/**
 * Plays `keyframes` on `el`, cancelling the animation this helper started on the same element
 * before. No-ops when `el` is null or the environment has no `Element.animate` (jsdom, old engines).
 */
export function playKeyframes(el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions): void {
  if (!el || typeof el.animate !== "function") return;
  running.get(el)?.cancel();
  const animation = el.animate(keyframes, options);
  running.set(el, animation);
  animation.onfinish = () => {
    if (running.get(el) === animation) running.delete(el);
  };
}
