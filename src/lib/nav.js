// Walking-route solver. Each floor is rasterised to a grid; blocked cells are units, voids and
// anything outside the outer wall. A* runs on the grid, then the path is straightened
// (line-of-sight string pulling) and smoothed (Chaikin) for drawing.
import { pointInPolygon, polygonBounds, distToPolygonEdge } from './geom.js';

const SQRT2 = Math.SQRT2;

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item, pri) {
    const a = this.a; a.push([pri, item]);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top[1];
  }
}

export function buildNavGrid({ outline, voids = [], obstacles = [], cell = 1.5, wallMargin = 1.0, obsMargin = 0.7 }) {
  const wb = polygonBounds(outline);
  const ox = wb.x0, oy = wb.y0;
  const cols = Math.ceil(wb.w / cell) + 1, rows = Math.ceil(wb.h / cell) + 1;
  const blockers = [...voids, ...obstacles];
  const bb = blockers.map(polygonBounds);
  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + (c + 0.5) * cell, y = oy + (r + 0.5) * cell;
    if (!pointInPolygon(x, y, outline) || distToPolygonEdge(x, y, outline) < wallMargin) continue;
    let blocked = false;
    for (let i = 0; i < blockers.length && !blocked; i++) {
      const b = bb[i];
      if (x < b.x0 - obsMargin || x > b.x1 + obsMargin || y < b.y0 - obsMargin || y > b.y1 + obsMargin) continue;
      if (pointInPolygon(x, y, blockers[i]) || distToPolygonEdge(x, y, blockers[i]) < obsMargin) blocked = true;
    }
    if (!blocked) walkable[r * cols + c] = 1;
  }
  const INF = 1e9;
  const clear = new Float32Array(cols * rows).fill(INF);
  for (let i = 0; i < clear.length; i++) if (!walkable[i]) clear[i] = 0;
  const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? 0 : clear[r * cols + c]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    clear[i] = Math.min(clear[i], at(c - 1, r) + 1, at(c, r - 1) + 1, at(c - 1, r - 1) + SQRT2, at(c + 1, r - 1) + SQRT2);
  }
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
    const i = r * cols + c;
    clear[i] = Math.min(clear[i], at(c + 1, r) + 1, at(c, r + 1) + 1, at(c + 1, r + 1) + SQRT2, at(c - 1, r + 1) + SQRT2);
  }
  const grid = { cols, rows, ox, oy, cell, walkable, clear };
  grid.cellOf = (x, y) => [Math.floor((x - ox) / cell), Math.floor((y - oy) / cell)];
  grid.centerOf = (c, r) => [ox + (c + 0.5) * cell, oy + (r + 0.5) * cell];
  grid.isWalkable = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && walkable[r * cols + c] === 1;
  return grid;
}

export function nearestWalkable(grid, x, y, maxRing = 14) {
  const [c0, r0] = grid.cellOf(x, y);
  let best = null, bd = Infinity;
  for (let rad = 0; rad < maxRing && !best; rad++) {
    for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
      if (!grid.isWalkable(c, r)) continue;
      const [cx, cy] = grid.centerOf(c, r);
      const d = Math.hypot(cx - x, cy - y);
      if (d < bd) { bd = d; best = [c, r]; }
    }
  }
  return best;
}

function lineOfSight(grid, p, q) {
  const [x0, y0] = p, [x1, y1] = q;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(len / (grid.cell * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [c, r] = grid.cellOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    if (!grid.isWalkable(c, r) || grid.clear[r * grid.cols + c] < 1.2) return false;
  }
  return true;
}

function chaikin(points, rounds = 2) {
  let pts = points;
  for (let k = 0; k < rounds; k++) {
    if (pts.length < 3) return pts;
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/** Shortest walk between two plan points. Returns { points, length } or null. */
export function findPath(grid, from, to) {
  const start = nearestWalkable(grid, from[0], from[1]);
  const goalC = nearestWalkable(grid, to[0], to[1]);
  if (!start || !goalC) return null;
  const { cols, rows } = grid;
  const s = start[1] * cols + start[0], goal = goalC[1] * cols + goalC[0];
  const g = new Float32Array(cols * rows).fill(Infinity);
  const prev = new Int32Array(cols * rows).fill(-1);
  const heap = new MinHeap();
  g[s] = 0; heap.push(s, 0);
  const [gx, gy] = grid.centerOf(goalC[0], goalC[1]);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]];
  let found = false;
  while (heap.size) {
    const cur = heap.pop();
    if (cur === goal) { found = true; break; }
    const cc = cur % cols, cr = (cur / cols) | 0;
    for (const [dc, dr, w] of dirs) {
      const nc = cc + dc, nr = cr + dr;
      if (!grid.isWalkable(nc, nr)) continue;
      if (dc && dr && !(grid.isWalkable(cc + dc, cr) && grid.isWalkable(cc, cr + dr))) continue;
      const ni = nr * cols + nc;
      const cost = w * (1 + 1.6 / (1 + grid.clear[ni] * grid.clear[ni] * 0.5));
      const gg = g[cur] + cost;
      if (gg < g[ni]) {
        g[ni] = gg; prev[ni] = cur;
        const [px, py] = grid.centerOf(nc, nr);
        heap.push(ni, gg + (Math.hypot(px - gx, py - gy) / grid.cell) * 1.0);
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let i = goal; i !== -1; i = prev[i]) cells.push(grid.centerOf(i % cols, (i / cols) | 0));
  cells.reverse();
  cells[0] = [from[0], from[1]];
  cells.push([to[0], to[1]]);
  const pulled = [cells[0]];
  let anchor = 0;
  for (let i = 2; i < cells.length; i++) {
    if (!lineOfSight(grid, cells[anchor], cells[i])) { pulled.push(cells[i - 1]); anchor = i - 1; }
  }
  pulled.push(cells[cells.length - 1]);
  const smoothPts = chaikin(pulled, 3);
  let length = 0;
  for (let i = 1; i < smoothPts.length; i++) length += Math.hypot(smoothPts[i][0] - smoothPts[i - 1][0], smoothPts[i][1] - smoothPts[i - 1][1]);
  return { points: smoothPts, length };
}
