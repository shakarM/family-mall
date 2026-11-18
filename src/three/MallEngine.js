// MallEngine: the 3D map. Two levels of a shopping mall that can be shown stacked, or one at a time, with
// selection, filtering, labels, wayfinding routes and a smooth camera. Framework-free; React only hosts it.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FLOORS, CAT, GATES, ALL_UNITS, UNIT_BY_ID } from '../data/mall.js';
import { buildFloor, GAP, SLAB } from './buildFloor.js';
import { buildInterior } from './fixtures.js';
import { PALETTE, TEX, makeGlassTexture, makeHatchTexture, makeDoorGlowTexture, makeGlowTexture, makeBeltTexture, makeRouteTexture } from './textures.js';
import { ribbonFlat, pointAlong } from './props.js';
import { iconDataUrl, iconSvg } from '../lib/icons.js';
import { clamp, easeInOutCubic, polygonBounds } from '../lib/geom.js';

export { GAP };
const TWO_PI = Math.PI * 2;
const DEFAULT_AZ = 0.34, DEFAULT_POL = 0.96;
const ACCENT = { light: '#1f5bff', dark: '#7ea0ff', mono: '#111111' };

const layoutFor = (mode) => ({
  both: { 1: { y: 0, a: 1 }, 2: { y: GAP, a: 1 } },
  L1: { 1: { y: 0, a: 1 }, 2: { y: GAP + 34, a: 0 } },
  L2: { 1: { y: -34, a: 0 }, 2: { y: GAP, a: 1 } },
}[mode]);

const yRange = (mode) => (mode === 'both' ? [-SLAB - 1, GAP + 9] : mode === 'L1' ? [-SLAB, 9] : [GAP - SLAB, GAP + 9]);

