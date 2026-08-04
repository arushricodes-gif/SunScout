// scripts/test-live-score.ts
// Local terminal test for the full LiveScore feature (Sun, Shade&Heat, View,
// Privacy, Wind) — runs the scoring engine directly (no Next.js server, no
// API key) against a few real scenarios. View/Privacy/Wind hit real Overpass
// and Open-Meteo APIs, so this needs network access and will be a bit slower
// than the v1 Sun+Shade-only test.
//
// Run with: npx tsx scripts/test-live-score.ts

import { computeLiveScore } from '../lib/scoring/scoreAggregator';

interface Scenario {
  name: string;
  lat: number; lon: number;
  floor: number; facing: string;
}

const BENGALURU = { lat: 12.9716, lon: 77.5946 };

const scenarios: Scenario[] = [
  { name: 'Ground floor, North-facing (worst case)', ...BENGALURU, floor: 0, facing: 'North' },
  { name: 'Ground floor, West-facing (hot + low)',   ...BENGALURU, floor: 0, facing: 'West' },
  { name: '5th floor, South-facing (typical)',        ...BENGALURU, floor: 5, facing: 'South' },
  { name: '5th floor, West-facing (hot afternoon)',   ...BENGALURU, floor: 5, facing: 'West' },
  { name: '12th floor, East-facing (bright, cool)',   ...BENGALURU, floor: 12, facing: 'East' },
  { name: '12th floor, South-facing (best case)',     ...BENGALURU, floor: 12, facing: 'South' },
];

async function main() {
  console.log('LiveScore — local test run (all 5 sub-scores)\n' + '='.repeat(70));

  for (const s of scenarios) {
    const start = Date.now();
    const result = await computeLiveScore({
      lat: s.lat, lon: s.lon,
      floor: s.floor, facing: s.facing,
      tzOffsetMinutes: 330, // IST
    });
    const ms = Date.now() - start;

    console.log(`\n${s.name}  (${ms}ms)`);
    console.log(`  Floor ${s.floor}, ${s.facing}-facing`);
    console.log(`  LiveScore: ${result.liveScore}/100  (${result.grade})`);
    for (const sub of result.subScores) {
      console.log(`    - ${sub.label}: ${sub.score}/100 — ${sub.summary}`);
    }
    if (result.dataNotes.length) {
      console.log(`  Data notes: ${result.dataNotes.join(' | ')}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Custom weighting test — privacy-obsessed user');
  const weighted = await computeLiveScore({
    ...BENGALURU, floor: 2, facing: 'South',
    tzOffsetMinutes: 330,
    weights: { sun: 0.1, shadeHeat: 0.1, view: 0.1, privacy: 0.6, wind: 0.1 },
  });
  console.log(`  2nd floor, South-facing → LiveScore: ${weighted.liveScore}/100 (${weighted.grade})`);
  console.log(`  Weights used:`, weighted.weights);
  console.log(`  Privacy sub-score: ${weighted.subScores.find(s => s.key === 'privacy')?.score}`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
