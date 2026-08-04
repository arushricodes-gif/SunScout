// lib/scoring/viewScore.ts
// "What does this unit actually look out onto?" — built on lib/occlusion.ts's
// ray-cast profile. For each sampled direction, a low block-angle means open
// sky/view; a high block-angle means a wall close by. Score = % of directions
// that are meaningfully open, weighted toward the unit's facing side (that's
// where the main windows/balcony are assumed to be).

import type { OcclusionProfile } from '../occlusion';
import type { SubScore } from './types';
import { clamp } from './types';
import { floorViewPrior } from './floorPriors';

// Below this blocking angle, a direction counts as "open" — a small angle
// still means you can see sky above nearby rooftops, not a wall filling
// your window.
const OPEN_THRESHOLD_DEG = 12;

const FACING_ANGLE: Record<string, number> = {
  North: 0, 'North-East': 45, East: 90, 'South-East': 135,
  South: 180, 'South-West': 225, West: 270, 'North-West': 315,
};

function angularDiff(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

export function computeViewScore(profile: OcclusionProfile | null, facing: string, floor: number): SubScore {
  if (!profile || profile.dataQuality === 'none') {
    const priorScore = floorViewPrior(floor);
    return {
      key: 'view',
      label: 'View',
      score: priorScore,
      summary: `Building data unavailable near this address — estimated from floor level only (floor ${floor} ${floor <= 1 ? 'is typically boxed in' : floor >= 10 ? 'is typically quite open' : 'is typically partially open'}), not an actual view assessment.`,
      basis: `Overpass building lookup returned no data — fallback is a floor-only prior (floor=${floor} → ${priorScore}), not a real ray-cast.`,
    };
  }

  const targetAz = FACING_ANGLE[facing] ?? 180;
  // Weight the facing-side arc (±90° from facing) more heavily — that's the
  // side the unit's main windows/balcony are assumed to face.
  let openWeighted = 0;
  let totalWeight = 0;
  let facingSideOpenCount = 0;
  let facingSideTotal = 0;

  for (const s of profile.samples) {
    const inFacingArc = angularDiff(s.azimuth, targetAz) <= 90;
    const weight = inFacingArc ? 2 : 1;
    const isOpen = s.blockAngleDeg <= OPEN_THRESHOLD_DEG;

    totalWeight += weight;
    if (isOpen) openWeighted += weight;

    if (inFacingArc) {
      facingSideTotal++;
      if (isOpen) facingSideOpenCount++;
    }
  }

  const score = Math.round(clamp((openWeighted / totalWeight) * 100));
  const facingOpenPct = facingSideTotal ? Math.round((facingSideOpenCount / facingSideTotal) * 100) : 0;

  const summary =
    score >= 75
      ? `Mostly open sky on the ${facing.toLowerCase()} side — minimal building obstruction (${facingOpenPct}% open).`
      : score >= 45
      ? `Partially obstructed view — some open sky, some nearby buildings on the ${facing.toLowerCase()} side (${facingOpenPct}% open).`
      : `Significantly boxed in — nearby buildings dominate the ${facing.toLowerCase()}-facing view (${facingOpenPct}% open).`;

  const qualityNote =
    profile.dataQuality === 'sparse'
      ? ` Note: OSM has height data for less than half the ${profile.buildingsFound} nearby buildings, so some heights were assumed.`
      : '';

  return {
    key: 'view',
    label: 'View',
    score,
    summary: summary + qualityNote,
    basis: `${profile.buildingsFound} buildings within ${profile.radiusM}m, ${facingSideOpenCount}/${facingSideTotal} facing-side directions open (block angle ≤ ${OPEN_THRESHOLD_DEG}°)`,
  };
}
