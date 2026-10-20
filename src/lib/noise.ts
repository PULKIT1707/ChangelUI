// Seeded gradient noise (roadmap I-11) for flow fields, topography, lava lamps and wobble.
// Pure and deterministic per seed, so it is safe in render (useMemo) and on the server.
// Internal: not exported from the package.
import { mulberry32 } from "./random";

export type Noise2D = (x: number, y: number) => number;
export type Noise3D = (x: number, y: number, z: number) => number;

/** Shuffled 0..255 permutation, doubled to 512 so lookups never wrap. */
function permutation(seed: number): Uint8Array {
  const random = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = p[i] as number;
    p[i] = p[j] as number;
    p[j] = tmp;
  }
  const doubled = new Uint8Array(512);
  for (let i = 0; i < 512; i++) doubled[i] = p[i & 255] as number;
  return doubled;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function grad2(hash: number, x: number, y: number): number {
  switch (hash & 7) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x;
    case 5:
      return -x;
    case 6:
      return y;
    default:
      return -y;
  }
}

function grad3(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** 2D gradient noise in roughly [-1, 1], smooth and continuous. */
export function createNoise2D(seed = 1): Noise2D {
  const p = permutation(seed);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[(p[X] as number) + Y] as number;
    const ab = p[(p[X] as number) + Y + 1] as number;
    const ba = p[(p[X + 1] as number) + Y] as number;
    const bb = p[(p[X + 1] as number) + Y + 1] as number;
    const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
    const x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.7071;
  };
}

/** 3D gradient noise in roughly [-1, 1]; use z as time for smoothly evolving 2D fields. */
export function createNoise3D(seed = 1): Noise3D {
  const p = permutation(seed);
  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const X = xi & 255;
    const Y = yi & 255;
    const Z = zi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const A = (p[X] as number) + Y;
    const AA = (p[A] as number) + Z;
    const AB = (p[A + 1] as number) + Z;
    const B = (p[X + 1] as number) + Y;
    const BA = (p[B] as number) + Z;
    const BB = (p[B + 1] as number) + Z;
    const g = (i: number) => p[i] as number;
    return lerp(
      lerp(
        lerp(grad3(g(AA), xf, yf, zf), grad3(g(BA), xf - 1, yf, zf), u),
        lerp(grad3(g(AB), xf, yf - 1, zf), grad3(g(BB), xf - 1, yf - 1, zf), u),
        v,
      ),
      lerp(
        lerp(grad3(g(AA + 1), xf, yf, zf - 1), grad3(g(BA + 1), xf - 1, yf, zf - 1), u),
        lerp(grad3(g(AB + 1), xf, yf - 1, zf - 1), grad3(g(BB + 1), xf - 1, yf - 1, zf - 1), u),
        v,
      ),
      w,
    );
  };
}

export interface FbmOptions {
  /** Layers. Default 4. */
  octaves?: number;
  /** Frequency multiplier per octave. Default 2. */
  lacunarity?: number;
  /** Amplitude multiplier per octave. Default 0.5. */
  gain?: number;
}

/** Fractal (layered) noise from a 2D noise function, normalized to roughly [-1, 1]. */
export function fbm2D(noise: Noise2D, x: number, y: number, { octaves = 4, lacunarity = 2, gain = 0.5 }: FbmOptions = {}): number {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return norm ? sum / norm : 0;
}
