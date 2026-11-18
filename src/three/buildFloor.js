// Builds one level of the mall as a three.js group: slab, walls, units, glass shopfronts, atrium, escalators, garden.
import * as THREE from 'three';
import { CAT, FACILITY_TYPES, ATRIUM } from '../data/mall.js';
import { pointInPolygon, rng, hash } from '../lib/geom.js';
import { extrudePrism, slabGeometry, ribbonVertical } from './props.js';
import { makeFloorTexture, makeGlassTexture, makeHatchTexture, makeDoorGlowTexture, makeGlowTexture, makeBeltTexture } from './textures.js';

export const GAP = 40;
export const SLAB = 1.2;
export const WALL_H = 3.4;
const ESC_RISE = 4.2;

const BOX = new THREE.BoxGeometry(1, 1, 1);

export function buildFloor(env, f) {
  const { P, theme } = env;
  const R = {
    f, n: f.n, group: new THREE.Group(), mats: [], units: new Map(), pick: [], belts: [], pulses: [], twinkle: [], dispose: [],
    beads: null,
  };
  const reg = (m) => { const rec = { m, base: m.opacity, baseT: m.transparent, baseDW: m.depthWrite }; R.mats.push(rec); m.userData.rec = rec; return m; };
  const own = (x) => { R.dispose.push(x); return x; };
  const std = (o) => reg(new THREE.MeshStandardMaterial(o));
  const basic = (o) => reg(new THREE.MeshBasicMaterial(o));
  const add = (obj, parent = R.group) => { parent.add(obj); return obj; };
  const boxMesh = (mat, w, h, d, x, y, z, ry = 0, parent = R.group) => {
    const m = new THREE.Mesh(BOX, mat); m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.y = ry; parent.add(m); return m;
  };

  // ---- shared per-floor materials
  const glassTex = env.glassTex;
  const glassMat = reg(new THREE.MeshStandardMaterial({
    map: glassTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.06, metalness: 0.1, envMapIntensity: 1.6,
  }));
  const wallMat = std({ color: P.wall, roughness: 0.55, metalness: 0.1 });
  const capMat = std({ color: P.wallCap, roughness: 0.4 });
  const fasciaMat = std({ color: P.fascia, roughness: 0.4, metalness: 0.35 });
  const goldMat = std({ color: env.mono ? '#9a9a9a' : '#e0bd76', roughness: 0.25, metalness: 0.9 });
  const doorGlowTex = env.doorGlowTex;

  // ---- slab with baked floor texture
  const floorTex = own(makeFloorTexture(f, theme, env.aniso));
  const slab = new THREE.Mesh(
    slabGeometry(f.outline, f.voids.map((v) => v.poly), SLAB),
    [std({ map: floorTex, roughness: 0.36, metalness: 0.0, envMapIntensity: 0.95 }), std({ color: P.slabSide, roughness: 0.85 })],
  );
  add(slab); R.dispose.push(slab.geometry);

  // ---- perimeter walls (cut at gates; glass balustrade on the roof garden)
  const edges = [];
  f.outline.forEach((a, i) => {
    const b = f.outline[(i + 1) % f.outline.length];
    let pieces = [[a, b]];
    if (f.n === 2 && a[1] === b[1] && Math.min(a[0], b[0]) < 44 && Math.max(a[0], b[0]) > 44) {
      const m = [44, a[1]];
      pieces = a[0] < b[0] ? [[a, m], [m, b]] : [[a, m], [m, b]];
    }
    for (const [p, q] of pieces) {
      const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
      const dir = [dx / L, dz / L];
      const cuts = [];
      for (const g of f.gates) {
        const onEdge = Math.abs((g.pos[0] - p[0]) * dir[1] - (g.pos[1] - p[1]) * dir[0]) < 0.01;
        const t = (g.pos[0] - p[0]) * dir[0] + (g.pos[1] - p[1]) * dir[1];
        if (onEdge && t > 0 && t < L) cuts.push([t - g.width / 2, t + g.width / 2]);
      }
      cuts.sort((x, y) => x[0] - y[0]);
      let cur = 0;
      const segs = [];
      for (const [c0, c1] of cuts) { if (c0 > cur) segs.push([cur, c0]); cur = c1; }
      if (cur < L) segs.push([cur, L]);
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const rail = f.n === 2 && mid[0] > 44;
      for (const [s0, s1] of segs) edges.push({ p: [p[0] + dir[0] * s0, p[1] + dir[1] * s0], q: [p[0] + dir[0] * s1, p[1] + dir[1] * s1], dir, rail });
    }
  });
  for (const e of edges) {
    const L = Math.hypot(e.q[0] - e.p[0], e.q[1] - e.p[1]);
    if (L < 0.2) continue;
    const mid = [(e.p[0] + e.q[0]) / 2, (e.p[1] + e.q[1]) / 2];
    let nrm = [-e.dir[1], e.dir[0]];
    if (!pointInPolygon(mid[0] + nrm[0] * 0.3, mid[1] + nrm[1] * 0.3, f.outline)) nrm = [-nrm[0], -nrm[1]];
    const ang = Math.atan2(e.dir[0], e.dir[1]) - Math.PI / 2; // box local x runs along the edge
    const cx = mid[0] + nrm[0] * 0.35, cz = mid[1] + nrm[1] * 0.35;
    const yaw = -Math.atan2(e.dir[1], e.dir[0]);
    if (!e.rail) {
      boxMesh(wallMat, L + 0.7, 1.0, 0.7, cx, 0.5, cz, yaw);
      boxMesh(capMat, L + 0.7, 0.14, 0.8, cx, WALL_H + 0.07, cz, yaw);
      const g = ribbonVertical([e.p, e.q], 1.0, WALL_H, 2.4);
      const uvs = g.attributes.uv; // shift line to the wall centre
      g.translate(nrm[0] * 0.35, 0, nrm[1] * 0.35); own(g);
      add(new THREE.Mesh(g, glassMat));
      void uvs;
    } else {
      const g = ribbonVertical([e.p, e.q], 0.05, 1.25, 2.4); g.translate(nrm[0] * 0.2, 0, nrm[1] * 0.2); own(g);
      add(new THREE.Mesh(g, glassMat));
      boxMesh(goldMat, L, 0.08, 0.1, cx - nrm[0] * 0.15, 1.28, cz - nrm[1] * 0.15, yaw);
    }
    void ang;
  }
  // east-end glass facade on level 2 (between the mall and the roof garden)
  for (const [x0, z0, x1, z1] of f.facade) {
    const g = ribbonVertical([[x0, z0], [x1, z1]], 0, WALL_H, 2.4); own(g);
    add(new THREE.Mesh(g, glassMat));
    boxMesh(capMat, 0.25, 0.14, Math.abs(z1 - z0), x0, WALL_H + 0.07, (z0 + z1) / 2);
  }
  if (f.facade.length) for (const z of [-4.5, 4.5]) boxMesh(fasciaMat, 0.35, WALL_H, 0.35, 44, WALL_H / 2, z);
  if (f.facade.length) boxMesh(fasciaMat, 0.35, 0.5, 9.35, 44, WALL_H - 0.25, 0);

  // ---- entrances: posts, lintel, canopy and a lit threshold
  const warm = new THREE.Color(P.glow);
  for (const g of f.gates) {
    const ang = Math.atan2(g.n[0], g.n[1]);
    const side = [g.n[1], -g.n[0]]; // along the wall
    const grp = new THREE.Group(); grp.position.set(g.pos[0], 0, g.pos[1]); grp.rotation.y = ang; R.group.add(grp);
    // local +z = outward
    for (const s of [-1, 1]) boxMesh(fasciaMat, 0.4, WALL_H, 0.7, s * (g.width / 2 + 0.2), WALL_H / 2, -0.35, 0, grp);
    boxMesh(fasciaMat, g.width + 1.2, 0.55, 0.8, 0, WALL_H - 0.28, -0.35, 0, grp);
    boxMesh(basic({ color: env.mono ? '#ffffff' : '#ffd9a0', transparent: true, opacity: 0.9 }), g.width, 0.08, 0.1, 0, WALL_H - 0.6, -0.1, 0, grp);
    boxMesh(capMat, g.width + 2.4, 0.16, 3.8, 0, WALL_H + 0.45, 1.5, 0, grp);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(g.width + 1, 4).rotateX(-Math.PI / 2), basic({ map: doorGlowTex, color: warm, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.position.set(0, 0.05, -2.1); glow.rotation.y = Math.PI; // gradient bright at the door, fading inward
    grp.add(glow); own(glow.geometry);
    void side;
  }

  // ---- stairwell openings / rails around voids
  const handMat = goldMat;
  for (const v of f.voids) {
    if (v.esc) {
      const [x0, z0, x1, z1] = v.esc.rect;
      const landX = v.esc.dir === 1 ? x1 : x0; // end where riders step off on this level
      const pts = v.esc.dir === 1
        ? [[x1, z0], [x0, z0], [x0, z1], [x1, z1]]
        : [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      const g = ribbonVertical(pts, 0.05, 1.15, 2.4); own(g); add(new THREE.Mesh(g, glassMat));
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        boxMesh(handMat, Math.abs(b[0] - a[0]) < 0.01 ? 0.08 : L, 0.07, Math.abs(b[0] - a[0]) < 0.01 ? L : 0.08, (a[0] + b[0]) / 2, 1.18, (a[1] + b[1]) / 2);
      }
      void landX;
    } else {
      const g = ribbonVertical(v.poly, 0.05, 1.3, 2.4, true); own(g); add(new THREE.Mesh(g, glassMat));
      const curve = new THREE.CatmullRomCurve3(v.poly.map(([x, z]) => new THREE.Vector3(x, 1.33, z)), true);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.07, 6, true), handMat); own(tube.geometry); add(tube);
    }
  }

  // ---- units
  const kit = { reg, own, std, basic, glassMat, fasciaMat, goldMat, boxMesh, doorGlowTex, warm };
  for (const u of f.units) buildUnit(env, R, u, kit);

  // ---- atrium sculpture, planters, trees, seating, pool
  if (f.atriumPlaza) buildHalo(env, R, kit);
  buildGreens(env, R, f, kit);

  return R;
}

