// Canvas-drawn textures: the baked floor (tiles, inlays, soft shadows), glass, belts, route arrows, glows.
import * as THREE from 'three';
import { rng } from '../lib/geom.js';
import { ATRIUM } from '../data/mall.js';

// Every floor texture covers the same world rectangle so UVs are shared between levels.
export const TEX = { x0: -67, z0: -28, w: 134, h: 56, ppm: 18 };

export const PALETTE = {
  light: {
    ground: '#e8e6e1', tile: '#f3f0e9', grout: 'rgba(70,58,36,0.075)', inlay: '#dad3c4', plaza: '#ebe5d8', ring: '#c8bda3',
    wood: '#d2b184', woodLine: 'rgba(80,50,20,0.16)', grass: '#a5c47a', grassDark: '#8fb164', paver: '#e6e0d2', coping: '#f6f3ec',
    shadowA: 0.34, aoA: 0.26, slabSide: '#cfc9bc', wall: '#3a3f4b', wallCap: '#f0ede6', glassTint: [176, 214, 236],
    fascia: '#2b2f3a', dim: '#c9ccd3', dimMix: 0.84, core: '#6b7385', lift: '#3d4456', restroom: '#8cc4e8', info: '#3d4456',
    iconInk: '#ffffff', pool: '#2fb0e0', env: 0.5, hemiSky: '#ffffff', hemiGround: '#d6d9e2', hemi: 0.85, key: 2.1, fill: 0.7, exposure: 1.02,
    tree: ['#5f9a46', '#6fae4f', '#4f8a3c', '#78b45a'], pot: '#d9d3c6', glow: '#ffe7bd',
  },
  dark: {
    ground: '#1a1d25', tile: '#2c303b', grout: 'rgba(255,255,255,0.055)', inlay: '#383d4b', plaza: '#323746', ring: '#4d5468',
    wood: '#6d5942', woodLine: 'rgba(0,0,0,0.25)', grass: '#3f5c3a', grassDark: '#36502f', paver: '#3a3e4a', coping: '#4a4f5e',
    shadowA: 0.55, aoA: 0.42, slabSide: '#12141b', wall: '#8b94a8', wallCap: '#c4cad8', glassTint: [110, 150, 190],
    fascia: '#12141a', dim: '#3b404d', dimMix: 0.78, core: '#59627a', lift: '#59627a', restroom: '#5f95bb', info: '#59627a',
    iconInk: '#ffffff', pool: '#1f8fc0', env: 0.34, hemiSky: '#9fb2d8', hemiGround: '#20242f', hemi: 0.7, key: 1.7, fill: 0.5, exposure: 1.0,
    tree: ['#3f6d37', '#4a7e3d', '#365f30', '#52873f'], pot: '#4b505e', glow: '#ffd9a0',
  },
};

// black & white "architectural model" palette used by the basic map
PALETTE.mono = {
  ...PALETTE.light,
  ground: '#e4e4e4', tile: '#dadada', grout: 'rgba(0,0,0,0.07)', inlay: '#cdcdcd', plaza: '#e2e2e2', ring: '#b9b9b9',
  wood: '#d0d0d0', woodLine: 'rgba(0,0,0,0.12)', grass: '#cfcfcf', grassDark: '#c2c2c2', paver: '#d6d6d6', coping: '#f2f2f2',
  slabSide: '#a9a9a9', wall: '#1c1c1c', wallCap: '#ffffff', glassTint: [190, 190, 190],
  fascia: '#111111', dim: '#cccccc', dimMix: 0.82, core: '#7d7d7d', lift: '#222222', restroom: '#b0b0b0', info: '#222222',
  pool: '#bdbdbd', tree: ['#a9a9a9', '#b6b6b6', '#9c9c9c', '#c0c0c0'], pot: '#cacaca', glow: '#ffffff',
  hemiGround: '#cfcfcf', env: 0.55, shadowA: 0.4,
};

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.round(w); c.height = Math.round(h);
  return c;
};
const toTex = (canvas, { repeat = false, aniso = 8, srgb = true } = {}) => {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};

const polyPath = (ctx, poly) => {
  ctx.beginPath();
  poly.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
  ctx.closePath();
};

const SHADOW_DIR = [0.55, 0.83]; // light comes from the north-west, shadows fall south-east

