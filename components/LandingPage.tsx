'use client';

import { useState, useEffect, useRef } from 'react';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [fbName, setFbName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fbSent, setFbSent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80);
    const onScroll = () => { setScrollY(window.scrollY); scrollRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Full-viewport canvas — scroll drives sun position
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    let W = 0, H = 0, autoT = 0;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cvs!.width = W * devicePixelRatio; cvs!.height = H * devicePixelRatio;
      cvs!.style.width = W + 'px'; cvs!.style.height = H + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      autoT += 0.003;
      ctx.clearRect(0, 0, W, H);

      // Scroll-based sun angle — 0 to PI across first 800px of scroll
      const scrollFraction = Math.min(scrollRef.current / 800, 1);
      const sunAngle = 0.15 + scrollFraction * 0.7 + autoT * (1 - scrollFraction * 0.8);
      const t = sunAngle % Math.PI;

      const cx = W / 2, cy = H + H * 0.15;
      const rx = W * 0.52, ry = H * 1.05;

      // Sky gradient — changes with sun height
      const sunY_norm = Math.sin(t); // 0 to 1 to 0
      const r1 = Math.round(255 - sunY_norm * 30);
      const g1 = Math.round(251 - sunY_norm * 20);
      const b1 = Math.round(245 - sunY_norm * 40);
      ctx.fillStyle = `rgb(${r1},${g1},${b1})`;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = `rgba(224,123,0,${0.04 + sunY_norm * 0.03})`;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Arc glow band
      ctx.save();
      const arcG = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      arcG.addColorStop(0, 'transparent');
      arcG.addColorStop(0.5, `rgba(224,123,0,${0.06 + sunY_norm * 0.08})`);
      arcG.addColorStop(1, 'transparent');
      ctx.strokeStyle = arcG; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Dashed arc path
      ctx.save();
      ctx.strokeStyle = `rgba(224,123,0,${0.15 + sunY_norm * 0.1})`; ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Hour markers
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI - (i / 14) * Math.PI;
        const mx = cx + rx * Math.cos(a), my = cy - ry * Math.sin(a);
        if (my < 0 || my > H) continue;
        ctx.beginPath(); ctx.arc(mx, my, i % 2 === 0 ? 2.5 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224,123,0,${i % 2 === 0 ? 0.4 : 0.18})`; ctx.fill();
      }

      // Sun position
      const sx = cx + rx * Math.cos(Math.PI - t);
      const sy = cy - ry * Math.sin(t);

      if (sy > -50 && sy < H + 50) {
        // Atmospheric halo
        const atmo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 200);
        atmo.addColorStop(0, `rgba(255,180,80,${0.12 + sunY_norm * 0.08})`);
        atmo.addColorStop(0.4, `rgba(255,140,0,${0.05 + sunY_norm * 0.04})`);
        atmo.addColorStop(1, 'transparent');
        ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(sx, sy, 200, 0, Math.PI * 2); ctx.fill();

        // Inner glow
        const inner = ctx.createRadialGradient(sx, sy, 0, sx, sy, 50);
        inner.addColorStop(0, 'rgba(255,200,80,0.55)');
        inner.addColorStop(1, 'transparent');
        ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2); ctx.fill();

        // Sun core
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fillStyle = '#FF9200'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFE080'; ctx.fill();

        // Rays
        for (let r = 0; r < 12; r++) {
          const ra = (r / 12) * Math.PI * 2 + autoT * 0.4;
          const len = 8 + Math.sin(autoT * 3 + r) * 4;
          ctx.strokeStyle = `rgba(255,180,0,${0.35 - r * 0.01})`; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx + 13 * Math.cos(ra), sy + 13 * Math.sin(ra));
          ctx.lineTo(sx + (13 + len) * Math.cos(ra), sy + (13 + len) * Math.sin(ra));
          ctx.stroke();
        }

        // Shadow line from sun through pin to ground
        ctx.save();
        ctx.strokeStyle = `rgba(160,140,110,${0.08 + sunY_norm * 0.06})`; ctx.lineWidth = 2;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy - 60);
        ctx.stroke(); ctx.restore();
      }

      // Horizon buildings — minimal, atmospheric
      const bldData = [
        [0,120,55],[52,95,38],[88,140,70],[155,108,42],[194,130,52],[243,100,60],
        [W*0.38,118,48],[W*0.45,95,38],[W*0.52,128,55],
        [W-310,105,52],[W-262,130,48],[W-218,95,42],[W-180,118,58],[W-125,100,45],[W-85,125,52],[W-38,95,38]
      ];
      bldData.forEach(([x, h, w]) => {
        const alpha = 0.15 + sunY_norm * 0.08;
        ctx.fillStyle = `rgba(190,175,160,${alpha})`;
        ctx.fillRect(x, H - h, w, h);
        // Windows
        for (let row = 0; row < Math.floor(h / 18); row++) {
          for (let col = 0; col < Math.floor((w as number) / 14); col++) {
            if (Math.random() > 0.6) continue;
            ctx.fillStyle = `rgba(224,123,0,${0.06 + sunY_norm * 0.06})`;
            ctx.fillRect(x + col * 14 + 4, H - h + row * 18 + 5, 6, 8);
          }
        }
      });

      // Ground
      ctx.fillStyle = `rgba(200,185,165,${0.12 + sunY_norm * 0.05})`;
      ctx.fillRect(0, H - 4, W, 4);

      // Pin
      const pinPulse = 0.8 + 0.2 * Math.sin(autoT * 2.5);
      const pg = ctx.createRadialGradient(cx, H - 50, 0, cx, H - 50, 22 * pinPulse);
      pg.addColorStop(0, 'rgba(224,123,0,0.3)'); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, H - 50, 22 * pinPulse, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${22 + pinPulse * 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📍', cx, H - 52);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fbName, message: feedback }) });
      setFbSent(true); setFeedback(''); setFbName('');
    } catch {}
  };

  return (
    <div style={{ background: '#FFFBF5', fontFamily: "Plus Jakarta Sans,sans-serif", color: '#1A1A1A' }}>

      {/* FULL VIEWPORT CANVAS HERO */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px', background: scrollY > 20 ? 'rgba(255,251,245,0.8)' : 'transparent', backdropFilter: scrollY > 20 ? 'blur(16px)' : 'none', borderBottom: scrollY > 20 ? '1px solid rgba(224,123,0,0.06)' : 'none', transition: 'all 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              {[0,45,90,135,180,225,270,315].map((d,i)=><line key={i} x1={18+8*Math.cos(d*Math.PI/180)} y1={18+8*Math.sin(d*Math.PI/180)} x2={18+13*Math.cos(d*Math.PI/180)} y2={18+13*Math.sin(d*Math.PI/180)} stroke="#E07B00" strokeWidth="2.2" strokeLinecap="round"/>)}
              <circle cx="18" cy="18" r="6" fill="#E07B00"/>
            </svg>
            <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>Free · No login</span>
            <button onClick={onEnter} style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 100, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif', transition: 'background .2s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
              onMouseLeave={e=>(e.currentTarget.style.background='#1A1A1A')}>
              Open app →
            </button>
          </div>
        </nav>

        {/* Hero text — overlaid on canvas */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '0 9vw', paddingTop: 80, pointerEvents: 'none' }}>
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.8s ease 0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E07B00', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.16em' }}>Solar Path Intelligence</span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(3.5rem,6.5vw,6rem)', fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.045em', margin: '0 0 32px', maxWidth: 640 }}>
              See where the<br/>
              <span style={{ color: '#E07B00', fontStyle: 'italic' }}>sun</span> falls.<br/>
              Before you buy.
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.7, maxWidth: 420, margin: '0 0 40px' }}>
              Drop a pin. Watch the sun move across your property — hour by hour, season by season. Real 3D building shadows. NOAA solar data. Free.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'all' }}>
              <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif', boxShadow: '0 4px 24px rgba(224,123,0,0.3)', transition: 'all .2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(224,123,0,0.45)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 24px rgba(224,123,0,0.3)'; }}>
                Drop a pin →
              </button>
              <span style={{ fontSize: 12, color: '#bbb' }}>Works anywhere on Earth</span>
            </div>
          </div>
        </div>

        {/* Floating data chips */}
        <div style={{ position: 'absolute', top: '50%', right: '6vw', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10, opacity: loaded ? 1 : 0, transition: 'opacity 1s ease 0.5s' }}>
          {[
            { label: '☀️ Elevation', value: '52°', sub: '14:32' },
            { label: '🌅 Sunrise', value: '06:12', sub: 'today' },
            { label: '🌇 Sunset', value: '18:44', sub: 'today' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(224,123,0,0.12)', borderRadius: 12, padding: '10px 16px', animation: `floatA ${3.5 + i * 0.5}s ease-in-out infinite ${i * 0.4}s` }}>
              <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace', marginBottom: 2 }}>{c.label} · {c.sub}</div>
              <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: loaded && scrollY < 50 ? 1 : 0, transition: 'opacity 0.5s', pointerEvents: 'none' }}>
          <span style={{ fontSize: 10, color: '#ccc', letterSpacing: '.12em', textTransform: 'uppercase' }}>Scroll to move the sun</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(224,123,0,0.4), transparent)', animation: 'scrollLine 2s ease-in-out infinite' }}/>
        </div>
      </div>

      {/* STATS BAND */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['250+','Weekly active users'],['Global','Any location on Earth'],['NOAA','Solar algorithm'],['Free','No account ever']].map(([v,l],i)=>(
            <div key={i} style={{ padding: '28px 0', borderRight: i<3 ? '1px solid rgba(0,0,0,0.05)' : 'none', paddingLeft: i > 0 ? 32 : 0 }}>
              <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:28, fontWeight:800, color:'#1A1A1A', letterSpacing:'-0.03em' }}>{v}</div>
              <div style={{ fontSize:12, color:'#bbb', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* THE PROBLEM */}
      <section style={{ padding: '120px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 24 }}>The problem</div>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2.2rem,3.5vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, margin: '0 0 28px' }}>
              You research<br/>the builder.<br/>The price.<br/><em style={{ color: '#E07B00', fontStyle: 'italic' }}>But the sun?</em>
            </h2>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
              Listing photos are shot on peak summer afternoons at the most flattering angle. Nobody tells you the living room is in shadow from October to March. SunScout shows you the truth before you commit.
            </p>
          </div>
          <div>
            {[
              ['Listing photos lie','Shot in June at noon. The balcony that glows in the photos sits in shadow for 8 months. You find out after you move in.'],
              ['No tool existed for buyers','Professional solar software costs ₹30,000/year and needs an engineer. Nothing existed for the person about to sign a lease.'],
              ['The sun moves. A lot.','The difference between summer and winter sun angles can mean a room that is bright all day vs one that sees sunlight for two hours.'],
            ].map(([t,d],i)=>(
              <div key={i} style={{ display:'flex', gap:20, padding:'28px 0', borderBottom: i<2 ? '1px solid rgba(0,0,0,0.06)' : 'none', alignItems:'flex-start' }}>
                <div style={{ width:26,height:26,borderRadius:'50%',border:'1.5px solid rgba(224,123,0,0.25)',color:'#E07B00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,marginTop:3,fontFamily:'Space Grotesk,sans-serif' }}>0{i+1}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:15,fontWeight:700,marginBottom:8 }}>{t}</div>
                  <div style={{ fontSize:13.5,color:'#aaa',lineHeight:1.7 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET — full bleed dark */}
      <section style={{ background: '#1A1A1A', padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%, rgba(224,123,0,0.1), transparent 60%)',pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:64,flexWrap:'wrap',gap:20 }}>
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:20 }}>What you get</div>
              <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.2rem,3.5vw,3.2rem)',fontWeight:800,letterSpacing:'-0.04em',lineHeight:1.0,color:'#fff',margin:0 }}>
                Three things.<br/>One pin drop.
              </h2>
            </div>
            <button onClick={onEnter} style={{ background:'rgba(255,255,255,0.07)',color:'#fff',border:'1px solid rgba(255,255,255,0.12)',borderRadius:100,padding:'10px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#E07B00'; e.currentTarget.style.borderColor='#E07B00'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }}>
              Try it free →
            </button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden' }}>
            {[
              {n:'01',title:'Hour-by-hour sun path',desc:'Watch the sun animate across your location. Pause at any hour. See exact angles, light direction, and shadow lengths in real time.',tag:'Animated'},
              {n:'02',title:'3D building shadows',desc:'Real geometry from OpenStreetMap. Neighboring buildings cast accurate shadows on your property — not estimates, not guesses. Actual geodata.',tag:'Accurate'},
              {n:'03',title:'Full seasonal range',desc:'Jump between summer solstice, winter solstice, and equinox. Understand the full year of light in 10 seconds. Before you commit to the next 10 years.',tag:'Year-round'},
            ].map((f,i)=>(
              <div key={i} style={{ background:'#222',padding:'36px 28px',transition:'background 0.2s',cursor:'default' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#282828'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='#222'}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:'rgba(224,123,0,0.5)',letterSpacing:'.1em' }}>{f.n}</span>
                  <span style={{ fontSize:9,fontWeight:700,color:'#E07B00',background:'rgba(224,123,0,0.1)',border:'1px solid rgba(224,123,0,0.2)',borderRadius:100,padding:'3px 10px',letterSpacing:'.08em',textTransform:'uppercase' }}>{f.tag}</span>
                </div>
                <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:16,fontWeight:700,color:'#fff',marginBottom:14,lineHeight:1.25 }}>{f.title}</div>
                <div style={{ fontSize:13.5,color:'rgba(255,255,255,0.35)',lineHeight:1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO USES IT */}
      <section style={{ padding:'120px 48px',background:'#FFFBF5' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:20 }}>Who uses it</div>
          <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.2rem,3.5vw,3.2rem)',fontWeight:800,letterSpacing:'-0.04em',lineHeight:1.0,margin:'0 0 64px' }}>
            If light matters<br/>to your decision.
          </h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:2,background:'rgba(224,123,0,0.07)',borderRadius:20,overflow:'hidden' }}>
            {[
              {icon:'🏡',title:'Home Buyers',desc:"Does that south-facing balcony actually get sun in December? Check before you sign. The answer takes 10 seconds and might save you years of disappointment."},
              {icon:'⚡',title:'Solar Installers',desc:'Verify rooftop viability before the site visit. See shading from neighboring structures, hour by hour, in every season. Qualify leads remotely.'},
              {icon:'🌿',title:'Gardeners',desc:'Find the exact full-sun and partial-shade zones in your plot. Know which corner gets 6 hours of direct sun in July and which is in permanent shade.'},
              {icon:'📸',title:'Photographers',desc:"Scout golden hour locations before you go. Know where the light will land, at what angle, at what time — for any location on Earth."},
            ].map((u,i)=>(
              <div key={i} style={{ background:'#fff',padding:'36px 32px',transition:'background 0.2s',cursor:'default',display:'flex',gap:20,alignItems:'flex-start' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#FFFBF5'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='#fff'}>
                <div style={{ fontSize:28,flexShrink:0,marginTop:2 }}>{u.icon}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:15,fontWeight:700,marginBottom:10 }}>{u.title}</div>
                  <div style={{ fontSize:13.5,color:'#aaa',lineHeight:1.7 }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'120px 48px',background:'#fff',borderTop:'1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth:700,margin:'0 auto',textAlign:'center' }}>
          <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:32 }}>Free · No account · Instant</div>
          <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.6rem,5vw,4.5rem)',fontWeight:800,letterSpacing:'-0.045em',lineHeight:0.9,margin:'0 0 32px' }}>
            Your property's<br/><em style={{ color:'#E07B00',fontStyle:'italic' }}>sunlight.</em><br/>Right now.
          </h2>
          <p style={{ fontSize:15,color:'#aaa',lineHeight:1.75,marginBottom:44 }}>
            Works for any address on Earth. No signup, no cost. Just drop a pin.
          </p>
          <button onClick={onEnter} style={{ background:'#E07B00',color:'#fff',border:'none',borderRadius:12,padding:'15px 44px',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',boxShadow:'0 6px 32px rgba(224,123,0,0.3)',transition:'all .2s' }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 14px 48px rgba(224,123,0,0.45)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 32px rgba(224,123,0,0.3)'; }}>
            Drop a pin →
          </button>

          <div style={{ marginTop:80,textAlign:'left',borderTop:'1px solid rgba(0,0,0,0.06)',paddingTop:56 }}>
            <div style={{ fontSize:14,fontWeight:700,color:'#333',marginBottom:20 }}>We read every message.</div>
            {fbSent ? (
              <div style={{ color:'#E07B00',fontWeight:700 }}>✓ Got it. Thank you.</div>
            ) : (
              <form onSubmit={handleFeedback} style={{ display:'flex',flexDirection:'column',gap:10 }}>
                <input value={fbName} onChange={e=>setFbName(e.target.value)} placeholder="Name (optional)" style={{ border:'1.5px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'Plus Jakarta Sans,sans-serif',color:'#1A1A1A',outline:'none',transition:'border-color .15s' }} onFocus={e=>(e.currentTarget.style.borderColor='#E07B00')} onBlur={e=>(e.currentTarget.style.borderColor='#eee')}/>
                <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What would make SunScout better?" rows={3} required style={{ border:'1.5px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'Plus Jakarta Sans,sans-serif',color:'#1A1A1A',outline:'none',resize:'vertical',transition:'border-color .15s' }} onFocus={e=>(e.currentTarget.style.borderColor='#E07B00')} onBlur={e=>(e.currentTarget.style.borderColor='#eee')}/>
                <button type="submit" style={{ alignSelf:'flex-start',background:'#1A1A1A',color:'#fff',border:'none',borderRadius:100,padding:'9px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'background .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
                  onMouseLeave={e=>(e.currentTarget.style.background='#1A1A1A')}>
                  Send →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#111',borderTop:'1px solid rgba(255,255,255,0.04)',padding:'22px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
        <span style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:14,fontWeight:800,color:'#fff' }}>Sun<span style={{ color:'#E07B00' }}>Scout</span> <span style={{ fontSize:11,color:'#444',fontWeight:400 }}>· Part of <a href="https://loclens.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color:'#E07B00',textDecoration:'none' }}>BlindSpot</a></span></span>
        <span style={{ fontSize:12,color:'#333' }}>Free · No login · Works worldwide</span>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes scrollLine { 0%{opacity:1;transform:scaleY(1)} 100%{opacity:0;transform:scaleY(0.3) translateY(20px)} }
        @media(max-width:900px){
          [style*="grid-template-columns: 1fr 1fr"],[style*="grid-template-columns: repeat(3"],[style*="grid-template-columns: repeat(4"],[style*="grid-template-columns: 1fr 1.4fr"],[style*="grid-template-columns: repeat(2"] { grid-template-columns:1fr!important; }
          nav,[style*="padding: 22px 48px"],[style*="padding: 120px 48px"] { padding-left:20px!important; padding-right:20px!important; }
        }
      `}</style>
    </div>
  );
}'use client';

