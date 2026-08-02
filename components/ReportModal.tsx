'use client';

import { useState, useEffect, useRef } from 'react';
import { getBlindSpotSession, saveReportToBlindSpot, redirectToBlindSpotLogin } from '@/lib/blindspot';

interface Props {
  lat: number;
  lon: number;
  tzOffset: number;
  address?: string;
  onClose: () => void;
  captureScreenshots: () => Promise<{label:string, base64:string}[]>;
}

const FACING = ['North','South','East','West','North-East','South-East','North-West','South-West'];

export default function ReportModal({ lat, lon, tzOffset, address, onClose, captureScreenshots }: Props) {
  const [floor, setFloor]     = useState('5');
  const [facing, setFacing]   = useState('South');
  const [facingTouched, setFacingTouched] = useState(false); // becomes true the moment the person picks a direction themselves
  const facingTouchedRef = useRef(false);
  const [facingSuggestion, setFacingSuggestion] = useState<{ direction: string; sentence: string } | null>(null);
  const [facingLoading, setFacingLoading] = useState(true);
  const [facingExpanded, setFacingExpanded] = useState(false); // the picker only shows if the person asks to change the guess
  const [reportLabel, setReportLabel] = useState(''); // optional nickname, e.g. "Skyline Residences · Unit 502"
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]     = useState('');
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportPayload, setReportPayload] = useState<{ summary: any; analysis: string; screenshots: {label:string, base64:string}[] } | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Auto-guess a facing direction as soon as the modal opens, so the person
  // doesn't have to know it up front. Never overwrites a direction they've
  // already picked themselves (checked via a ref so this effect doesn't need
  // to depend on — and re-fire on — facingTouched).
  useEffect(() => {
    let cancelled = false;
    setFacingLoading(true);
    fetch(`/api/report/suggest-facing?lat=${lat}&lon=${lon}`)
      .then(res => res.ok ? res.json() : { suggestion: null })
      .then(({ suggestion }) => {
        if (cancelled) return;
        if (suggestion) {
          setFacingSuggestion(suggestion);
          if (!facingTouchedRef.current) setFacing(suggestion.direction);
        } else if (!facingTouchedRef.current) {
          // No usable building data near this point — don't sit on the
          // arbitrary 'South' initial state and label it a "guess". Open
          // the picker so the person actually chooses instead.
          setFacingExpanded(true);
        }
      })
      .catch(() => {
        if (!cancelled && !facingTouchedRef.current) setFacingExpanded(true);
      })
      .finally(() => { if (!cancelled) setFacingLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon]);

  const pickFacing = (dir: string) => {
    setFacing(dir);
    setFacingTouched(true);
    facingTouchedRef.current = true;
    setFacingExpanded(false); // collapse back to the summary line once they've made a choice
  };

  const generate = async () => {
    setLoading(true);
    setError('');
    setProgress(5);
    try {
      const addr = address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      const screenshots = await captureScreenshots();
      setProgress(35);

      const analyseRes = await fetch('/api/report/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots, lat, lon, address: addr, floor, facing, tzOffset }),
      });
      if (!analyseRes.ok) throw new Error('analysis-failed');
      const { analysis, summary } = await analyseRes.json();
      setProgress(75);

      const pdfRes = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lon, tzOffset, address: addr, floor, facing, screenshots, analysis, summary,
          reportLabel: reportLabel || undefined,
          facingAssumptionNote: (!facingTouched && facingSuggestion) ? facingSuggestion.sentence : undefined,
        }),
      });
      if (!pdfRes.ok) throw new Error('pdf-failed');
      setProgress(100);

      const html = await pdfRes.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setReportUrl(url);
      setReportPayload({ summary, analysis, screenshots });
    } catch (e: any) {
      // Log the real technical cause for debugging, but never show it to
      // the person -- Gemini quota errors, network failures, etc. all
      // just become one calm, friendly message.
      console.error('Report generation failed:', e);
      setError("Something went wrong generating your report. This sometimes happens when things are busy — please try again in a minute.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBlindSpot = async () => {
    if (!reportPayload) return;
    setSaveState('saving');
    setSaveError('');
    const addr = address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const payload = {
      address: addr, lat, lon, floor, facing,
      summary: reportPayload.summary, analysis: reportPayload.analysis,
      screenshots: reportPayload.screenshots,
      reportLabel: reportLabel || undefined,
    };
    try {
      const session = await getBlindSpotSession();
      if (!session) {
        // Full-page redirect to BlindSpot's normal login -- proven to
        // work reliably, unlike the popup approach. Stashes the report
        // and comes back to /blindspot-callback once signed in.
        redirectToBlindSpotLogin(payload);
        return;
      }
      await saveReportToBlindSpot(payload);
      setSaveState('saved');
    } catch (e: any) {
      setSaveState('error');
      setSaveError(e.message || 'Could not save. Try again.');
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FFFBF5', borderRadius:0, padding:32, width:'100%', maxWidth:460, boxShadow:'0 24px 80px rgba(0,0,0,0.2)', fontFamily:'Plus Jakarta Sans,sans-serif' }}>

        {reportUrl ? (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
            <h3 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:18, fontWeight:800, color:'#1A0A00', marginBottom:8 }}>Report ready</h3>
            <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:24 }}>Opened in a new tab. Want to keep it? Save it to your BlindSpot account.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={() => window.open(reportUrl, '_blank')} style={{ background:'#f0ede8', color:'#5A2800', border:'none', borderRadius:0, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                View Report Again
              </button>
              {saveState === 'saved' ? (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:0, padding:'13px', fontSize:14, fontWeight:700, color:'#16a34a' }}>
                  ✓ Saved to BlindSpot
                </div>
              ) : (
                <button
                  onClick={handleSaveToBlindSpot}
                  disabled={saveState === 'saving'}
                  style={{ background:'#1A0A00', color:'#fff', border:'none', borderRadius:0, padding:'13px', fontSize:14, fontWeight:700, cursor: saveState === 'saving' ? 'default' : 'pointer', opacity: saveState === 'saving' ? 0.6 : 1 }}
                >
                  {saveState === 'saving' ? 'Saving…' : 'Save to BlindSpot'}
                </button>
              )}
              {saveState === 'error' && (
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#dc2626' }}>⚠️ {saveError}</div>
              )}
              <button onClick={onClose} style={{ background:'none', color:'#888', border:'none', padding:'8px', fontSize:13, cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>
        ) : !loading ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>AI Solar Report</div>
                <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:21, fontWeight:800, color:'#1A0A00', margin:0 }}>Home Buyer Analysis</h2>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
            </div>

            <p style={{ fontSize:13, color:'#999', lineHeight:1.6, marginBottom:24 }}>
              We compute precise sun/shadow data for this exact location, capture 12 real screenshots (3 per season) at different times, then use AI to narrate the shadow patterns at your pin location.
            </p>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#5A2800', display:'block', marginBottom:8 }}>Floor number</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input type="range" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} style={{ flex:1, accentColor:'#E07B00' }} />
                <div style={{ background:'#E07B00', color:'#fff', borderRadius:8, padding:'4px 12px', fontSize:14, fontWeight:700, minWidth:40, textAlign:'center' }}>{floor}</div>
              </div>
              <div style={{ fontSize:11, color:'#B07040', marginTop:3 }}>Floor {floor} ≈ {parseInt(floor)*3}m above ground</div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#5A2800', display:'block', marginBottom:8 }}>Which direction does the unit face?</label>

              {!facingExpanded ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff8ee', border:'1.5px solid rgba(200,130,40,0.2)', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:13, color:'#5A2800' }}>
                    {facingLoading ? (
                      <span style={{ color:'#B07040' }}>🧭 Detecting facing from nearby buildings…</span>
                    ) : (
                      <>
                        <strong>{facing}</strong>
                        <span style={{ color:'#B07040', fontSize:11.5 }}>
                          {' '}— {facingTouched ? 'set by you' : facingSuggestion ? 'assumed from nearby buildings, unconfirmed' : 'default, unconfirmed'}
                        </span>
                      </>
                    )}
                  </div>
                  <button onClick={() => setFacingExpanded(true)} style={{ background:'none', border:'none', color:'#E07B00', fontSize:12, fontWeight:700, cursor:'pointer', textDecoration:'underline', padding:0 }}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                    {FACING.map(dir => (
                      <button key={dir} onClick={() => pickFacing(dir)} style={{ background: facing===dir ? '#E07B00' : '#fff', color: facing===dir ? '#fff' : '#5A2800', border: `1.5px solid ${facing===dir ? '#E07B00' : 'rgba(200,130,40,0.2)'}`, borderRadius:9, padding:'7px 4px', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>{dir}</button>
                    ))}
                  </div>
                  <button onClick={() => setFacingExpanded(false)} style={{ background:'none', border:'none', color:'#B07040', fontSize:11, cursor:'pointer', marginTop:8, padding:0 }}>
                    Done
                  </button>
                </>
              )}

              {facingSuggestion && !facingTouched && (
                <div style={{ fontSize:10.5, color:'#B07040', marginTop:8, lineHeight:1.5 }}>
                  {facingSuggestion.sentence}
                </div>
              )}
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#5A2800', display:'block', marginBottom:8 }}>Name this report (optional)</label>
              <input
                type="text"
                placeholder="e.g. Skyline Residences · Unit 502"
                value={reportLabel}
                onChange={e => setReportLabel(e.target.value)}
                style={{ width:'100%', border:'1.5px solid rgba(200,130,40,0.2)', borderRadius:9, padding:'10px 12px', fontSize:13, fontFamily:'inherit' }}
              />
              <div style={{ fontSize:10.5, color:'#ccc', marginTop:6 }}>Shows as a small tag at the top of the report — handy if you're tracking a few units at once.</div>
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:14 }}>⚠️ {error}</div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={generate} style={{ flex:1, background:'#E07B00', color:'#fff', border:'none', borderRadius:0, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(224,123,0,0.3)' }}>
                📸 Generate AI Report
              </button>
              <button onClick={onClose} style={{ background:'#f0ede8', color:'#888', border:'none', borderRadius:0, padding:'13px 18px', fontSize:14, cursor:'pointer' }}>Cancel</button>
            </div>
            <div style={{ fontSize:11, color:'#ccc', textAlign:'center', marginTop:10 }}>Takes ~30 seconds · Free · AI-powered analysis</div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ marginBottom:20, animation:'spin 2s linear infinite', display:'inline-block', color:'#E07B00' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/><line x1="4.5" y1="4.5" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.5" y2="19.5"/><line x1="4.5" y1="19.5" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.5" y2="4.5"/></svg>
            </div>
            <h3 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:18, fontWeight:800, color:'#1A0A00', marginBottom:12 }}>Generating your report...</h3>
            <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:20 }}>This usually takes under a minute.</p>
            <div style={{ background:'#f0ede8', borderRadius:0, height:6, overflow:'hidden' }}>
              <div style={{ background:'#E07B00', height:'100%', width:`${progress}%`, borderRadius:0, transition:'width 0.4s ease' }} />
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  );
}