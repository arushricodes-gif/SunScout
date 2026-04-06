'use client';
// components/TabExplorer.tsx

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SolarChart from './SolarChart';
import type { SolarData } from '@/app/page';

const Map2D       = dynamic(() => import('./Map2D'),       { ssr: false });
const Map3DShadow = dynamic(() => import('./Map3DShadow'), { ssr: false });
const SeasonalMap = dynamic(() => import('./SeasonalMap'), { ssr: false });

interface TabExplorerProps {
  coords: [number, number];
  setCoords: (c: [number, number]) => void;
  targetDate: string;
  simTime: string;
  setSimTime: (t: string) => void;
  animating: boolean;
  setAnimating: (a: boolean) => void;
  solarData: SolarData | null;
  loading: boolean;
  tzOffset: number;
}

type ViewMode = 'location' | 'sunpath' | 'year';
type ViewType = '3d' | '2d';

const ORG = '#E07B00', ORG_LT = '#FFF3E0', TEXT_DARK = '#1A1A1A', TEXT_SUB = '#888888', WHITE = '#FFFFFF';

export default function TabExplorer({
  coords, setCoords, targetDate, simTime, setSimTime,
  animating, setAnimating, solarData, loading,
}: TabExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('location');
  const [viewType, setViewType] = useState<ViewType>('3d');

  const [lat, lon] = coords;
  const data = solarData;
  const [simH, simM] = simTime.split(':').map(Number);
  const el = data?.simPos.elevation ?? 0;
  const az = data?.simPos.azimuth ?? 0;

  const broadcastSeek = (time: string) => {
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage({ type: 'seekTime', time }, '*'); } catch {}
    });
  };

  const setSimHM = (h: number, m: number) => {
    const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    setSimTime(t);
    broadcastSeek(t);
  };

  const toggleAnimating = () => {
    const next = !animating;
    setAnimating(next);
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage({ type: 'setAnimating', value: next }, '*'); } catch {}
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* View mode selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { id: 'location', label: '📍 Set Location' },
          { id: 'sunpath',  label: '🌞 Sun Path' },
          { id: 'year',     label: '🔄 Year Summary' },
        ] as { id: ViewMode; label: string }[]).map(v => (
          <label key={v.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: viewMode === v.id ? ORG_LT : WHITE,
            border: `2px solid ${viewMode === v.id ? ORG : '#E5E7EB'}`,
            borderRadius: 12, padding: '8px 18px', cursor: 'pointer',
            fontWeight: 700, fontSize: 15,
            color: viewMode === v.id ? ORG : TEXT_DARK,
            transition: 'all .15s',
          }}>
            <input type="radio" style={{ display: 'none' }} checked={viewMode === v.id} onChange={() => setViewMode(v.id)} />
            {v.label}
          </label>
        ))}
      </div>

      {/* Below-horizon warning */}
      {el <= 0 && data && viewMode === 'sunpath' && (
        <div style={{ background: '#FFF8F0', border: '1px solid rgba(224,123,0,0.3)', borderRadius: 12, padding: '12px 18px', marginBottom: 12, fontSize: 15 }}>
          🌙 Sun is below the horizon at {simTime} — sunrise {data.sunTimes.rise}, sunset {data.sunTimes.set}.
        </div>
      )}

      {/* ── SET LOCATION ── */}
      {viewMode === 'location' && (
        <>
          <div style={{ background: ORG_LT, border: '2px solid rgba(224,123,0,0.2)', borderRadius: 14, padding: '14px 22px', marginBottom: 14, fontSize: 15, color: TEXT_DARK, fontWeight: 500 }}>
            👆 <b>Click anywhere on the map</b> to set your location, then switch to <b style={{ color: ORG }}>🌞 Sun Path</b>.
          </div>
          <Map2D
            lat={lat} lon={lon}
            pathData={[]} simPos={null} riseEdge={null} setEdge={null}
            animating={false} locationSelectMode height={530}
            onLocationSelect={(la, lo) => setCoords([la, lo])}
          />
        </>
      )}

      {/* ── SUN PATH ── */}
      {viewMode === 'sunpath' && (
        <>
          {/* Single combined control + info bar */}
          {data && (
            <div style={{ background: WHITE, border: `2px solid ${ORG_LT}`, borderRadius: 14, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(224,123,0,0.06)' }}>

              {/* Date + sun times — left */}
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SUB, whiteSpace: 'nowrap' }}>
                📅 <b style={{ color: TEXT_DARK }}>{new Date(targetDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SUB, whiteSpace: 'nowrap' }}>
                🌅 Sunrise <b style={{ color: ORG }}>{data.sunTimes.rise}</b>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SUB, whiteSpace: 'nowrap' }}>
                🌇 Sunset <b style={{ color: ORG }}>{data.sunTimes.set}</b>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SUB, whiteSpace: 'nowrap' }}>
                ☀️ Noon <b style={{ color: ORG }}>{data.sunTimes.noon}</b>
              </span>

              <div style={{ flex: 1 }} />

              {/* Time sliders — only when paused, compact */}
              {!animating && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: TEXT_DARK, whiteSpace: 'nowrap' }}>
                    Hr {simH}
                    <input type="range" min={0} max={23} value={simH}
                      onChange={e => setSimHM(+e.target.value, simM)}
                      style={{ width: 80, accentColor: ORG }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: TEXT_DARK, whiteSpace: 'nowrap' }}>
                    Min {simM}
                    <input type="range" min={0} max={55} step={5} value={simM}
                      onChange={e => setSimHM(simH, +e.target.value)}
                      style={{ width: 80, accentColor: ORG }} />
                  </label>
                </div>
              )}

              {/* Play/Pause */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}
                onClick={toggleAnimating}>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: animating ? ORG : '#D1D5DB', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: animating ? 21 : 3, transition: 'left .2s' }} />
                </div>
                {animating ? '⏸ Pause' : '▶ Play'}
              </div>

              <div style={{ width: 1, height: 24, background: ORG_LT, flexShrink: 0 }} />

              {/* 3D / 2D toggle */}
              <div style={{ display: 'flex', gap: 4 }}>
                {([{ id: '3d', label: '🏙 3D' }, { id: '2d', label: '🗺 2D' }] as { id: ViewType; label: string }[]).map(v => (
                  <button key={v.id} onClick={() => setViewType(v.id)} style={{
                    background: viewType === v.id ? ORG : WHITE,
                    color: viewType === v.id ? '#fff' : TEXT_DARK,
                    border: `2px solid ${viewType === v.id ? ORG : '#E5E7EB'}`,
                    borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>{v.label}</button>
                ))}
              </div>

            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: ORG, fontWeight: 700 }}>☀️ Computing sun path…</div>
          )}

          {!loading && data && (
            <>
              {viewType === '3d' && (
                <Map3DShadow
                  lat={lat} lon={lon}
                  pathData={data.pathData}
                  simTime={simTime}
                  simPos={data.simPos}
                  sunTimes={data.sunTimes}
                  animating={animating}
                />
              )}
              {viewType === '2d' && (
                <Map2D
                  lat={lat} lon={lon}
                  pathData={data.pathData}
                  simPos={data.simPos}
                  riseEdge={data.riseEdge}
                  setEdge={data.setEdge}
                  animating={animating}
                  locationSelectMode={false}
                  height={560}
                />
              )}

              {/* Metrics */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: ORG, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 12 }}>
                  📊 Solar Data for Selected Time
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: '🕐 Time',       val: simTime },
                    { label: '🧭 Azimuth',    val: `${az.toFixed(1)}°` },
                    { label: '☀️ Elevation',  val: `${el.toFixed(1)}°` },
                    { label: '⚡ Radiation',  val: `${data.radiation} W/m²` },
                  ].map(m => (
                    <div key={m.label} className="metric-card">
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value">{m.val}</div>
                    </div>
                  ))}
                </div>
                <SolarChart pathData={data.pathData} simTime={simTime} />
              </div>
            </>
          )}
        </>
      )}

      {/* ── YEAR SUMMARY ── */}
      {viewMode === 'year' && (
        <>
          <div style={{ background: WHITE, border: `2px solid ${ORG_LT}`, borderRadius: 14, padding: '16px 24px', marginBottom: 14 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT_DARK, fontFamily: "'Space Grotesk',sans-serif" }}>🔄 Seasonal Sun Path Comparison</div>
            <div style={{ fontSize: 14, color: TEXT_SUB, marginTop: 4 }}>All four seasons overlaid on the same map for your location</div>
          </div>
          {data && <SeasonalMap lat={lat} lon={lon} seasonal={data.seasonal} />}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', background: WHITE, padding: '14px 24px', borderRadius: 12, marginTop: 10, border: `2px solid ${ORG_LT}` }}>
            {[{ label: 'Summer', color: '#FF4444' }, { label: 'Autumn', color: '#FF8C00' }, { label: 'Spring', color: '#C8A800' }, { label: 'Winter', color: '#5BAED8' }].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 28, height: 4, background: s.color, borderRadius: 2 }} />
                <span style={{ color: s.color, fontWeight: 700, fontSize: 15 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