// ---------------------------------------------------------------------------------------------

function buildUnit(env, R, u, k) {
  const { P } = env;
  const f = R.f;
  const col = new THREE.Color();
  if (u.isStore && env.mono) {
    col.set(u.cat === 'soon' ? '#ffffff' : '#f6f6f6');
  } else if (u.isStore) {
    col.set(CAT[u.cat].color);
    const hsl = {}; col.getHSL(hsl);
    const r = rng(hash(u.id));
    col.setHSL(hsl.h + (r() - 0.5) * 0.02, Math.min(1, hsl.s * (0.95 + r() * 0.1)), Math.min(0.75, Math.max(0.25, hsl.l + (r() - 0.5) * 0.07)));
  } else col.set(u.fac === 'restroom' ? P.restroom : u.fac === 'parking' ? P.core : P.lift);
  const U = { u, R, base: col.clone(), s: { h: 1, hT: 1, dim: 0, dimT: 0, sel: 0, selT: 0, glow: 0, glowT: 0 }, wake: 0, dirty: true, interior: null, roofDetail: null, group: new THREE.Group() };
  R.units.set(u.id, U);
  U.group.userData.id = u.id;
  R.group.add(U.group);

  if (u.fac === 'escalator') { buildEscalator(env, R, u, U, k); return; }

  const sideCol = col.clone().multiplyScalar(0.9);
  const soon = u.cat === 'soon';
  U.capMat = new THREE.MeshStandardMaterial({ color: soon ? '#ffffff' : col, map: soon ? env.hatch : null, roughness: 0.5, metalness: 0.02, envMapIntensity: 0.55 });
  U.sideMat = new THREE.MeshStandardMaterial({ color: sideCol, roughness: 0.68, metalness: 0.02, vertexColors: true, envMapIntensity: 0.4 });
  k.reg(U.capMat); k.reg(U.sideMat);
  if (soon) U.base.set('#ffffff'), U.sideBase = new THREE.Color(env.mono ? '#d4d4d4' : CAT.soon.color).multiplyScalar(0.9);
  const geo = k.own(extrudePrism(u.poly, u.h, u.kind === 'feature' ? 0.08 : 0.12));
  const mesh = new THREE.Mesh(geo, [U.capMat, U.sideMat]);
  mesh.userData.unitId = u.id;
  U.mesh = mesh; U.group.add(mesh); R.pick.push(mesh);
  U.sideBase = U.sideBase || sideCol.clone();

  // roof outline (a crisp edge highlight)
  const edge = new THREE.LineLoop(
    k.own(new THREE.BufferGeometry().setFromPoints(u.poly.map(([x, z]) => new THREE.Vector3(x, u.h + 0.02, z)))),
    k.reg(new THREE.LineBasicMaterial({ color: env.mono ? 0x1a1a1a : 0xffffff, transparent: true, opacity: env.mono ? 0.55 : 0.38 })),
  );
  U.group.add(edge);

  if (u.isStore) {
    const { door } = u;
    const ang = Math.atan2(door.n[0], door.n[1]);
    const gh = Math.max(1.2, u.h - 1.25);
    const gl = door.glass;
    // lit window behind the glass
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(gl, gh), k.basic({ color: new THREE.Color(P.glow).lerp(col, 0.18), transparent: true, opacity: theme(env, 0.62, 0.8) }));
    glow.position.set(door.pos[0] + door.n[0] * 0.03, 0.18 + gh / 2, door.pos[1] + door.n[1] * 0.03); glow.rotation.y = ang;
    U.group.add(glow); k.own(glow.geometry); U.glow = glow;
    // glass either side of the door
    const seg = Math.max(0, (gl - door.width) / 2);
    for (const s of [-1, 1]) {
      if (seg < 0.3) continue;
      const g = new THREE.PlaneGeometry(seg, gh);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (seg / 2.4));
      const p = new THREE.Mesh(g, k.glassMat);
      const off = s * (door.width / 2 + seg / 2);
      p.position.set(door.pos[0] + door.n[0] * 0.07 + door.t[0] * off, 0.18 + gh / 2, door.pos[1] + door.n[1] * 0.07 + door.t[1] * off);
      p.rotation.y = ang; U.group.add(p); k.own(g);
    }
    // fascia sign with a category-coloured underline
    const fas = k.boxMesh(k.fasciaMat, gl + 0.5, 0.9, 0.34, door.pos[0] + door.n[0] * 0.16, u.h - 0.55, door.pos[1] + door.n[1] * 0.16, ang, U.group);
    const line = k.boxMesh(k.basic({ color: env.mono ? new THREE.Color('#ffffff') : col.clone().lerp(new THREE.Color('#ffffff'), 0.15) }), gl + 0.5, 0.1, 0.36, door.pos[0] + door.n[0] * 0.16, u.h - 1.05, door.pos[1] + door.n[1] * 0.16, ang, U.group);
    U.accent = line;
    void fas;
    // lit threshold on the floor (stays on the floor, so it is not part of the scaled group)
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(door.width + 1.6, 1.8).rotateX(-Math.PI / 2), k.basic({ map: k.doorGlowTex, color: env.mono ? new THREE.Color('#ffffff') : col.clone().lerp(new THREE.Color('#fff2d6'), 0.45), transparent: true, opacity: 0.55, depthWrite: false }));
    mat.position.set(door.pos[0] + door.n[0] * 0.9, 0.05, door.pos[1] + door.n[1] * 0.9); mat.rotation.y = ang;
    R.group.add(mat); k.own(mat.geometry); U.threshold = mat;

    // rooftop plant
    if (u.area > 70 && !env.mono && !env.clean) {
      const r = rng(hash(u.id + 'r')); const rd = new THREE.Group(); U.roofDetail = rd; U.group.add(rd);
      const rm = k.reg(new THREE.MeshStandardMaterial({ color: theme(env, '#c9ccd3', '#505564'), roughness: 0.7 }));
      let n = u.anchor ? 4 : 2;
      for (let tries = 0; tries < 40 && n > 0; tries++) {
        const x = u.bounds.x0 + 2 + r() * (u.bounds.w - 4), z = u.bounds.y0 + 2 + r() * (u.bounds.h - 4);
        if (!pointInPolygon(x, z, u.poly)) continue;
        k.boxMesh(rm, 1.4 + r() * 1.2, 0.6, 0.9 + r() * 0.8, x, u.h + 0.3, z, r() * 3, rd); n--;
      }
    }
  } else if (u.fac !== 'feature') {
    const size = Math.min(3.4, Math.min(u.bounds.w, u.bounds.h) * 0.66);
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), k.basic({ map: env.iconTex(FACILITY_TYPES[u.fac].icon), transparent: true, depthWrite: false, toneMapped: false }));
    icon.position.set(u.center[0], u.h + 0.05, u.center[1]); U.group.add(icon); k.own(icon.geometry);
    U.icon = icon;
    // front doors of the facility blocks
    if (u.door && u.fac !== 'info' && u.fac !== 'atm') {
      const ang = Math.atan2(u.door.n[0], u.door.n[1]);
      const dm = k.boxMesh(k.basic({ color: env.mono ? '#ffffff' : u.fac === 'restroom' ? '#f2fbff' : '#c9d6ff', transparent: true, opacity: 0.85 }), 2.6, 1.9, 0.08, u.door.pos[0] + u.door.n[0] * 0.05, 1.0, u.door.pos[1] + u.door.n[1] * 0.05, ang, U.group);
      void dm;
    }
  }
  U.baseColor = U.base;
}
const theme = (env, a, b) => (env.theme !== 'dark' ? a : b);

