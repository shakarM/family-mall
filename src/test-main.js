import { MallEngine } from './three/MallEngine.js';
const el = document.getElementById('app');
const params = new URLSearchParams(location.search);
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
const e = new MallEngine(el, { theme: params.get('theme') || 'light', noIntro: params.has('nointro'), onPick: (id) => { window.__picked = id; } });
window.__mall = e;
