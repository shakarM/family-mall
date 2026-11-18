import { ALL_UNITS, FLOORS, STORES, GATES } from '../src/data/mall.js';
import { route, navGrids } from '../src/lib/router.js';
import { search } from '../src/lib/search.js';
import fs from 'fs';
// 1) dump geometry for shapely validation
fs.writeFileSync(process.argv[2] || '/tmp/plan.json', JSON.stringify({
  floors: FLOORS.map((f) => ({ n: f.n, outline: f.outline, voids: f.voids.map((v) => v.poly), units: f.units.map((u) => ({ id: u.id, kind: u.kind, poly: u.poly, door: u.door.pos, front: u.front })) })),
}));
// 2) reachability: every store/facility front cell must be walkable and routable from every gate
const G = navGrids();
let bad = 0;
for (const u of ALL_UNITS) {
  const g = G[u.floor];
  const [c, r] = g.cellOf(u.front[0], u.front[1]);
  if (!g.isWalkable(c, r)) { console.log('front not walkable:', u.id, u.front); bad++; }
}
let routes = 0, fail = 0, longest = { m: 0 };
for (const gate of GATES) for (const u of ALL_UNITS) {
  if (u.fac === 'escalator' && u.floor === 2) continue;
  const r = route(gate.id, u.id);
  routes++;
  if (!r) { console.log('NO ROUTE', gate.id, '->', u.id); fail++; continue; }
  if (r.meters > longest.m) longest = { m: r.meters, from: gate.id, to: u.id, min: r.minutes };
}
console.log({ units: ALL_UNITS.length, stores: STORES.length, bad, routes, fail, longest });
const r = route('ent-n', 'cinema');
console.log(r.steps.map((s) => `${s.kind}: ${s.text} — ${s.sub}`).join('\n'), r.meters, 'm', r.minutes, 'min');
const r2 = route('ent-w', 'casa', { stepFree: true });
console.log(r2.steps.map((s) => `${s.kind}: ${s.text} — ${s.sub}`).join('\n'), r2.meters, 'm', r2.minutes, 'min');
for (const q of ['coffee', 'shoes', 'toilet', 'kids', 'cinemaa', 'open now', 'level 2 food', 'nike', 'sale', 'atm', 'perfum']) {
  const s = search(q);
  console.log(q.padEnd(14), s.stores.slice(0, 4).map((x) => `${x.unit.name}(${x.why || '-'})`).join(', '), '|', s.facilities.map((x) => x.unit.id).join(','), '|', s.categories.map((c) => c.cat.id).join(','), s.floors);
}
