import { useEffect, useMemo, useRef, useState } from 'react';
import { UiIcon, Swatch, FacIcon } from '../shared/ui.jsx';
import { CATEGORIES, CAT, FACILITY_TYPES, FACILITY_FILTERS, countsByCategory, FACILITIES } from '../data/mall.js';
import { search, SUGGESTIONS } from '../lib/search.js';

function Hl({ text, tokens }) {
  if (!tokens?.length) return text;
  const lower = text.toLowerCase();
  const marks = new Array(text.length).fill(false);
  for (const t of tokens) { let i = lower.indexOf(t); while (i > -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = lower.indexOf(t, i + t.length); } }
  const out = []; let buf = '', cur = false;
  [...text].forEach((ch, i) => { if (marks[i] !== cur) { out.push([cur, buf]); buf = ''; cur = marks[i]; } buf += ch; });
  out.push([cur, buf]);
  return out.map(([m, s], i) => (m ? <mark key={i} className="rounded-[3px] bg-accent-soft px-px text-accent">{s}</mark> : <span key={i}>{s}</span>));
}

const counts = countsByCategory();

export function SearchBox({ inputRef, query, setQuery, open, setOpen, onChoose, onCategory, onFacility, onSuggest, onFloor, onPreview, wide, activeCats, activeFacs }) {
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const res = useMemo(() => search(query, { limit: 8 }), [query]);

  const rows = useMemo(() => {
    const r = [];
    if (query.trim()) {
      res.floors.forEach((n) => r.push({ type: 'floor', n }));
      res.categories.forEach((c) => r.push({ type: 'cat', cat: c.cat }));
      res.stores.forEach((x) => r.push({ type: 'store', unit: x.unit, why: x.why }));
      res.facilities.forEach((x) => r.push({ type: 'fac', unit: x.unit }));
    }
    return r;
  }, [res, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { const row = rows[active]; onPreview?.(open && row && (row.type === 'store' || row.type === 'fac') ? row.unit.id : null); }, [active, rows, open]); // eslint-disable-line
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const act = (row) => {
    if (!row) return;
    if (row.type === 'store' || row.type === 'fac') onChoose(row.unit.id);
    else if (row.type === 'cat') onCategory(row.cat.id, true);
    else if (row.type === 'floor') onFloor(row.n);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); act(rows[active]); }
    else if (e.key === 'Escape') { if (query) setQuery(''); else { setOpen(false); e.currentTarget.blur(); } }
  };

  const has = query.trim().length > 0;
  return (
    <div className="relative w-full">
      <label className={`glass flex h-12 items-center gap-2.5 rounded-2xl border px-3.5 shadow-float transition-shadow ${open ? 'border-accent ring-2 ring-accent/30' : 'border-line'}`}>
        <UiIcon name="search" size={19} className="text-muted" />
        <input
          ref={inputRef} type="search" value={query} autoComplete="off" spellCheck={false}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder="Search stores, food, services…" aria-label="Search the mall" role="combobox" aria-expanded={open} aria-controls="mm-results"
          className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-faint" />
        {has ? (
          <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-ink/10"><UiIcon name="close" size={15} /></button>
        ) : null}
      </label>

      {open && (
        <div id="mm-results" ref={listRef} role="listbox" className="glass anim-rise scroll-thin absolute inset-x-0 top-[3.5rem] z-30 max-h-[min(30rem,calc(100dvh-9rem))] overflow-y-auto rounded-2xl border border-line p-2 shadow-float">
          {!has && (
            <div className="space-y-4 p-2">
              <section>
                <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">Browse</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.filter((c) => c.id !== 'soon').map((c) => (
                    <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onCategory(c.id)} aria-pressed={activeCats.has(c.id)}
                      className={`focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors ${activeCats.has(c.id) ? 'border-ink bg-ink text-bg' : 'border-line hover:bg-ink/5'}`}>
                      <Swatch color={c.color} size={10} /><span className="min-w-0 flex-1 truncate">{c.label}</span><span className="font-mono text-[11px] opacity-60">{counts[c.id]}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">Facilities</h3>
                <div className="flex flex-wrap gap-1.5">
                  {FACILITY_FILTERS.map((f) => (
                    <button key={f} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onFacility(f)} aria-pressed={activeFacs.has(f)}
                      className={`focus-ring flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${activeFacs.has(f) ? 'border-ink bg-ink text-bg' : 'border-line hover:bg-ink/5'}`}>
                      <FacIcon type={FACILITY_TYPES[f].icon} size={15} />{FACILITY_TYPES[f].label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {has && rows.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-[14.5px] font-semibold">Nothing matches “{query}”</p>
              <p className="mt-1 text-[13px] text-muted">Try a product (shoes, perfume), a food (ramen), or a service (restroom, ATM).</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.slice(0, 4).map((s) => <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSuggest(s)} className="rounded-full bg-panel2 px-2.5 py-1 text-[12.5px] text-muted hover:text-ink">{s}</button>)}
              </div>
            </div>
          )}

          {has && rows.length > 0 && (
            <ul className="space-y-0.5">
              {rows.map((row, i) => {
                const on = i === active;
                const base = `focus-ring flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${on ? 'bg-accent-soft' : 'hover:bg-ink/5'}`;
                const common = { 'data-active': on, onMouseEnter: () => setActive(i), onMouseDown: (e) => e.preventDefault(), onClick: () => act(row), role: 'option', 'aria-selected': on };
                if (row.type === 'cat') return (
                  <li key={`c${row.cat.id}`}><button type="button" className={base} {...common}>
                    <Swatch color={row.cat.color} size={12} round={false} /><span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">Show all {row.cat.label}</span><span className="block text-[12px] text-muted">{counts[row.cat.id]} places · filter the map</span></span><UiIcon name="sliders" size={16} className="text-muted" />
                  </button></li>
                );
                if (row.type === 'floor') return (
                  <li key={`f${row.n}`}><button type="button" className={base} {...common}>
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-ink font-display text-[15px] font-extrabold text-bg">{row.n}</span><span className="min-w-0 flex-1 text-[14px] font-semibold">Show Level {row.n}</span><UiIcon name="layers" size={16} className="text-muted" />
                  </button></li>
                );
                const u = row.unit;
                return (
                  <li key={u.id}><button type="button" className={base} {...common}>
                    {u.isStore ? <Swatch color={CAT[u.cat].color} size={12} round={false} hatched={u.cat === 'soon'} /> : <span className="grid h-6 w-6 place-items-center rounded-md bg-panel2"><FacIcon type={FACILITY_TYPES[u.fac].icon} size={15} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold"><Hl text={u.name} tokens={res.tokens} /></span>
                      <span className="flex items-center gap-1.5 truncate text-[12px] text-muted">
                        {u.isStore ? CAT[u.cat].label : FACILITY_TYPES[u.fac].label}
                      </span>
                    </span>
                    <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted">L{u.floor}</span>
                  </button></li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
void FACILITIES;
