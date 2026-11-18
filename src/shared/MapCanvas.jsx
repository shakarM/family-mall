import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MallEngine } from '../three/MallEngine.js';

/** Hosts the engine. State flows in through props; camera moves go through the imperative handle. */
export const MapCanvas = forwardRef(function MapCanvas(
  { theme, mono = false, clean = false, mode, selected, highlight, labels = 'auto', route, insets, spin = false, reduced = false, onPick, onHover, onFail, noIntro = false }, ref,
) {
  const host = useRef(null);
  const eng = useRef(null);
  const cb = useRef({});
  cb.current = { onPick, onHover, onFail };
  const first = useRef({ theme, mode, selected, highlight, labels, route, insets, spin });

  useEffect(() => {
    let e;
    try {
      e = new MallEngine(host.current, {
        theme, mono, clean, mode, reducedMotion: reduced, noIntro,
        onPick: (id) => cb.current.onPick?.(id),
        onHover: (id, x, y) => cb.current.onHover?.(id, x, y),
      });
    } catch (err) { cb.current.onFail?.(err); return undefined; }
    eng.current = e; window.__mall = e;
    const f = first.current;
    e.setInsets(f.insets || {}); e.setLabelMode(f.labels); e.setHighlight(f.highlight); e.setSelected(f.selected); e.setAutoRotate(f.spin);
    if (f.route) e.setRoute(f.route, { instant: true });
    return () => { e.dispose(); eng.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { eng.current?.setTheme(theme); }, [theme]);
  useEffect(() => { if (eng.current && eng.current.mode !== mode) eng.current.setFloorMode(mode); }, [mode]);
  useEffect(() => { eng.current?.setSelected(selected); }, [selected]);
  useEffect(() => { eng.current?.setHighlight(highlight); }, [highlight]);
  useEffect(() => { eng.current?.setLabelMode(labels); }, [labels]);
  useEffect(() => { eng.current?.setRoute(route || null); }, [route]);
  useEffect(() => { eng.current?.setInsets(insets || {}); }, [insets?.l, insets?.r, insets?.t, insets?.b]);
  useEffect(() => { eng.current?.setAutoRotate(spin); }, [spin]);

  useImperativeHandle(ref, () => ({
    flyTo: (id, o) => eng.current?.flyTo(id, o),
    reset: () => eng.current?.resetView(),
    zoom: (f) => eng.current?.zoomBy(f),
    rotate: (d) => eng.current?.rotateBy(d),
    faceNorth: () => eng.current?.faceNorth(),
    azimuth: () => eng.current?.azimuth() ?? 0,
    frameRoute: (r) => eng.current?.frameRoute(r),
    hover: (id) => eng.current?.setHover(id),
    engine: () => eng.current,
  }), []);

  return <div ref={host} className="mm-stage absolute inset-0 overflow-hidden" />;
});
