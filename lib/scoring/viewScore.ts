// lib/scoring/viewScore.ts
// "What does this unit actually look out onto?" — deterministic, floor-based
// cutoffs. No external building-data dependency: the free public Overpass
// API proved too unreliable (connection failures, header rejections, rate
// limits across multiple mirror servers) to depend on for a live score.
// Floor level alone is a real, defensible signal — ground floor is nearly
// always boxed in, high floors are nearly always open — so this trades a
// small amount of precision for 100% reliability and instant response time.

import type { SubScore } from './types';
import { floorViewPrior } from './floorPriors';

const CUTOFFS = [
  { max: 1, label: 'ground level, typically boxed in by compound walls or the next building' },
  { max: 4, label: 'low floor, partially open at best' },
  { max: 9, label: 'mid floor, usually clears most immediate obstructions' },
  { max: 15, label: 'high floor, generally open sky in most directions' },
  { max: Infinity, label: 'very high floor, close to unobstructed' },
];

export function computeViewScore(floor: number, facing: string): SubScore {
  const score = floorViewPrior(floor);
  const bucket = CUTOFFS.find(c => floor <= c.max)!;

  return {
    key: 'view',
    label: 'View',
    score,
    summary: `Floor ${floor} (${facing}-facing) — ${bucket.label}.`,
    basis: `Deterministic floor cutoff, not building-specific: floor=${floor} → score=${score}. No live building data used — see data notes.`,
  };
}