import { useState, useEffect, useRef } from 'react';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [fbName, setFbName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fbSent, setFbSent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80);
    const onScroll = () => { setScrollY(window.scrollY); scrollRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Full-viewport canvas — scroll drives sun position
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    let W = 0, H = 0, autoT = 0;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cvs!.width = W * devicePixelRatio; cvs!.height = H * devicePixelRatio;
      cvs!.style.width = W + 'px'; cvs!.style.height = H + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      autoT += 0.003;
      ctx.clearRect(0, 0, W, H);

      // Scroll-based sun angle — 0 to PI across first 800px of scroll
      const scrollFraction = Math.min(scrollRef.current / 800, 1);
      const sunAngle = 0.15 + scrollFraction * 0.7 + autoT * (1 - scrollFraction * 0.8);
      const t = sunAngle % Math.PI;

      const cx = W / 2, cy = H + H * 0.15;
      const rx = W * 0.52, ry = H * 1.05;

      // Sky gradient — changes with sun height
      const sunY_norm = Math.sin(t); // 0 to 1 to 0
      const r1 = Math.round(255 - sunY_norm * 30);
      const g1 = Math.round(251 - sunY_norm * 20);
      const b1 = Math.round(245 - sunY_norm * 40);
      ctx.fillStyle = `rgb(${r1},${g1},${b1})`;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = `rgba(224,123,0,${0.04 + sunY_norm * 0.03})`;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Arc glow band
      ctx.save();
      const arcG = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      arcG.addColorStop(0, 'transparent');
      arcG.addColorStop(0.5, `rgba(224,123,0,${0.06 + sunY_norm * 0.08})`);
      arcG.addColorStop(1, 'transparent');
      ctx.strokeStyle = arcG; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Dashed arc path
      ctx.save();
      ctx.strokeStyle = `rgba(224,123,0,${0.15 + sunY_norm * 0.1})`; ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Hour markers
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI - (i / 14) * Math.PI;
        const mx = cx + rx * Math.cos(a), my = cy - ry * Math.sin(a);
        if (my < 0 || my > H) continue;
        ctx.beginPath(); ctx.arc(mx, my, i % 2 === 0 ? 2.5 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224,123,0,${i % 2 === 0 ? 0.4 : 0.18})`; ctx.fill();
      }

      // Sun position
      const sx = cx + rx * Math.cos(Math.PI - t);
      const sy = cy - ry * Math.sin(t);

      if (sy > -50 && sy < H + 50) {
        // Atmospheric halo
        const atmo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 200);
        atmo.addColorStop(0, `rgba(255,180,80,${0.12 + sunY_norm * 0.08})`);
        atmo.addColorStop(0.4, `rgba(255,140,0,${0.05 + sunY_norm * 0.04})`);
        atmo.addColorStop(1, 'transparent');
        ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(sx, sy, 200, 0, Math.PI * 2); ctx.fill();

        // Inner glow
        const inner = ctx.createRadialGradient(sx, sy, 0, sx, sy, 50);
        inner.addColorStop(0, 'rgba(255,200,80,0.55)');
        inner.addColorStop(1, 'transparent');
        ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2); ctx.fill();

        // Sun core
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fillStyle = '#FF9200'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFE080'; ctx.fill();

        // Rays
        for (let r = 0; r < 12; r++) {
          const ra = (r / 12) * Math.PI * 2 + autoT * 0.4;
          const len = 8 + Math.sin(autoT * 3 + r) * 4;
          ctx.strokeStyle = `rgba(255,180,0,${0.35 - r * 0.01})`; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx + 13 * Math.cos(ra), sy + 13 * Math.sin(ra));
          ctx.lineTo(sx + (13 + len) * Math.cos(ra), sy + (13 + len) * Math.sin(ra));
          ctx.stroke();
        }

        // Shadow line from sun through pin to ground
        ctx.save();
        ctx.strokeStyle = `rgba(160,140,110,${0.08 + sunY_norm * 0.06})`; ctx.lineWidth = 2;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy - 60);
        ctx.stroke(); ctx.restore();
      }

      // Horizon buildings — minimal, atmospheric
      const bldData = [
        [0,120,55],[52,95,38],[88,140,70],[155,108,42],[194,130,52],[243,100,60],
        [W*0.38,118,48],[W*0.45,95,38],[W*0.52,128,55],
        [W-310,105,52],[W-262,130,48],[W-218,95,42],[W-180,118,58],[W-125,100,45],[W-85,125,52],[W-38,95,38]
      ];
      bldData.forEach(([x, h, w]) => {
        const alpha = 0.15 + sunY_norm * 0.08;
        ctx.fillStyle = `rgba(190,175,160,${alpha})`;
        ctx.fillRect(x, H - h, w, h);
        // Windows
        for (let row = 0; row < Math.floor(h / 18); row++) {
          for (let col = 0; col < Math.floor((w as number) / 14); col++) {
            if (Math.random() > 0.6) continue;
            ctx.fillStyle = `rgba(224,123,0,${0.06 + sunY_norm * 0.06})`;
            ctx.fillRect(x + col * 14 + 4, H - h + row * 18 + 5, 6, 8);
          }
        }
      });

      // Ground
      ctx.fillStyle = `rgba(200,185,165,${0.12 + sunY_norm * 0.05})`;
      ctx.fillRect(0, H - 4, W, 4);

      // Pin
      const pinPulse = 0.8 + 0.2 * Math.sin(autoT * 2.5);
      const pg = ctx.createRadialGradient(cx, H - 50, 0, cx, H - 50, 22 * pinPulse);
      pg.addColorStop(0, 'rgba(224,123,0,0.3)'); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, H - 50, 22 * pinPulse, 0, Math.PI * 2); ctx.fill();
      ctx.font = `${22 + pinPulse * 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📍', cx, H - 52);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fbName, message: feedback }) });
      setFbSent(true); setFeedback(''); setFbName('');
    } catch {}
  };

  return (
    <div style={{ background: '#FFFBF5', fontFamily: "Plus Jakarta Sans,sans-serif", color: '#1A1A1A' }}>

      {/* FULL VIEWPORT CANVAS HERO */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px', background: scrollY > 20 ? 'rgba(255,251,245,0.8)' : 'transparent', backdropFilter: scrollY > 20 ? 'blur(16px)' : 'none', borderBottom: scrollY > 20 ? '1px solid rgba(224,123,0,0.06)' : 'none', transition: 'all 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              {[0,45,90,135,180,225,270,315].map((d,i)=><line key={i} x1={18+8*Math.cos(d*Math.PI/180)} y1={18+8*Math.sin(d*Math.PI/180)} x2={18+13*Math.cos(d*Math.PI/180)} y2={18+13*Math.sin(d*Math.PI/180)} stroke="#E07B00" strokeWidth="2.2" strokeLinecap="round"/>)}
              <circle cx="18" cy="18" r="6" fill="#E07B00"/>
            </svg>
            <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>Free · No login</span>
            <button onClick={onEnter} style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 100, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif', transition: 'background .2s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
              onMouseLeave={e=>(e.currentTarget.style.background='#1A1A1A')}>
              Open app →
            </button>
          </div>
        </nav>

        {/* Hero text — overlaid on canvas */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '0 9vw', paddingTop: 80, pointerEvents: 'none' }}>
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.8s ease 0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E07B00', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.16em' }}>Solar Path Intelligence</span>
            </div>
            <h1 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(3.5rem,6.5vw,6rem)', fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.045em', margin: '0 0 32px', maxWidth: 640 }}>
              See where the<br/>
              <span style={{ color: '#E07B00', fontStyle: 'italic' }}>sun</span> falls.<br/>
              Before you buy.
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.7, maxWidth: 420, margin: '0 0 40px' }}>
              Drop a pin. Watch the sun move across your property — hour by hour, season by season. Real 3D building shadows. NOAA solar data. Free.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'all' }}>
              <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans,sans-serif', boxShadow: '0 4px 24px rgba(224,123,0,0.3)', transition: 'all .2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(224,123,0,0.45)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 24px rgba(224,123,0,0.3)'; }}>
                Drop a pin →
              </button>
              <span style={{ fontSize: 12, color: '#bbb' }}>Works anywhere on Earth</span>
            </div>
          </div>
        </div>

        {/* Floating data chips */}
        <div style={{ position: 'absolute', top: '50%', right: '6vw', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10, opacity: loaded ? 1 : 0, transition: 'opacity 1s ease 0.5s' }}>
          {[
            { label: '☀️ Elevation', value: '52°', sub: '14:32' },
            { label: '🌅 Sunrise', value: '06:12', sub: 'today' },
            { label: '🌇 Sunset', value: '18:44', sub: 'today' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(224,123,0,0.12)', borderRadius: 12, padding: '10px 16px', animation: `floatA ${3.5 + i * 0.5}s ease-in-out infinite ${i * 0.4}s` }}>
              <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace', marginBottom: 2 }}>{c.label} · {c.sub}</div>
              <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: loaded && scrollY < 50 ? 1 : 0, transition: 'opacity 0.5s', pointerEvents: 'none' }}>
          <span style={{ fontSize: 10, color: '#ccc', letterSpacing: '.12em', textTransform: 'uppercase' }}>Scroll to move the sun</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(224,123,0,0.4), transparent)', animation: 'scrollLine 2s ease-in-out infinite' }}/>
        </div>
      </div>

      {/* STATS BAND */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['250+','Weekly active users'],['Global','Any location on Earth'],['NOAA','Solar algorithm'],['Free','No account ever']].map(([v,l],i)=>(
            <div key={i} style={{ padding: '28px 0', borderRight: i<3 ? '1px solid rgba(0,0,0,0.05)' : 'none', paddingLeft: i > 0 ? 32 : 0 }}>
              <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:28, fontWeight:800, color:'#1A1A1A', letterSpacing:'-0.03em' }}>{v}</div>
              <div style={{ fontSize:12, color:'#bbb', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* THE PROBLEM */}
      <section style={{ padding: '120px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 24 }}>The problem</div>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2.2rem,3.5vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, margin: '0 0 28px' }}>
              You research<br/>the builder.<br/>The price.<br/><em style={{ color: '#E07B00', fontStyle: 'italic' }}>But the sun?</em>
            </h2>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.8 }}>
              Listing photos are shot on peak summer afternoons at the most flattering angle. Nobody tells you the living room is in shadow from October to March. SunScout shows you the truth before you commit.
            </p>
          </div>
          <div>
            {[
              ['Listing photos lie','Shot in June at noon. The balcony that glows in the photos sits in shadow for 8 months. You find out after you move in.'],
              ['No tool existed for buyers','Professional solar software costs ₹30,000/year and needs an engineer. Nothing existed for the person about to sign a lease.'],
              ['The sun moves. A lot.','The difference between summer and winter sun angles can mean a room that is bright all day vs one that sees sunlight for two hours.'],
            ].map(([t,d],i)=>(
              <div key={i} style={{ display:'flex', gap:20, padding:'28px 0', borderBottom: i<2 ? '1px solid rgba(0,0,0,0.06)' : 'none', alignItems:'flex-start' }}>
                <div style={{ width:26,height:26,borderRadius:'50%',border:'1.5px solid rgba(224,123,0,0.25)',color:'#E07B00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,marginTop:3,fontFamily:'Space Grotesk,sans-serif' }}>0{i+1}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:15,fontWeight:700,marginBottom:8 }}>{t}</div>
                  <div style={{ fontSize:13.5,color:'#aaa',lineHeight:1.7 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET — full bleed dark */}
      <section style={{ background: '#1A1A1A', padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%, rgba(224,123,0,0.1), transparent 60%)',pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:64,flexWrap:'wrap',gap:20 }}>
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:20 }}>What you get</div>
              <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.2rem,3.5vw,3.2rem)',fontWeight:800,letterSpacing:'-0.04em',lineHeight:1.0,color:'#fff',margin:0 }}>
                Three things.<br/>One pin drop.
              </h2>
            </div>
            <button onClick={onEnter} style={{ background:'rgba(255,255,255,0.07)',color:'#fff',border:'1px solid rgba(255,255,255,0.12)',borderRadius:100,padding:'10px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#E07B00'; e.currentTarget.style.borderColor='#E07B00'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }}>
              Try it free →
            </button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden' }}>
            {[
              {n:'01',title:'Hour-by-hour sun path',desc:'Watch the sun animate across your location. Pause at any hour. See exact angles, light direction, and shadow lengths in real time.',tag:'Animated'},
              {n:'02',title:'3D building shadows',desc:'Real geometry from OpenStreetMap. Neighboring buildings cast accurate shadows on your property — not estimates, not guesses. Actual geodata.',tag:'Accurate'},
              {n:'03',title:'Full seasonal range',desc:'Jump between summer solstice, winter solstice, and equinox. Understand the full year of light in 10 seconds. Before you commit to the next 10 years.',tag:'Year-round'},
            ].map((f,i)=>(
              <div key={i} style={{ background:'#222',padding:'36px 28px',transition:'background 0.2s',cursor:'default' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#282828'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='#222'}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:'rgba(224,123,0,0.5)',letterSpacing:'.1em' }}>{f.n}</span>
                  <span style={{ fontSize:9,fontWeight:700,color:'#E07B00',background:'rgba(224,123,0,0.1)',border:'1px solid rgba(224,123,0,0.2)',borderRadius:100,padding:'3px 10px',letterSpacing:'.08em',textTransform:'uppercase' }}>{f.tag}</span>
                </div>
                <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:16,fontWeight:700,color:'#fff',marginBottom:14,lineHeight:1.25 }}>{f.title}</div>
                <div style={{ fontSize:13.5,color:'rgba(255,255,255,0.35)',lineHeight:1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO USES IT */}
      <section style={{ padding:'120px 48px',background:'#FFFBF5' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:20 }}>Who uses it</div>
          <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.2rem,3.5vw,3.2rem)',fontWeight:800,letterSpacing:'-0.04em',lineHeight:1.0,margin:'0 0 64px' }}>
            If light matters<br/>to your decision.
          </h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:2,background:'rgba(224,123,0,0.07)',borderRadius:20,overflow:'hidden' }}>
            {[
              {icon:'🏡',title:'Home Buyers',desc:"Does that south-facing balcony actually get sun in December? Check before you sign. The answer takes 10 seconds and might save you years of disappointment."},
              {icon:'⚡',title:'Solar Installers',desc:'Verify rooftop viability before the site visit. See shading from neighboring structures, hour by hour, in every season. Qualify leads remotely.'},
              {icon:'🌿',title:'Gardeners',desc:'Find the exact full-sun and partial-shade zones in your plot. Know which corner gets 6 hours of direct sun in July and which is in permanent shade.'},
              {icon:'📸',title:'Photographers',desc:"Scout golden hour locations before you go. Know where the light will land, at what angle, at what time — for any location on Earth."},
            ].map((u,i)=>(
              <div key={i} style={{ background:'#fff',padding:'36px 32px',transition:'background 0.2s',cursor:'default',display:'flex',gap:20,alignItems:'flex-start' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#FFFBF5'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='#fff'}>
                <div style={{ fontSize:28,flexShrink:0,marginTop:2 }}>{u.icon}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:15,fontWeight:700,marginBottom:10 }}>{u.title}</div>
                  <div style={{ fontSize:13.5,color:'#aaa',lineHeight:1.7 }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'120px 48px',background:'#fff',borderTop:'1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth:700,margin:'0 auto',textAlign:'center' }}>
          <div style={{ fontSize:10,fontWeight:700,color:'#E07B00',textTransform:'uppercase',letterSpacing:'.16em',marginBottom:32 }}>Free · No account · Instant</div>
          <h2 style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:'clamp(2.6rem,5vw,4.5rem)',fontWeight:800,letterSpacing:'-0.045em',lineHeight:0.9,margin:'0 0 32px' }}>
            Your property's<br/><em style={{ color:'#E07B00',fontStyle:'italic' }}>sunlight.</em><br/>Right now.
          </h2>
          <p style={{ fontSize:15,color:'#aaa',lineHeight:1.75,marginBottom:44 }}>
            Works for any address on Earth. No signup, no cost. Just drop a pin.
          </p>
          <button onClick={onEnter} style={{ background:'#E07B00',color:'#fff',border:'none',borderRadius:12,padding:'15px 44px',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',boxShadow:'0 6px 32px rgba(224,123,0,0.3)',transition:'all .2s' }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 14px 48px rgba(224,123,0,0.45)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 32px rgba(224,123,0,0.3)'; }}>
            Drop a pin →
          </button>

          <div style={{ marginTop:80,textAlign:'left',borderTop:'1px solid rgba(0,0,0,0.06)',paddingTop:56 }}>
            <div style={{ fontSize:14,fontWeight:700,color:'#333',marginBottom:20 }}>We read every message.</div>
            {fbSent ? (
              <div style={{ color:'#E07B00',fontWeight:700 }}>✓ Got it. Thank you.</div>
            ) : (
              <form onSubmit={handleFeedback} style={{ display:'flex',flexDirection:'column',gap:10 }}>
                <input value={fbName} onChange={e=>setFbName(e.target.value)} placeholder="Name (optional)" style={{ border:'1.5px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'Plus Jakarta Sans,sans-serif',color:'#1A1A1A',outline:'none',transition:'border-color .15s' }} onFocus={e=>(e.currentTarget.style.borderColor='#E07B00')} onBlur={e=>(e.currentTarget.style.borderColor='#eee')}/>
                <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What would make SunScout better?" rows={3} required style={{ border:'1.5px solid #eee',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'Plus Jakarta Sans,sans-serif',color:'#1A1A1A',outline:'none',resize:'vertical',transition:'border-color .15s' }} onFocus={e=>(e.currentTarget.style.borderColor='#E07B00')} onBlur={e=>(e.currentTarget.style.borderColor='#eee')}/>
                <button type="submit" style={{ alignSelf:'flex-start',background:'#1A1A1A',color:'#fff',border:'none',borderRadius:100,padding:'9px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'background .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
                  onMouseLeave={e=>(e.currentTarget.style.background='#1A1A1A')}>
                  Send →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#111',borderTop:'1px solid rgba(255,255,255,0.04)',padding:'22px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
        <span style={{ fontFamily:'Space Grotesk,sans-serif',fontSize:14,fontWeight:800,color:'#fff' }}>Sun<span style={{ color:'#E07B00' }}>Scout</span> <span style={{ fontSize:11,color:'#444',fontWeight:400 }}>· Part of <a href="https://loclens.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color:'#E07B00',textDecoration:'none' }}>BlindSpot</a></span></span>
        <span style={{ fontSize:12,color:'#333' }}>Free · No login · Works worldwide</span>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes scrollLine { 0%{opacity:1;transform:scaleY(1)} 100%{opacity:0;transform:scaleY(0.3) translateY(20px)} }
        @media(max-width:900px){
          [style*="grid-template-columns: 1fr 1fr"],[style*="grid-template-columns: repeat(3"],[style*="grid-template-columns: repeat(4"],[style*="grid-template-columns: 1fr 1.4fr"],[style*="grid-template-columns: repeat(2"] { grid-template-columns:1fr!important; }
          nav,[style*="padding: 22px 48px"],[style*="padding: 120px 48px"] { padding-left:20px!important; padding-right:20px!important; }
        }
      `}</style>
    </div>
  );
}
