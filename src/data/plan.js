// Floor-plan authoring file. Everything is in metres. x runs west -> east, z runs north -> south.
// Layout is inspired by a long two-level resort-style retail podium: a wide central concourse,
// an atrium with a hanging sculpture, anchors at the ends, escalator pairs either side of the
// atrium, and a rooftop garden on the east end of level 2. All tenants are fictional.

// ---- outlines --------------------------------------------------------------------------
export const OUTLINE_1 = [
  [-66, -22], [-10.5, -22], [-10.5, -27], [10.5, -27], [10.5, -22], [66, -22],
  [66, 22], [10.5, 22], [10.5, 27], [-10.5, 27], [-10.5, 22], [-66, 22],
];
export const OUTLINE_2 = [
  [-66, -22], [-26, -22], [-26, -27], [26, -27], [26, -22], [66, -22],
  [66, 22], [26, 22], [26, 27], [-26, 27], [-26, 22], [-66, 22],
];

const ellipse = (cx, cz, rx, rz, n = 56) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [+(cx + Math.cos(a) * rx).toFixed(3), +(cz + Math.sin(a) * rz).toFixed(3)];
  });
const rectPoly = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const octagon = (cx, cz, r) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [+(cx + Math.cos(a) * r).toFixed(3), +(cz + Math.sin(a) * r).toFixed(3)];
  });

// escalator pairs: low end on level 1, landing on level 2
export const ESCALATORS = [
  { id: 'esc-w', rect: [-23, -1.6, -14, 1.6], dir: 1, node1: [-24.6, 0], node2: [-12.4, 0], name: 'West Escalators' },
  { id: 'esc-e', rect: [14, -1.6, 23, 1.6], dir: -1, node1: [24.6, 0], node2: [12.4, 0], name: 'East Escalators' },
];

export const ATRIUM = { cx: 0, cz: 0, rx: 10, rz: 4, plazaRx: 15, plazaRz: 11.5 };

// ---- units -----------------------------------------------------------------------------
// rect = [x0, z0, x1, z1] *before* the 0.5 m inset that opens a 1 m gap between neighbours.
// kind: store | restroom | lift | parking | info | atm | feature
export const UNITS = [
  // ===== LEVEL 1 · north row =====
  { id: 'maison', floor: 1, rect: [-66, -22, -42, -7], door: 'S', h: 5.8, anchor: true },
  { id: 'nordik', floor: 1, rect: [-42, -22, -32, -7], door: 'S' },
  { id: 'wc-w1', floor: 1, kind: 'restroom', rect: [-32, -22, -24, -12], door: 'S', h: 3.6 },
  { id: 'lift-w1', floor: 1, kind: 'lift', rect: [-31.5, -2.2, -27.5, 2.2], door: 'S', h: 4.2, noInset: true },
  { id: 'orbit', floor: 1, rect: [-24, -22, -10.5, -12.5], door: 'S' },
  { id: 'info', floor: 1, kind: 'info', rect: [-3, -20.5, 3, -17.5], door: 'S', h: 1.5, noInset: true },
  { id: 'aroma', floor: 1, rect: [10.5, -22, 24, -12.5], door: 'S' },
  { id: 'wc-e1', floor: 1, kind: 'restroom', rect: [24, -22, 32, -12], door: 'S', h: 3.6 },
  { id: 'bean', floor: 1, rect: [32, -22, 42, -7], door: 'S' },
  { id: 'fresh', floor: 1, rect: [42, -22, 66, -7], door: 'S', h: 5.6, anchor: true },
  // ===== LEVEL 1 · south row =====
  { id: 'atlas', floor: 1, rect: [-66, 7, -50, 22], door: 'N' },
  { id: 'ivy', floor: 1, rect: [-50, 7, -40, 22], door: 'N' },
  { id: 'atelier27', floor: 1, rect: [-40, 7, -30, 22], door: 'N', h: 3.4 },
  { id: 'core1', floor: 1, kind: 'parking', rect: [-30, 7, -22, 22], door: 'N', h: 5.2 },
  { id: 'luna', floor: 1, rect: [-22, 12.5, -10.5, 22], door: 'N' },
  { id: 'olive', floor: 1, rect: [10.5, 12.5, 22, 22], door: 'N' },
  { id: 'ramen', floor: 1, rect: [22, 12.5, 32, 22], door: 'N' },
  { id: 'lift-e1', floor: 1, kind: 'lift', rect: [27.5, -2.2, 31.5, 2.2], door: 'N', h: 4.2, noInset: true },
  { id: 'sneaker', floor: 1, rect: [32, 7, 42, 22], door: 'N' },
  { id: 'glow', floor: 1, rect: [42, 7, 54, 22], door: 'N' },
  { id: 'voltix', floor: 1, rect: [54, 7, 66, 22], door: 'N' },
  // ===== LEVEL 1 · concourse kiosks + small facilities =====
  { id: 'k-sweet', floor: 1, rect: [-56, -1.3, -52, 1.3], door: 'S', h: 2.6, noInset: true },
  { id: 'k-case', floor: 1, rect: [-40, -1.3, -36, 1.3], door: 'S', h: 2.6, noInset: true },
  { id: 'k-gift', floor: 1, rect: [36, -1.3, 40, 1.3], door: 'N', h: 2.6, noInset: true },
  { id: 'k-fix', floor: 1, rect: [52, -1.3, 56, 1.3], door: 'N', h: 2.6, noInset: true },
  { id: 'atm-w1', floor: 1, kind: 'atm', rect: [-60.8, 3.9, -59.2, 5.5], door: 'N', h: 2.1, noInset: true },
  { id: 'atm-e1', floor: 1, kind: 'atm', rect: [59.2, -5.5, 60.8, -3.9], door: 'S', h: 2.1, noInset: true },
  { id: 'halo', floor: 1, kind: 'feature', poly: ellipse(0, 0, 2.6, 2.6, 24), door: 'S', h: 0.7 },

  // ===== LEVEL 2 · north =====
  { id: 'casa', floor: 2, rect: [-66, -22, -42, -7], door: 'S', h: 5.8, anchor: true },
  { id: 'gilded', floor: 2, rect: [-42, -22, -32, -7], door: 'S' },
  { id: 'wc-w2', floor: 2, kind: 'restroom', rect: [-32, -22, -24, -12], door: 'S', h: 3.6 },
  { id: 'lift-w2', floor: 2, kind: 'lift', rect: [-31.5, -2.2, -27.5, 2.2], door: 'S', h: 4.2, noInset: true },
  { id: 'bao', floor: 2, rect: [-24, -27, -12, -19], door: 'S', h: 3.8 },
  { id: 'pita', floor: 2, rect: [-12, -27, 0, -19], door: 'S', h: 3.8 },
  { id: 'noodle', floor: 2, rect: [0, -27, 12, -19], door: 'S', h: 3.8 },
  { id: 'smoke', floor: 2, rect: [12, -27, 24, -19], door: 'S', h: 3.8 },
  { id: 'wc-e2', floor: 2, kind: 'restroom', rect: [24, -22, 32, -12], door: 'S', h: 3.6 },
  { id: 'skyb', floor: 2, rect: [32, -22, 42, -7], door: 'S' },
  { id: 'terrace', floor: 2, poly: octagon(56, -12.5, 5), doorAt: { pos: [51.2, -12.5], n: [-1, 0] }, h: 3.4 },
  // ===== LEVEL 2 · south =====
  { id: 'play', floor: 2, rect: [-66, 7, -50, 22], door: 'N' },
  { id: 'noir', floor: 2, rect: [-50, 7, -40, 22], door: 'N', h: 3.4 },
  { id: 'silk', floor: 2, rect: [-40, 7, -30, 22], door: 'N' },
  { id: 'core2', floor: 2, kind: 'parking', rect: [-30, 7, -22, 22], door: 'N', h: 5.2 },
  { id: 'cinema', floor: 2, rect: [-22, 8.5, 22, 27], door: 'N', h: 7.4, anchor: true },
  { id: 'lift-e2', floor: 2, kind: 'lift', rect: [27.5, -2.2, 31.5, 2.2], door: 'N', h: 4.2, noInset: true },
  { id: 'spa', floor: 2, rect: [22, 12.5, 34, 22], door: 'N' },
  { id: 'tempo', floor: 2, rect: [34, 7, 44, 22], door: 'N' },
  // ===== LEVEL 2 · kiosks + small facilities =====
  { id: 'k-boba', floor: 2, rect: [-40, -1.3, -36, 1.3], door: 'S', h: 2.6, noInset: true },
  { id: 'k-tech', floor: 2, rect: [36, -1.3, 40, 1.3], door: 'N', h: 2.6, noInset: true },
  { id: 'atm-w2', floor: 2, kind: 'atm', rect: [-60.8, 3.9, -59.2, 5.5], door: 'N', h: 2.1, noInset: true },
];

