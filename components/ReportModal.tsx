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

const ORG = '#E07B00';
const INK = '#1A0A00';
const SUB = '#8A8A8A';
const LINE = 'rgba(26,10,0,0.15)';
const MONO = "'IBM Plex Mono', monospace";
const SANS = "'Plus Jakarta Sans', sans-serif";
const DISPLAY = "'Space Grotesk', sans-serif";

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
      // Don't auto-open a tab here -- by this point several awaits have
      // passed since the click, so browsers no longer treat window.open()
      // as a direct user gesture and will usually block it (or, worse,
      // silently drop window.opener even when it isn't blocked). Instead
      // we stay on this tab and show a real "Open Report" button below;
      // clicking that IS a direct gesture, so the tab opens reliably and
      // window.opener (used by the report's "Back to SunScout" link)
      // comes through correctly too.
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
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(10,5,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FFFBF5', border:`1px solid ${LINE}`, padding:0, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 30px 90px rgba(0,0,0,0.35)', fontFamily:SANS }}>
      <div style={{ padding:24 }}>

        {reportUrl ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontFamily:MONO, fontSize:11, fontWeight:500, color:'#16a34a', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:14, border:'1px solid #16a34a', display:'inline-block', padding:'5px 14px' }}>Report Ready</div>
            <h3 style={{ fontFamily:DISPLAY, fontSize:18, fontWeight:800, color:INK, marginBottom:8 }}>Your report is ready</h3>
            <p style={{ fontSize:13, color:SUB, lineHeight:1.6, marginBottom:24 }}>Opens in a new tab. Want to keep it? Save it to your BlindSpot account.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              <button onClick={() => window.open(reportUrl, '_blank')} style={{ background:INK, color:'#fff', border:'none', padding:'13px', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'.03em', textTransform:'uppercase' }}>
                Open Report
              </button>
              {saveState === 'saved' ? (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderTop:'none', padding:'13px', fontSize:13, fontWeight:700, color:'#16a34a', fontFamily:MONO }}>
                  SAVED TO BLINDSPOT
                </div>
              ) : (
                <button
                  onClick={handleSaveToBlindSpot}
                  disabled={saveState === 'saving'}
                  style={{ background:'transparent', color:INK, border:`1px solid ${LINE}`, borderTop:'none', padding:'13px', fontSize:13, fontWeight:700, cursor: saveState === 'saving' ? 'default' : 'pointer', opacity: saveState === 'saving' ? 0.6 : 1, letterSpacing:'.03em', textTransform:'uppercase' }}
                >
                  {saveState === 'saving' ? 'Saving…' : 'Save to BlindSpot'}
                </button>
              )}
              {saveState === 'error' && (
                <div style={{ border:'1px solid #dc2626', padding:'10px 14px', fontSize:12, color:'#dc2626', marginTop:10, fontFamily:MONO }}>ERROR: {saveError}</div>
              )}
              <button onClick={onClose} style={{ background:'none', color:SUB, border:'none', padding:'12px', fontSize:12, cursor:'pointer', marginTop:10, fontFamily:MONO, letterSpacing:'.05em', textTransform:'uppercase' }}>
                Close
              </button>
            </div>
          </div>
        ) : !loading ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:MONO, fontSize:10, fontWeight:500, color:ORG, letterSpacing:'.14em', marginBottom:6 }}>AI SOLAR REPORT</div>
                <h2 style={{ fontFamily:DISPLAY, fontSize:21, fontWeight:800, color:INK, margin:0 }}>Home Buyer Analysis</h2>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:SUB, lineHeight:1, padding:4 }}>✕</button>
            </div>

            <p style={{ fontSize:13, color:SUB, lineHeight:1.6, marginBottom:26 }}>
              We compute precise sun/shadow data for this exact location, capture 12 real screenshots (3 per season) at different times, then use AI to narrate the shadow patterns at your pin location.
            </p>

            <div style={{ marginBottom:22 }}>
              <label style={{ fontFamily:MONO, fontSize:10.5, fontWeight:500, color:INK, letterSpacing:'.08em', display:'block', marginBottom:10, textTransform:'uppercase' }}>Floor number</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input type="range" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} style={{ flex:1, accentColor:ORG }} />
                <div style={{ background:INK, color:'#fff', fontFamily:MONO, fontSize:13, fontWeight:500, padding:'4px 12px', minWidth:40, textAlign:'center' }}>{floor}</div>
              </div>
              <div style={{ fontFamily:MONO, fontSize:10.5, color:SUB, marginTop:6 }}>Floor {floor} ≈ {parseInt(floor)*3}m above ground</div>
            </div>

            <div style={{ marginBottom:22 }}>
              <label style={{ fontFamily:MONO, fontSize:10.5, fontWeight:500, color:INK, letterSpacing:'.08em', display:'block', marginBottom:10, textTransform:'uppercase' }}>Facing direction</label>

              {!facingExpanded ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', border:`1px solid ${LINE}`, padding:'11px 14px' }}>
                  <div style={{ fontSize:13, color:INK }}>
                    {facingLoading ? (
                      <span style={{ color:SUB, fontFamily:MONO, fontSize:11.5 }}>Detecting facing from nearby buildings…</span>
                    ) : (
                      <>
                        <strong>{facing}</strong>
                        <span style={{ color:SUB, fontSize:11.5 }}>
                          {' '}— {facingTouched ? 'set by you' : facingSuggestion ? 'assumed from nearby buildings, unconfirmed' : 'default, unconfirmed'}
                        </span>
                      </>
                    )}
                  </div>
                  <button onClick={() => setFacingExpanded(true)} style={{ background:'none', border:'none', color:ORG, fontFamily:MONO, fontSize:11, fontWeight:500, cursor:'pointer', textTransform:'uppercase', letterSpacing:'.04em', padding:0 }}>
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
                    {FACING.map(dir => (
                      <button key={dir} onClick={() => pickFacing(dir)} style={{ background: facing===dir ? ORG : '#fff', color: facing===dir ? '#fff' : INK, border:`1px solid ${facing===dir ? ORG : LINE}`, padding:'8px 4px', fontSize:11, fontWeight:700, cursor:'pointer', marginLeft:-1, marginTop:-1 }}>{dir}</button>
                    ))}
                  </div>
                  <button onClick={() => setFacingExpanded(false)} style={{ background:'none', border:'none', color:ORG, fontFamily:MONO, fontSize:10.5, cursor:'pointer', marginTop:10, padding:0, textTransform:'uppercase', letterSpacing:'.05em' }}>
                    [−] Done
                  </button>
                </>
              )}

              {facingSuggestion && !facingTouched && (
                <div style={{ fontFamily:MONO, fontSize:10.5, color:SUB, marginTop:10, lineHeight:1.6, borderTop:`1px dashed ${LINE}`, paddingTop:8 }}>
                  {facingSuggestion.sentence}
                </div>
              )}
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontFamily:MONO, fontSize:10.5, fontWeight:500, color:INK, letterSpacing:'.08em', display:'block', marginBottom:10, textTransform:'uppercase' }}>Name this report <span style={{ color:SUB, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Skyline Residences · Unit 502"
                value={reportLabel}
                onChange={e => setReportLabel(e.target.value)}
                style={{ width:'100%', border:`1px solid ${LINE}`, padding:'11px 12px', fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}
              />
              <div style={{ fontFamily:MONO, fontSize:10, color:SUB, marginTop:8 }}>Shows as a small tag at the top of the report — handy if you're tracking a few units at once.</div>
            </div>

            {error && (
              <div style={{ border:'1px solid #dc2626', padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:16, fontFamily:MONO }}>ERROR: {error}</div>
            )}

            <div style={{ display:'flex', gap:0 }}>
              <button onClick={generate} style={{ flex:1, background:ORG, color:'#fff', border:'none', padding:'14px', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'.03em', textTransform:'uppercase' }}>
                Generate AI Report
              </button>
              <button onClick={onClose} style={{ background:'transparent', color:SUB, border:`1px solid ${LINE}`, borderLeft:'none', padding:'14px 20px', fontSize:13, cursor:'pointer' }}>Cancel</button>
            </div>
            <div style={{ fontFamily:MONO, fontSize:10.5, color:SUB, textAlign:'center', marginTop:12, letterSpacing:'.03em' }}>TAKES ~30 SECONDS · FREE · AI-POWERED</div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'30px 0' }}>
            <div style={{ marginBottom:20, animation:'rm-spin 1.6s linear infinite', display:'inline-block', color:ORG }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </div>
            <h3 style={{ fontFamily:DISPLAY, fontSize:17, fontWeight:800, color:INK, marginBottom:10 }}>Generating your report</h3>
            <p style={{ fontFamily:MONO, fontSize:11.5, color:SUB, lineHeight:1.8, marginBottom:20 }}>This usually takes under a minute.</p>
            <div style={{ background:'#EFEBE3', height:4, overflow:'hidden' }}>
              <div style={{ background:ORG, height:'100%', width:`${progress}%`, transition:'width 0.4s ease' }} />
            </div>
          </div>
        )}

        <style>{`
          @keyframes rm-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
      </div>
    </div>
  );
}