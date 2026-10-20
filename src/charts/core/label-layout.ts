// Label placement without the DOM: a 1D dodge for direct labels at line ends and a greedy 2D
// placer for annotations. Sizes come from estimateTextWidth, so server and client agree.

export interface DodgeLabel {
  /** Desired center position along the axis (e.g. the line's last y). */
  position: number;
  /** Extent along the axis (e.g. the label's height). */
  size: number;
}

/**
 * Moves labels the least total distance so none overlap (with `gap` between them) and all fit in
 * [min, max]. Returns adjusted centers in input order. Clusters of colliding labels are centered
 * on the mean of their wishes, then clamped to the bounds; repeated until stable.
 */
export function dodgeLabels(labels: readonly DodgeLabel[], min: number, max: number, gap = 2): number[] {
  const order = labels.map((_, i) => i).sort((a, b) => (labels[a] as DodgeLabel).position - (labels[b] as DodgeLabel).position || a - b);
  interface Cluster {
    members: number[];
    /** Total extent including gaps. */
    size: number;
    /** Sum of member wishes measured from the cluster top. */
    wish: number;
    top: number;
  }
  const clusters: Cluster[] = [];
  const clamp = (c: Cluster) => {
    c.top = Math.max(min, Math.min(max - c.size, c.top));
    if (c.size > max - min) c.top = min; // cannot fit: pin to the start
  };
  for (const i of order) {
    const l = labels[i] as DodgeLabel;
    const c: Cluster = { members: [i], size: l.size, wish: l.position - l.size / 2, top: l.position - l.size / 2 };
    clamp(c);
    clusters.push(c);
    // Merge backwards while the new cluster overlaps its predecessor.
    for (;;) {
      const cur = clusters[clusters.length - 1] as Cluster;
      const prev = clusters[clusters.length - 2];
      if (!prev || prev.top + prev.size + gap <= cur.top) break;
      clusters.pop();
      clusters.pop();
      // Offsets of the new members from the merged top, so its wish is the mean desired top.
      const offset = prev.size + gap;
      const merged: Cluster = {
        members: [...prev.members, ...cur.members],
        size: prev.size + gap + cur.size,
        wish: prev.wish + cur.wish - offset * cur.members.length,
        top: 0,
      };
      merged.top = merged.wish / merged.members.length;
      clamp(merged);
      clusters.push(merged);
    }
  }
  const out = new Array<number>(labels.length);
  for (const c of clusters) {
    let y = c.top;
    for (const i of c.members) {
      const size = (labels[i] as DodgeLabel).size;
      out[i] = y + size / 2;
      y += size + gap;
    }
  }
  return out;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementLabel {
  /** Point the label describes. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Higher places first (e.g. max/min insights before streak labels). Default 0. */
  priority?: number;
}

export interface Placement {
  /** Top-left of the placed box, or null when it could not be placed without overlap. */
  box: Box | null;
  /** Which candidate won: "top", "bottom", "right", "left", "top-right", ... */
  position: string | null;
}

const CANDIDATES: ReadonlyArray<readonly [string, number, number]> = [
  // [name, dx in label widths, dy in label heights] relative to centering on the point
  ["top", 0, -1],
  ["bottom", 0, 1],
  ["right", 1, 0],
  ["left", -1, 0],
  ["top-right", 1, -1],
  ["top-left", -1, -1],
  ["bottom-right", 1, 1],
  ["bottom-left", -1, 1],
];

const overlaps = (a: Box, b: Box, pad: number) =>
  a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad;

/**
 * Greedy placement: labels in priority order try 8 positions around their point and take the first
 * that stays inside `bounds` and clears placed labels and `obstacles`. Unplaceable labels get null
 * (hide them, or show them on hover).
 */
export function placeLabels(labels: readonly PlacementLabel[], bounds: Box, options: { obstacles?: readonly Box[]; offset?: number; padding?: number } = {}): Placement[] {
  const offset = options.offset ?? 6;
  const pad = options.padding ?? 2;
  const placed: Box[] = [...(options.obstacles ?? [])];
  const out: Placement[] = labels.map(() => ({ box: null, position: null }));
  const order = labels.map((_, i) => i).sort((a, b) => ((labels[b] as PlacementLabel).priority ?? 0) - ((labels[a] as PlacementLabel).priority ?? 0) || a - b);
  for (const i of order) {
    const l = labels[i] as PlacementLabel;
    for (const [name, fx, fy] of CANDIDATES) {
      const box: Box = {
        x: l.x - l.width / 2 + fx * (l.width / 2 + offset),
        y: l.y - l.height / 2 + fy * (l.height / 2 + offset),
        width: l.width,
        height: l.height,
      };
      const inside = box.x >= bounds.x && box.y >= bounds.y && box.x + box.width <= bounds.x + bounds.width && box.y + box.height <= bounds.y + bounds.height;
      if (!inside || placed.some((p) => overlaps(box, p, pad))) continue;
      placed.push(box);
      out[i] = { box, position: name };
      break;
    }
  }
  return out;
}
