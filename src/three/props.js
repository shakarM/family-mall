// Geometry helpers shared by the engine and the interior builder.
import * as THREE from 'three';

/** plan (x, z) -> three.js Shape (x, -z). After rotateX(-PI/2) the shape lies flat with y = -z. */
export const toShape = (poly) => new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
export const toPath = (poly) => new THREE.Path(poly.map(([x, z]) => new THREE.Vector2(x, -z)));

/**
 * Bevelled prism standing on y = 0 with a darkened base (fake ambient occlusion through vertex colours).
 * groups: 0 = caps (roof), 1 = sides
 */
export function extrudePrism(poly, height, bevel = 0.1, aoHeight = 1.8, aoMin = 0.58) {
  const b = Math.min(bevel, height / 3);
  const geo = new THREE.ExtrudeGeometry(toShape(poly), {
    depth: Math.max(0.01, height - 2 * b), bevelEnabled: b > 0.001, bevelThickness: b, bevelSize: b, bevelOffset: -b,
    bevelSegments: 2, curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, b, 0);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, pos.getY(i) / aoHeight);
    const v = aoMin + (1 - aoMin) * (t * t * (3 - 2 * t));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** Flat slab with optional holes. Top surface at y = 0, thickness extends downward. UVs are shape-space x / y. */
export function slabGeometry(outline, holes, thickness) {
  const shape = toShape(outline);
  for (const h of holes) shape.holes.push(toPath(h));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness, 0);
  return geo;
}

/** Vertical double-sided strip along a 2D polyline (glass balustrades). u = metres along the line / tile. */
export function ribbonVertical(points, y0, y1, tile = 2.4, closed = false) {
  const pts = closed ? [...points, points[0]] : points;
  const pos = [], uv = [], idx = [];
  let len = 0;
  pts.forEach(([x, z], i) => {
    if (i) len += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    pos.push(x, y0, z, x, y1, z);
    uv.push(len / tile, 0, len / tile, 1);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flat ribbon on the floor following a polyline (route line). v = metres along / period. */
export function ribbonFlat(points, width, period = 2.2) {
  const n = points.length;
  const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz * width / 2, nz = dx * width / 2;
    if (i) len += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
    pos.set([p[0] + nx, 0, p[1] + nz, p[0] - nx, 0, p[1] - nz], i * 6);
    uv.set([0, len / period, 1, len / period], i * 4);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.userData.length = len;
  return g;
}

export function pointAlong(points, d) {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (acc + seg >= d) { const t = (d - acc) / (seg || 1); return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t]; }
    acc += seg;
  }
  return points[points.length - 1];
}
