// Derives everything the engine, router and UI need from the authoring files.
import { UNITS, OUTLINE_1, OUTLINE_2, FLOOR_EXTRAS, ESCALATORS, ATRIUM } from './plan.js';
import { META } from './stores.js';
import { polygonArea, polygonBounds, polygonCentroid } from '../lib/geom.js';

export const MALL_NAME = 'Lumen Square';
export const INSET = 0.5;

export const CATEGORIES = [
  { id: 'fashion', label: 'Fashion', color: '#f28a2e' },
  { id: 'dining', label: 'Dining & Cafés', color: '#7b4fc4' },
  { id: 'beauty', label: 'Beauty & Wellness', color: '#e5588f' },
  { id: 'tech', label: 'Tech', color: '#12a0a8' },
  { id: 'family', label: 'Family & Fun', color: '#3b8de6' },
  { id: 'home', label: 'Home & Living', color: '#79b83a' },
  { id: 'jewelry', label: 'Jewelry & Gifts', color: '#e3ac00' },
  { id: 'services', label: 'Services', color: '#c0394d' },
  { id: 'soon', label: 'Opening soon', color: '#f07fb0' },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const FACILITY_TYPES = {
  restroom: { label: 'Restrooms', icon: 'restroom', color: '#8cc4e8' },
  lift: { label: 'Elevators', icon: 'lift', color: '#3a4152' },
  escalator: { label: 'Escalators', icon: 'escalator', color: '#3a4152' },
  parking: { label: 'Parking', icon: 'parking', color: '#3a4152' },
  info: { label: 'Information', icon: 'info', color: '#3a4152' },
  atm: { label: 'ATM', icon: 'atm', color: '#3a4152' },
  feature: { label: 'Landmark', icon: 'feature', color: '#3a4152' },
};
// the facility filters offered in the UI (escalators are listed so people can find them)
export const FACILITY_FILTERS = ['restroom', 'lift', 'escalator', 'parking', 'info', 'atm'];

const DEFAULT_H = { store: 4.6, restroom: 3.6, lift: 4.2, parking: 5.2, info: 1.5, atm: 2.1, feature: 0.7 };

const rectPoly = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

function makeDoor(u, poly, bounds) {
  const b = bounds;
  const cx = (b.x0 + b.x1) / 2, cz = (b.y0 + b.y1) / 2;
  if (u.doorAt) {
    const [nx, nz] = u.doorAt.n;
    return { pos: u.doorAt.pos, n: [nx, nz], t: [-nz, nx], width: 2.8, glass: 6 };
  }
  const side = u.door || 'S';
  const w = side === 'N' || side === 'S' ? b.w : b.h;
  const wide = w > 20;
  const doorW = wide ? 5 : u.kind && u.kind !== 'store' ? 1.6 : 2.8;
  const glass = Math.max(1.4, Math.min(w - 1.4, wide ? 14 : 10));
  if (side === 'N') return { pos: [cx, b.y0], n: [0, -1], t: [1, 0], width: doorW, glass };
  if (side === 'S') return { pos: [cx, b.y1], n: [0, 1], t: [1, 0], width: doorW, glass };
  if (side === 'E') return { pos: [b.x1, cz], n: [1, 0], t: [0, 1], width: doorW, glass };
  return { pos: [b.x0, cz], n: [-1, 0], t: [0, 1], width: doorW, glass };
}

const units = UNITS.map((u) => {
  const meta = META[u.id] || {};
  const kind = u.kind || 'store';
  let poly;
  if (u.poly) poly = u.poly;
  else {
    const [x0, z0, x1, z1] = u.rect;
    const i = u.noInset ? 0 : INSET;
    poly = rectPoly([x0 + i, z0 + i, x1 - i, z1 - i]);
  }
  const bounds = polygonBounds(poly);
  const door = makeDoor(u, poly, bounds);
  const center = u.poly ? polygonCentroid(poly) : [(bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2];
  const front = [door.pos[0] + door.n[0] * 2.2, door.pos[1] + door.n[1] * 2.2];
  const isStore = kind === 'store';
  return {
    id: u.id,
    floor: u.floor,
    kind,
    isStore,
    anchor: !!u.anchor,
    name: meta.name || u.id,
    cat: isStore ? meta.cat : null,
    fac: !isStore ? meta.fac || kind : null,
    line: meta.line || '',
    tags: meta.tags || [],
    kw: meta.kw || [],
    hours: meta.hours,
    soon: meta.soon,
    deal: meta.deal,
    h: u.h || (u.anchor ? 5.6 : DEFAULT_H[kind]),
    poly, bounds, center, door, front,
    area: Math.round(polygonArea(poly)),
    label: u.labelAt || center,
    box: !!u.rect,
  };
});

const withEscalators = ESCALATORS.flatMap((e) =>
  [1, 2].map((floor) => {
    const poly = rectPoly(e.rect);
    const bounds = polygonBounds(poly);
    const center = [(bounds.x0 + bounds.x1) / 2, 0];
    const lowX = floor === 1 ? e.node1 : e.node2;
    return {
      id: `${e.id}-${floor}`, floor, kind: 'escalator', isStore: false, anchor: false,
      name: e.name, cat: null, fac: 'escalator', line: 'Moving stairs between levels 1 and 2',
      tags: [], kw: ['escalator', 'stairs', 'level', 'floor', 'upstairs', 'downstairs', 'go up', 'go down'], hours: undefined,
      h: 0.1, poly, bounds, center, box: true, area: Math.round(polygonArea(poly)),
      door: { pos: lowX, n: [0, 1], t: [1, 0], width: 3, glass: 0 },
      front: lowX, label: center, esc: e,
    };
  }),
);

export const ALL_UNITS = [...units, ...withEscalators];
export const UNIT_BY_ID = Object.fromEntries(ALL_UNITS.map((u) => [u.id, u]));

const floorDefs = { 1: OUTLINE_1, 2: OUTLINE_2 };
export const FLOORS = [1, 2].map((n) => {
  const ex = FLOOR_EXTRAS[n];
  const outline = floorDefs[n];
  const b = polygonBounds(outline);
  return {
    n, key: `L${n}`, label: `Level ${n}`, short: `L${n}`, name: n === 1 ? 'Ground floor' : 'Upper floor',
    outline, bounds: b, voids: ex.voids, gates: ex.gates || [], facade: ex.facade || [], garden: ex.garden, pool: ex.pool,
    trees: ex.trees || [], planters: ex.planters || [], seating: ex.seating, loungers: ex.loungers || [],
    atriumPlaza: !!ex.atriumPlaza,
    units: ALL_UNITS.filter((u) => u.floor === n),
  };
});
export const FLOOR_BY_N = { 1: FLOORS[0], 2: FLOORS[1] };

export const GATES = FLOORS.flatMap((f) => f.gates.map((g) => ({ ...g, floor: f.n })));
export const STORES = ALL_UNITS.filter((u) => u.isStore);
export const FACILITIES = ALL_UNITS.filter((u) => !u.isStore);
export const TOTAL_BOUNDS = { x0: -66, x1: 66, z0: -27, z1: 27 };
export { ATRIUM, ESCALATORS };

export function countsByCategory(units = STORES) {
  const m = {};
  for (const u of units) if (u.cat) m[u.cat] = (m[u.cat] || 0) + 1;
  return m;
}
