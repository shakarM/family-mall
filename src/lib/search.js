// Forgiving search over stores, facilities, categories and floors.
// Tokens are AND-ed; each token may hit the name, tags, category, keywords/synonyms, description or floor,
// with exact / prefix / substring / one-typo matching. The result says *why* it matched.
import { ALL_UNITS, CAT, CATEGORIES, FACILITY_TYPES } from '../data/mall.js';
import { isOpenNow } from './hours.js';

const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ');
const tokens = (s) => strip(s).split(/[^a-z0-9]+/).filter(Boolean);

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i], best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function match(q, f) {
  if (f === q) return 1;
  if (q.length >= 2 && f.startsWith(q)) return 0.86;
  if (q.length >= 4 && f.includes(q)) return 0.5;
  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    if (lev(q, f.slice(0, Math.max(q.length, Math.min(f.length, q.length + 1))), max) <= max || lev(q, f, max) <= max) return 0.46;
  }
  return 0;
}

const FLOOR_WORDS = { 1: ['level', 'floor', '1', 'l1', 'one', 'ground', 'lower'], 2: ['level', 'floor', '2', 'l2', 'two', 'upper', 'second', 'upstairs'] };

const DOCS = ALL_UNITS.filter((u) => !(u.fac === 'escalator' && u.floor === 2)).map((u) => {
  const cat = u.cat ? CAT[u.cat] : null;
  const facLabel = u.fac ? FACILITY_TYPES[u.fac]?.label : null;
  const fields = [
    { w: 10, label: 'name', toks: tokens(u.name) },
    { w: 6, label: 'tag', toks: u.tags.flatMap((t) => tokens(t).map((x) => [x, t])).map(([x]) => x), raw: u.tags },
    { w: 5, label: 'category', toks: cat ? [...tokens(cat.label), cat.id] : facLabel ? tokens(facLabel) : [] },
    { w: 4.2, label: 'also', toks: u.kw.flatMap(tokens), raw: u.kw },
    { w: 2, label: 'about', toks: tokens(u.line || '') },
    { w: 2.5, label: 'floor', toks: FLOOR_WORDS[u.floor] },
  ];
  if (u.deal) fields.push({ w: 3.5, label: 'deal', toks: ['deal', 'deals', 'sale', 'offer', 'offers', 'discount', ...tokens(u.deal)] });
  return { u, fields, nameStr: strip(u.name) };
});

export function search(query, { now = new Date(), limit = 14 } = {}) {
  let q = strip(query.trim());
  let requireOpen = false;
  if (/\bopen now\b|\bopen\b/.test(q) && q.split(/\s+/).length >= 1 && /\bopen( now)?\b/.test(q)) {
    requireOpen = true;
    q = q.replace(/\bopen now\b/, ' ').replace(/\bopen\b/, ' ');
  }
  const qt = tokens(q);
  if (!qt.length && !requireOpen) return { stores: [], facilities: [], categories: [], floors: [], tokens: [] };

  const out = [];
  for (const d of DOCS) {
    if (requireOpen && d.u.isStore && !isOpenNow(d.u, now)) continue;
    if (requireOpen && !d.u.isStore) continue;
    let total = 0, ok = true, why = null, whyScore = 0, nameHits = 0;
    for (const t of qt) {
      let best = 0, bestF = null, bestRaw = null;
      for (const f of d.fields) {
        for (let i = 0; i < f.toks.length; i++) {
          const m = match(t, f.toks[i]);
          if (m * f.w > best) { best = m * f.w; bestF = f; bestRaw = f.raw ? f.raw[Math.min(i, f.raw.length - 1)] : f.toks[i]; }
        }
      }
      if (best <= 0) { ok = false; break; }
      total += best;
      if (bestF.label === 'name') nameHits++;
      else if (best > whyScore && bestF.label !== 'floor') { whyScore = best; why = bestRaw; }
    }
    if (!ok) continue;
    if (nameHits === qt.length) total += 6;
    if (qt.length && d.nameStr.startsWith(qt.join(' '))) total += 8;
    if (d.u.anchor) total += 0.4;
    if (d.u.cat === 'soon') total -= 3;
    out.push({ unit: d.u, score: total, why: qt.length && why ? String(why) : null });
  }
  out.sort((a, b) => b.score - a.score || a.unit.name.localeCompare(b.unit.name));
  const stores = out.filter((r) => r.unit.isStore).slice(0, limit);
  const facilities = out.filter((r) => !r.unit.isStore).slice(0, 5);

  const categories = [];
  for (const c of CATEGORIES) {
    if (c.id === 'soon') continue;
    const ctoks = [...tokens(c.label), c.id];
    let s = 0;
    for (const t of qt) { let b = 0; for (const f of ctoks) b = Math.max(b, match(t, f)); if (!b) { s = 0; break; } s += b; }
    if (qt.length && s >= qt.length * 0.8) categories.push({ cat: c, score: s });
  }
  const floors = [];
  if (qt.length) for (const n of [1, 2]) {
    const ok = qt.every((t) => FLOOR_WORDS[n].some((w) => match(t, w) >= 0.86)) && qt.some((t) => /^(l?[12]|level|floor|upper|ground|lower|upstairs)$/.test(t));
    if (ok && qt.some((t) => /^(l?[12]|one|two|ground|upper|lower|upstairs|second)$/.test(t))) floors.push(n);
  }
  return { stores, facilities, categories: categories.sort((a, b) => b.score - a.score).slice(0, 2), floors, tokens: qt, requireOpen };
}

export const SUGGESTIONS = ['coffee', 'shoes', 'kids', 'restroom', 'phone repair', 'cinema', 'gifts', 'open now'];
