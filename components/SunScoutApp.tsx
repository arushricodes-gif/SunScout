'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import SolarChart from './SolarChart';
import type { SolarData } from '@/app/page';
import ReportModal from './ReportModal';
import AsliVastuPopup from './AsliVastuPopup';


const Map3DShadow = dynamic(() => import('./Map3DShadow'), { ssr: false }) as any;
const Map2D       = dynamic(() => import('./Map2D'),       { ssr: false });
const SeasonalMap   = dynamic(() => import('./SeasonalMap'),   { ssr: false });
const SeasonalMap3D = dynamic(() => import('./SeasonalMap3D'), { ssr: false });

interface Props {
  coords: [number, number]; setCoords: (c: [number, number]) => void;
  targetDate: string; setTargetDate: (d: string) => void;
  simTime: string; setSimTime: (t: string) => void;
  animating: boolean; setAnimating: (a: boolean) => void;
  solarData: SolarData | null; loading: boolean;
  tzOffset: number; onGpsClick: () => void; onHome: () => void;
  hasRealLocation: boolean;
}

const ORG='#E07B00', ORG_LT='#FFF3E0', TEXT_DARK='#1A1A1A', TEXT_SUB='#777', WHITE='#FFFFFF';

const SEASONS_TEMPLATE = {
  'Select Season': null,
  'Spring equinox': '-03-20',
  'Summer solstice': '-06-21',
  'Autumn equinox': '-10-15',
  'Winter solstice': '-12-21',
  'Custom date': 'custom',
};

const SunLogo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
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
);

const Divider = () => <div style={{ width:1, height:30, background:'rgba(224,123,0,0.2)', flexShrink:0 }} />;

const SHOTS = [
  { label:'Summer · 9am',   date:'2025-06-21', time:'09:00' },
  { label:'Summer · Noon',  date:'2025-06-21', time:'12:00' },
  { label:'Summer · 3pm',   date:'2025-06-21', time:'15:00' },
  { label:'Winter · 9am',   date:'2025-12-21', time:'09:00' },
  { label:'Winter · Noon',  date:'2025-12-21', time:'12:00' },
  { label:'Winter · 3pm',   date:'2025-12-21', time:'15:00' },
  { label:'Spring · 9am',   date:'2025-03-20', time:'09:00' },
  { label:'Spring · Noon',  date:'2025-03-20', time:'12:00' },
  { label:'Spring · 3pm',   date:'2025-03-20', time:'15:00' },
  { label:'Autumn · 9am',   date:'2025-09-23', time:'09:00' },
  { label:'Autumn · Noon',  date:'2025-09-23', time:'12:00' },
  { label:'Autumn · 3pm',   date:'2025-09-23', time:'15:00' },
];

