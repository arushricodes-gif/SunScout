'use client';
// components/LiveScoreModal.tsx
// Standalone feature, not folded into the AI report — same modal pattern as
// ReportModal.tsx (floor/facing picker → generate → result), but simpler:
// no screenshots, no PDF, no save-to-BlindSpot. Just fetch /api/score and
// show the result. Deliberately its own thing so it reads as a distinct,
// nameable feature ("Check your LiveScore") rather than a report subsection.

import { useState } from 'react';
import LiveScoreCard from './LiveScoreCard';

interface Props {
  lat: number;
  lon: number;
  tzOffset: number;
  onClose: () => void;
}

const FACING = ['North', 'South', 'East', 'West', 'North-East', 'South-East', 'North-West', 'South-West'];

const SUBSCORE_WEIGHT_LABELS: { key: 'sun' | 'shadeHeat' | 'view' | 'privacy' | 'wind'; label: string }[] = [
  { key: 'sun', label: 'Sun' },
  { key: 'shadeHeat', label: 'Shade & Heat' },
  { key: 'view', label: 'View' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'wind', label: 'Wind' },
];

const DEFAULT_WEIGHTS = { sun: 30, shadeHeat: 25, view: 20, privacy: 15, wind: 10 };

export default function LiveScoreModal({ lat, lon, tzOffset, onClose }: Props) {
  const [floor, setFloor] = useState('5');
  const [facing, setFacing] = useState('South');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({
        lat: String(lat), lon: String(lon), tzOffset: String(tzOffset),
        floor, facing,
        sunWeight: String(weights.sun), shadeHeatWeight: String(weights.shadeHeat),
        viewWeight: String(weights.view), privacyWeight: String(weights.privacy), windWeight: String(weights.wind),
      });
      const res = await fetch(`/api/score?${params.toString()}`);
      if (!res.ok) throw new Error('score-failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error('LiveScore generation failed:', e);
      setError("Couldn't compute a score for this unit right now — please try again in a minute.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#FFFBF5', borderRadius: 18, padding: 32, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 5 }}>LiveScore</div>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 21, fontWeight: 800, color: '#1A0A00', margin: 0 }}>Will This Unit Work For You?</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#bbb' }}>✕</button>
        </div>

        {!result && !loading && (
          <>
            <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, marginBottom: 24 }}>
              One score for this exact flat — sun, shade &amp; heat, view, privacy, and wind — instead of digging through five tabs.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#5A2800', display: 'block', marginBottom: 8 }}>Floor number</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min="0" max="30" value={floor} onChange={e => setFloor(e.target.value)} style={{ flex: 1, accentColor: '#E07B00' }} />
                <div style={{ background: '#E07B00', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{floor}</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#5A2800', display: 'block', marginBottom: 8 }}>Which direction does the unit face?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                {FACING.map(dir => (
                  <button key={dir} onClick={() => setFacing(dir)} style={{ background: facing === dir ? '#E07B00' : '#fff', color: facing === dir ? '#fff' : '#5A2800', border: `1.5px solid ${facing === dir ? '#E07B00' : 'rgba(200,130,40,0.2)'}`, borderRadius: 9, padding: '7px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>{dir}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setShowWeights(!showWeights)} style={{ background: 'none', border: 'none', color: '#E07B00', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                {showWeights ? '▾' : '▸'} What matters most to you? <span style={{ color: '#B07040', fontWeight: 500 }}>(optional)</span>
              </button>
              {showWeights && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, background: '#fff8ee', border: '1px solid rgba(200,130,40,0.15)', borderRadius: 10, padding: 14 }}>
                  {SUBSCORE_WEIGHT_LABELS.map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, color: '#5A2800' }}>
                      <span style={{ width: 90, flexShrink: 0 }}>{label}</span>
                      <input
                        type="range" min="0" max="100" value={weights[key]}
                        onChange={e => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                        style={{ flex: 1, accentColor: '#E07B00' }}
                      />
                      <span style={{ width: 28, textAlign: 'right', color: '#B07040' }}>{weights[key]}</span>
                    </label>
                  ))}
                  <div style={{ fontSize: 10.5, color: '#ccc' }}>Weights are relative — they don't need to add up to 100.</div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>⚠️ {error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generate} style={{ flex: 1, background: '#E07B00', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(224,123,0,0.3)' }}>
                Get My LiveScore
              </button>
              <button onClick={onClose} style={{ background: '#f0ede8', color: '#888', border: 'none', borderRadius: 12, padding: '13px 18px', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: 20, animation: 'spin 2s linear infinite', display: 'inline-block', color: '#E07B00' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><line x1="12" y1="1.5" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="22.5" /><line x1="1.5" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="22.5" y2="12" /><line x1="4.5" y1="4.5" x2="6.6" y2="6.6" /><line x1="17.4" y1="17.4" x2="19.5" y2="19.5" /><line x1="4.5" y1="19.5" x2="6.6" y2="17.4" /><line x1="17.4" y1="6.6" x2="19.5" y2="4.5" /></svg>
            </div>
            <h3 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 18, fontWeight: 800, color: '#1A0A00', marginBottom: 12 }}>Scoring this unit…</h3>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>Checking sun, shade, nearby buildings, and wind.</p>
          </div>
        )}

        {result && !loading && (
          <>
            <LiveScoreCard result={result} />
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setResult(null)} style={{ flex: 1, background: '#f0ede8', color: '#5A2800', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ← Adjust &amp; recalculate
              </button>
              <button onClick={onClose} style={{ background: '#1A0A00', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </>
        )}

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  );
}
