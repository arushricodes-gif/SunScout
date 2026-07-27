'use client';

import { useEffect, useState } from 'react';

interface Props {
  lat: number;
  lon: number;
}

type CheckResult =
  | { status: 'loading' }
  | { status: 'covered'; url: string; city: string }
  | { status: 'not_covered' }
  | { status: 'hidden' }; // dismissed for THIS click, or check failed after retries

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 900;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Desktop: a floating rounded card, centered near the bottom, fixed max-width.
// Mobile (<=640px): a full-width bottom sheet flush with the screen edge,
// content stacked vertically instead of a cramped single row, safe-area
// padding for the iOS home-indicator. These are genuinely different layouts,
// not one layout scaled down — a horizontal row that's fine at 560px wide
// just doesn't work at 360px, no matter how small the font gets.
const CSS = `
.av-popup {
  position: fixed;
  z-index: 2000;
  background: #1A1A1A;
  color: #fff;
  box-shadow: 0 14px 40px rgba(0,0,0,0.4);
  box-sizing: border-box;
  transition: opacity .28s ease, transform .28s ease;
}
.av-popup.hide { opacity: 0; pointer-events: none; }

/* Desktop / tablet: floating card */
.av-popup {
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%) translateY(0);
  border-radius: 16px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 560px;
  width: calc(100% - 32px);
}
.av-popup.hide { transform: translateX(-50%) translateY(16px); }

.av-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.av-text { line-height: 1.45; flex: 1; min-width: 0; }
.av-title { font-size: 15.5px; font-weight: 700; margin-bottom: 2px; }
.av-sub { font-size: 13px; color: #bbb; }
.av-msg { line-height: 1.45; color: #ccc; font-size: 14.5px; flex: 1; min-width: 0; }
.av-open { background: #E07B00; color: #fff; padding: 11px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap; flex-shrink: 0; text-align: center; }
.av-close { background: transparent; border: none; color: #999; cursor: pointer; font-size: 20px; line-height: 1; padding: 4px; flex-shrink: 0; }

/* Mobile: full-width bottom sheet instead of a floating row */
@media (max-width: 640px) {
  .av-popup {
    left: 0;
    right: 0;
    bottom: 0;
    transform: translateY(0);
    border-radius: 18px 18px 0 0;
    padding: 16px 18px calc(16px + env(safe-area-inset-bottom, 0px) + 28px);
    max-width: none;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .av-popup.hide { transform: translateY(100%); }
  .av-popup .av-row { display: flex; align-items: center; gap: 14px; }
  .av-icon { width: 40px; height: 40px; font-size: 19px; }
  .av-title { font-size: 15px; }
  .av-open { width: 100%; padding: 13px 20px; font-size: 15px; }
  .av-close { position: absolute; top: 10px; right: 14px; }
}
`;

export default function AsliVastuPopup({ lat, lon }: Props) {
  const [result, setResult] = useState<CheckResult>({ status: 'loading' });
  const [visible, setVisible] = useState(false);

  // Every distinct lat/lon the user clicks/searches gets its own fresh check —
  // dismissing the popup for one spot never suppresses it for the next click,
  // however close by.
  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    (async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const r = await fetch(`/api/asli-vastu-check?lat=${lat}&lon=${lon}`);
          if (!r.ok) throw new Error(`status ${r.status}`);
          const d = await r.json();
          if (cancelled) return;
          if (d.covered) {
            setResult({ status: 'covered', url: d.url, city: d.city });
          } else {
            setResult({ status: 'not_covered' });
          }
          return;
        } catch {
          if (cancelled) return;
          if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
        }
      }
      if (!cancelled) setResult({ status: 'hidden' });
    })();

    return () => { cancelled = true; };
  }, [lat, lon]);

  useEffect(() => {
    if (result.status === 'covered' || result.status === 'not_covered') {
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [result.status]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setResult({ status: 'hidden' }), 200);
  };

  if (result.status === 'loading' || result.status === 'hidden') return null;

  return (
    <>
      <style>{CSS}</style>
      <div className={`av-popup${visible ? '' : ' hide'}`} style={{ position: 'relative' }}>
        {result.status === 'covered' ? (
          <>
            <div className="av-row">
              <div className="av-icon" style={{ background: '#E07B00' }}>📍</div>
              <div className="av-text">
                <div className="av-title">See the neighbourhood score for this area</div>
                <div className="av-sub">
                  Powered by <strong style={{ color: '#fff' }}>AsliVastu</strong>
                  {result.city ? ` · ${result.city}` : ''}
                </div>
              </div>
            </div>
            <a href={result.url} target="_blank" rel="noopener noreferrer" onClick={dismiss} className="av-open">
              Open →
            </a>
          </>
        ) : (
          <div className="av-row">
            <div className="av-icon" style={{ background: 'rgba(255,255,255,0.08)' }}>🏘️</div>
            <span className="av-msg">Neighbourhood intelligence isn't live for this region on AsliVastu yet.</span>
          </div>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="av-close">×</button>
      </div>
    </>
  );
}