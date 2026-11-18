// Opening hours -> live status. Uses the visitor's local clock.
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmt = (min) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

export function parseHours(str) {
  if (!str) return null;
  const [a, b] = str.split('-');
  let open = toMin(a), close = toMin(b);
  if (close <= open) close += 1440;
  return { open, close, label: `${a}–${b}` };
}

/** state: open | closing | closed | soon | always */
export function statusAt(meta, now = new Date()) {
  if (meta.soon) return { state: 'soon', label: meta.soon, short: 'Opening soon' };
  const h = parseHours(meta.hours);
  if (!h) return { state: 'always', label: 'Always open', short: 'Open' };
  let m = now.getHours() * 60 + now.getMinutes();
  if (m < h.open && m + 1440 < h.close) m += 1440; // still inside yesterday's after-midnight window
  if (m >= h.open && m < h.close) {
    const left = h.close - m;
    if (left <= 60) return { state: 'closing', label: `Closes in ${left} min`, short: `Closes ${fmt(h.close)}` };
    return { state: 'open', label: `Open · until ${fmt(h.close)}`, short: `Open until ${fmt(h.close)}` };
  }
  return { state: 'closed', label: `Closed · opens ${fmt(h.open)}`, short: `Opens ${fmt(h.open)}` };
}
export const isOpenNow = (meta, now) => { const s = statusAt(meta, now).state; return s === 'open' || s === 'closing' || s === 'always'; };
export const hoursLabel = (meta) => (parseHours(meta.hours)?.label ?? '24 hours');