export default function SunScoutApp({ coords, setCoords, targetDate, setTargetDate, simTime, setSimTime, animating, setAnimating, solarData, loading, tzOffset, onGpsClick, onHome, hasRealLocation }: Props) {
  const [SEASONS, setSEASONS] = useState<Record<string,string|null>>({'Select Season':null,'Spring equinox':null,'Summer solstice':null,'Autumn equinox':null,'Winter solstice':null,'Custom date':'custom'});
  useEffect(() => {
    const y = new Date().getFullYear();
    setSEASONS(Object.fromEntries(Object.entries(SEASONS_TEMPLATE).map(([k,v]) => [k, v && v !== 'custom' ? y+v : v])));
  }, []);

  const [view, setView]               = useState<'3d'|'2d'|'year'>('3d');
  const [prevView, setPrevView]       = useState<'2d'>('2d');
  const [yearMapView, setYearMapView] = useState<'2d'>('2d');
  const [searchQuery, setSearch]      = useState('');
  const [searching, setSearching]     = useState(false);
  const [season, setSeason]           = useState('Today');
  const [showCustom, setShowCustom]   = useState(false);
  const [showData, setShowData]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [showAbout, setShowAbout]     = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [views, setViews]             = useState<number|null>(null);
  const [feedback, setFeedback]       = useState('');
  const [fbName, setFbName]           = useState('');
  const [fbSent, setFbSent]           = useState(false);
  const [windData, setWindData]       = useState<{speed:number,dir:number,gust:number}|null>(null);
  const [mounted, setMounted]         = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const captureRef = useRef<((label: string, time: string, date: string) => void) | null>(null);
  const screenshotResolverRef = useRef<((screenshots: {label:string,base64:string}[]) => void) | null>(null);
  const screenshotBufferRef = useRef<{label:string,base64:string}[]>([]);
  const screenshotIdxRef = useRef(0);

  const [lat, lon] = coords;

  // Handle screenshot messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'screenshotReady') return;
      console.log('[SunScoutApp] received screenshotReady:', e.data.label, 'hasData:', !!e.data.data);
      if (e.data.data) {
        screenshotBufferRef.current.push({
          label: e.data.label,
          base64: e.data.data.split(',')[1],
        });
      }
      screenshotIdxRef.current++;
      if (screenshotIdxRef.current < SHOTS.length) {
        // Send next capture after changing date
        const next = SHOTS[screenshotIdxRef.current];
        console.log('[SunScoutApp] requesting next capture:', next.label);
        setTimeout(() => {
          captureRef.current?.(next.label, next.time, next.date);
        }, 500);
      } else {
        // All done
        console.log('[SunScoutApp] all screenshots done, buffer length:', screenshotBufferRef.current.length);
        if (screenshotResolverRef.current) {
          screenshotResolverRef.current([...screenshotBufferRef.current]);
          screenshotResolverRef.current = null;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setTargetDate]);

  const captureScreenshots = (): Promise<{label:string,base64:string}[]> => {
    return new Promise((resolve) => {
      screenshotBufferRef.current = [];
      screenshotIdxRef.current = 0;
      screenshotResolverRef.current = resolve;
      // Start first capture
      const first = SHOTS[0];
      console.log('[SunScoutApp] captureRef.current is', captureRef.current ? 'SET' : 'NULL', '- requesting first capture:', first.label);
      setTimeout(() => {
        captureRef.current?.(first.label, first.time, first.date);
      }, 500);
    });
  };

  useEffect(() => {
    const fetchWind = async () => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=windspeed_10m,winddirection_10m,windgusts_10m&forecast_days=1`);
        const d = await r.json();
        const h = new Date().getHours();
        setWindData({ speed: d.hourly.windspeed_10m[h], dir: d.hourly.winddirection_10m[h], gust: d.hourly.windgusts_10m[h] });
      } catch(e) {}
    };
    fetchWind();
  }, [lat, lon]);

  const data = solarData;
  const [simH, simM] = simTime.split(':').map(Number);
  const el = data?.simPos.elevation ?? 0;
  const az = data?.simPos.azimuth ?? 0;

  const broadcast = (msg: object) => {
    document.querySelectorAll('iframe').forEach(f => {
      try { (f as HTMLIFrameElement).contentWindow?.postMessage(msg, '*'); } catch {}
    });
  };

  const setSimHM = (h: number, m: number) => {
    const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    setSimTime(t); broadcast({ type:'seekTime', time:t });
  };

  const switchView = (v: '3d'|'2d'|'year') => {
    if (v !== 'year' && v !== '3d') setPrevView(v);
    if (v === 'year') setYearMapView(prevView);
    setView(v);
  };

  const toggleAnim = () => {
    const next = !animating;
    setAnimating(next); broadcast({ type:'setAnimating', value:next });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const d = await r.json();
      if (d.result) setCoords(d.result);
    } catch {} finally { setSearching(false); }
  };

  const handleSeason = (s: string) => {
    setSeason(s);
    if (s === 'Custom date') { setShowCustom(true); return; }
    setShowCustom(false);
    if (s === 'Select Season') {
      const now = new Date();
      setTargetDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
    } else {
      const d = SEASONS[s]; if (d) setTargetDate(d);
    }
  };

  useEffect(() => {
    fetch('/api/views').then(r => r.json()).then(d => setViews(d.views)).catch(() => {});
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:fbName, message:feedback}) });
      setFbSent(true); setFeedback(''); setFbName('');
    } catch {}
  };

  const handleShare = () => {
    const url = `https://sun-scout.com/?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lat', lat.toFixed(5));
      url.searchParams.set('lon', lon.toFixed(5));
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [lat, lon]);

  const defaultSimPos = { sunLat:lat+0.001, sunLon:lon+0.001, shadowLat:lat-0.001, shadowLon:lon-0.001, azimuth:90, elevation:30 };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#F9F9F7' }}>

      <style>{`
        .topbar-desktop { display: flex; }
        .topbar-mobile { display: none; }
        @media (max-width: 768px) {
          .topbar-desktop { display: none !important; }
          .topbar-mobile { display: flex !important; }
        }
      `}</style>

      {/* TOPBAR — DESKTOP */}
      <div className="topbar-desktop" style={{ background:WHITE, borderBottom:'1px solid rgba(224,123,0,0.15)', padding:'10px 16px', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        <div onClick={onHome} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0, userSelect:'none' }}>
          <SunLogo />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:ORG, letterSpacing:2 }}>SUN SCOUT</span>
        </div>
        <Divider />
        <form onSubmit={handleSearch} style={{ display:'flex', gap:6, flex:'1 1 160px', minWidth:140 }}>
          <input className="input-field" placeholder="Search for landmarks" value={searchQuery} onChange={e => setSearch(e.target.value)} style={{ flex:1, padding:'7px 11px', fontSize:13 }} />
          <button type="submit" className="btn-primary" disabled={searching} style={{ padding:'7px 13px', fontSize:13 }}>{searching ? '…' : '🔍'}</button>
        </form>
        <button className="btn-primary" onClick={onGpsClick} style={{ padding:'7px 13px', fontSize:13, whiteSpace:'nowrap', flexShrink:0 }}>📍 My location</button>
        <div style={{ background:ORG_LT, borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:700, color:TEXT_DARK, whiteSpace:'nowrap', flexShrink:0 }}>
          {lat.toFixed(3)}°, {lon.toFixed(3)}°
        </div>
        <Divider />
        <select value={season} onChange={e => handleSeason(e.target.value)} style={{ padding:'7px 10px', fontSize:13, borderRadius:8, border:'1px solid rgba(224,123,0,0.25)', background:WHITE, color:TEXT_DARK, cursor:'pointer', flexShrink:0 }}>
          {Object.keys(SEASONS).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        {showCustom && (
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ padding:'7px 10px', fontSize:13, borderRadius:8, border:'1px solid rgba(224,123,0,0.25)', background:WHITE, color:TEXT_DARK }} />
        )}
        <Divider />
        <div style={{ background:ORG_LT, borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:700, color:TEXT_DARK, whiteSpace:'nowrap', flexShrink:0 }}>
          📅 {new Date(targetDate + 'T12:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }} onClick={toggleAnim}>
          <div style={{ width:40, height:22, borderRadius:11, background:animating?ORG:'#D1D5DB', position:'relative', transition:'background .2s', flexShrink:0 }}>
            <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:animating?21:3, transition:'left .2s' }} />
          </div>
          {animating ? '⏸ Pause' : '▶ Play'}
        </div>
        {!animating && (
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:TEXT_DARK, whiteSpace:'nowrap' }}>
              Hr {simH} <input type="range" min={0} max={23} value={simH} onChange={e => setSimHM(+e.target.value, simM)} style={{ width:72, accentColor:ORG }} />
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:TEXT_DARK, whiteSpace:'nowrap' }}>
              Min {simM} <input type="range" min={0} max={55} step={5} value={simM} onChange={e => setSimHM(simH, +e.target.value)} style={{ width:72, accentColor:ORG }} />
            </label>
          </div>
        )}
        <Divider />
        <div style={{ display:'flex', background:'#F0EDE8', borderRadius:10, padding:3, flexShrink:0 }}>
          {(['3d','2d','year'] as const).map(id => {
            const labels = { '3d':'🏙 3D', '2d':'🗺 2D', 'year':'🔄 Year' };
            return (
              <button key={id} onClick={() => switchView(id)} style={{ background: view===id ? ORG : 'transparent', color: view===id ? '#fff' : TEXT_SUB, border: 'none', borderRadius:8, padding:'6px 12px', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}>{labels[id]}</button>
            );
          })}
        </div>
        <button onClick={() => setShowData(!showData)} style={{ background: showData ? ORG : WHITE, color: showData ? '#fff' : TEXT_DARK, border: `1px solid ${showData ? ORG : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'7px 12px', fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0 }}>📊 Data</button>
        <button onClick={() => setShowReport(true)} style={{ background: ORG, color: '#fff', border: 'none', borderRadius:8, padding:'7px 12px', fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0 }}>📄 AI Report</button>
        <button onClick={handleShare} style={{ background: copied ? '#22c55e' : WHITE, color: copied ? '#fff' : TEXT_DARK, border: `1px solid ${copied ? '#22c55e' : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'7px 12px', fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0, transition:'all .2s' }}>{copied ? '✓ Copied!' : '🔗 Share'}</button>
        <button onClick={() => setShowAbout(!showAbout)} style={{ background: showAbout ? '#1A1A1A' : WHITE, color: showAbout ? '#fff' : TEXT_DARK, border: `1px solid ${showAbout ? '#1A1A1A' : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'7px 12px', fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0 }}>About</button>
      </div>

      {/* TOPBAR — MOBILE (purpose-built layout, not a squeezed version of desktop) */}
      <div className="topbar-mobile" style={{ flexDirection:'column', background:WHITE, borderBottom:'1px solid rgba(224,123,0,0.15)', flexShrink:0 }}>
        {/* Row 1: logo + season (compact) + more menu toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px' }}>
          <div onClick={onHome} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', userSelect:'none', flexShrink:0 }}>
            <SunLogo />
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:ORG, letterSpacing:1 }}>SUN SCOUT</span>
          </div>
          <div style={{ flex:1 }} />
          <select value={season} onChange={e => handleSeason(e.target.value)} style={{ padding:'5px 6px', fontSize:11, borderRadius:7, border:'1px solid rgba(224,123,0,0.25)', background:WHITE, color:TEXT_DARK, maxWidth:110, flexShrink:1 }}>
            {Object.keys(SEASONS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} aria-label="More options" style={{ background: showMoreMenu ? ORG : WHITE, color: showMoreMenu ? '#fff' : TEXT_DARK, border:`1px solid ${showMoreMenu ? ORG : 'rgba(224,123,0,0.25)'}`, borderRadius:7, width:28, height:28, fontSize:14, fontWeight:700, cursor:'pointer', flexShrink:0 }}>⋯</button>
        </div>

        {/* Row 2: search + GPS + AI Report (with label) */}
        <div style={{ display:'flex', gap:5, padding:'0 10px 7px' }}>
          <form onSubmit={handleSearch} style={{ display:'flex', flex:1, minWidth:0 }}>
            <input className="input-field" placeholder="Search for landmarks" value={searchQuery} onChange={e => setSearch(e.target.value)} style={{ flex:1, minWidth:0, padding:'7px 10px', fontSize:13 }} />
          </form>
          <button className="btn-primary" onClick={onGpsClick} aria-label="My location" style={{ padding:'7px 10px', fontSize:14, flexShrink:0 }}>📍</button>
          <button onClick={() => setShowReport(true)} style={{ background:ORG, color:'#fff', border:'none', borderRadius:8, padding:'7px 11px', fontWeight:700, fontSize:12.5, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>AI Report</button>
        </div>

        {/* Collapsible "More" drawer — view switch, play/pause, date, data, share, about */}
        {showMoreMenu && (
          <div style={{ padding:'0 10px 12px', display:'flex', flexDirection:'column', gap:7, borderTop:'1px solid rgba(224,123,0,0.12)', paddingTop:8 }}>
            <div style={{ display:'flex', gap:7, alignItems:'center' }}>
              <div style={{ display:'flex', background:'#F0EDE8', borderRadius:9, padding:3, flex:1 }}>
                {(['3d','2d','year'] as const).map(id => {
                  const labels = { '3d':'🏙 3D', '2d':'🗺 2D', 'year':'🔄 Yr' };
                  return (
                    <button key={id} onClick={() => switchView(id)} style={{ flex:1, background: view===id ? ORG : 'transparent', color: view===id ? '#fff' : TEXT_SUB, border:'none', borderRadius:7, padding:'7px 4px', fontWeight:700, fontSize:11.5, cursor:'pointer' }}>{labels[id]}</button>
                  );
                })}
              </div>
              <button onClick={toggleAnim} aria-label={animating ? 'Pause' : 'Play'} style={{ background: animating ? ORG : WHITE, color: animating ? '#fff' : TEXT_DARK, border:`1px solid ${animating ? ORG : 'rgba(224,123,0,0.25)'}`, borderRadius:9, width:36, height:32, fontSize:14, cursor:'pointer', flexShrink:0 }}>
                {animating ? '⏸' : '▶'}
              </button>
            </div>

            {!animating && (
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:TEXT_DARK, flex:1 }}>
                  Hr {simH} <input type="range" min={0} max={23} value={simH} onChange={e => setSimHM(+e.target.value, simM)} style={{ flex:1, accentColor:ORG }} />
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:TEXT_DARK, flex:1 }}>
                  Min {simM} <input type="range" min={0} max={55} step={5} value={simM} onChange={e => setSimHM(simH, +e.target.value)} style={{ flex:1, accentColor:ORG }} />
                </label>
              </div>
            )}

            <div style={{ display:'flex', gap:7 }}>
              {showCustom ? (
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ flex:1, padding:'8px 9px', fontSize:12.5, borderRadius:8, border:'1px solid rgba(224,123,0,0.25)', background:WHITE, color:TEXT_DARK }} />
              ) : (
                <div style={{ flex:1, background:ORG_LT, borderRadius:8, padding:'8px 9px', fontSize:11.5, fontWeight:700, color:TEXT_DARK, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  📅 {new Date(targetDate + 'T12:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:7 }}>
              <button onClick={() => setShowData(!showData)} style={{ flex:1, background: showData ? ORG : WHITE, color: showData ? '#fff' : TEXT_DARK, border:`1px solid ${showData ? ORG : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'8px', fontWeight:700, fontSize:12.5, cursor:'pointer' }}>📊 Data</button>
              <button onClick={handleShare} style={{ flex:1, background: copied ? '#22c55e' : WHITE, color: copied ? '#fff' : TEXT_DARK, border:`1px solid ${copied ? '#22c55e' : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'8px', fontWeight:700, fontSize:12.5, cursor:'pointer' }}>{copied ? '✓ Copied!' : '🔗 Share'}</button>
              <button onClick={() => setShowAbout(!showAbout)} style={{ flex:1, background: showAbout ? '#1A1A1A' : WHITE, color: showAbout ? '#fff' : TEXT_DARK, border:`1px solid ${showAbout ? '#1A1A1A' : 'rgba(224,123,0,0.2)'}`, borderRadius:8, padding:'8px', fontWeight:700, fontSize:12.5, cursor:'pointer' }}>About</button>
            </div>
          </div>
        )}
      </div>

      {/* MAP + DATA ROW */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          {loading && (
            <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:999, background:'rgba(224,123,0,0.92)', color:'#fff', borderRadius:10, padding:'7px 18px', fontWeight:700, fontSize:13, pointerEvents:'none' }}>
              ☀️ Computing sun path…
            </div>
          )}
          {el <= 0 && data && view !== 'year' && (
            <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:999, background:'rgba(10,12,22,0.9)', color:'#F39C12', borderRadius:10, padding:'7px 18px', fontWeight:600, fontSize:12, whiteSpace:'nowrap', pointerEvents:'none' }}>
              🌙 Sun below horizon · Rise {data.sunTimes.rise} · Set {data.sunTimes.set}
            </div>
          )}
          {view === '3d' && (
            <Map3DShadow
              onReady={(fn: (label: string, time: string, date: string) => void) => { captureRef.current = fn; console.log('[SunScoutApp] Map3DShadow onReady fired, captureRef set'); }}
              lat={lat} lon={lon}
              pathData={data?.pathData ?? []}
              simTime={simTime}
              simPos={data?.simPos ?? defaultSimPos}
              sunTimes={data?.sunTimes ?? { rise:'--:--', set:'--:--', noon:'--:--' }}
              animating={animating}
              onLocationSelect={(la: number, lo: number) => setCoords([la, lo])}
            />
          )}
          {view === '2d' && (
            <>
              <button onClick={() => switchView('3d')} style={{position:'absolute',top:14,left:14,zIndex:999,background:'rgba(255,255,255,0.95)',border:'1px solid rgba(224,123,0,0.3)',borderRadius:8,padding:'6px 14px',fontWeight:700,fontSize:13,cursor:'pointer',color:'#E07B00'}}>{'← 3D'}</button>
              <Map2D lat={lat} lon={lon} pathData={data?.pathData ?? []} simPos={data?.simPos ?? null} riseEdge={data?.riseEdge ?? null} setEdge={data?.setEdge ?? null} animating={animating} locationSelectMode={true} height={mounted ? window.innerHeight - 62 : 700} onLocationSelect={(la, lo) => setCoords([la, lo])} />
            </>
          )}
          {view === 'year' && (
            <div style={{ height:'100%', overflowY:'auto', padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <button onClick={() => switchView(prevView)} style={{background:'#FFF3E0',border:'1px solid #E07B00',borderRadius:8,padding:'6px 14px',fontWeight:700,fontSize:12,cursor:'pointer',color:'#E07B00'}}>{'← Back'}</button>
                <span style={{fontSize:12,color:'#888'}}>Seasonal sun paths for your location</span>
              </div>
              {data ? (
                <>
                  {yearMapView === '2d' && <SeasonalMap lat={lat} lon={lon} seasonal={data.seasonal} />}
                  <div style={{ display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap', background:WHITE, padding:'10px 20px', borderRadius:10, marginTop:10, border:'1px solid rgba(224,123,0,0.15)' }}>
                    {[{label:'Summer',color:'#FF4444'},{label:'Autumn',color:'#FF8C00'},{label:'Spring',color:'#C8A800'},{label:'Winter',color:'#5BAED8'}].map(s => (
                      <div key={s.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ display:'inline-block', width:22, height:4, background:s.color, borderRadius:2 }} />
                        <span style={{ color:s.color, fontWeight:700, fontSize:13 }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60%', color:TEXT_SUB }}>Loading…</div>}
            </div>
          )}
        </div>

        {showAbout && (
          <div style={{ width:300, background:WHITE, borderLeft:'1px solid rgba(224,123,0,0.15)', padding:'20px', flexShrink:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.08em' }}>About</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:'#FFF8F0', borderRadius:10, padding:'14px' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#1A1A1A', marginBottom:8 }}>Built by Arushri Gangji.</div>
                <div style={{ fontSize:11, color:'#888', lineHeight:1.7, marginBottom:6 }}>Freshman at BITS Pilani, Dubai. Classical dancer, painter, cyclist.</div>
                <div style={{ fontSize:11, color:'#888', lineHeight:1.7, marginBottom:6 }}>Perpetually bothered by problems without good solutions. SunScout is my attempt to make property research more honest.</div>
                <div style={{ fontSize:11, color:'#888', lineHeight:1.7 }}>I care about design, data, and understanding how things actually work—not just on the surface, but all the way down.</div>
              </div>
              <a href="https://www.linkedin.com/in/arushri-gangji-056108381/" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:10, background:'#0A66C2', borderRadius:10, padding:'12px 16px', textDecoration:'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span style={{ color:'white', fontWeight:700, fontSize:13 }}>Connect on LinkedIn</span>
              </a>
            </div>
            <div style={{ width:'100%', height:1, background:'rgba(224,123,0,0.15)' }}/>
            <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.08em' }}>Feedback</div>
            {fbSent ? (
              <div style={{ background:'#f0fdf4', borderRadius:10, padding:'14px', fontSize:13, color:'#166534', fontWeight:600 }}>✓ Thanks for your feedback!</div>
            ) : (
              <form onSubmit={handleFeedback} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <input value={fbName} onChange={e=>setFbName(e.target.value)} placeholder="Your name (optional)" style={{ padding:'8px 10px', fontSize:12, borderRadius:8, border:'1px solid rgba(224,123,0,0.25)', background:'#FFFBF5' }}/>
                <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Share your thoughts, bugs, or ideas..." required rows={4} style={{ padding:'8px 10px', fontSize:12, borderRadius:8, border:'1px solid rgba(224,123,0,0.25)', background:'#FFFBF5', resize:'vertical', fontFamily:'inherit' }}/>
                <button type="submit" style={{ background:'#E07B00', color:'#fff', border:'none', borderRadius:8, padding:'9px', fontWeight:700, fontSize:13, cursor:'pointer' }}>Send Feedback</button>
              </form>
            )}
          </div>
        )}

        {showData && data && (
          <div style={{ width:260, background:WHITE, borderLeft:'1px solid rgba(224,123,0,0.15)', padding:'16px', flexShrink:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:ORG, textTransform:'uppercase', letterSpacing:'.08em' }}>Solar Data</div>
            {[
              { label:'Time', val:simTime, icon:'🕐' },
              { label:'Azimuth', val:`${az.toFixed(1)}°`, icon:'🧭' },
              { label:'Elevation', val:`${el.toFixed(1)}°`, icon:'☀️' },
              { label:'Radiation', val:`${data.radiation} W/m²`, icon:'⚡' },
            ].map(m => (
              <div key={m.label} style={{ background:'#FFF8F0', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:10, color:TEXT_SUB, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{m.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:ORG }}>{m.val}</div>
              </div>
            ))}
            {windData && (<>
              <div style={{ fontSize:11, fontWeight:700, color:ORG, textTransform:'uppercase', letterSpacing:'.08em', marginTop:4 }}>Wind Data</div>
              {[
                { label:'Speed', val:`${windData.speed} km/h`, icon:'💨' },
                { label:'Direction', val:`${windData.dir}°`, icon:'🧭' },
                { label:'Gusts', val:`${windData.gust} km/h`, icon:'🌬️' },
              ].map(m => (
                <div key={m.label} style={{ background:'#F0F7FF', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{m.icon}</div>
                  <div style={{ fontSize:10, color:TEXT_SUB, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{m.label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#2563EB' }}>{m.val}</div>
                </div>
              ))}
            </>)}
            <SolarChart pathData={data.pathData} simTime={simTime} />
          </div>
        )}
      </div>

      {data && !loading && hasRealLocation && <AsliVastuPopup lat={lat} lon={lon} />}

      {/* AI Report Modal */}
      {showReport && (
        <ReportModal
          lat={lat}
          lon={lon}
          tzOffset={tzOffset}
          address={searchQuery || undefined}
          onClose={() => setShowReport(false)}
          captureScreenshots={captureScreenshots}
        />
      )}
    </div>
  );
}