'use client';
// components/TabGuide.tsx

interface TabGuideProps {
  onEnter: () => void;
}

export default function TabGuide({ onEnter }: TabGuideProps) {
  const ORG = '#E07B00';
  const TEXT_MID = '#555555';
  const TEXT_DARK = '#1A1A1A';
  const WHITE = '#FFFFFF';
  const ORG_LT = '#FFF3E0';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 60%, #FFE0B2 100%)',
        border: '2px solid rgba(224,123,0,0.15)',
        borderRadius: 24,
        padding: '52px 52px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 48,
        marginBottom: 32,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{
            display: 'inline-block',
            background: ORG,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 20,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            marginBottom: 18,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>☀️ Sun Scout · Solar Intelligence</div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3.6rem)',
            fontWeight: 800,
            color: TEXT_DARK,
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Know Your <span style={{ color: ORG }}>Sunlight</span><br />Before You Buy.
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '1.15rem',
            color: TEXT_MID,
            maxWidth: 520,
            lineHeight: 1.8,
            marginBottom: 28,
          }}>
            The tool built for one question every house hunter should ask —
            <em> when does sunlight actually hit that balcony?</em>
          </div>
          <button
            className="btn-primary"
            onClick={onEnter}
            style={{ fontSize: '1.05rem', padding: '15px 34px', borderRadius: 14, boxShadow: '0 4px 20px rgba(224,123,0,0.4)' }}
          >
            ☀️ &nbsp;Enter &nbsp;→
          </button>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 120, opacity: 0.18, lineHeight: 1, userSelect: 'none' }}>☀️</div>
        </div>
      </div>

      {/* How to use */}
      <div className="sc-section">How to Use</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }} className="steps-row">
        {[
          { n: '01', icon: '📍', title: 'Set Your Location', body: 'Go to the Sun Scout tab, choose Set Location, and click on the map to drop your pin on any property.' },
          { n: '02', icon: '🗓️', title: 'Pick a Date & Time', body: 'Use the sidebar date picker or choose a celestial preset — Summer Solstice, Winter Solstice, or any custom date.' },
          { n: '03', icon: '▶️', title: 'Watch the Sun Move', body: 'Switch to Sun Path. Toggle between 2D map and 3D buildings. Hit Animate to watch the sun travel with real shadows.' },
          { n: '04', icon: '🔄', title: 'Compare Seasons', body: 'Switch to Year Summary to see all four seasonal sun paths overlaid on the same map at once.' },
        ].map(s => (
          <div key={s.n} style={{
            background: WHITE,
            border: `2px solid ${ORG_LT}`,
            borderRadius: 18,
            padding: '24px 20px',
            boxShadow: '0 2px 12px rgba(224,123,0,0.06)',
          }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2.8rem', fontWeight: 800, color: ORG, opacity: .15, lineHeight: 1, marginBottom: 8 }}>{s.n}</div>
            <span style={{ fontSize: 28, marginBottom: 10, display: 'block' }}>{s.icon}</span>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: ORG, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.title}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1rem', lineHeight: 1.7, color: TEXT_MID }}>{s.body}</div>
          </div>
        ))}
      </div>

      {/* Who is this for */}
      <div className="sc-section">Who Is This For</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 32 }} className="usecase-grid">
        {[
          { icon: '🏡', title: 'House Hunters', body: 'That "sunny south-facing balcony" might be shaded by the building next door from October to March. Check before you sign.', pill: 'Core Use Case' },
          { icon: '🌿', title: 'Gardeners', body: 'Full-sun plants need 6+ hours of direct light. Watch sunlight move across your garden plot hour by hour.', pill: 'Planting Decisions' },
          { icon: '⚡', title: 'Solar Panel Owners', body: 'Check peak solar radiation hours by season and see if your roof gets enough sun for viable solar generation.', pill: 'Energy Planning' },
          { icon: '📸', title: 'Photographers', body: 'Find the exact azimuth and elevation of the sun at your shoot location — down to the minute.', pill: 'Shot Planning' },
        ].map(u => (
          <div key={u.title} style={{
            background: WHITE,
            border: `2px solid ${ORG_LT}`,
            borderRadius: 18,
            padding: 24,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            boxShadow: '0 2px 12px rgba(224,123,0,0.06)',
          }}>
            <div style={{
              fontSize: 30, width: 56, height: 56,
              background: ORG_LT, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{u.icon}</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1.05rem', fontWeight: 700, color: ORG, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{u.title}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1rem', lineHeight: 1.7, color: TEXT_MID }}>{u.body}</div>
              <span className="sc-pill">{u.pill}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Glossary */}
      <div className="sc-section">Understanding the Numbers</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 32 }} className="glossary-grid">
        {[
          { key: 'Azimuth', val: 'Compass direction of the sun. North = 0°, East = 90°, South = 180°, West = 270°.' },
          { key: 'Elevation', val: 'How high the sun is above the horizon. 0° = just risen. 90° = directly overhead. Low = long shadows.' },
          { key: 'Solar Noon', val: 'The moment the sun peaks for the day — highest elevation, shortest shadows. Not always 12:00.' },
          { key: 'Radiation W/m²', val: 'Estimated sunlight intensity. Above 600 W/m² is strong solar generation territory.' },
        ].map(g => (
          <div key={g.key} style={{
            background: WHITE,
            border: `2px solid ${ORG_LT}`,
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            gap: 14,
          }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '1rem', fontWeight: 700, color: ORG, whiteSpace: 'nowrap', minWidth: 120 }}>{g.key}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1rem', lineHeight: 1.65, color: TEXT_MID }}>{g.val}</div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        background: ORG_LT,
        border: '2px solid rgba(224,123,0,0.15)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>🔬</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '0.95rem', color: TEXT_MID, lineHeight: 1.65 }}>
          Sun Scout uses the <b style={{ color: ORG }}>NOAA solar algorithm</b> for precise astronomical
          calculations, <b style={{ color: ORG }}>OpenStreetMap</b> for building geometry, and the
          <b style={{ color: ORG }}> Overpass / OSMBuildings API</b> for real building heights.
          Solar positions are accurate to within fractions of a degree.
        </div>
      </div>
    </div>
  );
}
