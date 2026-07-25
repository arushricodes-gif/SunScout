'use client';

import { useState } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError]     = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const addr = address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      setLoadingMsg('📸 Capturing 12 map screenshots...');
      const screenshots = await captureScreenshots();

      setLoadingMsg('🤖 Gemini is analysing real shadows...');
      const analyseRes = await fetch('/api/report/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots, lat, lon, address: addr, floor, facing, tzOffset }),
      });
      if (!analyseRes.ok) throw new Error('Analysis failed');
      const { analysis, summary } = await analyseRes.json();

      setLoadingMsg('📄 Building your report...');
      const pdfRes = await fetch('/api/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, tzOffset, address: addr, floor, facing, screenshots, analysis, summary }),
      });
      if (!pdfRes.ok) throw new Error('PDF generation failed');

      const html = await pdfRes.text();
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#FFFBF5', borderRadius:20, padding:32, width:'100%', maxWidth:460, boxShadow:'0 24px 80px rgba(0,0,0,0.2)', fontFamily:'Plus Jakarta Sans,sans-serif' }}>

        {!loading ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:5 }}>AI Solar Report</div>
                <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:21, fontWeight:800, color:'#1A0A00', margin:0 }}>Home Buyer Analysis</h2>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#bbb' }}>✕</button>
            </div>

            <p style={{ fontSize:13, color:'#999', lineHeight:1.6, marginBottom:24 }}>
              We compute precise sun/shadow data for this exact location, capture 12 real screenshots (3 per season) at different times, then use Gemini Vision to narrate the shadow patterns at your pin location.
            </p>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#5A2800', display:'block', marginBottom:8 }}>Floor number</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input type="range" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} style={{ flex:1, accentColor:'#E07B00' }} />
                <div style={{ background:'#E07B00', color:'#fff', borderRadius:8, padding:'4px 12px', fontSize:14, fontWeight:700, minWidth:40, textAlign:'center' }}>{floor}</div>
              </div>
              <div style={{ fontSize:11, color:'#B07040', marginTop:3 }}>Floor {floor} ≈ {parseInt(floor)*3}m above ground</div>
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#5A2800', display:'block', marginBottom:8 }}>Which direction does the unit face?</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                {FACING.map(dir => (
                  <button key={dir} onClick={() => setFacing(dir)} style={{ background: facing===dir ? '#E07B00' : '#fff', color: facing===dir ? '#fff' : '#5A2800', border: `1.5px solid ${facing===dir ? '#E07B00' : 'rgba(200,130,40,0.2)'}`, borderRadius:9, padding:'7px 4px', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>{dir}</button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#dc2626', marginBottom:14 }}>⚠️ {error}</div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={generate} style={{ flex:1, background:'#E07B00', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(224,123,0,0.3)' }}>
                📸 Generate AI Report
              </button>
              <button onClick={onClose} style={{ background:'#f0ede8', color:'#888', border:'none', borderRadius:12, padding:'13px 18px', fontSize:14, cursor:'pointer' }}>Cancel</button>
            </div>
            <div style={{ fontSize:11, color:'#ccc', textAlign:'center', marginTop:10 }}>Takes ~30 seconds · Free · Powered by Gemini Vision</div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:48, marginBottom:20, animation:'spin 2s linear infinite', display:'inline-block' }}>☀️</div>
            <h3 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:18, fontWeight:800, color:'#1A0A00', marginBottom:12 }}>Analysing your property...</h3>
            <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:20 }}>{loadingMsg}</p>
            <div style={{ background:'#f0ede8', borderRadius:8, height:6, overflow:'hidden' }}>
              <div style={{ background:'#E07B00', height:'100%', width:'60%', borderRadius:8, animation:'progress 2s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes progress { 0%{width:20%} 50%{width:80%} 100%{width:20%} }
        `}</style>
      </div>
    </div>
  );
}