import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from '../shared/MapCanvas.jsx';
import { FallbackMap } from '../shared/FallbackMap.jsx';
import { Swatch, UiIcon, useMedia, useTheme } from '../shared/ui.jsx';
import { CAT, FACILITIES, MALL_NAME, STORES, UNIT_BY_ID } from '../data/mall.js';
import { search } from '../lib/search.js';
import { route as makeRoute } from '../lib/router.js';
import { SearchBox } from './Search.jsx';
import { FilterBar } from './Filters.jsx';
import { FloorSwitch } from './Floors.jsx';
import { Detail } from './Detail.jsx';
import { Tools } from './Tools.jsx';

const toggle = (set, v) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n; };
const GUT = 'max(16px, env(safe-area-inset-left))';

export default function App() {
  const theme = useTheme();
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const wide = useMedia('(min-width: 900px)');
  const map = useRef(null);
  const input = useRef(null);

  const [mode, setMode] = useState('both');
  const [sel, setSel] = useState(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [cats, setCats] = useState(new Set());
  const [facs, setFacs] = useState(new Set());
  const [failed, setFailed] = useState(false);
  const [fbFloor, setFbFloor] = useState(1);
  const [tip, setTip] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [dirOn, setDirOn] = useState(false);
  const [fromId, setFromId] = useState('ent-n');
  const [stepFree, setStepFree] = useState(false);

  const unit = sel ? UNIT_BY_ID[sel] : null;

  // ---- filters -> highlighted set
  const filterSet = useMemo(() => {
    const storeOn = cats.size, facOn = facs.size;
    if (!storeOn && !facOn) return null;
    const s = new Set();
    if (storeOn) for (const u of STORES) {
      if (cats.has(u.cat)) s.add(u.id);
    }
    if (facOn) for (const u of FACILITIES) if (facs.has(u.fac)) s.add(u.id);
    return s;
  }, [cats, facs]);

  const highlight = useMemo(() => {
    if (open && query.trim()) {
      const r = search(query, { limit: 24 });
      const ids = [...r.stores.map((x) => x.unit.id), ...r.facilities.map((x) => x.unit.id)];
      const set = new Set(filterSet ? ids.filter((i) => filterSet.has(i)) : ids);
      if (set.size) return set;
    }
    return filterSet;
  }, [open, query, filterSet]);

  const floorCounts = useMemo(() => {
    if (!highlight) return null;
    const c = { 1: 0, 2: 0 };
    highlight.forEach((id) => { const u = UNIT_BY_ID[id]; if (u) c[u.floor] += 1; });
    return c;
  }, [highlight]);

  const activeCount = cats.size + facs.size;
  const clearAll = () => { setCats(new Set()); setFacs(new Set()); };

  // ---- route
  const route = useMemo(() => (dirOn && sel && fromId !== sel ? makeRoute(fromId, sel, { stepFree }) : null), [dirOn, sel, fromId, stepFree]);
  useEffect(() => {
    if (!route) return;
    const m = route.floors.length > 1 ? 'both' : `L${route.floors[0]}`;
    setMode(m);
    const t = setTimeout(() => map.current?.frameRoute(route), 60);
    return () => clearTimeout(t);
  }, [route]);

  // ---- selection
  const choose = useCallback((id, { focus = true } = {}) => {
    const u = UNIT_BY_ID[id]; if (!u) return;
    setSel(id); setDirOn(false); setExpanded(false);
    setQuery(''); setOpen(false); setPreview(null);
    if (focus) setMode(`L${u.floor}`);
    try { history.replaceState(null, '', `#${id}`); } catch { /* sandboxed */ }
  }, []);
  const deselect = useCallback(() => {
    setSel(null); setDirOn(false);
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* sandboxed */ }
  }, []);
  useEffect(() => { if (sel && !dirOn) { const t = setTimeout(() => map.current?.flyTo(sel), 30); return () => clearTimeout(t); } return undefined; }, [sel, dirOn]);

  const onPick = useCallback((id) => {
    if (!id) { deselect(); return; }
    choose(id, { focus: false });
  }, [choose, deselect]);

  // deep link
  useEffect(() => {
    const id = decodeURIComponent((location.hash || '').slice(1));
    if (id && UNIT_BY_ID[id]) choose(id);
  }, [choose]);

  // keyboard
  useEffect(() => {
    const k = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); input.current?.focus(); return; }
      if (e.key !== 'Escape') return;
      if (open) { setOpen(false); input.current?.blur(); }
      else if (sel) deselect();
      else if (activeCount) clearAll();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, sel, activeCount, deselect]);


  // ---- handlers
  const onCategory = (id, only) => { setCats((c) => (only ? new Set([id]) : toggle(c, id))); setOpen(false); setQuery(''); setPreview(null); };
  const onFacility = (f) => { setFacs((s) => toggle(s, f)); setOpen(false); };
  const onSuggest = (s) => { setQuery(s); setOpen(true); input.current?.focus(); };
  const onFloor = (n) => { setMode(`L${n}`); setQuery(''); setOpen(false); };
  const onMode = (m) => { setMode(m); if (failed && m !== 'both') setFbFloor(Number(m[1])); };
  useEffect(() => { map.current?.hover?.(preview); }, [preview]);

  const dir = useMemo(() => ({
    on: dirOn, route, fromId, stepFree,
    toggle: () => { setDirOn((v) => !v); setExpanded(true); },
    setFrom: setFromId, setStepFree,
    goStep: (s) => { if (route?.floors.length === 1 || mode !== 'both') setMode(`L${s.floor}`); map.current?.frameRoute(route); },
  }), [dirOn, route, fromId, stepFree, mode]);

  const insets = useMemo(() => {
    if (wide) return { t: 140, b: 24, l: 110, r: unit ? 420 : 24 };
    const sheet = unit ? (expanded ? Math.round(window.innerHeight * 0.62) : 232) : 84;
    return { t: 132, b: sheet + 8, l: 8, r: 8 };
  }, [wide, unit, expanded]);

  const searchW = 'w-[min(34rem,calc(100vw-2rem))]';
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-ink">
      {failed ? (
        <FallbackMap floor={fbFloor} selected={sel} highlight={highlight} onPick={(id) => onPick(id)} />
      ) : (
        <MapCanvas ref={map} theme={theme} clean mode={mode} selected={sel} highlight={highlight} route={route} insets={insets} reduced={reduced}
          onPick={onPick} onFail={() => setFailed(true)} onHover={(id, x, y) => setTip(id && wide ? { id, x, y } : null)} />
      )}

      {/* brand */}
      {wide && (
        <header className="pointer-events-none absolute top-4 z-10" style={{ left: GUT }}>
          <p className="text-[1.35rem] font-bold leading-none tracking-tight">{MALL_NAME}</p>
        </header>
      )}

      {/* search + filters */}
      <div className={`absolute left-1/2 top-3 z-30 -translate-x-1/2 ${searchW} sm:top-4`}>
        <SearchBox inputRef={input} query={query} setQuery={setQuery} open={open} setOpen={setOpen} wide={wide}
          onChoose={(id) => choose(id)} onCategory={onCategory} onFacility={onFacility} onSuggest={onSuggest} onFloor={onFloor}
          onPreview={setPreview} activeCats={cats} activeFacs={facs} />
      </div>
      {open && <button type="button" aria-label="Close search" tabIndex={-1} className="absolute inset-0 z-20 cursor-default bg-bg/30" onClick={() => setOpen(false)} />}
      <div className={`absolute left-1/2 top-[4.1rem] z-10 -translate-x-1/2 sm:top-[4.6rem] ${wide ? 'w-[min(60rem,calc(100vw-2rem))]' : 'w-[calc(100vw-1rem)]'}`}>
        <FilterBar cats={cats} facs={facs} activeCount={activeCount}
          onCat={(id) => setCats((c) => toggle(c, id))} onFac={onFacility} onClear={clearAll} />
      </div>

      {/* floors */}
      {wide
        ? <FloorSwitch mode={mode} onMode={onMode} counts={floorCounts} wide style={{ left: GUT }} />
        : <FloorSwitch mode={mode} onMode={onMode} counts={floorCounts} style={{ bottom: unit ? (expanded ? 'calc(62dvh + 0.75rem)' : 'calc(14rem + 0.75rem)') : 'max(1rem, env(safe-area-inset-bottom))' }} />}

      <Tools onReset={() => map.current?.reset()} onZoom={(f) => map.current?.zoom(f)}
        style={{ left: GUT, bottom: wide ? '1rem' : (unit ? (expanded ? 'calc(62dvh + 0.75rem)' : 'calc(14rem + 0.75rem)') : 'max(1rem, env(safe-area-inset-bottom))') }} />

      {unit && <Detail unit={unit} wide={wide} expanded={expanded} onToggle={() => setExpanded((v) => !v)} onClose={deselect} dir={dir} />}

      {tip && !unit && <Tip tip={tip} />}
    </div>
  );
}

function Tip({ tip }) {
  const u = UNIT_BY_ID[tip.id];
  if (!u) return null;
  return (
    <div className="glass pointer-events-none fixed z-20 flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold shadow-float" style={{ left: tip.x + 14, top: tip.y + 14 }}>
      {u.isStore && <Swatch color={CAT[u.cat].color} />}{u.name}<span className="font-mono text-[11px] font-normal text-muted">L{u.floor}</span>
    </div>
  );
}
void UiIcon;
