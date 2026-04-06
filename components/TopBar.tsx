'use client';

import { useState } from 'react';

interface TopBarProps {
  coords: [number, number];
  setCoords: (c: [number, number]) => void;
  targetDate: string;
  setTargetDate: (d: string) => void;
  onGpsClick: () => void;
  activeTab: number;
  setActiveTab: (i: number) => void;
}

const ORG = '#E07B00';
const ORG_LT = '#FFF3E0';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_SUB = '#888888';

export default function TopBar({ coords, setCoords, targetDate, setTargetDate, onGpsClick, activeTab, setActiveTab }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await r.json();
      if (data.result) { setCoords(data.result); setSearchError(''); }
      else setSearchError('Not found');
    } catch { setSearchError('Failed'); }
    finally { setSearching(false); }
  };

  return (
    <div style={{ background: WHITE, borderBottom: `2px solid ${ORG_LT}`, boxShadow: '0 2px 16px rgba(224,123,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ background: '#FFF8F0', borderBottom: '1px solid rgba(224,123,0,0.2)', padding: '4px 20px', fontSize: 12, fontWeight: 600, color: '#888', textAlign: 'center' }}>
        💻 Best viewed on desktop — not suitable for mobile
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', flexWrap: 'wrap' }}>

        {/* Logo */}
        <div onClick={() => setActiveTab(0)} style={{ cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="2" x2="18" y2="8" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="18" y1="28" x2="18" y2="34" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="2" y1="18" x2="8" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="28" y1="18" x2="34" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6.1" y1="6.1" x2="10.3" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="6.1" x2="21.5" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="6.1" y1="29.9" x2="10.3" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="29.9" x2="21.5" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="18" cy="18" r="9" fill="#FFF3E0" stroke="#F39C12" strokeWidth="1.5"/>
            <circle cx="18" cy="18" r="6.5" fill="#E07B00"/>
            <circle cx="15.5" cy="15.5" r="2" fill="rgba(255,255,255,0.3)"/>
          </svg>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: ORG, letterSpacing: 3, lineHeight: 1 }}>SUN SCOUT</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, fontWeight: 600, color: '#aaa', letterSpacing: 3, textTransform: 'uppercase' }}>Visualize the Light</div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: ORG_LT, flexShrink: 0 }} />

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '1 1 200px', minWidth: 180 }}>
          <input className="input-field" placeholder="Search for a place..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: 14 }} />
          <button type="submit" className="btn-primary" disabled={searching} style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontSize: 13 }}>{searching ? '...' : '🔍'}</button>
          {searchError && <span style={{ color: '#c00', fontSize: 12 }}>{searchError}</span>}
        </form>

        {/* GPS */}
        <button className="btn-primary" onClick={onGpsClick} style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>📍 My Location</button>

        {/* Coords */}
        <div style={{ background: ORG_LT, border: '1px solid rgba(224,123,0,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: TEXT_DARK, whiteSpace: 'nowrap', flexShrink: 0 }}>
          📌 {coords[0].toFixed(3)}°, {coords[1].toFixed(3)}°
        </div>

        <div style={{ width: 1, height: 32, background: ORG_LT, flexShrink: 0 }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: ORG_LT, borderRadius: 12, padding: 4, flexShrink: 0 }}>
          {['📖 Guide', '☀️ Sun Scout'].map((label, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{ background: activeTab === i ? ORG : 'transparent', color: activeTab === i ? WHITE : TEXT_SUB, border: 'none', borderRadius: 9, padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', transition: 'all .15s' }}>{label}</button>
          ))}
        </div>

      </div>
    </div>
  );
}
