'use client';

import { useState, useEffect, useRef } from 'react';

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [scrollY, setScrollY] = useState(0);
  const [fbName, setFbName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fbSent, setFbSent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const fn = () => { const s = window.scrollY; setScrollY(s); scrollRef.current = s; };
    window.addEventListener('scroll', fn, { passive: true });

    // Scroll pop observer
    setTimeout(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('popped'); obs.unobserve(e.target); } });
      }, { threshold: 0.1 });
      document.querySelectorAll('.scroll-pop').forEach(el => obs.observe(el));
    }, 300);

    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    let W = 0, H = 0;

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      cvs.width = W * devicePixelRatio; cvs.height = H * devicePixelRatio;
      cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
      ctx.resetTransform(); ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize(); window.addEventListener('resize', resize);

    const draw = () => {
      tRef.current += 0.007;
      const t = tRef.current;
      const scroll = scrollRef.current;
      ctx.clearRect(0, 0, W, H);

      // Sky — warm cream, gets more golden as sun rises
      const scrollProg = Math.min(scroll / 1800, 1);
      const r = Math.round(255 - scrollProg * 10);
      const g = Math.round(248 - scrollProg * 30);
      const b = Math.round(238 - scrollProg * 60);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, W, H);

      // Sun angle: starts low left, sweeps to high noon as you scroll
      const baseAngle = 0.12 + scrollProg * 0.76; // 0.12π to 0.88π
      const wobble = Math.sin(t * 0.5) * 0.018; // gentle auto wobble
      const sunT = (baseAngle + wobble) * Math.PI;

      const cx = W / 2, cy = H + H * 0.1;
      const rx = W * 0.47, ry = H * 0.95;
      const sx = cx + rx * Math.cos(Math.PI - sunT / Math.PI * Math.PI);
      const sy = cy - ry * Math.sin(sunT / Math.PI * Math.PI);
      const elev = Math.sin(sunT / Math.PI * Math.PI);

      // Big sky glow radiating from sun
      if (sy < H + 100) {
        const skyG = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.7);
        skyG.addColorStop(0, `rgba(255,${Math.round(180 + elev*40)},${Math.round(60 + elev*80)},${0.15 + elev * 0.12})`);
        skyG.addColorStop(0.5, `rgba(255,200,100,${0.04 + elev * 0.04})`);
        skyG.addColorStop(1, 'transparent');
        ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
      }

      // Dot grid — warm amber dots
      for (let x = 40; x < W; x += 52) {
        for (let y = 40; y < H; y += 52) {
          const dist = Math.hypot(x - sx, y - sy);
          const glow = Math.max(0, 1 - dist / (W * 0.5)) * 0.12;
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,110,30,${0.07 + glow})`; ctx.fill();
        }
      }

      // Arc glow band
      ctx.save();
      const arcBand = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
      arcBand.addColorStop(0, 'transparent');
      arcBand.addColorStop(0.5, `rgba(224,123,0,${0.07 + elev * 0.1})`);
      arcBand.addColorStop(1, 'transparent');
      ctx.strokeStyle = arcBand; ctx.lineWidth = 44;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Dashed arc path
      ctx.save();
      ctx.strokeStyle = `rgba(180,100,20,${0.18 + elev * 0.1})`; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 12]);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0); ctx.stroke();
      ctx.restore();

      // Hour tick marks on arc
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        const mx = cx - rx * Math.cos(a), my = cy - ry * Math.sin(a);
        if (my < 0 || my > H + 30) continue;
        const isHour = i % 2 === 0;
        ctx.beginPath(); ctx.arc(mx, my, isHour ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,100,20,${isHour ? 0.4 : 0.18})`; ctx.fill();
      }

      // Trail — faint arc segment already traveled
      const traveled = sunT / Math.PI;
      ctx.save();
      ctx.strokeStyle = `rgba(224,123,0,${0.2 + elev * 0.15})`; ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * (1 - traveled));
      ctx.stroke();
      ctx.restore();

      // Sun glow layers
      if (sy < H + 50) {
        // Atmosphere halo
        const g1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 180);
        g1.addColorStop(0, `rgba(255,${Math.round(170 + elev*50)},50,${0.22 + elev * 0.15})`);
        g1.addColorStop(0.4, `rgba(255,150,30,${0.06 + elev * 0.06})`);
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(sx, sy, 180, 0, Math.PI * 2); ctx.fill();

        // Inner corona
        const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 50);
        g2.addColorStop(0, 'rgba(255,220,100,0.7)');
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2); ctx.fill();

        // Sun disc
        ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fillStyle = '#FF8C00'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fillStyle = '#FFE070'; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();

        // Spinning rays
        for (let i = 0; i < 12; i++) {
          const ra = (i / 12) * Math.PI * 2 + t * 0.6;
          const inner = 16, outer = 24 + Math.sin(t * 3 + i * 0.8) * 5;
          ctx.strokeStyle = `rgba(255,${Math.round(160 + elev*40)},20,${0.3 - i * 0.01})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx + inner * Math.cos(ra), sy + inner * Math.sin(ra));
          ctx.lineTo(sx + outer * Math.cos(ra), sy + outer * Math.sin(ra));
          ctx.stroke();
        }

        // Shadow ray to center pin
        ctx.save();
        ctx.strokeStyle = `rgba(100,60,20,${0.08 + elev * 0.06})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 9]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, H - 55); ctx.stroke();
        ctx.restore();
      }

      // Buildings — fade in from scroll 200
      const bldOpacity = Math.min(Math.max((scroll - 100) / 300, 0), 1) * 0.28;
      if (bldOpacity > 0.01) {
        const blds = [
          [0,125,52],[50,92,36],[86,140,68],[152,108,40],[192,132,50],[240,96,58],
          [W*0.36,115,46],[W*0.44,92,36],[W*0.51,128,52],
          [W-312,102,50],[W-264,130,46],[W-220,94,40],[W-182,118,56],
          [W-128,98,44],[W-84,124,50],[W-36,94,36]
        ];
        blds.forEach(([bx, bh, bw]) => {
          ctx.fillStyle = `rgba(140,100,60,${bldOpacity})`;
          ctx.fillRect(bx, H - bh, bw, bh);
          // window glows near sun
          const distToSun = Math.abs(bx + bw / 2 - sx) / W;
          const winGlow = Math.max(0, (0.4 - distToSun) * elev);
          for (let row = 1; row < Math.floor(bh / 18); row++) {
            for (let col = 1; col < Math.floor((bw as number) / 14) - 1; col++) {
              if ((row + col) % 3 !== 0) continue;
              ctx.fillStyle = `rgba(255,${Math.round(180 + elev * 40)},80,${winGlow * 0.5})`;
              ctx.fillRect(bx + col * 14 + 2, H - bh + row * 18 + 2, 8, 10);
            }
          }
        });
        // Ground
        ctx.fillStyle = `rgba(140,100,60,${bldOpacity * 0.5})`;
        ctx.fillRect(0, H - 3, W, 3);
      }

      // Pin pulse at center bottom
      const pinPulse = 0.8 + 0.2 * Math.sin(t * 2.5);
      const pg = ctx.createRadialGradient(cx, H - 55, 0, cx, H - 55, 26 * pinPulse);
      pg.addColorStop(0, `rgba(224,123,0,${0.3 + elev * 0.15})`); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, H - 55, 26 * pinPulse, 0, Math.PI * 2); ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://formspree.io/f/mqegvpwb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fbName, message: feedback }) });
      setFbSent(true); setFeedback(''); setFbName('');
    } catch {}
  };

  const op = (enter: number, exit: number) => ({
    opacity: Math.max(0, Math.min(1, (scrollY - enter) / 180)) * Math.max(0, Math.min(1, (exit - scrollY) / 180)),
    transform: `translateY(${Math.max(0, (1 - Math.max(0, Math.min(1, (scrollY - enter) / 250))) * 22)}px)`,
    transition: 'none' as const,
  });

  return (
    <div style={{ fontFamily: 'Plus Jakarta Sans,sans-serif', color: '#1A0A00', background: '#FFF8EE' }}>

      {/* Fixed fullscreen canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: scrollY > 50 ? '13px 44px' : '20px 44px', background: scrollY > 50 ? 'rgba(255,248,238,0.88)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(14px)' : 'none', borderBottom: scrollY > 50 ? '1px solid rgba(180,110,30,0.1)' : 'none', transition: 'all 0.35s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            {[0,45,90,135,180,225,270,315].map((d,i) => <line key={i} x1={18+8*Math.cos(d*Math.PI/180)} y1={18+8*Math.sin(d*Math.PI/180)} x2={18+13*Math.cos(d*Math.PI/180)} y2={18+13*Math.sin(d*Math.PI/180)} stroke="#E07B00" strokeWidth="2.2" strokeLinecap="round"/>)}
            <circle cx="18" cy="18" r="6" fill="#E07B00"/>
          </svg>
          <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: '#1A0A00' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span></span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#B07040' }}>Free · No login</span>
          <button onClick={onEnter} style={{ background: '#1A0A00', color: '#FFF8EE', border: 'none', borderRadius: 100, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E07B00')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1A0A00')}>Open app →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 10, height: '100vh', display: 'flex', alignItems: 'center', padding: '0 8vw', pointerEvents: 'none' }}>
        <div style={{ maxWidth: 600, opacity: Math.max(0, Math.min(1, 1 - scrollY / 350)), transform: `translateY(${scrollY * 0.15}px)`, transition: 'none' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(224,123,0,0.1)', border: '1px solid rgba(224,123,0,0.22)', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
            <span style={{ width: 5, height: 5, background: '#E07B00', borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }}/>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#B05000', textTransform: 'uppercase', letterSpacing: '.14em' }}>Solar Path Intelligence</span>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(3rem,6vw,5.8rem)', fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.045em', margin: '0 0 24px', color: '#1A0A00' }}>
            See where<br/>the <em style={{ color: '#E07B00', fontStyle: 'italic' }}>sun</em> hits.<br/>Before you sign.
          </h1>
          <p style={{ fontSize: 17, color: '#7A4820', lineHeight: 1.7, maxWidth: 380, margin: '0 0 36px' }}>
            Drop a pin on any property. Watch the actual sun arc across it — every hour, every season, with real 3D shadows.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'all' }}>
            <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(224,123,0,0.4)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(224,123,0,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(224,123,0,0.4)'; }}>
              Drop a pin →
            </button>
            <span style={{ fontSize: 12, color: '#B07040' }}>Free · Works anywhere on Earth</span>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 44, paddingTop: 22, borderTop: '1px solid rgba(180,110,30,0.15)' }}>
            {[['250+','weekly users'],['Global','coverage'],['Free','always']].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 22, fontWeight: 800, color: '#1A0A00', letterSpacing: '-0.03em' }}>{v}</div>
                <div style={{ fontSize: 10, color: '#B07040', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.08em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, opacity: scrollY < 80 ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: 'none' }}>
          <span style={{ fontSize: 10, color: '#B07040', letterSpacing: '.12em', textTransform: 'uppercase' }}>scroll · watch the sun move</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(180,110,30,0.5), transparent)', animation: 'drip 1.8s ease-in-out infinite' }}/>
        </div>
      </section>

      {/* ── SCROLL CHAPTERS — text reveals over the live canvas ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {[
          { enter: 200, exit: 900, time: '06:12', title: 'Not all homes\nwake with the sun.', body: 'Listing photos are taken at noon in June. That glowing balcony in the pictures? It sits in complete shadow from October through March. Nobody tells you this.' },
          { enter: 800, exit: 1500, time: '12:00', title: 'Drop a pin.\nGet the truth.', body: 'NOAA solar algorithms + real OpenStreetMap building geometry. See exactly where light falls at any hour, on any day, for any location on Earth. Instantly.' },
          { enter: 1400, exit: 2200, time: 'All year', title: 'The sun moves.\nA lot.', body: 'Same property. Completely different at 9am vs 3pm. And completely different again in December vs June. See the whole picture before you commit.' },
        ].map((ch, i) => (
          <div key={i} style={{ height: '65vh', display: 'flex', alignItems: 'center', padding: '0 8vw' }}>
            <div style={{ maxWidth: 500, ...op(ch.enter, ch.exit) }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 16 }}>{ch.time}</div>
              <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, margin: '0 0 18px', color: '#1A0A00', whiteSpace: 'pre-line' }}>{ch.title}</h2>
              <p style={{ fontSize: 15, color: '#7A4820', lineHeight: 1.78, margin: 0 }}>{ch.body}</p>
            </div>
          </div>
        ))}

        {/* Feature chips reveal */}
        <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', padding: '60px 8vw' }}>
          <div style={{ ...op(2000, 3000), width: '100%' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 28 }}>What you get</div>
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 720 }}>
              {[
                { icon: '☀️', label: 'Hour-by-hour animation', sub: 'Watch the sun move in real time' },
                { icon: '🏗', label: '3D building shadows', sub: 'Real OpenStreetMap geometry' },
                { icon: '🗓', label: 'Full seasonal range', sub: 'Summer, winter, equinox' },
                { icon: '⚡', label: 'Solar panel scoring', sub: 'Is your roof worth it?' },
                { icon: '🌍', label: 'Global coverage', sub: 'Any lat/long on Earth' },
                { icon: '🆓', label: 'Always free', sub: 'No account, no catch' },
              ].map(({ icon, label, sub }, i) => (
                <div key={label} style={{ background: 'rgba(255,248,238,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(180,110,30,0.18)', borderRadius: 16, padding: '16px 18px', transition: 'all 0.2s', cursor: 'default', transitionDelay: `${i * 0.06}s` }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,248,238,0.95)'; el.style.borderColor = 'rgba(224,123,0,0.35)'; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 8px 28px rgba(224,123,0,0.15)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,248,238,0.75)'; el.style.borderColor = 'rgba(180,110,30,0.18)'; el.style.transform = 'none'; el.style.boxShadow = 'none'; }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 13, fontWeight: 700, color: '#1A0A00', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#B07040', lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTIONS BELOW ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* WHO USES IT — dark */}
        <section className="scroll-pop dark-pop" style={{ background: '#1A0A00', padding: '100px 48px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(224,123,0,0.4), transparent)' }}/>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 60%, rgba(224,123,0,0.1), transparent 60%)', pointerEvents: 'none' }}/>
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 16 }}>Who uses it</div>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#FFF8EE', margin: '0 0 52px', lineHeight: 1.0 }}>
              If light matters<br/>to your decision.
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 20, overflow: 'hidden' }}>
              {[
                { e: '🏡', t: 'Home Buyers', d: 'Does that balcony get sun in December? Check before you sign. Takes 10 seconds and might save you years of regret.' },
                { e: '⚡', t: 'Solar Installers', d: 'Verify rooftop viability remotely. See exact shading patterns from neighboring buildings, every hour, every season.' },
                { e: '🌿', t: 'Gardeners', d: 'Find the exact full-sun spots in your garden. Know where to plant what, before you dig a single hole.' },
                { e: '📸', t: 'Photographers', d: 'Scout golden hour positions ahead of time. Know where the light lands, at what angle, at exactly what time.' },
              ].map((u, i) => (
                <div key={i} className="pop-item" style={{ background: '#1A0A00', padding: '32px', display: 'flex', gap: 18, transition: 'background .2s', cursor: 'default', transitionDelay: `${i * 0.1}s` }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#260E00'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#1A0A00'}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{u.e}</div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 15, fontWeight: 700, color: '#FFF8EE', marginBottom: 8 }}>{u.t}</div>
                    <div style={{ fontSize: 13.5, color: 'rgba(255,210,160,0.45)', lineHeight: 1.7 }}>{u.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT YOU GET — warm */}
        <section className="scroll-pop" style={{ background: '#FFF8EE', padding: '100px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 52, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#E07B00', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 16 }}>Three things</div>
                <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#1A0A00', margin: 0, lineHeight: 1.0 }}>
                  One pin drop.
                </h2>
              </div>
              <button onClick={onEnter} style={{ background: 'transparent', color: '#E07B00', border: '1.5px solid rgba(224,123,0,0.35)', borderRadius: 100, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,123,0,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>Try it free →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, background: 'rgba(180,110,30,0.08)', borderRadius: 20, overflow: 'hidden' }}>
              {[
                { n: '01', title: 'Hour-by-hour sun path', desc: 'Watch the sun animate across your location in real time. Pause at any hour. See exact light angles and where shadows fall.', tag: 'Animated' },
                { n: '02', title: '3D building shadows', desc: 'Real geometry from OpenStreetMap. Neighboring buildings cast accurate shadows on your property — not guesses. Actual geodata.', tag: 'Accurate' },
                { n: '03', title: 'Full seasonal range', desc: 'Summer solstice, winter, equinox — understand the full year of light in 10 seconds. Before you commit to 10 years.', tag: 'Year-round' },
              ].map((f, i) => (
                <div key={i} className="pop-item" style={{ background: '#FFF8EE', padding: '32px 26px', transition: 'background 0.2s', cursor: 'default', transitionDelay: `${i * 0.12}s` }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FFF0D8'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#FFF8EE'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(180,100,20,0.3)', letterSpacing: '.1em' }}>{f.n}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#E07B00', background: 'rgba(224,123,0,0.1)', border: '1px solid rgba(224,123,0,0.2)', borderRadius: 100, padding: '3px 10px', letterSpacing: '.08em', textTransform: 'uppercase' }}>{f.tag}</span>
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 15, fontWeight: 700, color: '#1A0A00', marginBottom: 12, lineHeight: 1.3 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#9A6030', lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="scroll-pop" style={{ background: '#FFF0D0', padding: '100px 48px', borderTop: '1px solid rgba(180,110,30,0.15)', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ fontSize: 52, marginBottom: 24, animation: 'spin 8s linear infinite', display: 'inline-block' }}>☀️</div>
            <h2 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.9, color: '#1A0A00', margin: '0 0 20px' }}>
              Your property.<br/><em style={{ color: '#E07B00', fontStyle: 'italic' }}>Now you know.</em>
            </h2>
            <p style={{ fontSize: 15, color: '#9A6030', lineHeight: 1.75, marginBottom: 40 }}>Free. No signup. Works for any address on Earth.</p>
            <button onClick={onEnter} style={{ background: '#E07B00', color: '#fff', border: 'none', borderRadius: 14, padding: '15px 44px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 32px rgba(224,123,0,0.35)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 48px rgba(224,123,0,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(224,123,0,0.35)'; }}>
              Drop a pin →
            </button>
            <div style={{ marginTop: 64, textAlign: 'left', borderTop: '1px solid rgba(180,110,30,0.15)', paddingTop: 44 }}>
              <div style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 14, fontWeight: 700, color: '#5A2800', marginBottom: 6 }}>Leave feedback</div>
              <div style={{ fontSize: 12, color: '#B07040', marginBottom: 20 }}>We read everything. Reply rate 100%.</div>
              {fbSent ? <div style={{ color: '#E07B00', fontWeight: 700 }}>✓ Got it — thank you!</div> : (
                <form onSubmit={handleFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="Name (optional)" style={{ border: '1.5px solid rgba(180,110,30,0.22)', background: '#FFF8EE', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1A0A00', outline: 'none', transition: 'border-color .15s', fontFamily: 'Plus Jakarta Sans,sans-serif' }} onFocus={e => (e.currentTarget.style.borderColor = '#E07B00')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(180,110,30,0.22)')}/>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What would make SunScout better?" rows={3} required style={{ border: '1.5px solid rgba(180,110,30,0.22)', background: '#FFF8EE', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#1A0A00', outline: 'none', resize: 'vertical', transition: 'border-color .15s', fontFamily: 'Plus Jakarta Sans,sans-serif' }} onFocus={e => (e.currentTarget.style.borderColor = '#E07B00')} onBlur={e => (e.currentTarget.style.borderColor = 'rgba(180,110,30,0.22)')}/>
                  <button type="submit" style={{ alignSelf: 'flex-start', background: '#1A0A00', color: '#FFF8EE', border: 'none', borderRadius: 100, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background .2s', fontFamily: 'Plus Jakarta Sans,sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#E07B00')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1A0A00')}>Send →</button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: '#0E0500', padding: '22px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: 14, fontWeight: 800, color: '#FFF8EE' }}>Sun<span style={{ color: '#E07B00' }}>Scout</span> <span style={{ fontSize: 11, color: '#5A3010', fontWeight: 400 }}>· Part of <a href="https://loclens.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: '#E07B00', textDecoration: 'none' }}>BlindSpot</a></span></span>
          <span style={{ fontSize: 12, color: '#5A3010' }}>Free · No login · Works worldwide</span>
        </footer>
      </div>

      {/* Persistent floating CTA */}
      <button onClick={onEnter} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, background: '#E07B00', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 28px rgba(224,123,0,0.5)', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Plus Jakarta Sans,sans-serif' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(224,123,0,0.65)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(224,123,0,0.5)'; }}>
        <svg width="13" height="13" viewBox="0 0 36 36" fill="none">
          {[0,45,90,135,180,225,270,315].map((d,i) => <line key={i} x1={18+7*Math.cos(d*Math.PI/180)} y1={18+7*Math.sin(d*Math.PI/180)} x2={18+12*Math.cos(d*Math.PI/180)} y2={18+12*Math.sin(d*Math.PI/180)} stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>)}
          <circle cx="18" cy="18" r="5.5" fill="#fff"/>
        </svg>
        Open SunScout
      </button>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.55)} }
        @keyframes drip { 0%{opacity:1;transform:scaleY(1) translateY(0)} 80%{opacity:0;transform:scaleY(0.4) translateY(14px)} 100%{opacity:0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        /* Scroll pop — sections */
        .scroll-pop {
          opacity: 0;
          transform: translateY(40px) scale(0.99);
          transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1);
        }
        .scroll-pop.popped {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* Pop items — cards inside sections */
        .pop-item {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1), background 0.2s;
        }
        .scroll-pop.popped .pop-item {
          opacity: 1;
          transform: translateY(0);
        }

        /* Glow on dark section pop */
        .scroll-pop.dark-pop {
          box-shadow: 0 0 0 0 rgba(224,123,0,0);
          transition: opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1), box-shadow 1.2s ease;
        }
        .scroll-pop.dark-pop.popped {
          box-shadow: 0 -4px 60px rgba(224,123,0,0.08);
        }

        @media(max-width:768px){
          nav { padding:13px 18px!important; }
          section { padding:60px 20px!important; }
          [style*="padding: 100px 48px"] { padding:60px 20px!important; }
          [style*="grid-template-columns: repeat(2"],[style*="grid-template-columns: repeat(3"] { grid-template-columns:1fr!important; }
          [style*="padding: 0 8vw"] { padding:0 20px!important; }
          [style*="padding: 60px 8vw"] { padding:40px 20px!important; }
          .features-grid { grid-template-columns: repeat(2,1fr)!important; }
        }
      `}</style>
    </div>
  );
}
