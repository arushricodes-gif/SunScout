// lib/scoring/privacyScore.ts
// "How overlooked is this unit likely to be?" — same deterministic,
// floor-based approach as viewScore.ts, for the same reason: no reliable
// live building-data source. Ground floor = more street-level/passerby
// overlook risk. High floor = progressively less.

import type { SubScore } from './types';
import { floorPrivacyPrior } from './floorPriors';

const CUTOFFS = [
  { max: 1, label: 'ground level — street-level sightlines and passersby are the main risk' },
  { max: 4, label: 'low floor — still within easy sightline of nearby buildings' },
  { max: 9, label: 'mid floor — most street-level overlook risk drops off' },
  { max: 15, label: 'high floor — few buildings tall enough to overlook' },
  { max: Infinity, label: 'very high floor — overlook risk is minimal' },
];

export function computePrivacyScore(floor: number, facing: string): SubScore {
  const score = floorPrivacyPrior(floor);
  const bucket = CUTOFFS.find(c => floor <= c.max)!;

  return {
    key: 'privacy',
    label: 'Privacy',
    score,
    summary: `Floor ${floor} (${facing}-facing) — ${bucket.label}.`,
    basis: `Deterministic floor cutoff, not building-specific: floor=${floor} → score=${score}. No live building data used — see data notes.`,
  };
}
