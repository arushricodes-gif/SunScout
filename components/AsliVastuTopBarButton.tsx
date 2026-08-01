'use client';

import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  lat: number;
  lon: number;
  style?: CSSProperties;
}

// Independent of the bottom AsliVastuPopup on purpose -- this stays in the
// top bar and keeps working even after that popup has been dismissed for
// this location. Renders nothing if the area isn't covered or the check
// fails; no retry logic needed here since it's not the primary prompt.
export default function AsliVastuTopBarButton({ lat, lon, style }: Props) {
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
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#fff', color: '#1A1A1A',
        border: '1px solid rgba(224,123,0,0.2)', borderRadius: 8,
        padding: '7px 12px', fontWeight: 700, fontSize: 12,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      🏘️ AsliVastu
    </button>
  );
}
