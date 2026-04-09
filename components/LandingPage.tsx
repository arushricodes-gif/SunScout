'use client';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'#FFFBF5', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:40 }}>
        <svg width="48" height="48" viewBox="0 0 36 36" fill="none">
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
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:'#E07B00', letterSpacing:4, lineHeight:1 }}>SUN SCOUT</div>
          <div style={{ fontSize:10, fontWeight:600, color:'#bbb', letterSpacing:4, textTransform:'uppercase' }}>Visualize the Light</div>
        </div>
      </div>
      <div style={{ textAlign:'center', maxWidth:560, marginBottom:36 }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:700, color:'#1A1A1A', lineHeight:1.15, marginBottom:16 }}>
          Know your <span style={{ color:'#E07B00' }}>sunlight</span><br/>before you buy.
        </h1>
        <p style={{ fontSize:15, color:'#666', lineHeight:1.75 }}>
          Drop a pin on any property. See exactly where sunlight falls — hour by hour, season by season, with real 3D building shadows.
        </p>
      </div>
      <div style={{ background:'#fff', border:'1px solid rgba(224,123,0,0.15)', borderRadius:16, padding:'20px 28px', marginBottom:32, maxWidth:400, width:'100%' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>How it works</div>
        {[['1','Click anywhere on the 3D map to drop a pin'],['2','Sun path + building shadows appear instantly'],['3','Click anywhere again to change location']].map(([n,text]) => (
          <div key={n} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'#E07B00', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{n}</div>
            <span style={{ fontSize:13, color:'#444', lineHeight:1.5 }}>{text}</span>
          </div>
        ))}
      </div>
      <button onClick={onEnter} style={{ background:'#E07B00', color:'#fff', border:'none', borderRadius:12, padding:'15px 44px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:32 }}>
        ☀️ &nbsp;Enter Sun Scout →
      </button>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, maxWidth:560, width:'100%' }}>
        {[['🏡','House hunters','Verify sunlight before signing'],['🌿','Gardeners','Plan sun vs shade spots'],['⚡','Solar owners','Find peak radiation hours'],['📸','Photographers','Scout the golden hour']].map(([icon,title,body]) => (
          <div key={String(title)} style={{ background:'#fff', border:'1px solid rgba(224,123,0,0.12)', borderRadius:12, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'#E07B00', marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em' }}>{title}</div>
            <div style={{ fontSize:11, color:'#888', lineHeight:1.5 }}>{body}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, color:'#ccc', marginTop:24 }}>Free · No login · Works anywhere in the world</p>
    </div>
  );
}
