// Procedural store interiors, built lazily when a unit is opened. Pure decoration: racks, tables, cases,
// seating... chosen by category and laid out inside the footprint while keeping an aisle from the door.
import * as THREE from 'three';
import { rng, hash, pointInPolygon, distToPolygonEdge } from '../lib/geom.js';
import { toShape } from './props.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const matCache = new Map();
let MONO = false; // set per buildInterior call: the basic map renders everything in greys
const grey = (c) => { const col = new THREE.Color(c); const l = Math.round((0.3 * col.r + 0.59 * col.g + 0.11 * col.b) * 255 * 0.4 + 150); return new THREE.Color(`rgb(${l},${l},${l})`); };
const std = (color, o = {}) => {
  const k = (MONO ? 'm' : '') + color + JSON.stringify(o);
  if (!matCache.has(k)) {
    const opts = { color, roughness: 0.62, metalness: 0.02, ...o };
    if (MONO) { opts.color = grey(color); if (opts.emissive) opts.emissive = grey(opts.emissive); }
    matCache.set(k, new THREE.MeshStandardMaterial(opts));
  }
  return matCache.get(k);
};

export function buildInterior(u, P, catColor, mono = false) {
  MONO = mono;
  const g = new THREE.Group();
  const R = rng(hash(u.id));
  const { x0, y0: z0, x1, y1: z1 } = u.bounds;
  const [dx, dz] = u.door.pos, [nx, nz] = u.door.n, [tx, tz] = u.door.t;
  const inside = (x, z, r) => pointInPolygon(x, z, u.poly) && distToPolygonEdge(x, z, u.poly) > r;
  // keep a clear aisle straight in from the door
  const aisle = (x, z, half = 1.5) => {
    const along = (x - dx) * nx + (z - dz) * nz;
    const across = (x - dx) * tx + (z - dz) * tz;
    return along < 14 && Math.abs(across) < half;
  };
  const depth = Math.abs((x1 - x0) * nx) + Math.abs((z1 - z0) * nz);

  const add = (geo, mat, x, y, z, sx, sy, sz, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry;
    g.add(m); return m;
  };
  const box = (w, h, d, x, z, color, o, ry = 0, y = 0) => add(BOX, std(color, o), x, y + h / 2, z, w, h, d, ry);
  const cyl = (r, h, x, z, color, y = 0) => add(CYL, std(color), x, y + h / 2, z, r, h, r);

  // floor of the shop: warm, slightly different from the concourse
  const cat = u.cat;
  const floorColor = mono ? '#efefef' : { dining: '#d9c3a0', fashion: '#e8e1d6', beauty: '#f3e6e8', tech: '#d8dde3', family: '#f1e3b8', home: '#e5dccb', jewelry: '#ece3d3', services: '#e2e5ea', soon: '#e8e8e8' }[cat] || '#e6e1d8';
  const fg = new THREE.ShapeGeometry(toShape(u.poly)); fg.rotateX(-Math.PI / 2);
  const f = new THREE.Mesh(fg, std(floorColor, { roughness: 0.5 })); f.position.y = 0.04; g.add(f);

  const ry = Math.abs(nx) > 0.5 ? Math.PI / 2 : 0; // fixtures run parallel to the shop front
  const grid = (sx, sz, m, fn, jitter = 0) => {
    for (let x = x0 + m; x <= x1 - m; x += sx) for (let z = z0 + m; z <= z1 - m; z += sz) {
      const px = x + (R() - 0.5) * jitter, pz = z + (R() - 0.5) * jitter;
      if (!inside(px, pz, m * 0.7) || aisle(px, pz)) continue;
      fn(px, pz);
    }
  };
  // back-wall counter / shelving
  const bx = dx - nx * (depth - 1.0), bz = dz - nz * (depth - 1.0);
  const wide = Math.abs(nx) > 0.5 ? z1 - z0 : x1 - x0;
  const backLen = Math.min(wide - 2.4, 14);
  const accent = catColor;
  const pale = ['#f4efe6', '#ffffff', '#e9dfd0'];

  if (u.id === 'cinema') {
    // four auditoriums along the back wall + a snack counter in the lobby
    for (let i = 0; i < 4; i++) {
      const cx = x0 + 6 + i * 9.7, cz = z1 - 4.6;
      box(8.6, 0.12, 8.2, cx, cz, '#2a2d3a');
      for (let r = 0; r < 4; r++) box(7, 0.45 + r * 0.32, 0.9, cx, cz + 2.6 - r * 1.5, '#7b2230', {}, 0, 0);
      box(6.6, 3, 0.15, cx, cz - 3.9, '#101218', { emissive: '#4a6fa8', emissiveIntensity: 0.5 }, 0, 0.4);
    }
    box(10, 1.1, 1.4, 0, z0 + 3.2, '#2b2f3a'); box(10, 0.1, 1.5, 0, z0 + 3.2, accent, {}, 0, 1.1);
    for (let i = -3; i <= 3; i += 2) cyl(0.5, 0.9, i * 3.3, z0 + 6.8, '#d9d3c6');
    return g;
  }

  switch (cat) {
    case 'dining': {
      box(backLen, 1.1, 0.9, bx, bz, '#3a3f4c', {}, ry);
      box(backLen, 0.12, 1.0, bx, bz, accent, {}, ry, 1.1);
      grid(3.4, 3.2, 1.9, (x, z) => {
        cyl(0.5, 0.76, x, z, '#f4efe6');
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; cyl(0.22, 0.46, x + Math.cos(a) * 0.95, z + Math.sin(a) * 0.95, accent); }
      }, 0.3);
      break;
    }
    case 'fashion': {
      box(backLen * 0.5, 1.0, 0.8, bx, bz, '#2b2f3a', {}, ry);
      grid(3.3, 2.6, 1.6, (x, z) => {
        box(2.1, 1.6, 0.35, x, z, '#c9ccd3', { metalness: 0.4 }, ry);
        for (let k = -1; k <= 1; k++) box(0.5, 1.15, 0.22, x + k * 0.62 * Math.cos(ry), z - k * 0.62 * Math.sin(ry), R() > 0.4 ? accent : pale[(R() * 3) | 0], {}, ry, 0.3);
      }, 0.4);
      for (let i = 0; i < 3; i++) { const x = dx - nx * 2.2 + tx * (i - 1) * 2.6, z = dz - nz * 2.2 + tz * (i - 1) * 2.6; cyl(0.3, 1.7, x, z, '#e9e4da'); }
      break;
    }
    case 'beauty': {
      box(backLen, 2.2, 0.15, bx, bz, '#dfe9ef', { metalness: 0.6, roughness: 0.1 }, ry, 0.2);
      grid(3.6, 3.2, 1.8, (x, z) => { box(2.6, 1.05, 1.0, x, z, '#ffffff', {}, ry); box(2.7, 0.08, 1.1, x, z, accent, {}, ry, 1.05); });
      break;
    }
    case 'tech': {
      for (let i = -2; i <= 2; i++) box(2.2, 1.2, 0.12, bx + tx * i * 2.4, bz + tz * i * 2.4, '#0f1218', { emissive: '#3b78c9', emissiveIntensity: 0.55 }, ry, 1.0);
      grid(4.2, 3.0, 1.8, (x, z) => { box(3.4, 0.95, 0.9, x, z, '#f1f3f6', {}, ry); for (let k = -1; k <= 1; k++) box(0.7, 0.45, 0.06, x + k * 1.0 * Math.cos(ry), z - k * 1.0 * Math.sin(ry), '#10131a', { emissive: accent, emissiveIntensity: 0.4 }, ry, 0.95); });
      break;
    }
    case 'family': {
      const colors = [accent, '#f2b134', '#e5588f', '#79b83a', '#ffffff'];
      grid(3.0, 3.0, 1.8, (x, z) => { const s = 0.9 + R() * 0.9; box(s, s, s, x, z, colors[(R() * 5) | 0], {}, R() * 1.5); }, 0.6);
      cyl(2.0, 0.5, x1 - 4, z1 - 4, accent);
      break;
    }
    case 'home': {
      grid(4.2, 2.8, 1.7, (x, z) => {
        if (R() > 0.45) box(3.4, 1.9, 0.5, x, z, '#d9cdb8', {}, ry);
        else { box(2.3, 0.85, 1.0, x, z, '#8f9bb0', {}, ry); box(2.3, 0.7, 0.28, x - nx * 0.4, z - nz * 0.4, '#7b879d', {}, ry, 0.85); }
      }, 0.3);
      break;
    }
    case 'jewelry': {
      box(backLen * 0.7, 1.0, 0.7, bx, bz, '#2b2f3a', {}, ry);
      grid(3.2, 2.4, 1.5, (x, z) => { box(2.0, 0.8, 0.8, x, z, '#2b2f3a', {}, ry); box(2.0, 0.55, 0.8, x, z, '#cfe6f2', { transparent: true, opacity: 0.45, roughness: 0.05 }, ry, 0.8); });
      break;
    }
    case 'services': {
      box(backLen * 0.6, 0.95, 0.9, bx, bz, '#3a3f4c', {}, ry);
      grid(3.4, 3.0, 1.7, (x, z) => { box(1.9, 0.78, 0.9, x, z, '#ffffff', {}, ry); box(0.55, 0.5, 0.55, x + nx * 1.2, z + nz * 1.2, accent, {}); });
      break;
    }
    default: break;
  }
  if (u.anchor) grid(5.5, 4.6, 2.2, (x, z) => { box(3.2, 1.0, 1.4, x, z, '#ffffff', {}, ry); box(3.3, 0.08, 1.5, x, z, accent, {}, ry, 1.0); });
  return g;
}
