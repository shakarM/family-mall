// Facility glyphs on a 24x24 grid. Used as SVG in the UI and as textures on the 3D blocks.
const S = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor" stroke="none"';

export const ICONS = {
  info: `<g ${F}><circle cx="12" cy="5.4" r="1.9"/></g><path ${S} d="M12 10v8.4"/><path ${S} d="M9.6 10.2h2.4M9.6 18.6h4.8"/>`,
  lift: `<rect ${S} x="5" y="3" width="14" height="18" rx="1.6"/><path ${S} d="M9.2 9.4 12 6.6l2.8 2.8M9.2 14.6 12 17.4l2.8-2.8"/>`,
  escalator: `<path ${S} d="M3.5 19.5h4v-3.6h4v-3.6h4V8.7h5"/><path ${S} d="M13.6 3.8l3.4 0 0 3.4M17 3.8l-5 5"/>`,
  restroom: `<g ${F}><circle cx="7.4" cy="4.8" r="1.8"/><path d="M4.6 8.6h5.6a.8.8 0 0 1 .8.8V14H9.6v6H7.9v-4.6H6.9V20H5.2v-6H4v-4.6a.8.8 0 0 1 .6-.8z"/><circle cx="16.6" cy="4.8" r="1.8"/><path d="M16.6 8.4c-1 0-1.7.5-2 1.5l-1.7 4.6h1.8V20h1.8v-5.5h.2V20h1.8v-5.5h1.8l-1.7-4.6c-.3-1-1-1.5-2-1.5z"/></g>`,
  parking: `<rect ${S} x="4" y="4" width="16" height="16" rx="3"/><path ${S} d="M10 16.6V7.8h3.2a2.5 2.5 0 0 1 0 5H10"/>`,
  atm: `<rect ${S} x="3.5" y="6" width="17" height="12" rx="2.4"/><path ${S} d="M12 9v6M13.9 10.2c-.5-.5-1.2-.7-1.9-.7-1 0-1.8.5-1.8 1.3 0 1.9 3.9.9 3.9 2.7 0 .8-.8 1.3-1.9 1.3-.8 0-1.5-.3-2-.8"/>`,
  feature: `<circle ${S} cx="12" cy="12" r="3"/><circle ${S} cx="12" cy="12" r="7.6" stroke-dasharray="2.2 2.6"/>`,
  entrance: `<path ${S} d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M3 20h18"/><path ${S} d="M17 9.5l2.5 2.5-2.5 2.5M19.5 12H11"/>`,
};

export function iconSvg(type, { size = 24, color = 'currentColor', extra = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" color="${color}" ${extra}>${ICONS[type]}</svg>`;
}
export function iconDataUrl(type, color = '#ffffff') {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(type, { size: 128, color }))}`;
}
