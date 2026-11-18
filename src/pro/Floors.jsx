import { UiIcon } from '../shared/ui.jsx';

const ITEMS = [['L2', '2', 'Level 2'], ['L1', '1', 'Level 1'], ['both', null, 'Both levels']];

export function FloorSwitch({ mode, onMode, counts, wide, style }) {
  const items = wide ? ITEMS : [ITEMS[2], ITEMS[1], ITEMS[0]];
  return (
    <div role="group" aria-label="Levels" style={style}
      className={`glass absolute z-20 flex rounded-2xl border border-line p-1 shadow-float ease-out-soft transition-[right,bottom] duration-300 ${wide ? 'top-1/2 -translate-y-1/2 flex-col gap-1' : 'left-1/2 -translate-x-1/2 gap-1'}`}>
      {items.map(([m, n, label]) => {
        const on = mode === m;
        const c = m === 'both' ? (counts ? counts[1] + counts[2] : 0) : counts ? counts[Number(n)] : 0;
        return (
          <button key={m} type="button" aria-pressed={on} aria-label={label} title={label} onClick={() => onMode(m)}
            className={`focus-ring relative grid place-items-center rounded-xl transition-colors ${wide ? 'h-[3.4rem] w-[3.4rem]' : 'h-11 min-w-[3.6rem] px-3'} ${on ? 'bg-ink text-bg' : 'text-ink hover:bg-ink/10'}`}>
            {n ? (
              <span className={`flex items-baseline ${wide ? 'flex-col items-center leading-none' : 'gap-1'}`}>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-60">Level</span>
                <span className="font-display text-[1.7rem] font-extrabold leading-none">{n}</span>
              </span>
            ) : (
              <span className={`flex items-center ${wide ? 'flex-col gap-0.5' : 'gap-1.5'}`}><UiIcon name="layers" size={wide ? 20 : 17} /><span className="font-mono text-[9.5px] uppercase tracking-[0.12em]">All</span></span>
            )}
            {counts && c > 0 && <span className="anim-pop absolute -right-2 -top-2 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-accent px-1 font-mono text-[10.5px] font-semibold text-accent-ink">{c}</span>}
          </button>
        );
      })}
    </div>
  );
}
