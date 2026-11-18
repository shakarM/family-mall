import { UiIcon, Swatch, StatusDot, FacIcon } from '../shared/ui.jsx';
import { CAT, FACILITY_TYPES, GATES, UNIT_BY_ID } from '../data/mall.js';
import { statusAt, hoursLabel } from '../lib/hours.js';

const STEP_ICON = { start: 'home', walk: 'walk', lift: 'layers', escalator: 'layers', arrive: 'check' };

export function Detail({ unit, wide, expanded, onToggle, onClose, dir }) {
  const status = unit.isStore ? statusAt(unit) : null;
  const label = unit.isStore ? CAT[unit.cat].label : FACILITY_TYPES[unit.fac].label;
  const r = dir.route;

  const shell = wide
    ? 'right-4 top-[8.25rem] bottom-4 w-[24rem] max-h-[calc(100dvh-9.5rem)]'
    : `inset-x-0 bottom-0 rounded-b-none ${expanded ? 'h-[62dvh]' : 'h-[14rem]'} transition-[height] duration-300`;

  return (
    <aside className={`glass anim-rise absolute z-20 flex flex-col overflow-hidden rounded-2xl border border-line shadow-float ${shell}`} aria-label={`${unit.name} details`}>
      {!wide && (
        <button type="button" onClick={onToggle} aria-label={expanded ? 'Collapse details' : 'Expand details'} className="focus-ring grid h-6 w-full shrink-0 place-items-center">
          <span className="h-1 w-10 rounded-full bg-line" />
        </button>
      )}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-1 sm:pt-4">
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-muted">
            {unit.isStore ? <Swatch color={CAT[unit.cat].color} hatched={unit.cat === 'soon'} /> : <FacIcon type={FACILITY_TYPES[unit.fac].icon} size={15} />}
            <span>{label}</span>
            <span className="rounded bg-ink px-1.5 py-0.5 text-bg">Level {unit.floor}</span>
          </p>
          <button type="button" aria-label="Close details" onClick={onClose} className="focus-ring -mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-ink/10"><UiIcon name="close" size={16} /></button>
        </div>
        <h2 className="mt-2 text-[1.75rem] font-bold leading-[1.05] tracking-tight">{unit.name}</h2>
        {unit.line && <p className="mt-1.5 text-[14px] leading-snug text-muted">{unit.line}</p>}

        {status && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-semibold"><StatusDot state={status.state} />{status.label}<span className="font-normal text-muted">· {hoursLabel(unit)}</span></p>
        )}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={dir.toggle} aria-pressed={dir.on}
            className={`focus-ring flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-bold transition-colors ${dir.on ? 'border border-ink text-ink' : 'bg-accent text-accent-ink hover:brightness-110'}`}>
            <UiIcon name="walk" size={18} />{dir.on ? 'Hide directions' : 'Directions'}
          </button>
        </div>

        {dir.on && (
          <section className="anim-rise mt-4 rounded-xl border border-line bg-panel2/70 p-3" aria-label="Directions">
            <label className="block font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint" htmlFor="mm-from">Start from</label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <select id="mm-from" value={dir.fromId} onChange={(e) => dir.setFrom(e.target.value)}
                  className="focus-ring h-10 w-full appearance-none truncate rounded-lg border border-line bg-panel pl-3 pr-8 text-[13.5px] font-semibold">
                  <optgroup label="Entrances">{GATES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</optgroup>
                  <optgroup label="Landmarks">
                    <option value="info">Information desk</option>
                    <option value="halo">Halo sculpture</option>
                  </optgroup>
                  {!GATES.some((g) => g.id === dir.fromId) && !['info', 'halo'].includes(dir.fromId) && UNIT_BY_ID[dir.fromId] && <optgroup label="Picked"><option value={dir.fromId}>{UNIT_BY_ID[dir.fromId].name}</option></optgroup>}
                </select>
                <UiIcon name="chevron" size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>
            <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" checked={dir.stepFree} onChange={(e) => dir.setStepFree(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Step-free route <span className="font-normal text-muted">(elevators only)</span>
            </label>

            {!r && <p className="mt-3 text-[13px] text-muted">{dir.fromId === unit.id ? 'Choose a different starting point.' : 'No route found for that start point.'}</p>}
            {r && (
              <>
                <p className="mt-3 flex items-baseline gap-2 border-t border-line pt-3">
                  <span className="text-[2rem] font-bold leading-none">{r.minutes}</span><span className="text-[13px] font-semibold">min walk</span>
                  <span className="font-mono text-[12px] text-muted">{r.meters} m{r.floors.length > 1 ? ' · 2 levels' : ''}</span>
                </p>
                <ol className="mt-2.5 space-y-0.5">
                  {r.steps.map((s, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => dir.goStep(s)} className="focus-ring flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-ink/5">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.kind === 'arrive' ? 'bg-accent text-accent-ink' : 'bg-ink text-bg'}`}><UiIcon name={STEP_ICON[s.kind] || 'walk'} size={13} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold leading-snug">{s.text}</span>{s.sub && <span className="block text-[12px] text-muted">{s.sub}</span>}</span>
                        <span className="mt-0.5 font-mono text-[11px] text-faint">L{s.floor}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
