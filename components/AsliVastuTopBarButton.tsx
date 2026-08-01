'use client';

import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  lat: number;
  lon: number;
  style?: CSSProperties;
  compact?: boolean; // tighter padding/font for a 4-across mobile row
}

// Minimalist icon matching the rest of the top bar's icon set (stroke-based,
// currentColor, no fill) -- intentionally not an emoji.
const IconHomeSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11L12 4l8 7" />
    <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
  </svg>
);

// Independent of the bottom AsliVastuPopup on purpose -- this stays in the
// top bar and keeps working even after that popup has been dismissed for
// the session. Renders nothing if the area isn't covered or the check
// fails; no retry logic needed here since it's not the primary prompt.
export default function AsliVastuTopBarButton({ lat, lon, style, compact }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    fetch(`/api/asli-vastu-check?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.covered) setUrl(d.url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lon]);

  if (!url) return null;

  return (
    <button
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        background: '#fff', color: '#1A1A1A',
        border: '1px solid rgba(224,123,0,0.2)', borderRadius: 8,
        padding: compact ? '8px' : '7px 12px',
        fontWeight: 700, fontSize: compact ? 12.5 : 12,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <IconHomeSmall /> AsliVastu
    </button>
  );
}
