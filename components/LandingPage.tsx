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
  const tRef = useRef(0);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 60);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    let W = 0, H = 0;

    function resize() {
      W = cvs!.offsetWidth * window.devicePixelRatio;
      H = cvs!.offsetHeight * window.devicePixelRatio;
      cvs!.width = W; cvs!.height = H;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      tRef.current += 0.005;
      const t = tRef.current;
      const w = cvs!.offsetWidth, h = cvs!.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h + 40;
      const rx = w * 0.48, ry = h * 1.1;

      // Background warm glow
      const bg = ctx.createRadialGradient(cx, h * 0.4, 0, cx, h * 0.4, w * 0.5);
      bg.addColorStop(0, 'rgba(224,123,0,0.06)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(224,123,0,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Arc trail (glow)
      ctx.save();
      const arcGlow = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
      arcGlow.addColorStop(0, 'rgba(224,123,0,0)');
      arcGlow.addColorStop(0.5, 'rgba(224,123,0,0.15)');
      arcGlow.addColorStop(1, 'rgba(224,123,0,0)');
      ctx.strokeStyle = arcGlow;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
      ctx.stroke();
      ctx.restore();

      // Dashed arc line
      ctx.save();
      ctx.strokeStyle = 'rgba(224,123,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 9]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Hour tick marks
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI - (i / 14) * Math.PI;
        const x = cx + rx * Math.cos(a);
        const y = cy - ry * Math.sin(a);
        if (y < 0 || y > h) continue;
        ctx.beginPath();
        ctx.arc(x, y, i % 2 === 0 ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(224,123,0,0.4)' : 'rgba(224,123,0,0.2)';
        ctx.fill();
      }

      // Sun position
      const sa = Math.PI - (t % Math.PI);
      const sx = cx + rx * Math.cos(Math.PI - sa);
      const sy = cy - ry * Math.sin(Math.PI - sa);

      if (sy > 0 && sy < h) {
        // Big glow
        const g1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
        g1.addColorStop(0, 'rgba(255,160,0,0.18)');
        g1.addColorStop(0.5, 'rgba(224,123,0,0.06)');
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(sx, sy, 120, 0, Math.PI * 2); ctx.fill();

        // Medium glow
        const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
        g2.addColorStop(0, 'rgba(255,180,0,0.45)');
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(sx, sy, 40, 0, Math.PI * 2); ctx.fill();

        // Sun core
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FF9500'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD060'; ctx.fill();

        // Shadow ray to pin
        ctx.save();
        ctx.strokeStyle = 'rgba(100,100,150,0.12)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 7]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, h - 30);
        ctx.stroke(); ctx.restore();

        // Light rays from sun
        for (let r = 0; r < 8; r++) {
          const ra = (r / 8) * Math.PI * 2 + t * 0.5;
          const r1 = 14, r2 = 22 + Math.sin(t * 3 + r) * 4;
          ctx.strokeStyle = 'rgba(255,160,0,0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx + r1 * Math.cos(ra), sy + r1 * Math.sin(ra));
          ctx.lineTo(sx + r2 * Math.cos(ra), sy + r2 * Math.sin(ra));
          ctx.stroke();
        }
      }

      // Building silhouettes at bottom
      const buildings = [
        [0, 180, 70, 120], [65, 200, 50, 100], [110, 160, 80, 140],
        [185, 210, 45, 90], [225, 175, 65, 125], [285, 195, 55, 105],
        [w-350, 185, 60, 115], [w-295, 165, 80, 135], [w-220, 200, 50, 100],
        [w-175, 178, 70, 122], [w-110, 190, 55, 110], [w-60, 205, 60, 95],
      ];
      buildings.forEach(([x, y, bw, bh]) => {
        ctx.fillStyle = 'rgba(200,190,180,0.3)';
        ctx.fillRect(x, h - bh, bw, bh);
        ctx.fillStyle = 'rgba(180,170,160,0.2)';
        ctx.fillRect(x + 2, h - bh + 4, bw - 4, bh);
      });

      // Pin at center bottom
      const pulse = 0.8 + 0.2 * Math.sin(t * 3);
      const pg = ctx.createRadialGradient(cx, h - 30, 0, cx, h - 30, 24 * pulse);
      pg.addColorStop(0, 'rgba(224,123,0,0.3)'); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(cx, h - 30, 24 * pulse, 0, Math.PI * 2); ctx.fill();

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

  const fu = (d = 0): React.CSSProperties => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'none' : 'translateY(20px)',
    transition: `opacity 0.7s ease ${d}s, transform 0.7s ease ${d}s`,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFBF5', fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#1A1A1A', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: scrollY > 30 ? '12px 48px' : '20px 48px',
        background: scrollY > 30 ? 'rgba(255,251,245,0.85)' : 'transparent',
        backdropFilter: scrollY > 30 ? 'blur(14px)' : 'none',
        borderBottom: scrollY > 30 ? '1px solid rgba(224,123,0,0.08)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            {[0,45,90,135,180,225,270,315].map((deg,i) => (
              <line key={i} x1={18+9*Math.cos(deg*Math.PI/180)} y1={18+9*Math.sin(deg*Math.PI/180)} x2={18+13*Math.cos(deg*Math.PI/180)} y2={18+13*Math.sin(deg*Math.PI/180)} stroke="#E07B00" strokeWidth="2" strokeLinecap="round"/>
            ))}
            <circle cx="18" cy="18" r="7" fill="#E07B00"/>
          </svg>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#bbb' }}>Free · No login</span>
          <button onClick={onEnter} style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E07B00'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1A1A'; }}>
            Open app →
          </button>
        </div>
      </nav>

      {/* HERO — two column */}
      <section style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, maxWidth: 1200, margin: '0 auto', padding: '0 48px', alignItems: 'center' }}>

        {/* Left: text */}
        <div style={{ paddingTop: 80 }}>
          <div style={{ ...fu(0.1), display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(224,123,0,0.1)', border: '1px solid rgba(224,123,0,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 32, fontSize: 11, color: '#E07B00', fontWeight: 700, letterSpacing: '.06em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E07B00', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}/>
            LIVE SUN TRACKER
          </div>

          <h1 style={{ ...fu(0.2), fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2.6rem,4vw,4rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24 }}>
            Know your<br/>
            <span style={{ color: '#E07B00' }}>sunlight</span><br/>
            before you<br/>buy.
          </h1>

          <p style={{ ...fu(0.3), fontSize: 16, color: '#888', lineHeight: 1.75, maxWidth: 400, marginBottom: 40 }}>
            Drop a pin on any property. See exactly where sunlight falls — hour by hour, season by season — with real 3D building shadows and NOAA solar data.
          </p>

          <div style={{ ...fu(0.4), display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .2s', boxShadow: '0 4px 24px rgba(224,123,0,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(224,123,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(224,123,0,0.3)'; }}>
              ☀️ Drop a pin for free
            </button>
            <span style={{ fontSize: 12, color: '#ccc' }}>Works anywhere · No signup</span>
          </div>

          {/* Mini stats */}
          <div style={{ ...fu(0.5), display: 'flex', gap: 32, marginTop: 48 }}>
            {[['250+', 'weekly users'], ['Global', 'coverage'], ['Free', 'always']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: canvas */}
        <div style={{ ...fu(0.3), position: 'relative', height: '100vh', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', height: 520, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(224,123,0,0.1)', background: 'rgba(255,248,238,0.5)', boxShadow: '0 8px 64px rgba(224,123,0,0.1)' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

            {/* Floating info chips */}
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(224,123,0,0.2)', borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#E07B00', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)', animation: 'floatA 4s ease-in-out infinite', fontFamily: 'monospace' }}>
              ☀️ 14:32 &nbsp;·&nbsp; El. 52°
            </div>
            <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#555', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)', animation: 'floatB 4s ease-in-out infinite 0.8s', fontFamily: 'monospace' }}>
              🌅 06:12 &nbsp;→&nbsp; 🌇 18:44
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(224,123,0,0.15)', borderRadius: 12, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#666', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', animation: 'floatA 3.5s ease-in-out infinite 0.4s' }}>
              📍 Bangalore, India &nbsp;·&nbsp; <span style={{ color: '#E07B00' }}>Click to move pin</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — horizontal scroll feel */}
      <section style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>What you get</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Everything you need<br/>to make the call.
            </h2>
          </div>
          <button onClick={onEnter} style={{ background: 'transparent', color: '#E07B00', border: '1.5px solid rgba(224,123,0,0.3)', borderRadius: 100, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: 'nowrap', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,123,0,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            Try it now →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { num: '01', title: 'Hour-by-hour sun path', desc: 'Watch the sun animate across your property in real time. Pause at any hour to see exact light angles and shadow positions.', accent: '#E07B00' },
            { num: '02', title: '3D building shadows', desc: "Real building geometry from OpenStreetMap. See how neighboring structures cast shadows on your target property throughout the day.", accent: '#E07B00' },
            { num: '03', title: 'Seasonal comparison', desc: 'Jump between summer solstice, winter solstice, spring and autumn equinox. Understand how light changes all year.', accent: '#E07B00' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '32px 28px', transition: 'all 0.25s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 20px 60px rgba(224,123,0,0.12)'; el.style.borderColor = 'rgba(224,123,0,0.3)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(0,0,0,0.06)'; }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle at top right, rgba(224,123,0,0.08), transparent)', borderRadius: '0 20px 0 80px' }} />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(224,123,0,0.4)', letterSpacing: '.1em', marginBottom: 20 }}>{f.num}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 12, lineHeight: 1.3 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: '#999', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHO USES IT — asymmetric */}
      <section style={{ padding: '60px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 48, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 100 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>Who uses it</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2rem,3vw,2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
              Built for real<br/>decisions.
            </h2>
            <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.7 }}>From home buyers to solar installers — if sunlight matters to your decision, SunScout gives you the data.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '🏡', title: 'Home Buyers', desc: "Check if that south-facing balcony actually gets sun in December — not just in listing photos shot on a perfect June afternoon." },
              { icon: '⚡', title: 'Solar Installers', desc: 'Verify rooftop viability before site visits. See shading patterns from neighboring buildings, hour by hour, every season.' },
              { icon: '🌿', title: 'Gardeners', desc: 'Find the exact full-sun and partial-shade zones in your garden. Know where to plant what before you break ground.' },
              { icon: '📸', title: 'Photographers', desc: 'Scout golden hour locations ahead of time. Know where the light will be at any minute of any day.' },
            ].map((u, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 18, padding: '24px', transition: 'all 0.2s', cursor: 'default' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(224,123,0,0.25)'; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 12px 40px rgba(224,123,0,0.1)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(0,0,0,0.06)'; el.style.transform = 'none'; el.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{u.icon}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{u.title}</div>
                <div style={{ fontSize: 13, color: '#999', lineHeight: 1.65 }}>{u.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ padding: '80px 48px', background: '#1A1A1A', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(224,123,0,0.15), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(224,123,0,0.08), transparent 60%)' }} />
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>☀️</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', marginBottom: 20, lineHeight: 1.1 }}>
            See your property's<br/>sunlight right now.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 40 }}>
            Free. No account. Works for any address on Earth.
          </p>
          <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 44px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: '0 8px 40px rgba(224,123,0,0.4)', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 56px rgba(224,123,0,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(224,123,0,0.4)'; }}>
            ☀️ &nbsp; Launch SunScout →
          </button>

          {/* Feedback */}
          <div style={{ marginTop: 72, textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Leave feedback</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>We read every message.</div>
            {fbSent ? (
              <div style={{ color: '#E07B00', fontWeight: 700 }}>✓ Thanks! We got it.</div>
            ) : (
              <form onSubmit={handleFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="Your name (optional)" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#fff', outline: 'none' }} />
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What would you like to see improved?" rows={3} required style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#fff', outline: 'none', resize: 'vertical' }} />
                <button type="submit" style={{ alignSelf: 'flex-start', background: '#E07B00', color: '#fff', border: 'none', borderRadius: 100, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Send →</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 800, color: '#fff' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span> <span style={{ fontSize: 11, color: '#444', fontWeight: 400 }}>· Part of <a href="https://loclens.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: '#E07B00', textDecoration: 'none' }}>BlindSpot</a></span></span>
        <span style={{ fontSize: 12, color: '#444' }}>Free · No login · Works worldwide</span>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @media(max-width:768px){
          section[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          section[style*="grid-template-columns: 1fr 2fr"] { grid-template-columns: 1fr !important; }
          section[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
          section[style*="grid-template-columns: 1fr 1fr"]:first-of-type > div:last-child { height: 320px !important; }
          nav { padding: 14px 20px !important; }
        }
      `}</style>
    </div>
  );
}