// ---- escalators: two moving lanes that climb out of the floor (level 1) or drop into the opening (level 2)
function buildEscalator(env, R, u, U, k) {
  const e = u.esc;
  const [x0, z0, x1, z1] = e.rect;
  const len = x1 - x0;
  const lowX = e.dir === 1 ? x0 : x1;
  const g = new THREE.Group();
  g.position.set(lowX, R.n === 1 ? 0 : -ESC_RISE, (z0 + z1) / 2);
  g.rotation.y = e.dir === 1 ? 0 : Math.PI;
  R.group.add(g);
  const th = Math.atan2(ESC_RISE, len), L = Math.hypot(len, ESC_RISE);
  const body = k.std({ color: theme(env, '#b6bcc8', '#4d5364'), roughness: 0.5, metalness: 0.4 });
  const dark = k.std({ color: '#2a2e38', roughness: 0.6, metalness: 0.3 });
  for (const lane of [-0.85, 0.85]) {
    const belt = env.beltTex.clone(); belt.repeat.set(L / 1.8, 1); belt.wrapS = belt.wrapT = THREE.RepeatWrapping;
    R.belts.push({ tex: belt, dir: (lane < 0 ? 1 : -1) * (R.n === 1 ? 1 : 1) });
    const m = new THREE.Mesh(BOX, [dark, dark, k.std({ map: belt, roughness: 0.7 }), dark, dark, dark]);
    m.scale.set(L, 0.3, 1.2); m.position.set(len / 2, ESC_RISE / 2, lane); m.rotation.z = th; g.add(m);
  }
  for (const z of [-1.55, 0, 1.55]) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.0), k.glassMat);
    gl.position.set(len / 2, ESC_RISE / 2 + 0.8, z); gl.rotation.z = th; g.add(gl); k.own(gl.geometry);
    const rail = new THREE.Mesh(BOX, body); rail.scale.set(L, 0.1, 0.16); rail.position.set(len / 2, ESC_RISE / 2 + 1.32, z); rail.rotation.z = th; g.add(rail);
  }
  // underside truss so the ramp does not float
  const truss = new THREE.Mesh(BOX, body); truss.scale.set(L, 0.5, 3.1); truss.position.set(len / 2, ESC_RISE / 2 - 0.4, 0); truss.rotation.z = th; g.add(truss);
  // pad on the floor with a direction chevron
  const pick = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ visible: false }));
  pick.scale.set(len, 1.2, 3.2); pick.position.set((x0 + x1) / 2, 0.6, (z0 + z1) / 2); pick.userData.unitId = u.id;
  R.group.add(pick); R.pick.push(pick); U.mesh = pick;
  U.group.visible = true; U.capMat = null; U.isEsc = true;
}

