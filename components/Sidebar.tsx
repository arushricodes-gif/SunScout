'use client';
// components/Sidebar.tsx

import { useState } from 'react';

interface SidebarProps {
  coords: [number, number];
  setCoords: (c: [number, number]) => void;
  targetDate: string;
  setTargetDate: (d: string) => void;
  onGpsClick: () => void;
}

const CELESTIAL_DATES: Record<string, string | null> = {
  'Manual Selection': null,
  '🌸 Spring Equinox (Mar 20)': `${new Date().getFullYear()}-03-20`,
  '☀️ Summer Solstice (Jun 21)': `${new Date().getFullYear()}-06-21`,
  '🍂 Autumn Equinox (Sep 22)': `${new Date().getFullYear()}-09-22`,
  '❄️ Winter Solstice (Dec 21)': `${new Date().getFullYear()}-12-21`,
};

export default function Sidebar({ coords, setCoords, targetDate, setTargetDate, onGpsClick }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [datePreset, setDatePreset] = useState('Manual Selection');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await r.json();
      if (data.result) {
        setCoords(data.result);
      } else {
        setSearchError('Location not found.');
      }
    } catch {
      setSearchError('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handlePreset = (preset: string) => {
    setDatePreset(preset);
    const d = CELESTIAL_DATES[preset];
    if (d) setTargetDate(d);
  };

  return (
    <div style={{
      width: 260,
      minWidth: 260,
      background: '#fff',
      borderRight: '2px solid var(--org-lt)',
      boxShadow: '2px 0 16px rgba(224,123,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 24px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', padding: '24px 16px 16px' }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 52,
          fontWeight: 900,
          color: 'var(--org)',
          letterSpacing: 6,
          lineHeight: 1,
          textShadow: '0 2px 12px rgba(224,123,0,0.18)',
        }}>☀️ SUN<br />SCOUT</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-sub)',
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginTop: 6,
        }}>Visualize the Light</div>
      </div>

      <div style={{ height: 2, background: 'var(--org-lt)', borderRadius: 2, margin: '0 16px 20px' }} />

      {/* Best on desktop */}
      <div style={{
        margin: '0 16px 16px',
        background: '#FFF8F0',
        border: '1px solid rgba(224,123,0,0.3)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--text-mid)',
      }}>
        💻 Best viewed on laptop/PC.
      </div>

      {/* Location section */}
      <div style={{
        fontSize: 15,
        fontWeight: 800,
        color: 'var(--org)',
        fontFamily: "'Space Grotesk', sans-serif",
        margin: '0 16px 10px',
      }}>📍 Location</div>

      {/* Search form */}
      <form onSubmit={handleSearch} style={{ margin: '0 16px 10px' }}>
        <div style={{
          background: '#fff',
          border: '2px solid var(--org-lt)',
          borderRadius: 16,
          padding: 14,
        }}>
          <input
            className="input-field"
            placeholder="e.g. Paris, France"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={searching}>
            {searching ? '🔍 Searching…' : '🔍 Search'}
          </button>
          {searchError && (
            <div style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{searchError}</div>
          )}
        </div>
      </form>

      {/* GPS button */}
      <div style={{ margin: '0 16px 10px' }}>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onGpsClick}>
          📍 Use My GPS
        </button>
      </div>

      {/* Current coords */}
      <div style={{
        background: 'var(--org-lt)',
        border: '1px solid var(--card-bdr)',
        borderRadius: 10,
        padding: '10px 14px',
        margin: '0 16px 20px',
        fontSize: 13,
        color: 'var(--text-mid)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        📌 <b style={{ color: 'var(--text-dark)' }}>{coords[0].toFixed(4)}°, {coords[1].toFixed(4)}°</b>
      </div>

      <div style={{ height: 2, background: 'var(--org-lt)', borderRadius: 2, margin: '0 16px 16px' }} />

      {/* Date section */}
      <div style={{
        fontSize: 15,
        fontWeight: 800,
        color: 'var(--org)',
        fontFamily: "'Space Grotesk', sans-serif",
        margin: '0 16px 10px',
      }}>📅 Date</div>

      <div style={{ margin: '0 16px 10px' }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>
          Key Dates
        </label>
        <select
          className="select-field"
          value={datePreset}
          onChange={e => handlePreset(e.target.value)}
        >
          {Object.keys(CELESTIAL_DATES).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {datePreset === 'Manual Selection' && (
        <div style={{ margin: '0 16px 10px' }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>
            Custom Date
          </label>
          <input
            type="date"
            className="input-field"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />
        </div>
      )}

      <div style={{ height: 2, background: 'var(--org-lt)', borderRadius: 2, margin: '16px 16px 0' }} />

      {/* Info */}
      <div style={{
        margin: '16px 16px 0',
        fontSize: 12,
        color: 'var(--text-sub)',
        lineHeight: 1.6,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        🔬 Uses NOAA solar algorithm · OSMBuildings · OpenStreetMap
      </div>
    </div>
  );
}