/** Bakes one floor's ground: polished tile, inlays, garden/seating patches and soft shadows. */
export function makeFloorTexture(floor, theme, aniso = 8) {
  const P = PALETTE[theme];
  const { x0, z0, w, h, ppm } = TEX;
  const canvas = mk(w * ppm, h * ppm);
  const ctx = canvas.getContext('2d');
  const R = rng(floor.n * 977 + 13);
  ctx.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -z0 * ppm);

  ctx.fillStyle = P.ground; ctx.fillRect(x0, z0, w, h);

  // ---- tile floor inside the outline
  ctx.save(); polyPath(ctx, floor.outline); ctx.clip();
  ctx.fillStyle = P.tile; ctx.fillRect(x0, z0, w, h);
  for (let x = -66; x < 66; x += 3) for (let z = -27; z < 27; z += 3) {
    const v = R();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.12})` : `rgba(0,0,0,${(0.5 - v) * 0.05})`;
    ctx.fillRect(x, z, 3, 3);
  }
  ctx.strokeStyle = P.grout; ctx.lineWidth = 0.045;
  ctx.beginPath();
  for (let x = -66; x <= 66; x += 3) { ctx.moveTo(x, -28); ctx.lineTo(x, 28); }
  for (let z = -27; z <= 27; z += 3) { ctx.moveTo(-67, z); ctx.lineTo(67, z); }
  ctx.stroke();

  // runner inlay along the concourse
  ctx.fillStyle = P.inlay;
  ctx.fillRect(-64, -0.28, 128, 0.56);
  ctx.fillRect(-64, -5.6, 128, 0.14); ctx.fillRect(-64, 5.46, 128, 0.14);

  // level 1 plaza: stone medallion under the hanging sculpture
  if (floor.atriumPlaza) {
    ctx.fillStyle = P.plaza;
    ctx.beginPath(); ctx.ellipse(0, 0, ATRIUM.plazaRx, ATRIUM.plazaRz, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.ring;
    for (const [k, lw] of [[1, 0.16], [0.82, 0.07], [0.62, 0.1], [0.4, 0.06], [0.2, 0.12]]) {
      ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(0, 0, ATRIUM.plazaRx * k, ATRIUM.plazaRz * k, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 0.05; ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * ATRIUM.plazaRx * 0.2, Math.sin(a) * ATRIUM.plazaRz * 0.2);
      ctx.lineTo(Math.cos(a) * ATRIUM.plazaRx * 0.82, Math.sin(a) * ATRIUM.plazaRz * 0.82);
    }
    ctx.stroke();
    // entrance hall carpet-runner toward the north & south gates
    ctx.fillStyle = P.inlay;
    ctx.fillRect(-0.3, -26, 0.6, 14); ctx.fillRect(-0.3, 12, 0.6, 14);
  }

  // level 2 seating field (warm timber) + rooftop garden
  if (floor.seating) {
    const [a, b, c, d] = floor.seating.rect;
    ctx.fillStyle = P.wood; ctx.fillRect(a, b, c - a, d - b);
    ctx.strokeStyle = P.woodLine; ctx.lineWidth = 0.04; ctx.beginPath();
    for (let z = b; z <= d; z += 0.45) { ctx.moveTo(a, z); ctx.lineTo(c, z); }
    ctx.stroke();
    ctx.strokeStyle = P.inlay; ctx.lineWidth = 0.2; ctx.strokeRect(a, b, c - a, d - b);
  }
  if (floor.garden) {
    const [a, b, c, d] = floor.garden.rect;
    ctx.fillStyle = P.grass; ctx.fillRect(a, b, c - a, d - b);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = R() > 0.5 ? P.grassDark : 'rgba(255,255,255,0.07)';
      const s = 0.12 + R() * 0.3;
      ctx.fillRect(a + R() * (c - a), b + R() * (d - b), s, s * 0.6);
    }
    ctx.fillStyle = P.paver; // stone path from the glass doors to the pool deck
    ctx.fillRect(a, -2.2, 8, 4.4);
    ctx.fillRect(a + 6.5, -2.2, 4.4, 14);
    if (floor.pool) {
      const [px0, pz0, px1, pz1] = floor.pool.rect;
      ctx.fillStyle = P.coping; ctx.fillRect(px0 - 2.6, pz0 - 2.4, px1 - px0 + 5.2, pz1 - pz0 + 4.8);
      ctx.strokeStyle = P.grout; ctx.lineWidth = 0.05; ctx.beginPath();
      for (let x = px0 - 2.6; x <= px1 + 2.6; x += 1.2) { ctx.moveTo(x, pz0 - 2.4); ctx.lineTo(x, pz1 + 2.4); }
      ctx.stroke();
    }
    ctx.strokeStyle = P.paver; ctx.lineWidth = 0.5; ctx.strokeRect(a, b, c - a, d - b);
  }
  ctx.restore();

  // ---- baked soft shadows + contact AO, built on a half-resolution mask, blurred, multiplied in
  const sc = 0.5;
  const mask = mk(w * ppm * sc, h * ppm * sc);
  const mctx = mask.getContext('2d');
  const drawMask = (fn) => { mctx.setTransform(ppm * sc, 0, 0, ppm * sc, -x0 * ppm * sc, -z0 * ppm * sc); fn(mctx); };
  const blurTo = (blurPx, alpha) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    polyPath(ctx, []); // reset path
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    if ('filter' in ctx) ctx.filter = `blur(${blurPx}px)`;
    // clip to the outline so shadows never spill onto the stage
    ctx.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -z0 * ppm); polyPath(ctx, floor.outline); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, mask.width, mask.height);
  };

  // directional shadow: sweep each footprint along the shadow direction
  drawMask((c) => {
    c.fillStyle = '#000';
    for (const u of floor.units) {
      if (u.h < 1) continue;
      const len = Math.min(u.h * 0.62, 4.2);
      const steps = Math.max(3, Math.ceil(len / 0.35));
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * len;
        c.save(); c.translate(SHADOW_DIR[0] * t, SHADOW_DIR[1] * t); polyPath(c, u.poly); c.fill(); c.restore();
      }
    }
  });
  blurTo(7, P.shadowA);
  // ambient occlusion halo
  drawMask((c) => {
    c.fillStyle = '#000';
    for (const u of floor.units) if (u.h >= 1) { polyPath(c, u.poly); c.fill(); }
  });
  blurTo(13, P.aoA);
  // thin inner perimeter darkening along the outer wall
  ctx.save(); ctx.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -z0 * ppm);
  polyPath(ctx, floor.outline); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.6; polyPath(ctx, floor.outline); ctx.stroke();
  ctx.restore();

  const tex = toTex(canvas, { aniso });
  tex.repeat.set(1 / w, 1 / h);
  // shape-space y = -z; texture v=1 is the top row (north). v = (y - ymin)/h with ymin = -(z0 + h)
  tex.offset.set(-x0 / w, (z0 + h) / h);
  return tex;
}

export function makeHatchTexture(color) {
  const c = mk(64, 64); const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = color; g.lineWidth = 11; g.beginPath();
  for (let i = -64; i < 128; i += 22) { g.moveTo(i, 64); g.lineTo(i + 64, 0); }
  g.stroke();
  const t = toTex(c, { repeat: true });
  t.repeat.set(1 / 2.2, 1 / 2.2);
  return t;
}

/** Shopfront glass: faint tint, mullions every 2.4 m and a transom bar. u runs along the width. */
export function makeGlassTexture(theme) {
  const tint = PALETTE[theme].glassTint;
  const c = mk(128, 128); const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, `rgba(${tint.join(',')},0.55)`); grd.addColorStop(1, `rgba(${tint.join(',')},0.22)`);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,0.18)'; // reflection streak
  g.beginPath(); g.moveTo(10, 0); g.lineTo(46, 0); g.lineTo(18, 128); g.lineTo(-18, 128); g.fill();
  g.fillStyle = 'rgba(24,28,38,0.85)';
  g.fillRect(0, 0, 3, 128); g.fillRect(0, 0, 128, 4); g.fillRect(0, 124, 128, 4);
  return toTex(c, { repeat: true });
}

export function makeBeltTexture() {
  const c = mk(256, 64); const g = c.getContext('2d');
  g.fillStyle = '#9aa1af'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#7d8493' : '#aab1be'; g.fillRect(i * 16, 0, 12, 64);
    g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(i * 16 + 12, 0, 4, 64);
  }
  return toTex(c, { repeat: true });
}

/** Chevron strip for the route ribbon. v runs along the path. */
export function makeRouteTexture() {
  const c = mk(64, 128); const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(8, 100); g.lineTo(32, 70); g.lineTo(56, 100); g.lineTo(56, 118); g.lineTo(32, 88); g.lineTo(8, 118); g.closePath();
  g.fill();
  const t = toTex(c, { repeat: true });
  t.wrapS = THREE.ClampToEdgeWrapping;
  return t;
}

export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = mk(128, 128); const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(0.55, inner.replace(/[\d.]+\)$/, '0.35)')); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return toTex(c);
}

export function makeDoorGlowTexture() {
  const c = mk(128, 64); const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(10, 0); g.lineTo(118, 0); g.lineTo(128, 64); g.lineTo(0, 64); g.closePath(); g.fill();
  return toTex(c);
}
