'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TabGuide from '@/components/TabGuide';
import TabExplorer from '@/components/TabExplorer';

export interface SolarData {
  sunTimes: { rise: string; set: string; noon: string };
  pathData: PathPoint[];
  simPos: {
    sunLat: number; sunLon: number;
    shadowLat: number; shadowLon: number;
    azimuth: number; elevation: number;
  };
  riseEdge: [number, number];
  setEdge: [number, number];
  radiation: number;
  seasonal: Record<string, [number, number][]>;
}

export interface PathPoint {
  lat: number; lon: number;
  shlat: number; shlon: number;
  time: string; el: number; az: number; iso: string;
}

// Read timezone offset synchronously from browser — always correct, no API needed
// Returns minutes east of UTC. IST = +330, EST = -300, UTC = 0
const TZ_OFFSET = typeof window !== 'undefined' ? -new Date().getTimezoneOffset() : 0;

// Get today's date in LOCAL time (not UTC)
function getLocalDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Home() {
  const [activeTab, setActiveTab]   = useState(0);
  const [coords, setCoords]         = useState<[number, number]>([51.505, -0.09]);
  const [targetDate, setTargetDate] = useState(getLocalDateStr);
  const [simTime, setSimTime]       = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  });
  const [animating, setAnimating] = useState(true);
  const [solarData, setSolarData] = useState<SolarData | null>(null);
  const [loading, setLoading]     = useState(false);

  // GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const fetchSolar = useCallback(async (st: string) => {
    setLoading(true);
    try {
      const url = `/api/solar?lat=${coords[0]}&lon=${coords[1]}&date=${targetDate}&tzOffset=${TZ_OFFSET}&simTime=${st}`;
      const r    = await fetch(url);
      const data = await r.json();
      setSolarData(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [coords[0], coords[1], targetDate]);

  useEffect(() => { fetchSolar(simTime); }, [coords[0], coords[1], targetDate]);

  useEffect(() => {
    if (!animating) fetchSolar(simTime);
  }, [simTime, animating]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        coords={coords}
        setCoords={setCoords}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        onGpsClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              pos => setCoords([pos.coords.latitude, pos.coords.longitude]),
              () => {}
            );
          }
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'var(--white)', borderBottom: '2px solid var(--org-lt)', padding: '12px 24px', display: 'flex', gap: '6px' }}>
          <div style={{ background: 'var(--white)', border: '2px solid var(--org-lt)', borderRadius: 16, padding: 6, display: 'flex', gap: 4 }}>
            {['📖 Getting Started', '☀️ Sun Scout'].map((label, i) => (
              <button key={i} className={`tab-btn${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {activeTab === 0 && <TabGuide onEnter={() => setActiveTab(1)} />}
          {activeTab === 1 && (
            <TabExplorer
              coords={coords}
              setCoords={setCoords}
              targetDate={targetDate}
              simTime={simTime}
              setSimTime={setSimTime}
              animating={animating}
              setAnimating={setAnimating}
              solarData={solarData}
              loading={loading}
              tzOffset={TZ_OFFSET}
            />
          )}
        </div>
      </div>
    </div>
  );
}