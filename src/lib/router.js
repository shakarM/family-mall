// Multi-floor wayfinding. Per-floor grids + connectors (escalators, elevators).
import { buildNavGrid, findPath } from './nav.js';
import { FLOORS, FLOOR_BY_N, UNIT_BY_ID, GATES, ESCALATORS } from '../data/mall.js';

const WALK_M_PER_MIN = 75;
const ride = { escalator: { eq: 22, min: 0.35 }, lift: { eq: 42, min: 0.8 } };

const circle = (c, r, n = 8) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * Math.PI * 2) * r, c[1] + Math.sin((i / n) * Math.PI * 2) * r]);
const rectP = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const CONNECTORS = [
  ...ESCALATORS.map((e) => ({ id: e.id, type: 'escalator', name: e.name, at: { 1: e.node1, 2: e.node2 } })),
  { id: 'lift-w', type: 'lift', name: 'West Elevators', at: { 1: UNIT_BY_ID['lift-w1'].front, 2: UNIT_BY_ID['lift-w2'].front } },
  { id: 'lift-e', type: 'lift', name: 'East Elevators', at: { 1: UNIT_BY_ID['lift-e1'].front, 2: UNIT_BY_ID['lift-e2'].front } },
];

let GRIDS = null;
function grids() {
  if (GRIDS) return GRIDS;
  GRIDS = {};
  for (const f of FLOORS) {
    const obstacles = f.units.filter((u) => u.fac !== 'escalator' || f.n === 1).map((u) => u.poly);
    if (f.pool) obstacles.push(rectP(f.pool.rect));
    for (const p of f.planters) obstacles.push(circle(p, 0.9));
    GRIDS[f.n] = buildNavGrid({ outline: f.outline, voids: f.voids.map((v) => v.poly), obstacles });
  }
  return GRIDS;
}
export const navGrids = grids;

export function placeOf(id) {
  const u = UNIT_BY_ID[id];
  if (u) return { id, floor: u.floor, pos: u.front, name: u.name, unit: u };
  const g = GATES.find((x) => x.id === id);
  if (g) return { id, floor: g.floor, pos: g.node, name: g.name, gate: g };
  return null;
}

function landmarks(floor, points, skipIds, max = 2) {
  const hits = [];
  for (const u of FLOOR_BY_N[floor].units) {
    if (!u.isStore || skipIds.includes(u.id) || u.cat === 'soon') continue;
    let best = Infinity, at = 0;
    for (let i = 0; i < points.length; i++) {
      const d = Math.hypot(points[i][0] - u.door.pos[0], points[i][1] - u.door.pos[1]);
      if (d < best) { best = d; at = i; }
    }
    if (best <= 5.5) hits.push({ u, at, score: (u.anchor ? 2 : 0) + (u.area > 120 ? 1 : 0) - best / 6 });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, max).sort((a, b) => a.at - b.at).map((h) => h.u.name);
}

const sideWord = (n) => (n[1] < 0 ? 'north' : n[1] > 0 ? 'south' : n[0] > 0 ? 'east' : 'west');
const meters = (m) => (m < 15 ? Math.max(5, Math.round(m)) : Math.round(m / 5) * 5);

export function route(fromId, toId, { stepFree = false } = {}) {
  const G = grids();
  const A = placeOf(fromId), B = placeOf(toId);
  if (!A || !B || fromId === toId) return null;

  const options = [];
  if (A.floor === B.floor) {
    const p = findPath(G[A.floor], A.pos, B.pos);
    if (p) options.push({ legs: [{ floor: A.floor, ...p }], conn: null, cost: p.length });
  } else {
    for (const c of CONNECTORS) {
      if (stepFree && c.type === 'escalator') continue;
      const p1 = findPath(G[A.floor], A.pos, c.at[A.floor]);
      const p2 = findPath(G[B.floor], c.at[B.floor], B.pos);
      if (!p1 || !p2) continue;
      options.push({ legs: [{ floor: A.floor, ...p1 }, { floor: B.floor, ...p2 }], conn: c, cost: p1.length + p2.length + ride[c.type].eq });
    }
  }
  if (!options.length) return null;
  options.sort((a, b) => a.cost - b.cost);
  const best = options[0];

  const steps = [{ kind: 'start', floor: A.floor, text: `Start at ${A.name}`, sub: `Level ${A.floor}` }];
  const names = [A.unit?.id, B.unit?.id].filter(Boolean);
  best.legs.forEach((leg, i) => {
    const lastLeg = i === best.legs.length - 1;
    const target = lastLeg ? B.name : best.conn.name;
    const past = landmarks(leg.floor, leg.points, names);
    const m = meters(leg.length);
    if (leg.length > 4) steps.push({ kind: 'walk', floor: leg.floor, meters: m, text: `Walk ${m} m${past.length ? ` past ${past.join(' and ')}` : ''}`, sub: `to ${target}` });
    if (!lastLeg) {
      const up = B.floor > A.floor;
      steps.push({ kind: best.conn.type, floor: leg.floor, text: `Take the ${best.conn.type === 'lift' ? 'elevator' : 'escalator'} ${up ? 'up' : 'down'}`, sub: `to Level ${B.floor}` });
    }
  });
  steps.push({ kind: 'arrive', floor: B.floor, text: `Arrive at ${B.name}`, sub: B.unit ? `Entrance on the ${sideWord(B.unit.door.n)} side · Level ${B.floor}` : `Level ${B.floor}` });

  const walk = best.legs.reduce((s, l) => s + l.length, 0);
  const minutes = Math.max(1, Math.round(walk / WALK_M_PER_MIN + (best.conn ? ride[best.conn.type].min : 0)));
  const links = best.conn ? [{ type: best.conn.type, name: best.conn.name, pos: best.conn.at[A.floor], from: A.floor, to: B.floor, toPos: best.conn.at[B.floor] }] : [];
  return { from: A, to: B, legs: best.legs, links, steps, meters: Math.round(walk), minutes, stepFree, floors: [...new Set([A.floor, B.floor])] };
}

/** Straight-line-ish distance used to rank "nearest" without running A* for everything. */
export function nearest(fromId, predicate, limit = 3) {
  const A = placeOf(fromId);
  if (!A) return [];
  const cand = [];
  for (const u of Object.values(UNIT_BY_ID)) {
    if (!predicate(u) || u.id === fromId) continue;
    const dz = u.floor === A.floor ? 0 : 60;
    cand.push({ u, d: Math.hypot(u.front[0] - A.pos[0], u.front[1] - A.pos[1]) + dz });
  }
  return cand.sort((a, b) => a.d - b.d).slice(0, limit).map((c) => c.u);
}
