'use client';

import { useState, useEffect, useRef } from 'react';
import LandingPage from '@/components/LandingPage';
import SunScoutApp from '@/components/SunScoutApp';

export interface SolarData {
  sunTimes: { rise: string; set: string; noon: string };
  pathData: PathPoint[];
  simPos: { sunLat: number; sunLon: number; shadowLat: number; shadowLon: number; azimuth: number; elevation: number };
  riseEdge: [number, number];
  setEdge: [number, number];
  radiation: number;
  seasonal: Record<string, [number, number][]>;
}

export interface PathPoint {
  lat: number; lon: number; shlat: number; shlon: number;
  time: string; el: number; az: number; iso: string;
}

function getLocalDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

export default function Home() {
  const [isFromUrl, setIsFromUrl]      = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.has('lat') && p.has('lon');
    }
    return false;
  });
  const [entered, setEntered]         = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.has('lat') && p.has('lon');
    }
    return false;
  });
  const [coords, setCoords]           = useState<[number, number]>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const lat = parseFloat(p.get('lat') || '');
      const lon = parseFloat(p.get('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    return [12.97, 77.59];
  });
  const [tzOffset, setTzOffset]       = useState(330);
  const [isGpsCoords, setIsGpsCoords] = useState(false);
  const [targetDate, setTargetDate]   = useState(getLocalDateStr);
  const [simTime, setSimTime]         = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  });
  const [animating, setAnimating]     = useState(true);
  const [solarData, setSolarData]     = useState<SolarData | null>(null);
  const [loading, setLoading]         = useState(false);
  const tzRef = useRef(tzOffset);
  tzRef.current = tzOffset;

  useEffect(() => {
    if (isFromUrl) return; // don't override URL coords with GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setCoords([pos.coords.latitude, pos.coords.longitude]); setIsGpsCoords(true); },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      let tz = (isGpsCoords && !isFromUrl) ? -new Date().getTimezoneOffset() : Math.round(coords[1] / 15) * 60;
      if (!isGpsCoords) {
        try {
          const r = await fetch(`/api/timezone?lat=${coords[0]}&lon=${coords[1]}`);
          const d = await r.json();
          if (typeof d.offsetMinutes === 'number') tz = d.offsetMinutes;
        } catch {}
      }
      if (cancelled) return;
      setTzOffset(tz); tzRef.current = tz;
      setLoading(true);
      try {
        const d = await fetch(`/api/solar?lat=${coords[0]}&lon=${coords[1]}&date=${targetDate}&tzOffset=${tz}&simTime=${simTime}`).then(r => r.json());
        if (!cancelled) setSolarData(d);
      } catch {} finally { if (!cancelled) setLoading(false); }
    }
    go();
    return () => { cancelled = true; };
  }, [coords[0], coords[1], targetDate, isGpsCoords]);

  useEffect(() => {
    if (!animating) {
      fetch(`/api/solar?lat=${coords[0]}&lon=${coords[1]}&date=${targetDate}&tzOffset=${tzRef.current}&simTime=${simTime}`)
        .then(r => r.json()).then(d => setSolarData(d)).catch(() => {});
    }
  }, [simTime, animating]);

  const handleSetCoords = (c: [number, number]) => { setIsGpsCoords(false); setCoords(c); };
  const handleGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { setIsGpsCoords(true); setCoords([pos.coords.latitude, pos.coords.longitude]); },
      () => {}
    );
  };

  if (!entered) return <LandingPage onEnter={() => setEntered(true)} />;

  return (
    <SunScoutApp
      coords={coords} setCoords={handleSetCoords}
      targetDate={targetDate} setTargetDate={setTargetDate}
      simTime={simTime} setSimTime={setSimTime}
      animating={animating} setAnimating={setAnimating}
      solarData={solarData} loading={loading}
      tzOffset={tzOffset} onGpsClick={handleGps}
      onHome={() => setEntered(false)}
    />
  );
}
