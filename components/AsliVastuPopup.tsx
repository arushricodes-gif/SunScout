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

export default function AsliVastuPopup({ lat, lon }: Props) {
  const [result, setResult] = useState<CheckResult>({ status: 'loading' });
  const [visible, setVisible] = useState(false);

  // Every distinct lat/lon the user clicks/searches gets its own fresh check —
  // dismissing the popup for one spot never suppresses it for the next click,
  // however close by. (A previous version remembered dismissals by ~1km area
  // for 30 minutes, which meant most clicks within the same neighborhood
  // never showed the popup after the first one — that's removed here.)
  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    // The check involves a live reverse-geocode call (Nominatim) which is
    // occasionally flaky/rate-limited — retry a couple of times with a short
    // backoff before giving up, so a single transient failure doesn't make
    // the popup silently skip a location it should have shown for.
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

  // Dismissing only hides the popup for the click you're looking at right
  // now — it does not persist anywhere, so the very next click gets checked
  // and shown fresh regardless of what you just dismissed.
  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setResult({ status: 'hidden' }), 200);
  };

  if (result.status === 'loading' || result.status === 'hidden') return null;

  const ORG = '#E07B00';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '16px'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity .28s ease, transform .28s ease',
        zIndex: 2000,
        background: '#1A1A1A',
        color: '#fff',
        borderRadius: 16,
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 14px 40px rgba(0,0,0,0.4)',
        maxWidth: 560,
        width: 'calc(100% - 32px)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: result.status === 'covered' ? ORG : 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {result.status === 'covered' ? '📍' : '🏘️'}
      </div>

      {result.status === 'covered' ? (
        <>
          <div style={{ lineHeight: 1.45, flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 2 }}>
              See the neighbourhood score for this area
            </div>
            <div style={{ fontSize: 13, color: '#bbb' }}>
              Powered by <strong style={{ color: '#fff' }}>AsliVastu</strong>
              {result.city ? ` · ${result.city}` : ''}
            </div>
          </div>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            style={{
              background: ORG,
              color: '#fff',
              padding: '11px 20px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Open →
          </a>
        </>
      ) : (
        <span style={{ lineHeight: 1.45, color: '#ccc', fontSize: 14.5, flex: 1 }}>
          Neighbourhood intelligence isn't live for this region on AsliVastu yet.
        </span>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
          padding: 4,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