// ---- hanging sculpture over the level-1 plaza
function buildHalo(env, R, k) {
  const g = new THREE.Group(); g.position.set(ATRIUM.cx, 0.7, ATRIUM.cz); R.group.add(g); R.halo = g;
  const gold = k.goldMat;
  const ringY = [3.0, 5.6, 8.2, 10.6, 12.6, 14.2], ringR = [3.8, 3.2, 2.6, 2.0, 1.4, 0.8];
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 15.6, 8), gold); mast.position.y = 7.8; g.add(mast); k.own(mast.geometry);
  ringY.forEach((y, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(ringR[i], 0.045, 6, 72), gold);
    t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); k.own(t.geometry);
  });
  const cable = new THREE.CylinderGeometry(0.014, 0.014, 1, 4); k.own(cable);
  const cm = k.reg(new THREE.MeshBasicMaterial({ color: env.mono ? '#e6e6e6' : '#f3dcab', transparent: true, opacity: 0.8 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * ringR[0], ringY[0], Math.sin(a) * ringR[0]);
    const q = new THREE.Vector3(Math.cos(a) * ringR[5], ringY[5], Math.sin(a) * ringR[5]);
    const m = new THREE.Mesh(cable, cm); m.position.copy(p).lerp(q, 0.5);
    m.scale.set(1, p.distanceTo(q), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
    g.add(m);
  }
  const bead = new THREE.SphereGeometry(0.13, 8, 6); k.own(bead);
  const bm = k.reg(new THREE.MeshStandardMaterial({ color: env.mono ? '#ffffff' : '#fff3d8', emissive: new THREE.Color(env.P.glow), emissiveIntensity: 1.5, roughness: 0.3 }));
  const N = 240, beads = new THREE.InstancedMesh(bead, bm, N);
  const r = rng(9); const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const ri = (r() * 6) | 0, a = r() * Math.PI * 2, drop = r() * 1.1;
    m4.makeTranslation(Math.cos(a) * ringR[ri], ringY[ri] - drop, Math.sin(a) * ringR[ri]);
    beads.setMatrixAt(i, m4);
  }
  g.add(beads); R.beads = bm;
  const glowTex = env.glowTex;
  ringY.forEach((y, i) => {
    const s = new THREE.Sprite(k.reg(new THREE.SpriteMaterial({ map: glowTex, color: env.P.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })));
    s.position.y = y - 0.3; s.scale.setScalar(ringR[i] * 3.2); g.add(s);
  });
  // soft pool of light on the stone below
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), k.basic({ map: glowTex, color: env.P.glow, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  spot.position.set(0, -0.62, 0); g.add(spot); k.own(spot.geometry);
}

// ---- planters, trees, seating, pool, loungers
function buildGreens(env, R, f, k) {
  const { P } = env;
  const r = rng(f.n * 31 + 7);
  const trunkG = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6), leafG = new THREE.IcosahedronGeometry(1, 1);
  const potG = new THREE.CylinderGeometry(0.95, 0.8, 0.6, 14), shrubG = new THREE.IcosahedronGeometry(0.8, 1);
  k.own(trunkG); k.own(leafG); k.own(potG); k.own(shrubG);
  const trunkM = k.std({ color: env.mono ? '#a8a8a8' : '#6b5238', roughness: 0.9 });
  const leafM = k.std({ color: '#ffffff', roughness: 0.85, flatShading: true });
  const potM = k.std({ color: P.pot, roughness: 0.6 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();

  if (f.trees.length) {
    const tr = new THREE.InstancedMesh(trunkG, trunkM, f.trees.length);
    const lf = new THREE.InstancedMesh(leafG, leafM, f.trees.length * 3);
    f.trees.forEach(([x, z], i) => {
      const sc = 0.9 + r() * 0.5;
      m4.compose(p.set(x, 1.1 * sc, z), q.identity(), s.set(sc, sc, sc)); tr.setMatrixAt(i, m4);
      for (let j = 0; j < 3; j++) {
        const a = r() * 6.28, rad = j ? 0.7 : 0, big = (j ? 1.25 : 1.7) * sc;
        m4.compose(p.set(x + Math.cos(a) * rad, (2.7 + (j ? 0.3 : 0.9)) * sc, z + Math.sin(a) * rad), q.identity(), s.set(big, big * 0.85, big));
        lf.setMatrixAt(i * 3 + j, m4); lf.setColorAt(i * 3 + j, c.set(P.tree[(r() * P.tree.length) | 0]));
      }
    });
    R.group.add(tr, lf);
  }
  if (f.planters.length) {
    const pots = new THREE.InstancedMesh(potG, potM, f.planters.length);
    const shr = new THREE.InstancedMesh(shrubG, leafM, f.planters.length);
    f.planters.forEach(([x, z], i) => {
      m4.compose(p.set(x, 0.3, z), q.identity(), s.set(1, 1, 1)); pots.setMatrixAt(i, m4);
      const sc = 0.9 + r() * 0.35;
      m4.compose(p.set(x, 1.0, z), q.identity(), s.set(sc, sc * 0.9, sc)); shr.setMatrixAt(i, m4); shr.setColorAt(i, c.set(P.tree[(r() * P.tree.length) | 0]));
    });
    R.group.add(pots, shr);
  }
  if (f.seating) {
    const tableG = new THREE.CylinderGeometry(0.55, 0.55, 0.76, 14), stoolG = new THREE.CylinderGeometry(0.24, 0.24, 0.46, 10);
    k.own(tableG); k.own(stoolG);
    const pts = [];
    for (const x of [-12, 0, 12]) for (const z of [-15.4, -12.6, -9.9]) pts.push([x, z]);
    const tm = k.std({ color: '#f7f2e8', roughness: 0.4 }), sm = k.std({ color: env.mono ? '#2a2a2a' : CAT.dining.color, roughness: 0.55 });
    const tables = new THREE.InstancedMesh(tableG, tm, pts.length), stools = new THREE.InstancedMesh(stoolG, sm, pts.length * 4);
    pts.forEach(([x, z], i) => {
      m4.compose(p.set(x, 0.38, z), q.identity(), s.set(1, 1, 1)); tables.setMatrixAt(i, m4);
      for (let j = 0; j < 4; j++) { const a = (j / 4) * 6.28 + 0.5; m4.compose(p.set(x + Math.cos(a) * 1.0, 0.23, z + Math.sin(a) * 1.0), q.identity(), s.set(1, 1, 1)); stools.setMatrixAt(i * 4 + j, m4); }
    });
    R.group.add(tables, stools);
  }
  if (f.pool) {
    const [x0, z0, x1, z1] = f.pool.rect;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), k.reg(new THREE.MeshPhysicalMaterial({
      color: P.pool, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.9, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.8,
    })));
    water.position.set((x0 + x1) / 2, 0.1, (z0 + z1) / 2); R.group.add(water); k.own(water.geometry);
    const lm = k.std({ color: '#ffffff', roughness: 0.5 });
    for (const [x, z] of f.loungers) {
      k.boxMesh(lm, 0.9, 0.28, 1.9, x, 0.2, z);
      const back = k.boxMesh(lm, 0.9, 0.1, 0.9, x, 0.62, z - 0.85); back.rotation.x = -0.9;
    }
  }
}