export class MallEngine {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.theme = opts.mono ? 'mono' : (opts.theme || 'light');
    this.P = PALETTE[this.theme];
    this.mode = opts.mode || 'both';
    this.reduced = !!opts.reducedMotion;
    this.onPick = opts.onPick || (() => {});
    this.onHover = opts.onHover || (() => {});
    this.labelMode = 'auto';
    this.sel = null; this.hi = null; this.hover = null;
    this.ins = { l: 0, r: 0, t: 0, b: 0 }; this.insT = { ...this.ins };
    this.az = DEFAULT_AZ; this.pol = DEFAULT_POL;
    this.units = new Map(); this.floors = {};
    this.tween = null; this.route = null;
    this.activeUntil = 0; this.frame = 0; this.time = 0; this.disposed = false;
    this.W = 0; this.H = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    cv.setAttribute('aria-label', '3D mall map'); cv.tabIndex = 0;
    container.appendChild(cv);
    this.labelsEl = document.createElement('div');
    this.labelsEl.className = 'mm-labels';
    this.labelsEl.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none';
    container.appendChild(this.labelsEl);

    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.camera = new THREE.PerspectiveCamera(30, 1, 5, 2400);
    this.controls = new OrbitControls(this.camera, cv);
    const c = this.controls;
    c.enableDamping = true; c.dampingFactor = 0.09; c.screenSpacePanning = true; c.zoomToCursor = true;
    c.minDistance = 16; c.maxDistance = 900; c.minPolarAngle = 0.12; c.maxPolarAngle = 1.4; c.rotateSpeed = 0.7; c.zoomSpeed = 0.9;
    c.addEventListener('start', () => { this.tween = null; this._wake(); });
    c.addEventListener('change', () => this._wake());

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xd6d9e2, 0.85);
    this.key = new THREE.DirectionalLight(0xfff4e6, 2.1); this.key.position.set(-70, 110, -80);
    this.fill = new THREE.DirectionalLight(0xdfe8ff, 0.7); this.fill.position.set(60, 50, 100);
    this.scene.add(this.hemi, this.key, this.fill);

    this.raycaster = new THREE.Raycaster();
    this.tmpV = new THREE.Vector3(); this.tmpC = new THREE.Color();
    this.routeTex = makeRouteTexture();
    this.glowTex = makeGlowTexture(); this.doorGlowTex = makeDoorGlowTexture(); this.beltTex = makeBeltTexture();
    this.iconCache = new Map();

    this._buildLabels();
    this._buildWorld();
    this._bindEvents();
    this.resize();
    this._intro();
    this._loop = this._loop.bind(this);
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  }

  // ------------------------------------------------------------------ world
  _iconTex(type) {
    if (this.iconCache.has(type)) return this.iconCache.get(type);
    const img = new Image();
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    img.onload = () => { t.needsUpdate = true; this._wake(); };
    img.src = iconDataUrl(type, '#ffffff');
    this.iconCache.set(type, t);
    return t;
  }

  _applyTheme() {
    const P = this.P;
    this.hemi.color.set(P.hemiSky); this.hemi.groundColor.set(P.hemiGround); this.hemi.intensity = P.hemi;
    this.key.intensity = P.key; this.fill.intensity = P.fill;
    this.renderer.toneMappingExposure = P.exposure;
    this.scene.environmentIntensity = P.env;
    this.accent = ACCENT[this.theme];
  }

  _buildWorld() {
    this._disposeWorld();
    this.P = PALETTE[this.theme];
    this._applyTheme();
    this.glassTex = makeGlassTexture(this.theme);
    this.hatch = makeHatchTexture(this.theme === 'mono' ? '#111111' : CAT.soon.color);
    const env = {
      P: this.P, theme: this.theme, mono: this.theme === 'mono', clean: !!this.opts.clean, aniso: this.aniso, glassTex: this.glassTex, doorGlowTex: this.doorGlowTex, hatch: this.hatch,
      beltTex: this.beltTex, glowTex: this.glowTex, iconTex: (t) => this._iconTex(t),
    };
    this.units.clear();
    const lay = layoutFor(this.mode);
    for (const f of FLOORS) {
      const R = buildFloor(env, f);
      R.y = R.yT = lay[f.n].y; R.alpha = R.aT = lay[f.n].a;
      R.group.position.y = R.y;
      this.scene.add(R.group);
      this.floors[f.n] = R;
      for (const [id, U] of R.units) this.units.set(id, U);
    }
    // soft contact shadow under the lower level so the model sits on the stage
    const sh = document.createElement('canvas'); sh.width = 256; sh.height = 128;
    const g = sh.getContext('2d');
    const grd = g.createRadialGradient(128, 64, 8, 128, 64, 126);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 128);
    this.shadowTex = new THREE.CanvasTexture(sh);
    const smat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: this.theme !== 'dark' ? 0.5 : 0.8 });
    this._regMat(this.floors[1], smat);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(210, 105).rotateX(-Math.PI / 2), smat);
    shadow.position.y = -SLAB - 0.4; this.floors[1].group.add(shadow); this.floors[1].dispose.push(shadow.geometry);
    this.allUnits = [...this.units.values()];
    this.pickables = null;
    this._applyStates(false);
    this._applyAllFloors();
    this._wake();
  }

  _regMat(R, m) { const rec = { m, base: m.opacity, baseT: m.transparent, baseDW: m.depthWrite }; R.mats.push(rec); m.userData.rec = rec; return m; }

  _disposeWorld() {
    for (const n of Object.keys(this.floors)) {
      const R = this.floors[n];
      this.scene.remove(R.group);
      R.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      for (const rec of R.mats) { rec.m.map?.dispose?.(); rec.m.dispose(); }
      for (const d of R.dispose) d.dispose?.();
      for (const U of R.units.values()) if (U.interior) U.interior.traverse((o) => o.geometry?.dispose?.());
    }
    this.floors = {};
    this.glassTex?.dispose(); this.hatch?.dispose(); this.shadowTex?.dispose();
    this._routeObjs?.forEach((o) => o.parent?.remove(o));
    this._routeObjs = null; this.route = null;
  }

  // ------------------------------------------------------------------ labels
  _buildLabels() {
    this.labels = [];
    const mk = (id, cls, html, extra) => {
      const el = document.createElement('div'); el.className = `mm-label ${cls}`; el.dataset.id = id; el.innerHTML = html;
      el.style.visibility = 'hidden'; this.labelsEl.appendChild(el);
      const lab = { id, el, w: 0, h: 22, ...extra };
      this.labels.push(lab); return lab;
    };
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    for (const u of ALL_UNITS) {
      if (u.fac === 'escalator' && u.floor === 2) continue;
      if (u.isStore) mk(u.id, '', `<i style="background:${this.theme === 'mono' ? '#111' : CAT[u.cat].color}"></i><span>${esc(u.name)}</span>`, { kind: 'store', u });
      else mk(u.id, 'mm-fac', `${iconSvg(u.fac === 'feature' ? 'feature' : u.fac, { size: 13 })}<span>${esc(u.name)}</span>`, { kind: 'fac', u });
    }
    for (const g of GATES) mk(g.id, 'mm-gate', `${iconSvg('entrance', { size: 13 })}<span>${esc(g.name)}</span>`, { kind: 'gate', g });
    this.pinFrom = mk('pin-from', 'mm-pin mm-pin-from', '<span>Start</span>', { kind: 'pin' });
    this.pinTo = mk('pin-to', 'mm-pin mm-pin-to', '<svg viewBox="0 0 24 34" width="26" height="36"><path d="M12 33S2 21.5 2 12a10 10 0 0 1 20 0c0 9.500-10 21-10 21z" fill="currentColor"/><circle cx="12" cy="12" r="4.2" fill="#fff"/></svg>', { kind: 'pin' });
    this.measured = false;
  }

  _measureLabels() {
    for (const l of this.labels) { const r = l.el.getBoundingClientRect(); l.w = r.width || l.w || 90; l.h = r.height || 22; }
    this.measured = true;
  }

  _labelWorld(lab, out) {
    if (lab.kind === 'pin') return null;
    if (lab.kind === 'gate') { const R = this.floors[1]; return out.set(lab.g.pos[0] + lab.g.n[0] * 2, R.y + 4.6, lab.g.pos[1] + lab.g.n[1] * 2); }
    const u = lab.u, U = this.units.get(lab.id); if (!U) return null;
    const R = U.R; const sy = U.isEsc ? 1 : U.group.scale.y;
    return out.set(u.label[0], R.y + (U.isEsc ? 5 : u.h * sy) + 0.4, u.label[1]);
  }

  _updateLabels() {
    if (!this.W) return;
    if (!this.measured) this._measureLabels();
    const placed = [], W = this.W, H = this.H, v = this.tmpV;
    const mobile = W < 600;
    const items = [];
    const hi = this.hi, sel = this.sel, hov = this.hover;
    for (const lab of this.labels) {
      let pri = -1, R;
      if (lab.kind === 'pin') {
        if (!this.route) { this._hideLabel(lab); continue; }
        R = this.floors[lab.id === 'pin-from' ? this.route.from.floor : this.route.to.floor];
        if (!R || R.alpha < 0.5) { this._hideLabel(lab); continue; }
        pri = 2000;
      } else if (lab.kind === 'gate') {
        R = this.floors[1];
        if (R.alpha < 0.5 || this.labelMode === 'off' || hi) { this._hideLabel(lab); continue; }
        pri = 120;
        if (this.route && (lab.id === this.route.from.id || lab.id === this.route.to.id)) pri = 900;
      } else {
        const U = this.units.get(lab.id); if (!U) continue;
        R = U.R;
        if (R.alpha < 0.5 || R.aT < 0.5) { this._hideLabel(lab); continue; }
        const u = lab.u;
        const isSel = sel === lab.id, isHov = hov === lab.id, isHi = hi ? hi.has(lab.id) : false;
        if (isSel) pri = 1000; else if (isHov) pri = 900;
        else if (hi) pri = isHi ? 500 + Math.min(u.area, 400) / 100 : -1;
        else if (this.labelMode === 'off') pri = -1;
        else if (lab.kind === 'fac') pri = -1;
        else pri = (u.anchor ? 300 : 0) + Math.min(u.area, 400) / 50 + (u.cat === 'soon' ? -2 : 0);
        if (this.route && !isSel && (lab.id === this.route.to.id)) pri = Math.max(pri, 950);
        if (pri < 0) { this._hideLabel(lab); continue; }
      }
      let px, py;
      if (lab.kind === 'pin') {
        const r = this.route; const isFrom = lab.id === 'pin-from';
        const leg = isFrom ? r.legs[0] : r.legs[r.legs.length - 1];
        const pt = isFrom ? leg.points[0] : leg.points[leg.points.length - 1];
        v.set(pt[0], R.y + (isFrom ? 1.2 : 0.2), pt[1]);
      } else {
        if (!this._labelWorld(lab, v)) continue;
      }
      v.project(this.camera);
      if (v.z > 1 || v.z < -1) { this._hideLabel(lab); continue; }
      px = (v.x * 0.5 + 0.5) * W; py = (-v.y * 0.5 + 0.5) * H;
      items.push({ lab, pri, px, py });
    }
    items.sort((a, b) => b.pri - a.pri);
    const k = mobile ? 0.88 : 1;
    for (const it of items) {
      const { lab, px, py } = it;
      const w = lab.w * k, h = lab.h * k;
      const isPin = lab.kind === 'pin';
      const box = isPin ? [px - 14, py - 38, px + 14, py] : [px - w / 2 - 3, py - h - 3, px + w / 2 + 3, py + 3];
      const ins = this.ins;
      const outside = box[0] < Math.max(4, ins.l) || box[2] > W - Math.max(4, ins.r) || box[1] < Math.max(4, ins.t * 0.5) || box[3] > H - Math.max(4, ins.b);
      let ok = it.pri >= 900 ? !(box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 2) || it.pri >= 1000 : !outside;
      if (ok && it.pri < 900) for (const b of placed) if (box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]) { ok = false; break; }
      if (!ok) { this._hideLabel(lab); continue; }
      placed.push(box);
      const el = lab.el;
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${Math.round(px)}px,${Math.round(py)}px,0) translate(-50%,${isPin ? '-100%' : '-120%'})`;
      el.style.zIndex = String(Math.round(it.pri));
      el.classList.remove('is-hidden');
      const hiMode = !!hi;
      el.classList.toggle('is-selected', this.sel === lab.id);
      el.classList.toggle('is-hover', this.hover === lab.id && this.sel !== lab.id);
      el.classList.toggle('is-match', hiMode && hi.has(lab.id) && this.sel !== lab.id);
      el.classList.toggle('is-small', mobile);
    }
  }
  _hideLabel(lab) { if (lab.el.style.visibility !== 'hidden') { lab.el.style.visibility = 'hidden'; lab.el.classList.add('is-hidden'); } }

  // ------------------------------------------------------------------ states
  _wake(ms = 1500) { this.activeUntil = Math.max(this.activeUntil, performance.now() + ms); }

  setHighlight(ids) {
    this.hi = ids ? new Set(ids) : null;
    this._applyStates(true); this._wake();
  }
  setSelected(id) {
    this.sel = id || null;
    this._applyStates(false); this._wake();
  }
  setLabelMode(m) { this.labelMode = m; this._wake(); }

  _applyStates(wave) {
    const now = performance.now();
    const hasHi = !!this.hi, sel = this.sel;
    for (const U of this.allUnits) {
      if (U.isEsc) continue;
      const id = U.u.id, isSel = id === sel, match = hasHi ? this.hi.has(id) : true;
      let dimT = 0, hT = 1, glowT = 0;
      if (hasHi) { if (match) { hT = 1.12; glowT = 0.4; } else { dimT = 1; hT = 0.5; } }
      if (sel && !isSel) { dimT = Math.max(dimT, hasHi && match ? 0.2 : 0.5); hT = Math.min(hT, hasHi && match ? 1.0 : 0.82); }
      if (id === this.hover && !isSel) { hT += 0.1; glowT = Math.max(glowT, 0.55); }
      U.s.dimT = dimT; U.s.hT = hT; U.s.glowT = glowT; U.s.selT = isSel ? 1 : 0;
      if (wave && !this.reduced) U.wake = now + clamp((U.u.center[0] + 66) / 132, 0, 1) * 220;
      else U.wake = 0;
      U.dirty = true;
    }
  }

  setHover(id) {
    if (id === this.hover) return;
    this.hover = id; this._applyStates(false); this._wake();
  }

  _applyUnit(U) {
    const s = U.s;
    U.group.scale.y = Math.max(0.02, s.h * (1 - 0.58 * s.sel));
    if (!U.capMat) return;
    const dimCol = this.tmpC.set(this.P.dim);
    U.capMat.color.copy(U.base).lerp(dimCol, s.dim * this.P.dimMix);
    U.sideMat.color.copy(U.sideBase).lerp(dimCol, s.dim * this.P.dimMix * 0.9);
    U.capMat.emissive.copy(U.base).multiplyScalar(s.glow * 0.3);
    U.sideMat.emissive.copy(U.sideBase).multiplyScalar(s.glow * 0.16);
    const rec = U.capMat.userData.rec;
    const ob = 1 - 0.93 * s.sel;
    if (rec) { rec.base = ob; rec.baseT = s.sel > 0.01; rec.baseDW = s.sel < 0.01; this._applyMat(U.R, rec); }
    if (U.roofDetail) U.roofDetail.visible = s.sel < 0.35;
    if (U.threshold) U.threshold.material.opacity = 0.55 + 0.4 * s.sel + 0.25 * s.glow;
    if (s.sel > 0.02 && !U.interior && U.u.isStore) {
      const grp = buildInterior(U.u, this.P, this.theme === 'mono' ? '#2a2a2a' : (CAT[U.u.cat]?.color || '#888'), this.theme === 'mono');
      grp.position.y = 0.0; U.R.group.add(grp); U.interior = grp;
    }
    if (U.interior) U.interior.visible = s.sel > 0.25;
  }

  _applyMat(R, rec) {
    const a = R.alpha, m = rec.m;
    m.opacity = rec.base * a;
    const t = rec.baseT || a < 0.995;
    if (m.transparent !== t) m.transparent = t;
    m.depthWrite = rec.baseDW && a > 0.5;
  }
  _applyAllFloors() {
    for (const n of Object.keys(this.floors)) {
      const R = this.floors[n];
      for (const rec of R.mats) this._applyMat(R, rec);
      R.group.visible = R.alpha > 0.01;
      R.group.position.y = R.y;
    }
  }

  // ------------------------------------------------------------------ floors & camera
  setFloorMode(mode, { fit = true, ms = 1100 } = {}) {
    if (!layoutFor(mode)) return;
    this.mode = mode;
    const lay = layoutFor(mode);
    for (const n of [1, 2]) { this.floors[n].yT = lay[n].y; this.floors[n].aT = lay[n].a; }
    if (this.reduced) for (const n of [1, 2]) { this.floors[n].y = this.floors[n].yT; this.floors[n].alpha = this.floors[n].aT; }
    this.pickables = null;
    if (fit) this.animateTo(this.viewFor(mode), ms);
    this._applyStates(false);
    this._wake(2500);
  }

  _frameBox(mode) {
    const [y0, y1] = yRange(mode);
    return { x0: -67, x1: 67, z0: -28, z1: 28, y0, y1 };
  }

  /** Fit a world box into the free area of the canvas for a given camera angle. */
  _fit(box, az, pol, margin = 0.93) {
    const W = this.W || 1000, H = this.H || 600;
    const fw = Math.max(200, W - this.insT.l - this.insT.r), fh = Math.max(200, H - this.insT.t - this.insT.b);
    const target = new THREE.Vector3((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2);
    const cam = new THREE.PerspectiveCamera(this.camera.fov, W / H, 1, 3000);
    const corners = [];
    for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) for (const z of [box.z0, box.z1]) corners.push(new THREE.Vector3(x, y, z));
    let d = 140;
    const dir = new THREE.Vector3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az));
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      cam.position.copy(target).addScaledVector(dir, d); cam.lookAt(target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let mx = 0, my = 0;
      for (const c of corners) { v.copy(c).project(cam); mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y)); }
      const k = Math.max(mx / ((fw / W) * margin), my / ((fh / H) * margin));
      d *= clamp(k, 0.5, 2); if (Math.abs(k - 1) < 0.003) break;
    }
    return { target, dist: d, az, pol };
  }

  viewFor(mode) {
    const portrait = (this.W || 1) / (this.H || 1) < 0.85;
    const az = portrait && mode !== 'both' ? 1.2 : DEFAULT_AZ;
    return this._fit(this._frameBox(mode), az, DEFAULT_POL);
  }

  _sph() {
    const off = this.tmpV.copy(this.camera.position).sub(this.controls.target);
    const r = off.length();
    return { dist: r, pol: Math.acos(clamp(off.y / r, -1, 1)), az: Math.atan2(off.x, off.z), target: this.controls.target.clone() };
  }

  animateTo(to, ms = 1000) {
    const from = this._sph();
    const goal = { az: to.az ?? from.az, pol: to.pol ?? from.pol, dist: to.dist ?? from.dist, target: to.target ? to.target.clone() : from.target };
    let da = goal.az - from.az; da = ((da + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI; goal.az = from.az + da;
    if (this.reduced || ms <= 0) { this._setCam(goal); this.tween = null; return; }
    this.tween = { from, goal, t0: performance.now(), ms };
    this._wake(ms + 400);
  }
  _setCam(s) {
    this.controls.target.copy(s.target);
    this.camera.position.set(
      s.target.x + s.dist * Math.sin(s.pol) * Math.sin(s.az), s.target.y + s.dist * Math.cos(s.pol), s.target.z + s.dist * Math.sin(s.pol) * Math.cos(s.az),
    );
    this.camera.lookAt(s.target);
    this.controls.update();
  }

  resetView() { this.animateTo(this.viewFor(this.mode), 1000); }
  zoomBy(f) { const s = this._sph(); this.animateTo({ ...s, dist: clamp(s.dist * f, 18, 900) }, 380); }
  rotateBy(d) { const s = this._sph(); this.animateTo({ ...s, az: s.az + d }, 600); }
  faceNorth() { const s = this._sph(); this.animateTo({ ...s, az: 0 }, 700); }
  azimuth() { return this._sph().az; }

  setInsets(ins) {
    this.insT = { l: ins.l || 0, r: ins.r || 0, t: ins.t || 0, b: ins.b || 0 };
    if (this.reduced) this.ins = { ...this.insT };
    this._wake(900);
  }

  flyTo(id, { floorMode, ms = 1200 } = {}) {
    const U = this.units.get(id); if (!U) return;
    const u = U.u;
    if (floorMode) this.setFloorMode(floorMode, { fit: false });
    const R = U.R;
    const radius = Math.max(u.bounds.w, u.bounds.h) / 2;
    const dist = clamp(radius * 3.4 + 22, 28, 78);
    const target = new THREE.Vector3(u.center[0], R.yT + 1.0, u.center[1]);
    const s = this._sph();
    this.animateTo({ target, dist: Math.min(dist, s.dist < dist ? dist : Math.max(dist, Math.min(s.dist, dist * 1.4))), pol: 0.9, az: s.az }, ms);
  }

  frameRoute(route, { ms = 1100 } = {}) {
    if (!route) return;
    const both = route.floors.length > 1 && this.mode === 'both';
    if (this.mode === 'both' || both) { this.animateTo(this.viewFor('both'), ms); return; }
    const leg = route.legs.find((l) => this.floors[l.floor].aT > 0.5);
    if (!leg) return;
    const pts = leg.points;
    const b = polygonBounds(pts);
    const R = this.floors[leg.floor];
    const m = 9;
    const box = { x0: b.x0 - m, x1: b.x1 + m, z0: b.y0 - m, z1: b.y1 + m, y0: R.yT, y1: R.yT + 6 };
    const v = this._fit(box, this._sph().az, 0.95, 0.92);
    this.animateTo(v, ms);
  }

  setAutoRotate(on) { this.controls.autoRotate = !!on; this.controls.autoRotateSpeed = 0.7; this._wake(); }

  setTheme(theme) {
    if (this.theme === 'mono' || theme === this.theme) return;
    this.theme = theme;
    const r = this.route && { ...this._routeArgs };
    this._buildWorld();
    if (r) this.setRoute(r.route, { instant: true });
    this._wake();
  }

  // ------------------------------------------------------------------ routing
  setRoute(route, { instant = false } = {}) {
    this._clearRoute();
    this._routeArgs = { route };
    if (!route) { this.route = null; this._wake(); return; }
    const objs = [];
    const accent = new THREE.Color(this.accent);
    const casingCol = new THREE.Color(this.theme !== 'dark' ? '#ffffff' : '#10131a');
    const legs = route.legs.map((leg) => {
      const R = this.floors[leg.floor];
      const gMain = ribbonFlat(leg.points, 0.95), gCase = ribbonFlat(leg.points, 1.55);
      const mMain = this._regMat(R, new THREE.MeshBasicMaterial({ map: this.routeTex, color: accent, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const mCase = this._regMat(R, new THREE.MeshBasicMaterial({ color: casingCol, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      const main = new THREE.Mesh(gMain, mMain), casing = new THREE.Mesh(gCase, mCase);
      main.position.y = 0.2; casing.position.y = 0.16; main.renderOrder = 6; casing.renderOrder = 5;
      R.group.add(casing, main); objs.push(main, casing);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), this._regMat(R, new THREE.MeshBasicMaterial({ color: accent, transparent: true, toneMapped: false })));
      const halo = new THREE.Sprite(this._regMat(R, new THREE.SpriteMaterial({ map: this.glowTex, color: accent, transparent: true, opacity: 0.7, depthWrite: false })));
      halo.scale.setScalar(4.2); dot.add(halo); dot.visible = false; R.group.add(dot); objs.push(dot);
      return { floor: leg.floor, R, pts: leg.points, len: gMain.userData.length, main, casing, gMain, gCase, dot, progress: instant ? 1 : 0 };
    });
    let links = [];
    if (route.links.length) {
      const l = route.links[0];
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: accent, transparent: true, toneMapped: false }), 30);
      dots.frustumCulled = false; this.scene.add(dots); objs.push(dots);
      const mk = (floor, pos) => {
        const R = this.floors[floor];
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.35, 40).rotateX(-Math.PI / 2), this._regMat(R, new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })));
        ring.position.set(pos[0], 0.24, pos[1]); R.group.add(ring); objs.push(ring); return ring;
      };
      links = [{ ...l, dots, rings: [mk(l.from, l.pos), mk(l.to, l.toPos)] }];
    }
    this._routeObjs = objs;
    const dur = legs.map((l) => clamp(l.len / 42, 0.5, 1.4));
    this.route = { ...route, legObjs: legs, links, dur, t: instant ? 99 : 0 };
    this._wake(6000);
  }
  _clearRoute() {
    if (this._routeObjs) for (const o of this._routeObjs) { o.parent?.remove(o); o.geometry?.dispose?.(); o.material?.dispose?.(); }
    this._routeObjs = null; this.route = null;
  }
  _tickRoute(dt) {
    const r = this.route; if (!r) return;
    r.t += dt;
    this.routeTex.offset.y -= dt * 0.9;
    let t = r.t;
    r.legObjs.forEach((L, i) => {
      const start = i === 0 ? 0 : r.dur[0] + 0.45 + (i - 1) * 0;
      const p = clamp((t - start) / r.dur[i], 0, 1);
      if (p !== L.progress || L.progress < 1) {
        L.progress = p;
        const segs = L.pts.length - 1;
        const count = Math.floor(segs * easeInOutCubic(p)) * 6;
        L.gMain.setDrawRange(0, count); L.gCase.setDrawRange(0, count);
      }
      if (p >= 1) {
        const d = (r.t * 12) % (L.len + 6);
        const [x, z] = pointAlong(L.pts, Math.min(d, L.len));
        L.dot.visible = d < L.len; L.dot.position.set(x, 0.7, z);
        L.dot.scale.setScalar(0.85 + 0.15 * Math.sin(r.t * 6));
      }
    });
    for (const l of r.links) {
      const A = this.floors[l.from], B = this.floors[l.to];
      const show = A.alpha > 0.5 && B.alpha > 0.5 && r.t > r.dur[0];
      l.dots.visible = show;
      if (show) {
        const m4 = new THREE.Matrix4(), N = l.dots.count;
        for (let i = 0; i < N; i++) {
          const f = ((i / N) + r.t * 0.35) % 1;
          m4.makeTranslation(l.pos[0] + (l.toPos[0] - l.pos[0]) * f, A.y + 0.4 + (B.y - A.y) * f, l.pos[1] + (l.toPos[1] - l.pos[1]) * f);
          l.dots.setMatrixAt(i, m4);
        }
        l.dots.instanceMatrix.needsUpdate = true;
      }
      l.rings.forEach((ring) => { const s = 1 + 0.25 * Math.sin(r.t * 4); ring.scale.set(s, 1, s); });
    }
  }

  // ------------------------------------------------------------------ input
  _bindEvents() {
    const cv = this.renderer.domElement;
    let down = null;
    this._onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this._onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved < 6 && dt < 700) this.onPick(this._pick(e.clientX, e.clientY));
    };
    this._onMove = (e) => {
      if (e.pointerType === 'touch' || e.buttons) return;
      this._hoverXY = [e.clientX, e.clientY];
      if (this._hoverQueued) return;
      this._hoverQueued = true;
      requestAnimationFrame(() => {
        this._hoverQueued = false; if (this.disposed) return;
        const [x, y] = this._hoverXY;
        const id = this._pick(x, y);
        cv.style.cursor = id ? 'pointer' : 'grab';
        this.setHover(id);
        this.onHover(id, x, y);
      });
    };
    this._onLeave = () => { this.setHover(null); this.onHover(null, 0, 0); };
    cv.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointerup', this._onUp);
    cv.addEventListener('pointermove', this._onMove);
    cv.addEventListener('pointerleave', this._onLeave);
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.container);
  }

  _pickList() {
    if (!this.pickables) {
      this.pickables = [];
      for (const n of Object.keys(this.floors)) { const R = this.floors[n]; if (R.aT > 0.5) this.pickables.push(...R.pick); }
    }
    return this.pickables;
  }
  _pick(cx, cy) {
    const r = this.renderer.domElement.getBoundingClientRect();
    if (!r.width) return null;
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this._pickList(), false);
    return hits.length ? hits[0].object.userData.unitId : null;
  }

  /** Screen position of a unit (px, relative to the canvas) for anchoring UI. */
  project(id) {
    const U = this.units.get(id); if (!U) return null;
    const v = new THREE.Vector3(U.u.center[0], U.R.y + U.u.h, U.u.center[1]).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H, behind: v.z > 1 };
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    if (!W || !H || (W === this.W && H === this.H)) return;
    const first = !this.W;
    this.W = W; this.H = H;
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
    this._applyViewOffset();
    this.measured = false;
    if (first) { this.ins = { ...this.insT }; this._setCam(this._introFrom ? this._introFrom() : this.viewFor(this.mode)); if (this._introTo) { this.animateTo(this._introTo(), 1800); } }
    else this.tween || this._setCam({ ...this._sph() });
    this._wake();
  }
  _applyViewOffset() {
    const { l, r, t, b } = this.ins;
    if (!l && !r && !t && !b) { if (this.camera.view?.enabled) this.camera.clearViewOffset(); }
    else this.camera.setViewOffset(this.W, this.H, -(l - r) / 2, -(t - b) / 2, this.W, this.H);
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ intro + loop
  _intro() {
    if (this.reduced || this.opts.noIntro) return;
    const now = performance.now();
    for (const n of [1, 2]) {
      const R = this.floors[n];
      R.y = R.yT + (n === 1 ? -16 : 16); R.alpha = 0;
    }
    for (const U of this.allUnits) { if (U.isEsc) continue; U.s.h = 0.02; U.wake = now + 200 + clamp((U.u.center[0] + 66) / 132, 0, 1) * 500 + (U.R.n - 1) * 160; U.dirty = true; }
    this._applyAllFloors();
    this._introTo = () => this.viewFor(this.mode);
    this._introFrom = () => { const v = this.viewFor(this.mode); return { ...v, dist: v.dist * 0.72, az: v.az - 0.7, pol: 0.62 }; };
  }

  _loop(now) {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.max(0, Math.min(0.05, (now - this._last) / 1000)); this._last = now; // rAF stamps can predate construction
    const active = now < this.activeUntil || this.controls.autoRotate;
    this.frame++;
    if (!active && this.frame % 3) return; // idle: ~20 fps is plenty for belts and twinkles
    this._step(dt || 0.016, now);
  }

  _step(dt, now) {
    this.time += dt;
    // camera tween
    if (this.tween) {
      const tw = this.tween, e = easeInOutCubic(clamp((now - tw.t0) / tw.ms, 0, 1));
      const { from, goal } = tw;
      this._setCam({
        az: from.az + (goal.az - from.az) * e, pol: from.pol + (goal.pol - from.pol) * e,
        dist: from.dist * Math.pow(goal.dist / from.dist, e), target: from.target.clone().lerp(goal.target, e),
      });
      if (now - tw.t0 >= tw.ms) this.tween = null;
    } else {
      this.controls.update();
      const t = this.controls.target;
      const cx = clamp(t.x, -72, 72), cy = clamp(t.y, -50, GAP + 40), cz = clamp(t.z, -40, 40);
      if (cx !== t.x || cy !== t.y || cz !== t.z) { this.camera.position.x += cx - t.x; this.camera.position.y += cy - t.y; this.camera.position.z += cz - t.z; t.set(cx, cy, cz); }
    }
    // insets glide
    const ki = 1 - Math.exp(-dt * 7), I = this.ins, T = this.insT;
    if (I.l !== T.l || I.r !== T.r || I.t !== T.t || I.b !== T.b) {
      for (const k of ['l', 'r', 't', 'b']) { I[k] += (T[k] - I[k]) * ki; if (Math.abs(T[k] - I[k]) < 0.5) I[k] = T[k]; }
      this._applyViewOffset();
    }
    // floors
    let floorMoved = false;
    for (const n of [1, 2]) {
      const R = this.floors[n];
      const dy = R.yT - R.y, da = R.aT - R.alpha;
      if (Math.abs(dy) > 0.01 || Math.abs(da) > 0.004) {
        const k = 1 - Math.exp(-dt * 4.6);
        R.y += dy * k; R.alpha += da * k;
        if (Math.abs(R.yT - R.y) <= 0.01) R.y = R.yT; if (Math.abs(R.aT - R.alpha) <= 0.004) R.alpha = R.aT;
        for (const rec of R.mats) this._applyMat(R, rec);
        R.group.visible = R.alpha > 0.01; R.group.position.y = R.y; floorMoved = true;
      }
    }
    // units
    const kh = 1 - Math.exp(-dt * 9), kd = 1 - Math.exp(-dt * 7), ks = 1 - Math.exp(-dt * 6);
    for (const U of this.allUnits) {
      if (!U.dirty || now < U.wake) continue;
      const s = U.s;
      s.h += (s.hT - s.h) * kh; s.dim += (s.dimT - s.dim) * kd; s.sel += (s.selT - s.sel) * ks; s.glow += (s.glowT - s.glow) * kd;
      const done = Math.abs(s.hT - s.h) < 0.002 && Math.abs(s.dimT - s.dim) < 0.004 && Math.abs(s.selT - s.sel) < 0.004 && Math.abs(s.glowT - s.glow) < 0.004;
      if (done) { s.h = s.hT; s.dim = s.dimT; s.sel = s.selT; s.glow = s.glowT; U.dirty = false; }
      this._applyUnit(U);
    }
    // ambient animation: escalator belts, sculpture twinkle
    for (const n of [1, 2]) {
      const R = this.floors[n]; if (R.alpha < 0.05) continue;
      for (const b of R.belts) b.tex.offset.x += dt * 0.5 * b.dir / 1.8 * 1.0;
      if (R.beads) R.beads.emissiveIntensity = 1.35 + Math.sin(this.time * 2.2) * 0.35;
    }
    this._tickRoute(dt);
    if (floorMoved) this.pickables = null;
    if (this.frame % 2 === 0 || this.tween || floorMoved) this._updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  /** Test/debug hook: a snapshot of engine state. */
  debug() {
    return {
      mode: this.mode, selected: this.sel, highlighted: this.hi ? [...this.hi] : null, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      floors: Object.fromEntries(Object.entries(this.floors).map(([n, R]) => [n, { y: +R.y.toFixed(2), alpha: +R.alpha.toFixed(3) }])),
      labelsVisible: this.labels.filter((l) => l.el.style.visibility === 'visible').map((l) => l.id),
      camera: this._sph(), size: [this.W, this.H],
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
    const cv = this.renderer.domElement;
    cv.removeEventListener('pointerdown', this._onDown); cv.removeEventListener('pointermove', this._onMove); cv.removeEventListener('pointerleave', this._onLeave);
    window.removeEventListener('pointerup', this._onUp);
    this._disposeWorld();
    this.controls.dispose();
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch { /* already gone */ }
    cv.remove(); this.labelsEl.remove();
    if (window.__mall === this) window.__mall = null;
  }
}
