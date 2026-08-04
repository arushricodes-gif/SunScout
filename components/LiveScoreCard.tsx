'use client';
// components/LiveScoreCard.tsx
// Pure display component for a /api/score result. Used inside LiveScoreModal,
// but kept separate so it can be dropped elsewhere (e.g. a future compare
// view) without dragging the floor/facing picker UI along with it.

interface SubScoreView {
  key: string;
  label: string;
  score: number;
  summary: string;
}

interface LiveScoreResultView {
  liveScore: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  subScores: SubScoreView[];
  dataNotes: string[];
}

const ORG = '#E07B00';
const TEXT_DARK = '#1A1A1A';
const TEXT_SUB = '#888888';

const GRADE_COLOR: Record<string, string> = {
  Excellent: '#16a34a',
  Good: '#65a30d',
  Fair: '#E07B00',
  Poor: '#dc2626',
};

const SUBSCORE_ICON: Record<string, string> = {
  sun: '☀️',
  shadeHeat: '🌤️',
  view: '🏙️',
  privacy: '🔒',
  wind: '💨',
};

function scoreColor(score: number): string {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#E07B00';
  if (score >= 25) return '#ea580c';
  return '#dc2626';
}

export default function LiveScoreCard({ result }: { result: LiveScoreResultView }) {
  return (
    <div>
      {/* Big composite score */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', padding: '20px 0 24px',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 64, fontWeight: 800, color: ORG, lineHeight: 1,
        }}>
          {result.liveScore}
          <span style={{ fontSize: 22, color: TEXT_SUB, fontWeight: 700 }}>/100</span>
        </div>
        <div style={{
          marginTop: 10,
          display: 'inline-block',
          background: GRADE_COLOR[result.grade] + '18',
          color: GRADE_COLOR[result.grade],
          fontSize: 13, fontWeight: 800,
          padding: '5px 16px', borderRadius: 20,
          textTransform: 'uppercase', letterSpacing: '.06em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {result.grade}
        </div>
      </div>

      {/* Sub-score breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {result.subScores.map(sub => (
          <div key={sub.key} className="metric-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, color: TEXT_DARK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span>{SUBSCORE_ICON[sub.key] ?? '•'}</span> {sub.label}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 16, color: scoreColor(sub.score) }}>
                {sub.score}
              </div>
            </div>
            <div style={{ background: '#F0EDE8', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${sub.score}%`, height: '100%', background: scoreColor(sub.score), borderRadius: 6, transition: 'width .3s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>{sub.summary}</div>
          </div>
        ))}
      </div>

      {result.dataNotes.length > 0 && (
        <div style={{ marginTop: 16, background: '#FFF8F0', border: '1px solid rgba(224,123,0,0.15)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: ORG, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Data notes</div>
          {result.dataNotes.map((note, i) => (
            <div key={i} style={{ fontSize: 11, color: TEXT_SUB, lineHeight: 1.6 }}>• {note}</div>
          ))}
        </div>
      )}
    </div>
  );
}
