'use client';
// components/TopBar.tsx — full-width top bar replacing the sidebar

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

const CELESTIAL_DATES: Record<string, string | null> = {
  'Today':                           null,
  '🌸 Spring Equinox':  `${new Date().getFullYear()}-03-20`,
  '☀️ Summer Solstice': `${new Date().getFullYear()}-06-21`,
  '🍂 Autumn Equinox':  `${new Date().getFullYear()}-09-22`,
  '❄️ Winter Solstice': `${new Date().getFullYear()}-12-21`,
  '📅 Custom Date':     'custom',
};

const ORG = '#E07B00';
const ORG_LT = '#FFF3E0';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_SUB = '#888888';

export default function TopBar({ coords, setCoords, targetDate, setTargetDate, onGpsClick, activeTab, setActiveTab }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching]     = useState(false);
  const [datePreset, setDatePreset]   = useState('Today');
  const [showCustomDate, setShowCustomDate] = useState(false);

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

  const handlePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'custom' || preset === '📅 Custom Date') {
      setShowCustomDate(true);
    } else if (preset === 'Today') {
      setShowCustomDate(false);
      const now = new Date();
      setTargetDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
    } else {
      setShowCustomDate(false);
      const d = CELESTIAL_DATES[preset];
      if (d && d !== 'custom') setTargetDate(d);
    }
  };

  return (
    <div style={{
      background: WHITE,
      borderBottom: `2px solid ${ORG_LT}`,
      boxShadow: '0 2px 16px rgba(224,123,0,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{background:"#FFF8F0",borderBottom:"1px solid rgba(224,123,0,0.2)",padding:"5px 20px",fontSize:12,fontWeight:600,color:"#888",textAlign:"center"}}>💻 Best viewed on desktop — some features may not work on mobile</div>
      <div style={{background:"#FFF8F0",borderBottom:"1px solid rgba(224,123,0,0.2)",padding:"5px 20px",fontSize:12,fontWeight:600,color:"#888",textAlign:"center"}}>💻 Best viewed on desktop - Not suitable for the mobile screen</div>
      {/* Top row: logo + search + gps + date + tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        flexWrap: 'wrap',
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28,
          color: ORG,
          letterSpacing: 3,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>☀️ SUN SCOUT</div>

        <div style={{ width: 1, height: 32, background: ORG_LT, flexShrink: 0 }} />

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, alignItems: 'center', flex: '1 1 200px', minWidth: 180 }}>
          <input
            className="input-field"
            placeholder="Search city…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
          />
          <button type="submit" className="btn-primary" disabled={searching} style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontSize: 13 }}>
            {searching ? '…' : '🔍'}
          </button>
          {searchError && <span style={{ color: '#c00', fontSize: 12 }}>{searchError}</span>}
        </form>

        {/* GPS */}
        <button
          className="btn-primary"
          onClick={onGpsClick}
          style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          📍 My Location
        </button>

        {/* Coords pill */}
        <div style={{
          background: ORG_LT,
          border: `1px solid rgba(224,123,0,0.2)`,
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 700,
          color: TEXT_DARK,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          📌 {coords[0].toFixed(3)}°, {coords[1].toFixed(3)}°
        </div>

        <div style={{ width: 1, height: 32, background: ORG_LT, flexShrink: 0 }} />

        {/* Date preset */}
        <select
          className="select-field"
          value={datePreset}
          onChange={e => handlePreset(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, flex: '0 1 180px', minWidth: 140 }}
        >
          {Object.keys(CELESTIAL_DATES).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        {/* Custom date input */}
        {showCustomDate && (
          <input
            type="date"
            className="input-field"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            style={{ padding: '8px 12px', fontSize: 13, flex: '0 1 150px' }}
          />
        )}

        <div style={{ width: 1, height: 32, background: ORG_LT, flexShrink: 0 }} />

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 4, background: ORG_LT, borderRadius: 12, padding: 4, flexShrink: 0 }}>
          {['📖 Guide', '☀️ Sun Scout'].map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                background: activeTab === i ? ORG : 'transparent',
                color: activeTab === i ? WHITE : TEXT_SUB,
                border: 'none',
                borderRadius: 9,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
