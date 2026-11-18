import { UiIcon } from '../shared/ui.jsx';

const btn = 'focus-ring grid h-10 w-10 place-items-center transition-colors hover:bg-ink/10 active:bg-ink/15';

export function Tools({ onReset, onZoom, style }) {
  return (
    <div className="absolute z-20 flex flex-col gap-2" style={style}>
      <div className="glass flex flex-col overflow-hidden rounded-xl border border-line shadow-float">
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => onZoom(0.8)}><UiIcon name="plus" size={18} /></button>
        <span className="h-px bg-line" />
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => onZoom(1.25)}><UiIcon name="minus" size={18} /></button>
        <span className="h-px bg-line" />
        <button type="button" className={btn} aria-label="Reset view" onClick={onReset}><UiIcon name="home" size={18} /></button>
      </div>
    </div>
  );
}
