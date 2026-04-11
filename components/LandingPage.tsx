'use client';

import { useState } from 'react';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [fbName, setFbName] = useState('');
  const [fbSent, setFbSent] = useState(false);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name:fbName, message:feedback})
      });
      setFbSent(true);
      setFeedback(''); setFbName('');
    } catch {}
  };

  return (
    <div style={{ minHeight:'100vh', position:'relative', background:'#FFFBF5', fontFamily:"'Plus Jakarta Sans',sans-serif", color:'#1A1A1A', display:'flex', flexDirection:'column', alignItems:'center', overflow:'hidden' }}>

      <div style={{ width:'100%', maxWidth:1100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 40px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <line x1="18" y1="2" x2="18" y2="8" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="18" y1="28" x2="18" y2="34" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="2" y1="18" x2="8" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="28" y1="18" x2="34" y2="18" stroke="#E07B00" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6.1" y1="6.1" x2="10.3" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="6.1" x2="21.5" y2="10.3" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="6.1" y1="29.9" x2="10.3" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.7" y1="29.9" x2="21.5" y2="25.7" stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="18" cy="18" r="9" fill="rgba(255,243,224,0.15)" stroke="#F39C12" strokeWidth="1.5"/>
            <circle cx="18" cy="18" r="6.5" fill="#E07B00"/>
            <circle cx="15.5" cy="15.5" r="2" fill="rgba(255,255,255,0.3)"/>
          </svg>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#E07B00', letterSpacing:3 }}>SUN SCOUT</span>
        </div>
        <div style={{ fontSize:12, color:'#aaa', letterSpacing:'.05em' }}>Free · No login required</div>
      </div>

      <div style={{ maxWidth:820, textAlign:'center', padding:'48px 40px 0' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(224,123,0,0.12)', border:'1px solid rgba(224,123,0,0.25)', borderRadius:100, padding:'6px 16px', marginBottom:32, fontSize:12, color:'#E07B00', fontWeight:600, letterSpacing:'.04em' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#F39C12', display:'inline-block' }}/>
          Real 3D building shadows · NOAA solar algorithm
        </div>
        <h1 style={{ fontSize:'clamp(2.8rem,6vw,5rem)', fontWeight:800, lineHeight:1.05, marginBottom:24, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:'-.02em' }}>
          Know your <span style={{ color:'#E07B00' }}>sunlight</span><br/>before you buy.
        </h1>
        <p style={{ fontSize:18, color:'#666', lineHeight:1.7, maxWidth:560, margin:'0 auto 44px' }}>
          When buying a home, sunlight is as important as square footage. The sun's path shifts with the seasons, meaning that a balcony glowing with golden light in June might sit in cool shade come December. Drop a pin on your location to track sunlight hour-by-hour, see how it changes across equinoxes and solstices, and visualize shadow lines to understand how light plays through your space year-round.
        </p>
        <button onClick={onEnter} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          style={{ background:hovered?'#FF8C00':'#E07B00', color:'#1A1A1A', border:'none', borderRadius:14, padding:'16px 48px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all .2s', transform:hovered?'translateY(-2px)':'none', boxShadow:hovered?'0 12px 40px rgba(224,123,0,0.4)':'0 4px 20px rgba(224,123,0,0.25)', marginBottom:16 }}>
          ☀️ &nbsp; Enter Sun Scout →
        </button>
        <div style={{ fontSize:12, color:'#ccc', marginBottom:64 }}>Works anywhere in the world</div>
      </div>

      <div style={{ width:'100%', maxWidth:900, padding:'0 40px', position:'relative' }}>
        <div style={{ background:'#F0EDE8', borderRadius:'20px 20px 0 0', border:'1px solid rgba(224,123,0,0.12)', borderBottom:'none', overflow:'hidden', position:'relative', height:300 }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#E8E4DE 25%,#DDD9D3 25%,#DDD9D3 50%,#E8E4DE 50%,#E8E4DE 75%,#DDD9D3 75%)', backgroundSize:'40px 40px', opacity:.5 }}/>
          <div style={{ position:'absolute', top:'42%', left:0, right:0, height:2, background:'rgba(0,0,0,0.06)' }}/>
          <div style={{ position:'absolute', top:'68%', left:0, right:0, height:1, background:'rgba(0,0,0,0.05)' }}/>
          <div style={{ position:'absolute', left:'33%', top:0, bottom:0, width:2, background:'rgba(0,0,0,0.05)' }}/>
          <div style={{ position:'absolute', left:'62%', top:0, bottom:0, width:1, background:'rgba(224,123,0,0.04)' }}/>
          {[[80,70,65,85],[190,85,55,70],[290,75,70,80],[410,90,50,65],[530,80,60,75],[650,85,45,80],[750,72,75,68],[90,185,85,58],[240,195,58,52],[370,180,72,68],[495,190,48,62],[615,185,68,58],[745,195,52,72]].map(([x,y,w,h],i) => (
            <div key={i} style={{ position:'absolute', left:x, top:y, width:w, height:h, background:i%2===0?'#D8D3CC':'#C8C3BB', borderRadius:3, border:'1px solid rgba(0,0,0,0.04)' }}/>
          ))}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 900 300">
            <path d="M 60 265 Q 450 -40 840 265" fill="none" stroke="rgba(243,156,18,0.12)" strokeWidth="22" strokeLinecap="round"/>
            <path d="M 60 265 Q 450 -40 840 265" fill="none" stroke="#F39C12" strokeWidth="2.5" strokeDasharray="8 10" opacity=".85"/>
            <circle cx="60" cy="265" r="5" fill="#F39C12"/>
            <circle cx="840" cy="265" r="5" fill="#F39C12"/>
            <text x="48" y="254" fill="#FFD06D" fontSize="11" fontFamily="monospace" fontWeight="600" textAnchor="end">🌅 Rise</text>
            <text x="852" y="254" fill="#FFD06D" fontSize="11" fontFamily="monospace" fontWeight="600">Set 🌇</text>
            <text x="450" y="80" fontSize="28" textAnchor="middle">☀️</text>
            <line x1="450" y1="265" x2="415" y2="295" stroke="#8B9AB0" strokeWidth="3" strokeDasharray="5 7" opacity=".5"/>
          </svg>
          <div style={{ position:'absolute', left:'calc(50% - 10px)', top:'82%', fontSize:22 }}>📍</div>
          <div style={{ position:'absolute', top:14, left:14, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(243,156,18,.25)', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:600, fontFamily:'monospace', color:'#E07B00' }}>☀️ 09:32</div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:100, background:'linear-gradient(to top, #FFFBF5, transparent)' }}/>
        </div>
      </div>

      <div style={{ width:'100%', maxWidth:900, padding:'48px 40px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:20 }}>How it works</div>
          {[['Click anywhere on the map','Drop a pin on any property or location'],['Sun path appears instantly','See the arc, building shadows, and animation'],['Click again to change location','Move the pin anywhere, anytime']].map(([title,body],i) => (
            <div key={i} style={{ display:'flex', gap:14, marginBottom:22 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(224,123,0,0.15)', border:'1px solid rgba(224,123,0,0.3)', color:'#E07B00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:2 }}>{i+1}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1A1A1A', marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:13, color:'#aaa', lineHeight:1.5 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:20 }}>Who uses it</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['🏡','House hunters','Check sunlight before signing'],['🌿','Gardeners','Plan full-sun spots'],['⚡','Solar owners','Find peak hours'],['📸','Photographers','Scout golden hour']].map(([icon,title,body]) => (
              <div key={String(title)} style={{ background:'rgba(224,123,0,0.04)', border:'1px solid rgba(224,123,0,0.12)', borderRadius:12, padding:'14px' }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#333', marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:11, color:'#aaa', lineHeight:1.5 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
