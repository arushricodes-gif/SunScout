// scripts/test-live-score.ts
// Local terminal test for the full LiveScore feature. Sun/Shade use real
// solar geometry. View/Privacy are deterministic floor cutoffs — no network
// call, always instant, always consistent. Wind hits the real Open-Meteo API
// (needs network — this one genuinely tests live data).
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
  console.log('LiveScore — local test run\n' + '='.repeat(70));

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
  }

  console.log('\n' + '='.repeat(70));
  console.log('Sanity check: does floor level correctly move View/Privacy?');
  const ground = await computeLiveScore({ ...BENGALURU, floor: 0, facing: 'South', tzOffsetMinutes: 330 });
  const high = await computeLiveScore({ ...BENGALURU, floor: 18, facing: 'South', tzOffsetMinutes: 330 });
  const groundView = ground.subScores.find(s => s.key === 'view')!.score;
  const highView = high.subScores.find(s => s.key === 'view')!.score;
  console.log(`  Ground floor View: ${groundView}  |  18th floor View: ${highView}`);
  console.log(`  Correctly increasing with floor: ${highView > groundView ? 'PASS' : 'FAIL'}`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