// ---- level-specific extras -------------------------------------------------------------
export const FLOOR_EXTRAS = {
  1: {
    voids: [],
    // opaque curtain-wall segments dividing inside from outside (none: the outline is the wall)
    gates: [
      { id: 'ent-w', name: 'West Gate', pos: [-66, 0], n: [-1, 0], width: 9, node: [-62.5, 0] },
      { id: 'ent-e', name: 'East Gate', pos: [66, 0], n: [1, 0], width: 9, node: [62.5, 0] },
      { id: 'ent-n', name: 'Main Entrance', pos: [0, -27], n: [0, -1], width: 9, node: [0, -23.6] },
      { id: 'ent-s', name: 'Parking Entrance', pos: [0, 27], n: [0, 1], width: 9, node: [0, 23.6] },
    ],
    planters: [
      [-13, -8.5], [13, -8.5], [-13, 8.5], [13, 8.5], [-5, -12.5], [5, -12.5], [-5, 12.5], [5, 12.5],
    ],
    trees: [],
    atriumPlaza: true,
  },
  2: {
    voids: [
      { id: 'atrium', poly: ellipse(ATRIUM.cx, ATRIUM.cz, ATRIUM.rx, ATRIUM.rz, 64) },
      ...ESCALATORS.map((e) => ({ id: `slot-${e.id}`, poly: rectPoly(e.rect), esc: e })),
    ],
    gates: [],
    // east end: rooftop garden behind a glass facade at x = 44
    facade: [[44, -22, 44, -4.5], [44, 4.5, 44, 22]],
    garden: { rect: [44.2, -22, 66, 22] },
    pool: { rect: [51, 3.5, 63, 12.5], r: 1.6 },
    trees: [
      [47, -19], [47, -6], [49.5, 16.5], [47, 18.5], [64, -20], [64.5, -8], [60, 18.5], [64, 15], [54, -19.5],
      [48, -1.5], [64, 1.5],
    ],
    planters: [[-13, -9.2], [13, -9.2], [-20, -16], [20, -16]],
    // food-hall seating field (north hall)
    seating: { rect: [-23, -16.5, 23, -9.5] },
    loungers: [[53, 16.5], [56.5, 16.5], [60, 16.5], [53, -1.5], [60, -1.5]],
  },
};
