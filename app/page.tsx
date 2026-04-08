'use client';

import { useState, useEffect, useRef } from 'react';
import SunScoutApp from '@/components/SunScoutApp';
import LandingPage from '@/components/LandingPage';

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

export default function Home() {
  const [entered, setEntered]         = useState(false);
  const [coords, setCoords]           = useState<[number, number]>([12.97, 77.59]);
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setCoords([pos.coords.latitude, pos.coords.longitude]); setIsGpsCoords(true); },
        () => {}
      );
    }
  }, []);

  const fetchSolar = async (lat: number, lon: number, date: string, tz: number, st: string) => {
    setLoading(true);
    try {
      const data = await fetch(`/api/solar?lat=${lat}&lon=${lon}&date=${date}&tzOffset=${tz}&simTime=${st}`).then(r => r.json());
      setSolarData(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelled = false;
    async function go() {
      let tz = isGpsCoords ? -new Date().getTimezoneOffset() : Math.round(coords[1] / 15) * 60;
      if (!isGpsCoords) {
        try {
          const r = await fetch(`/api/timezone?lat=${coords[0]}&lon=${coords[1]}`);
          const d = await r.json();
          if (typeof d.offsetMinutes === 'number') tz = d.offsetMinutes;
        } catch {}
      }
      if (cancelled) return;
      setTzOffset(tz); tzRef.current = tz;
      await fetchSolar(coords[0], coords[1], targetDate, tz, simTime);
    }
    go();
    return () => { cancelled = true; };
  }, [coords[0], coords[1], targetDate, isGpsCoords]);

  useEffect(() => {
    if (!animating) fetchSolar(coords[0], coords[1], targetDate, tzRef.current, simTime);
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
    />
  );
}
