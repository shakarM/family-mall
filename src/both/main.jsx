import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import Basic from '../simple/App.jsx';
import Advanced from '../pro/App.jsx';

const TABS = [['basic', 'Basic', 'Black & white, two levels, minimal'], ['advanced', 'Advanced', 'Search, filters and directions']];

function Page() {
  const [tab, setTab] = useState('basic');
  const go = (t) => { if (t !== tab) setTab(t); };
  return (
    <div className={`flex h-full w-full flex-col bg-bg text-ink ${tab === 'basic' ? 'theme-mono' : ''}`}>
      <nav className="relative z-40 flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-line bg-panel" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }} aria-label="Map versions">
        <p className="hidden min-w-0 truncate text-[13px] font-semibold sm:block">3D mall map <span className="font-normal text-muted">· two versions</span></p>
        <div role="tablist" className="mx-auto flex rounded-full border border-line bg-panel2 p-0.5 sm:mx-0">
          {TABS.map(([id, label, hint]) => (
            <button key={id} role="tab" aria-selected={tab === id} title={hint} onClick={() => go(id)}
              className={`focus-ring h-8 rounded-full px-5 text-[13px] font-semibold transition-colors ${tab === id ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      </nav>
      <main className="relative min-h-0 flex-1">
        {tab === 'basic' ? <Basic key="basic" /> : <Advanced key="advanced" />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Page />);
