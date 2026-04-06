'use client';

import { useState, useEffect } from 'react';
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

function getLocalDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

// Get accurate tz offset from browser's Intl API for any IANA timezone name
function ianaToOffset(tz: string): number {
  try {
    const now = new Date();
    const utc   = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const local = now.toLocaleString('en-US', { timeZone: tz });
    return Math.round((new Date(local).getTime() - new Date(utc).getTime()) / 60000);
  } catch { return 0; }
}

export default function Home() {
  const [activeTab, setActiveTab]   = useState(0);
  const [coords, setCoords]         = useState<[number, number]>([51.505, -0.09]);
  const [tzOffset, setTzOffset]     = useState(0);
  const [isGpsCoords, setIsGpsCoords] = useState(false);
  const [targetDate, setTargetDate] = useState(getLocalDateStr);
  const [simTime, setSimTime]       = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  });
  const [animating, setAnimating] = useState(true);
  const [solarData, setSolarData] = useState<SolarData | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCoords([pos.coords.latitude, pos.coords.longitude]);
          setIsGpsCoords(true);
        },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      let tz: number;

      if (isGpsCoords) {
        // For GPS: use browser's own timezone — always correct
        tz = -new Date().getTimezoneOffset();
      } else {
        // For searched cities: fetch from timezone API
        tz = Math.round(coords[1] / 15) * 60; // rough fallback
        try {
          const r = await fetch(`/api/timezone?lat=${coords[0]}&lon=${coords[1]}`);
          const d = await r.json();
          if (typeof d.offsetMinutes === 'number') tz = d.offsetMinutes;
        } catch {}
      }

      if (cancelled) return;
      setTzOffset(tz);

      setLoading(true);
      try {
        const url = `/api/solar?lat=${coords[0]}&lon=${coords[1]}&date=${targetDate}&tzOffset=${tz}&simTime=${simTime}`;
        const r   = await fetch(url);
        const data = await r.json();
        if (!cancelled) setSolarData(data);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [coords[0], coords[1], targetDate, isGpsCoords]);

  useEffect(() => {
    if (!animating) {
      fetch(`/api/solar?lat=${coords[0]}&lon=${coords[1]}&date=${targetDate}&tzOffset=${tzOffset}&simTime=${simTime}`)
        .then(r => r.json())
        .then(data => setSolarData(data))
        .catch(() => {});
    }
  }, [simTime, animating]);

  const handleSetCoords = (c: [number, number]) => {
    setIsGpsCoords(false);
    setCoords(c);
  };

  const handleGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setIsGpsCoords(true);
        setCoords([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        coords={coords}
        setCoords={handleSetCoords}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        onGpsClick={handleGps}
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
              setCoords={handleSetCoords}
              targetDate={targetDate}
              simTime={simTime}
              setSimTime={setSimTime}
              animating={animating}
              setAnimating={setAnimating}
              solarData={solarData}
              loading={loading}
              tzOffset={tzOffset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
