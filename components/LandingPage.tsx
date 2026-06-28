'use client';

import { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────
interface Chapter {
  id: string;
  progress: number; // 0–1 within this chapter
}

// ── Main Component ─────────────────────────────────
export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [scrollY, setScrollY]     = useState(0);
  const [loaded, setLoaded]       = useState(false);
  const [fbName, setFbName]       = useState('');
  const [feedback, setFeedback]   = useState('');
  const [fbSent, setFbSent]       = useState(false);
  const canvasRef                 = useRef<HTMLCanvasElement>(null);
  const animRef                   = useRef<number>(0);
  const scrollRef                 = useRef(0);
  const tRef                      = useRef(0);

  // Total scroll height = 5 chapters × 100vh
  const CHAPTER_H = typeof window !== 'undefined' ? window.innerHeight : 800;
  const CHAPTERS  = 5;
  const TOTAL_H   = CHAPTER_H * CHAPTERS;

  // Current chapter + progress
  const chapter     = Math.min(Math.floor(scrollY / CHAPTER_H), CHAPTERS - 1);
  const chProg      = Math.min((scrollY % CHAPTER_H) / CHAPTER_H, 1);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80);
    const onScroll = () => { setScrollY(window.scrollY); scrollRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Canvas — reacts to scroll position
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx  = cvs.getContext('2d')!;
    let W = 0, H = 0;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cvs!.width  = W * devicePixelRatio;
      cvs!.height = H * devicePixelRatio;
      cvs!.style.width  = W + 'px';
      cvs!.style.height = H + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function ease(x: number) { return x < 0.5 ? 2*x*x : 1-(-2*x+2)**2/2; }
    function lerp(a: number, b: number, t: number) { return a + (b-a)*t; }
    function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }

    function draw() {
      tRef.current += 0.005;
      const tt = tRef.current;
      const scroll  = scrollRef.current;
      const ch      = Math.min(Math.floor(scroll / H), CHAPTERS - 1);
      const prog    = clamp((scroll % H) / H, 0, 1);
      const ep      = ease(prog);

      ctx.clearRect(0, 0, W, H);

      // ── Sky color transitions per chapter ──
      // ch0: warm cream → ch1: golden morning → ch2: bright noon → ch3: amber dusk → ch4: deep dusk
      const skies = [
        [255,251,245], [255,244,220], [255,248,230], [255,235,200], [240,220,195]
      ];
      const nextSkies = [
        [255,244,220], [255,248,230], [255,235,200], [240,220,195], [230,210,185]
      ];
      const r = Math.round(lerp(skies[ch][0], nextSkies[ch][0], ep));
      const g = Math.round(lerp(skies[ch][1], nextSkies[ch][1], ep));
      const b = Math.round(lerp(skies[ch][2], nextSkies[ch][2], ep));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, W, H);

      // ── Grid (fades in/out) ──
      const gridAlpha = ch === 0 ? 0.04 : 0.02;
      ctx.strokeStyle = `rgba(224,123,0,${gridAlpha})`;
      ctx.lineWidth = 1;
      const gs = 72;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // ── Sun arc — position driven by scroll ──
      const cx = W / 2;
      const cy = H + H * 0.12;
      const rx = W * 0.48;
      const ry = H * 1.0;

      // Sun angle: ch0=0.1π (just risen), scrolling to ch4=0.9π (almost set)
      const globalProg = clamp(scroll / (H * (CHAPTERS - 1)), 0, 1);
      // Add gentle auto-oscillation on top of scroll position
      const autoWobble = Math.sin(tt * 1.5) * 0.02;
      const sunT = 0.1 + globalProg * 0.8 + autoWobble;
      const sx = cx + rx * Math.cos(Math.PI - sunT * Math.PI);
      const sy = cy - ry * Math.sin(sunT * Math.PI);
      const sunHeight = Math.sin(sunT * Math.PI); // 0–1

      // Arc glow band
      ctx.save();
      const arcG = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      arcG.addColorStop(0, 'transparent');
      arcG.addColorStop(0.5, `rgba(224,123,0,${0.05 + sunHeight * 0.1})`);
      arcG.addColorStop(1, 'transparent');
      ctx.strokeStyle = arcG; ctx.lineWidth = 32;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Dashed arc
      ctx.save();
      ctx.strokeStyle = `rgba(224,123,0,${0.12 + sunHeight * 0.1})`; ctx.lineWidth = 1;
      ctx.setLineDash([4, 9]);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Hour dots
      for (let i = 0; i <= 12; i++) {
        const a  = Math.PI - (i / 12) * Math.PI;
        const mx = cx + rx * Math.cos(a), my = cy - ry * Math.sin(a);
        if (my < 0 || my > H) continue;
        const isPast = (i / 12) <= sunT;
        ctx.beginPath(); ctx.arc(mx, my, i % 3 === 0 ? 2.5 : 1.4, 0, Math.PI * 2);
        ctx.fillStyle = isPast
          ? `rgba(224,123,0,${i % 3 === 0 ? 0.55 : 0.28})`
          : `rgba(224,123,0,${i % 3 === 0 ? 0.18 : 0.08})`;
        ctx.fill();
      }

      // Sun glow
      if (sy > -80 && sy < H + 80) {
        const atmo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 180);
        atmo.addColorStop(0, `rgba(255,170,60,${0.18 + sunHeight * 0.12})`);
        atmo.addColorStop(0.45, `rgba(224,123,0,${0.06 + sunHeight * 0.06})`);
        atmo.addColorStop(1, 'transparent');
        ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(sx, sy, 180, 0, Math.PI * 2); ctx.fill();

        const inner = ctx.createRadialGradient(sx, sy, 0, sx, sy, 44);
        inner.addColorStop(0, 'rgba(255,200,80,0.6)'); inner.addColorStop(1, 'transparent');
        ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(sx, sy, 44, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fillStyle = '#FF9000'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 6,  0, Math.PI * 2); ctx.fillStyle = '#FFE060'; ctx.fill();

        // Rotating rays
        for (let ri = 0; ri < 10; ri++) {
          const ra  = (ri / 10) * Math.PI * 2 + tt * 0.5;
          const r1  = 14, r2 = 20 + Math.sin(tt * 4 + ri) * 4;
          ctx.strokeStyle = `rgba(255,170,0,${0.28 - ri * 0.018})`;
          ctx.lineWidth   = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx + r1 * Math.cos(ra), sy + r1 * Math.sin(ra));
          ctx.lineTo(sx + r2 * Math.cos(ra), sy + r2 * Math.sin(ra));
          ctx.stroke();
        }

        // Shadow ray to pin
        ctx.save();
        ctx.strokeStyle = `rgba(150,130,100,${0.07 + sunHeight * 0.06})`;
        ctx.lineWidth = 1.5; ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, H - 60); ctx.stroke();
        ctx.restore();
      }

      // ── Buildings (appear from ch1 onwards) ──
      const bldAlpha = clamp((scroll - H * 0.5) / (H * 0.5), 0, 1);
      if (bldAlpha > 0) {
        const blds = [
          [0,115,52],[50,88,36],[84,138,68],[150,104,40],[188,128,50],[236,96,58],
          [W*0.36,112,46],[W*0.44,90,36],[W*0.51,122,52],
          [W-308,100,50],[W-260,126,46],[W-216,92,40],[W-178,114,56],
          [W-124,96,44],[W-82,120,50],[W-36,92,36]
        ];
        blds.forEach(([bx, bh, bw]) => {
          ctx.fillStyle = `rgba(185,170,155,${bldAlpha * (0.18 + sunHeight * 0.08)})`;
          ctx.fillRect(bx, H - bh, bw, bh);
          // Window glow
          for (let row = 0; row < Math.floor(bh / 16); row++) {
            for (let col = 0; col < Math.floor(bw / 12); col++) {
              if ((row + col) % 3 !== 0) continue;
              ctx.fillStyle = `rgba(255,160,0,${bldAlpha * sunHeight * 0.12})`;
              ctx.fillRect(bx + col*12 + 3, H - bh + row*16 + 4, 6, 7);
            }
          }
        });
      }

      // Ground line
      ctx.fillStyle = `rgba(195,180,162,${0.1 + sunHeight * 0.06})`;
      ctx.fillRect(0, H - 4, W, 4);

      // ── Pin (appears from ch2 onwards) ──
      const pinAlpha = clamp((scroll - H * 1.5) / (H * 0.4), 0, 1);
      if (pinAlpha > 0) {
        const pp = 0.8 + 0.2 * Math.sin(tt * 2.5);
        const pg = ctx.createRadialGradient(cx, H - 55, 0, cx, H - 55, 20 * pp);
        pg.addColorStop(0, `rgba(224,123,0,${0.3 * pinAlpha})`); pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, H - 55, 20 * pp, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = pinAlpha;
        ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('📍', cx, H - 56);
        ctx.globalAlpha = 1;
      }

      // ── Shadow bar on ground (ch3+) ──
      const shadowAlpha = clamp((scroll - H * 2.5) / (H * 0.4), 0, 1);
      if (shadowAlpha > 0 && bldAlpha > 0) {
        const shadowLen = (1 - sunHeight) * 200;
        const shadowDir = Math.cos(sunT * Math.PI) * -1;
        ctx.save();
        ctx.globalAlpha = shadowAlpha * 0.1;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.ellipse(cx + shadowDir * shadowLen * 0.5, H - 4, shadowLen * 0.5 + 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:fbName,message:feedback}) });
      setFbSent(true); setFeedback(''); setFbName('');
    } catch {}
  };

  // Text opacity helpers
  const show = (from: number, to: number) => {
    const op = clamp01((scrollY - from) / 200) * clamp01((to - scrollY) / 200);
    return { opacity: op, transform: `translateY(${(1 - clamp01((scrollY - from) / 300)) * 20}px)`, transition: 'none' };
  };
  function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
  const H_WIN = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div style={{ background: '#FFFBF5', fontFamily: 'Plus Jakarta Sans,sans-serif', color: '#1A1A1A' }}>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding: scrollY > 30 ? '13px 48px' : '20px 48px', background: scrollY > 30 ? 'rgba(255,251,245,0.88)' : 'transparent', backdropFilter: scrollY > 30 ? 'blur(16px)' : 'none', borderBottom: scrollY > 30 ? '1px solid rgba(224,123,0,0.07)' : 'none', transition:'padding 0.3s ease, background 0.3s ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            {[0,45,90,135,180,225,270,315].map((d,i)=>(
              <line key={i} x1={18+8*Math.cos(d*Math.PI/180)} y1={18+8*Math.sin(d*Math.PI/180)} x2={18+13*Math.cos(d*Math.PI/180)} y2={18+13*Math.sin(d*Math.PI/180)} stroke="#E07B00" strokeWidth="2.2" strokeLinecap="round"/>
            ))}
            <circle cx="18" cy="18" r="6" fill="#E07B00"/>
          </svg>
          <span style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:16, fontWeight:800, letterSpacing:'-0.02em' }}>Sun<span style={{ color:'#E07B00' }}>Scout</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <span style={{ fontSize:12, color:'#bbb' }}>Free · No login</span>
          <button onClick={onEnter} style={{ background:'#1A1A1A', color:'#fff', border:'none', borderRadius:100, padding:'8px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif', transition:'background .2s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
            onMouseLeave={e=>(e.currentTarget.style.background='#1A1A1A')}>
            Open app →
          </button>
        </div>
      </nav>

      {/* STICKY CANVAS */}
      <canvas ref={canvasRef} style={{ position:'fixed', top:0, left:0, zIndex:0, width:'100vw', height:'100vh', pointerEvents:'none' }} />

      {/* SCROLL CONTAINER — creates scroll height */}
      <div style={{ height: `${TOTAL_H + H_WIN}px`, position:'relative', zIndex:10 }}>

        {/* ── Chapter 0: Hero ── */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', alignItems:'center', pointerEvents:'none' }}>
          <div style={{ padding:'0 9vw', maxWidth:700, opacity: loaded ? clamp01((H_WIN * 0.85 - scrollY) / 200) : 0, transform: `translateY(${(1 - clamp01((800 - scrollY) / 400)) * 20}px)`, transition: scrollY === 0 ? 'opacity 0.8s ease' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#E07B00', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em' }}>Solar Path Intelligence</span>
            </div>
            <h1 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(3.2rem,6vw,5.8rem)', fontWeight:800, lineHeight:0.92, letterSpacing:'-0.045em', margin:'0 0 28px' }}>
              See where the<br/>
              <em style={{ color:'#E07B00', fontStyle:'italic' }}>sun</em> falls.<br/>
              Before you buy.
            </h1>
            <p style={{ fontSize:16, color:'#666', lineHeight:1.75, maxWidth:420, margin:'0 0 32px' }}>
              Drop a pin on any property. Watch the sun move across it — hour by hour, season by season. Real 3D building shadows. Free.
            </p>
            {/* Feature chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:32, pointerEvents:'all' }}>
              {['Hour-by-hour animation','3D building shadows','Seasonal shifts','Global coverage'].map(chip=>(
                <div key={chip} style={{ background:'rgba(224,123,0,0.09)', border:'1px solid rgba(224,123,0,0.18)', borderRadius:100, padding:'5px 14px', fontSize:11, fontWeight:600, color:'#E07B00', letterSpacing:'.03em' }}>{chip}</div>
              ))}
            </div>
            {/* Stats row */}
            <div style={{ display:'flex', gap:32, paddingTop:20, borderTop:'1px solid rgba(224,123,0,0.1)' }}>
              {[['250+','weekly users'],['Global','coverage'],['Free','always']].map(([v,l])=>(
                <div key={l}>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:20, fontWeight:800, color:'#1A1A1A', letterSpacing:'-0.03em' }}>{v}</div>
                  <div style={{ fontSize:10, color:'#bbb', marginTop:2, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize:12, color:'#E07B00', letterSpacing:'.06em', margin:'24px 0 0', animation:'bounce 2s ease-in-out infinite' }}>
              ↓ scroll to see it move
            </p>
          </div>
        </div>

      {/* Persistent floating CTA */}
      <button onClick={onEnter} style={{ position:'fixed', bottom:28, right:28, zIndex:300, background:'#E07B00', color:'#fff', border:'none', borderRadius:100, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif', boxShadow:'0 6px 32px rgba(224,123,0,0.4)', transition:'all .2s', display:'flex', alignItems:'center', gap:8 }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 44px rgba(224,123,0,0.55)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 32px rgba(224,123,0,0.4)'; }}>
        <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
          {[0,45,90,135,180,225,270,315].map((d,i)=>(
            <line key={i} x1={18+7*Math.cos(d*Math.PI/180)} y1={18+7*Math.sin(d*Math.PI/180)} x2={18+12*Math.cos(d*Math.PI/180)} y2={18+12*Math.sin(d*Math.PI/180)} stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          ))}
          <circle cx="18" cy="18" r="5.5" fill="#fff"/>
        </svg>
        Open SunScout
      </button>

        {/* ── Chapter 1: Morning — sun rising ── */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', alignItems:'center', pointerEvents:'none' }}>
          <div style={{ padding:'0 9vw', maxWidth:600, ...show(H_WIN * 0.9, H_WIN * 1.85) }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:20 }}>06:00 — Sunrise</div>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.4rem,4.5vw,4rem)', fontWeight:800, letterSpacing:'-0.04em', lineHeight:0.95, margin:'0 0 24px' }}>
              The sun rises.<br/>
              <em style={{ color:'#E07B00', fontStyle:'italic' }}>Not all homes wake with it.</em>
            </h2>
            <p style={{ fontSize:15, color:'#888', lineHeight:1.8, maxWidth:420 }}>
              Listing photos are shot at noon in June. The living room that glows in the photos sits in shadow from October to March. Nobody mentions this.
            </p>
          </div>
        </div>

        {/* ── Chapter 2: Noon — sun high ── */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', alignItems:'center', pointerEvents:'none' }}>
          <div style={{ padding:'0 9vw', maxWidth:600, ...show(H_WIN * 1.9, H_WIN * 2.85) }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:20 }}>12:00 — Peak Sun</div>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.4rem,4.5vw,4rem)', fontWeight:800, letterSpacing:'-0.04em', lineHeight:0.95, margin:'0 0 24px' }}>
              Drop a pin.<br/>
              <em style={{ color:'#E07B00', fontStyle:'italic' }}>Get the full picture.</em>
            </h2>
            <p style={{ fontSize:15, color:'#888', lineHeight:1.8, maxWidth:420 }}>
              SunScout uses NOAA solar algorithms and real OpenStreetMap building geometry to show exactly where light falls — at any hour, on any day of the year, anywhere on Earth.
            </p>
            {/* Stats inline */}
            <div style={{ display:'flex', gap:36, marginTop:32 }}>
              {[['250+','weekly users'],['Global','coverage'],['Free','always']].map(([v,l])=>(
                <div key={l}>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:22, fontWeight:800, color:'#1A1A1A' }}>{v}</div>
                  <div style={{ fontSize:11, color:'#ccc', marginTop:2, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Chapter 3: Afternoon — shadows long ── */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', alignItems:'center', pointerEvents:'none' }}>
          <div style={{ padding:'0 9vw', maxWidth:600, ...show(H_WIN * 2.9, H_WIN * 3.85) }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:20 }}>16:00 — Long shadows</div>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.4rem,4.5vw,4rem)', fontWeight:800, letterSpacing:'-0.04em', lineHeight:0.95, margin:'0 0 24px' }}>
              The sun moves.<br/>
              <em style={{ color:'#E07B00', fontStyle:'italic' }}>A lot.</em>
            </h2>
            <p style={{ fontSize:15, color:'#888', lineHeight:1.8, maxWidth:420 }}>
              The same property looks completely different at 9am vs 3pm. And completely different again in December vs June. See all of it — before you sign anything.
            </p>
            {/* Feature chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:32 }}>
              {['Hour-by-hour animation','3D building shadows','Seasonal comparison','Solar panel scoring'].map(chip=>(
                <div key={chip} style={{ background:'rgba(224,123,0,0.09)', border:'1px solid rgba(224,123,0,0.2)', borderRadius:100, padding:'6px 14px', fontSize:12, fontWeight:600, color:'#E07B00' }}>{chip}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Chapter 4: Sunset — CTA ── */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
          <div style={{ textAlign:'center', maxWidth:600, padding:'0 24px', ...show(H_WIN * 3.9, H_WIN * 5) }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:24 }}>Free · No account · Instant</div>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.8rem,5vw,4.8rem)', fontWeight:800, letterSpacing:'-0.045em', lineHeight:0.92, margin:'0 0 28px' }}>
              Your property.<br/><em style={{ color:'#E07B00', fontStyle:'italic' }}>Now you know.</em>
            </h2>
            <p style={{ fontSize:15, color:'#888', lineHeight:1.75, marginBottom:40 }}>
              Works for any address on Earth. No signup. No cost. Drop a pin.
            </p>
            <button onClick={onEnter} style={{ background:'#E07B00', color:'#fff', border:'none', borderRadius:12, padding:'16px 44px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif', boxShadow:'0 8px 36px rgba(224,123,0,0.35)', transition:'all .2s', pointerEvents:'all' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 16px 52px rgba(224,123,0,0.5)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 8px 36px rgba(224,123,0,0.35)'; }}>
              Drop a pin →
            </button>
          </div>
        </div>
      </div>

      {/* ── OFF-CANVAS SECTIONS (normal scroll, below the sticky experience) ── */}
      <div style={{ position:'relative', zIndex:10, background:'#FFFBF5' }}>

        {/* WHO USES IT */}
        <section style={{ padding:'100px 48px', borderTop:'1px solid rgba(224,123,0,0.1)' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#E07B00', textTransform:'uppercase', letterSpacing:'.16em', marginBottom:20 }}>Who uses it</div>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.2rem,3.5vw,3.2rem)', fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.0, margin:'0 0 60px' }}>
              If light matters<br/>to your decision.
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:2, background:'rgba(224,123,0,0.07)', borderRadius:20, overflow:'hidden' }}>
              {[
                {icon:'🏡', title:'Home Buyers', desc:"Does that south-facing balcony actually get sun in December? Check before you sign. The answer takes 10 seconds."},
                {icon:'⚡', title:'Solar Installers', desc:'Verify rooftop viability before the site visit. See shading from neighboring structures, every hour, every season.'},
                {icon:'🌿', title:'Gardeners', desc:'Find the exact full-sun zones in your plot. Know which corner gets 6 hours of direct sun in July.'},
                {icon:'📸', title:'Photographers', desc:"Scout golden hour positions before you go. Know exactly where the light lands, at any time, anywhere."},
              ].map((u,i)=>(
                <div key={i} style={{ background:'#fff', padding:'32px', transition:'background 0.2s', cursor:'default', display:'flex', gap:18, alignItems:'flex-start' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#FFFBF5'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='#fff'}>
                  <div style={{ fontSize:26, flexShrink:0, marginTop:2 }}>{u.icon}</div>
                  <div>
                    <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:15, fontWeight:700, marginBottom:8 }}>{u.title}</div>
                    <div style={{ fontSize:13.5, color:'#aaa', lineHeight:1.7 }}>{u.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA + FEEDBACK */}
        <section style={{ padding:'100px 48px', background:'#1A1A1A', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, rgba(224,123,0,0.1), transparent 60%)', pointerEvents:'none' }}/>
          <div style={{ maxWidth:640, margin:'0 auto', textAlign:'center', position:'relative' }}>
            <h2 style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:'clamp(2.4rem,4vw,3.6rem)', fontWeight:800, letterSpacing:'-0.04em', color:'#fff', lineHeight:0.95, margin:'0 0 24px' }}>
              See your property.<br/><em style={{ color:'#E07B00', fontStyle:'italic' }}>Right now.</em>
            </h2>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.4)', lineHeight:1.75, marginBottom:40 }}>Free. No account. Works anywhere on Earth.</p>
            <button onClick={onEnter} style={{ background:'#E07B00', color:'#fff', border:'none', borderRadius:12, padding:'15px 44px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif', boxShadow:'0 6px 32px rgba(224,123,0,0.3)', transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 14px 48px rgba(224,123,0,0.45)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 32px rgba(224,123,0,0.3)'; }}>
              Drop a pin →
            </button>

            <div style={{ marginTop:72, textAlign:'left', borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:48 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:20 }}>We read every message.</div>
              {fbSent ? (
                <div style={{ color:'#E07B00', fontWeight:700 }}>✓ Got it. Thank you.</div>
              ) : (
                <form onSubmit={handleFeedback} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <input value={fbName} onChange={e=>setFbName(e.target.value)} placeholder="Name (optional)" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'Plus Jakarta Sans,sans-serif', color:'#fff', outline:'none' }}/>
                  <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What would make SunScout better?" rows={3} required style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:14, fontFamily:'Plus Jakarta Sans,sans-serif', color:'#fff', outline:'none', resize:'vertical' }}/>
                  <button type="submit" style={{ alignSelf:'flex-start', background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)', borderRadius:100, padding:'9px 24px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Plus Jakarta Sans,sans-serif', transition:'background .2s' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#E07B00')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.1)')}>
                    Send →
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background:'#111', borderTop:'1px solid rgba(255,255,255,0.04)', padding:'22px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <span style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:14, fontWeight:800, color:'#fff' }}>Sun<span style={{ color:'#E07B00' }}>Scout</span> <span style={{ fontSize:11, color:'#444', fontWeight:400 }}>· Part of <a href="https://loclens.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color:'#E07B00', textDecoration:'none' }}>BlindSpot</a></span></span>
          <span style={{ fontSize:12, color:'#333' }}>Free · No login · Works worldwide</span>
        </footer>
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)}   50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)}         50%{transform:translateY(5px)} }
        .hide-mobile { display: flex; }
        @media(max-width:768px){
          .hide-mobile { display:none!important; }
          nav { padding:14px 20px!important; }
          [style*="padding: 100px 48px"] { padding:60px 20px!important; }
          [style*="grid-template-columns: repeat(2"] { grid-template-columns:1fr!important; }
        }
      `}</style>
    </div>
  );
}
