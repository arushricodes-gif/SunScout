'use client';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#FFF8F0 0%,#FFF3E0 60%,#FFE0B2 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:48 }}>
        <svg width="56" height="56" viewBox="0 0 36 36" fill="none">
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
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:'#E07B00', letterSpacing:4, lineHeight:1 }}>SUN SCOUT</div>
          <div style={{ fontSize:11, fontWeight:600, color:'#aaa', letterSpacing:4, textTransform:'uppercase' }}>Visualize the Light</div>
        </div>
      </div>
      <div style={{ textAlign:'center', maxWidth:640, marginBottom:48 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:800, color:'#1A1A1A', lineHeight:1.1, marginBottom:20 }}>
          Know Your <span style={{ color:'#E07B00' }}>Sunlight</span><br/>Before You Buy.
        </div>
        <div style={{ fontSize:'1.1rem', color:'#555', lineHeight:1.8, marginBottom:12 }}>
          Drop a pin on any property. See exactly where sunlight falls — hour by hour, season by season, with real 3D building shadows.
        </div>
        <div style={{ fontSize:'0.95rem', color:'#aaa' }}>Free · No login · Works anywhere in the world</div>
      </div>
      <button onClick={onEnter} style={{ background:'#E07B00', color:'#fff', border:'none', borderRadius:16, padding:'18px 48px', fontSize:'1.1rem', fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", cursor:'pointer', boxShadow:'0 8px 32px rgba(224,123,0,0.35)', marginBottom:48 }}>
        ☀️ &nbsp; Enter Sun Scout →
      </button>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, maxWidth:800, width:'100%' }}>
        {[{icon:'🏡',title:'House Hunters',body:'Verify sunlight before signing'},{icon:'🌿',title:'Gardeners',body:'Plan full-sun vs shade spots'},{icon:'⚡',title:'Solar Owners',body:'Check peak radiation hours'},{icon:'📸',title:'Photographers',body:'Scout the perfect golden hour'}].map(u => (
          <div key={u.title} style={{ background:'rgba(255,255,255,0.7)', border:'2px solid rgba(224,123,0,0.12)', borderRadius:14, padding:'18px 16px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{u.icon}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:'#E07B00', marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em' }}>{u.title}</div>
            <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>{u.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
