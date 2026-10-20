// Generated landscape artwork as SVG data URIs, so gallery demos (lightbox, carousel, image compare)
// need no image files or network requests. Deterministic per seed, so server and client agree.

export interface Scene {
  name: string;
  sky: [string, string];
  sun: string;
  hills: [string, string, string];
  /** Stars and a moon instead of a sun glow. */
  night?: boolean;
}

export const SCENES: Scene[] = [
  { name: "Dawn ridge", sky: ["#fbc2eb", "#fde68a"], sun: "#fff7ed", hills: ["#c084fc", "#7c3aed", "#3b0764"] },
  { name: "High noon", sky: ["#7dd3fc", "#e0f2fe"], sun: "#fffbeb", hills: ["#86efac", "#22c55e", "#14532d"] },
  { name: "Desert dusk", sky: ["#fb923c", "#fde047"], sun: "#fff7ed", hills: ["#f97316", "#c2410c", "#431407"] },
  { name: "Night valley", sky: ["#0f172a", "#312e81"], sun: "#e0e7ff", hills: ["#4338ca", "#1e1b4b", "#020617"], night: true },
  { name: "Lagoon", sky: ["#5eead4", "#ccfbf1"], sun: "#f0fdfa", hills: ["#2dd4bf", "#0f766e", "#042f2e"] },
  { name: "Rose hills", sky: ["#fda4af", "#ffe4e6"], sun: "#fff1f2", hills: ["#fb7185", "#be123c", "#4c0519"] },
  { name: "Arctic", sky: ["#bae6fd", "#f8fafc"], sun: "#ffffff", hills: ["#e2e8f0", "#94a3b8", "#334155"] },
  { name: "Aurora", sky: ["#022c22", "#164e63"], sun: "#a7f3d0", hills: ["#065f46", "#064e3b", "#020617"], night: true },
];

function rand(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridge(r: () => number, base: number, amp: number, w: number, h: number) {
  const f1 = 1 + r() * 2;
  const f2 = 3 + r() * 4;
  const p1 = r() * Math.PI * 2;
  const p2 = r() * Math.PI * 2;
  let d = `M0 ${h}`;
  for (let x = 0; x <= w; x += w / 48) {
    const t = x / w;
    const y = base + Math.sin(t * Math.PI * f1 + p1) * amp + Math.sin(t * Math.PI * f2 + p2) * amp * 0.35;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${w} ${h} Z`;
}

/** A layered-hills landscape. `w`/`h` set the aspect ratio. */
export function landscape(scene: Scene, seed = 1, w = 1200, h = 800): string {
  const r = rand(seed * 977 + scene.name.length);
  const sunX = w * (0.2 + r() * 0.6);
  const sunY = h * (0.22 + r() * 0.18);
  const stars = scene.night
    ? Array.from({ length: 60 }, () => {
        const x = (r() * w).toFixed(0);
        const y = (r() * h * 0.55).toFixed(0);
        return `<circle cx="${x}" cy="${y}" r="${(r() * 1.6 + 0.4).toFixed(1)}" fill="#fff" opacity="${(r() * 0.6 + 0.3).toFixed(2)}"/>`;
      }).join("")
    : "";
  const [a, b, c] = scene.hills;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.sky[0]}"/><stop offset="1" stop-color="${scene.sky[1]}"/></linearGradient><radialGradient id="g"><stop offset="0" stop-color="${scene.sun}" stop-opacity="0.9"/><stop offset="1" stop-color="${scene.sun}" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/>${stars}<circle cx="${sunX}" cy="${sunY}" r="${h * 0.32}" fill="url(#g)"/><circle cx="${sunX}" cy="${sunY}" r="${h * 0.07}" fill="${scene.sun}"/><path d="${ridge(r, h * 0.55, h * 0.06, w, h)}" fill="${a}" opacity="0.85"/><path d="${ridge(r, h * 0.68, h * 0.07, w, h)}" fill="${b}"/><path d="${ridge(r, h * 0.82, h * 0.05, w, h)}" fill="${c}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
