import { FLOORS, CAT } from '../data/mall.js';
import { FacIcon } from './ui.jsx';

/** Flat SVG plan used when WebGL is unavailable. Same contract as the 3D canvas: select / highlight. */
export function FallbackMap({ floor = 1, selected, highlight, onPick }) {
  const f = FLOORS[floor - 1];
  const pts = (poly) => poly.map(([x, z]) => `${x},${z}`).join(' ');
  return (
    <div className="mm-stage absolute inset-0 flex items-center justify-center p-4 pt-28 pb-24">
      <svg viewBox="-70 -31 140 62" className="h-full w-full max-w-5xl" role="img" aria-label={`Level ${floor} plan`}>
        <polygon points={pts(f.outline)} fill="var(--panel)" stroke="var(--ink)" strokeWidth="0.6" />
        {f.voids.map((v) => <polygon key={v.id} points={pts(v.poly)} fill="var(--stage-b)" />)}
        {f.units.map((u) => {
          const dim = highlight && !highlight.has(u.id);
          const fill = u.isStore ? CAT[u.cat].color : 'var(--panel-2)';
          return (
            <g key={u.id} onClick={() => onPick?.(u.id)} style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1 }}>
              <polygon points={pts(u.poly)} fill={fill} stroke={selected === u.id ? 'var(--accent)' : 'rgba(0,0,0,.35)'} strokeWidth={selected === u.id ? 0.9 : 0.25} />
              {u.isStore && u.area > 60 && <text x={u.center[0]} y={u.center[1]} fontSize="2.1" fontWeight="700" textAnchor="middle" dominantBaseline="middle" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.55)', strokeWidth: 0.5 }}>{u.name}</text>}
            </g>
          );
        })}
      </svg>
      <span className="sr-only"><FacIcon type="info" /></span>
    </div>
  );
}
