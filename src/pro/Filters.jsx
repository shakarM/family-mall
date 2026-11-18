import { useEffect, useRef, useState } from 'react';
import { UiIcon, Swatch, FacIcon } from '../shared/ui.jsx';
import { CATEGORIES, FACILITY_TYPES, FACILITY_FILTERS, FACILITIES, countsByCategory } from '../data/mall.js';

const counts = countsByCategory();
const facCounts = FACILITY_FILTERS.reduce((m, f) => ({ ...m, [f]: FACILITIES.filter((u) => u.fac === f).length }), {});

const chip = (on) => `focus-ring glass flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${on ? 'border-ink bg-ink text-bg' : 'border-line text-ink hover:border-ink/40'}`;

export function FilterBar({ cats, facs, onCat, onFac, onClear, activeCount }) {
  const [pop, setPop] = useState(false);
  const btn = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!pop) return undefined;
    const r = btn.current.getBoundingClientRect();
    setPos({ left: Math.min(r.left, window.innerWidth - 300), top: r.bottom + 8 });
    const close = (e) => { if (!e.target.closest?.('[data-fac-pop]') && !btn.current.contains(e.target)) setPop(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [pop]);
  const facActive = facs.size;

  return (
    <div className="relative">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1" style={{ maskImage: 'linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 28px), transparent 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 28px), transparent 100%)' }}>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className={`${chip(false)} anim-pop border-accent text-accent`}><UiIcon name="close" size={13} />Clear · {activeCount}</button>
        )}
        {CATEGORIES.filter((c) => c.id !== 'soon').map((c) => (
          <button key={c.id} type="button" onClick={() => onCat(c.id)} aria-pressed={cats.has(c.id)} className={chip(cats.has(c.id))}>
            <Swatch color={c.color} size={9} />{c.label}
          </button>
        ))}
        <button ref={btn} type="button" onClick={() => setPop((p) => !p)} aria-expanded={pop} className={chip(facActive > 0 || pop)}>
          <UiIcon name="sliders" size={14} />Facilities{facActive > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-bg px-1 font-mono text-[10.5px] text-ink">{facActive}</span>}
        </button>
      </div>
      {pop && (
        <div data-fac-pop className="glass anim-rise fixed z-40 w-[18.5rem] rounded-2xl border border-line p-2 shadow-float" style={{ left: pos.left, top: pos.top }}>
          <div className="grid grid-cols-2 gap-1.5">
            {FACILITY_FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => onFac(f)} aria-pressed={facs.has(f)}
                className={`focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${facs.has(f) ? 'border-ink bg-ink text-bg' : 'border-line hover:bg-ink/5'}`}>
                <FacIcon type={FACILITY_TYPES[f].icon} size={17} /><span className="flex-1">{FACILITY_TYPES[f].label}</span><span className="font-mono text-[11px] opacity-55">{facCounts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
