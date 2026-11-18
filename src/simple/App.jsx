import { useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from '../shared/MapCanvas.jsx';
import { FallbackMap } from '../shared/FallbackMap.jsx';
import { UiIcon, useMedia } from '../shared/ui.jsx';
import { UNIT_BY_ID, MALL_NAME } from '../data/mall.js';
import { search } from '../lib/search.js';

const GUT = 'max(16px, env(safe-area-inset-left))';
const LEVELS = [['both', 'Both'], ['L1', 'Level 1'], ['L2', 'Level 2']];

// Basic map: black & white 3D plan, two levels, a search box and a level switch. Nothing else.
export default function App() {
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const wide = useMedia('(min-width: 768px)');
  const map = useRef(null);
  const [mode, setMode] = useState('both');
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fbFloor, setFbFloor] = useState(1);

  const unit = sel ? UNIT_BY_ID[sel] : null;
  const results = useMemo(() => (q.trim() ? search(q, { limit: 5 }).stores : []), [q]);

  const choose = (id, fromSearch) => {
    const u = UNIT_BY_ID[id];
    setSel(id);
    if (fromSearch || mode !== 'both') setMode(`L${u.floor}`);
    setQ(''); setFocus(false);
  };
  useEffect(() => { if (sel) map.current?.flyTo(sel); }, [sel]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { setSel(null); setQ(''); setFocus(false); document.activeElement?.blur?.(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const insets = useMemo(() => (wide ? { t: 70, b: 84, r: unit ? 340 : 0, l: 0 } : { t: 110, b: unit ? 250 : 100, l: 0, r: 0 }), [wide, unit]);
  const words = MALL_NAME.split(' ');

  return (
    <div className="theme-mono relative h-full w-full overflow-hidden bg-bg text-ink">
      {failed ? (
        <FallbackMap floor={fbFloor} selected={sel} highlight={null} onPick={(id) => setSel(id)} />
      ) : (
        <MapCanvas ref={map} theme="light" mono mode={mode} selected={sel} highlight={null} insets={insets} reduced={reduced}
          onPick={(id) => (id ? choose(id) : setSel(null))} onFail={() => setFailed(true)} />
      )}

      <header className="pointer-events-none absolute left-0 top-0 pt-4" style={{ paddingLeft: GUT }}>
        <h1 className="text-[1.6rem] font-bold leading-none tracking-tight sm:text-[2rem]">{words[0]}<br />{words[1]}</h1>
        <p className="mt-1.5 text-[12px] text-muted">Mall map</p>
      </header>

      <div className="absolute right-0 top-0 w-[min(20rem,calc(100%-9rem))] pt-4 sm:w-[21rem]" style={{ paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
        <label className="glass flex h-11 items-center gap-2 rounded-full border border-line px-3.5 shadow-float focus-within:border-ink">
          <UiIcon name="search" size={17} className="text-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 140)}
            onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) choose(results[0].unit.id, true); }}
            placeholder="Find a store" aria-label="Find a store" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
          {q && <button type="button" aria-label="Clear" onClick={() => setQ('')} className="focus-ring grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-ink/10"><UiIcon name="close" size={14} /></button>}
        </label>
        {focus && q.trim() && (
          <ul className="glass anim-rise mt-2 overflow-hidden rounded-2xl border border-line py-1 shadow-float" role="listbox">
            {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No store matches “{q}”.</li>}
            {results.map((r) => (
              <li key={r.unit.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(r.unit.id, true)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-ink/5">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.unit.name}</span>
                  <span className="text-[12px] text-muted">Level {r.unit.floor}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unit && (
        <aside className={`glass anim-rise absolute z-10 rounded-2xl border border-line p-4 shadow-float ${wide ? 'right-4 top-[4.75rem] w-[20rem]' : 'inset-x-4 bottom-[5.2rem]'}`} aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-muted">Level {unit.floor}</p>
            <button type="button" aria-label="Close" onClick={() => setSel(null)} className="focus-ring -mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-ink/10"><UiIcon name="close" size={16} /></button>
          </div>
          <h2 className="text-[1.6rem] font-bold leading-tight tracking-tight">{unit.name}</h2>
          {unit.line && <p className="mt-1 text-[14px] leading-snug text-muted">{unit.line}</p>}
        </aside>
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))]">
        <div role="group" aria-label="Levels" className="glass pointer-events-auto flex rounded-full border border-line p-1 shadow-float">
          {LEVELS.map(([m, label]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); if (failed && m !== 'both') setFbFloor(Number(m[1])); }}
              className={`focus-ring h-9 rounded-full px-4 text-[13px] font-semibold transition-colors ${mode === m ? 'bg-ink text-bg' : 'text-ink hover:bg-ink/10'}`}>{label}</button>
          ))}
        </div>
      </footer>
    </div>
  );
}
