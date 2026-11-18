import { ICONS } from '../lib/icons.js';

const PATHS = {
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM20 20l-4.8-4.8',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  home: 'M4 12 12 4.5 20 12M6.5 10.5V19h11v-8.5',
  tag: 'M4 12.2V5.5A1.5 1.5 0 0 1 5.5 4h6.7a1.5 1.5 0 0 1 1.06.44l6.3 6.3a1.5 1.5 0 0 1 0 2.12l-6.7 6.7a1.5 1.5 0 0 1-2.12 0l-6.3-6.3A1.5 1.5 0 0 1 4 12.2zM8.5 8.5h.01',
  layers: 'M12 3 3 8l9 5 9-5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5',
  walk: 'M13 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9.5 20l1.7-6.2-2.2-2 1.2-4.3 3 .3 2.3 3.4M9 11.5 6.5 13M12 14.5l2.3 2.2.7 3.3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chevron: 'M6 9l6 6 6-6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 4.5v5M7 14.5v5',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  rotate: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  stairs: 'M3.5 19.5h4.2v-4.2h4.2v-4.2h4.2V7h4.4',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
};

export function UiIcon({ name, size = 18, className = '', strokeWidth = 1.8, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function FacIcon({ type, size = 20, className = '' }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[type] }} />;
}

export function Swatch({ color, size = 10, round = true, hatched = false }) {
  return (
    <span className={`inline-block shrink-0 ${round ? 'rounded-full' : 'rounded-[3px]'}`}
      style={{ width: size, height: size, background: hatched ? `repeating-linear-gradient(135deg, ${color} 0 2px, #fff 2px 4px)` : color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
  );
}

export function StatusDot({ state }) {
  const c = state === 'open' || state === 'always' ? 'var(--ok)' : state === 'closing' ? 'var(--warn)' : state === 'soon' ? 'var(--accent)' : 'var(--bad)';
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />;
}

/** page theme: follows data-theme if the host sets it, else the OS setting */
import { useEffect, useState } from 'react';
export function useTheme() {
  const read = () => {
    const a = document.documentElement.getAttribute('data-theme');
    if (a === 'dark' || a === 'light') return a;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setT(read());
    mq.addEventListener('change', fn);
    const mo = new MutationObserver(fn); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', fn); mo.disconnect(); };
  }, []);
  return t;
}

export function useMedia(query) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const mq = window.matchMedia(query); const fn = () => setM(mq.matches); mq.addEventListener('change', fn); fn(); return () => mq.removeEventListener('change', fn); }, [query]);
  return m;
}
