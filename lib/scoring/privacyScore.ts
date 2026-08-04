// lib/scoring/privacyScore.ts
// "Can the building next door see into my unit?" — uses the same ray-cast
// profile as viewScore.ts, but scores the opposite thing: close, tall
// buildings are BAD here (they can look in), whereas for View Score they're
// just neutral obstruction. Only buildings close enough and near eye-height
// are treated as an overlook risk — a building far away or much shorter than
// the unit doesn't have sightlines into it.
//
// CAVEAT: this has no window-level data (OSM doesn't record where windows
// are) — it's a proximity + height-parity proxy, not a "can literally see
// your bedroom" measurement. Always disclose this alongside the score.

import type { OcclusionProfile } from '../occlusion';
import type { SubScore } from './types';
import { clamp } from './types';
import { floorPrivacyPrior } from './floorPriors';

const FACING_ANGLE: Record<string, number> = {
  North: 0, 'North-East': 45, East: 90, 'South-East': 135,
  South: 180, 'South-West': 225, West: 270, 'North-West': 315,
};

const OVERLOOK_DIST_M = 40;       // beyond this, treat as no meaningful overlook risk
const HEIGHT_PARITY_BAND_M = 12;  // a building whose height is within this band of eye-height (or taller) can plausibly see in

function angularDiff(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

export function computePrivacyScore(profile: OcclusionProfile | null, facing: string, floor: number): SubScore {
  if (!profile || profile.dataQuality === 'none') {
    const priorScore = floorPrivacyPrior(floor);
    return {
      key: 'privacy',
      label: 'Privacy',
      score: priorScore,
      summary: `Building data unavailable near this address — estimated from floor level only (floor ${floor} ${floor <= 1 ? 'typically has more street-level overlook risk' : floor >= 10 ? 'typically has less overlook risk' : 'has moderate overlook risk'}), not an actual assessment of nearby buildings.`,
      basis: `Overpass building lookup returned no data — fallback is a floor-only prior (floor=${floor} → ${priorScore}), not a real proximity check.`,
    };
  }

  const targetAz = FACING_ANGLE[facing] ?? 180;
  const facingSamples = profile.samples.filter(s => angularDiff(s.azimuth, targetAz) <= 90);

  let riskSum = 0;
  let riskCount = 0;
  let peakRisk = 0;
  let worstDirection: { azimuth: number; distM: number } | null = null;

  for (const s of facingSamples) {
    riskCount++;
    if (s.distM === null || s.heightM === null || s.distM > OVERLOOK_DIST_M) continue;

    const heightDiff = s.heightM - (profile.eyeHeightM - HEIGHT_PARITY_BAND_M);
    if (heightDiff <= 0) continue; // building too short to see in even from close

    const proximityFactor = clamp((OVERLOOK_DIST_M - s.distM) / OVERLOOK_DIST_M, 0, 1);
    const heightFactor = clamp(heightDiff / (HEIGHT_PARITY_BAND_M * 2), 0, 1);
    const risk = proximityFactor * heightFactor;

    riskSum += risk;
    if (risk > peakRisk) peakRisk = risk;
    if (!worstDirection || s.distM < worstDirection.distM) worstDirection = { azimuth: s.azimuth, distM: s.distM };
  }

  const avgRisk = riskCount ? riskSum / riskCount : 0;
  // A single close/tall building shouldn't get diluted away just because the
  // directions next to it are open — one bad angle IS the overlook problem.
  // Weight the worst single direction heavily, the arc average lightly.
  const blendedRisk = peakRisk * 0.75 + avgRisk * 0.25;
  const score = Math.round(clamp((1 - blendedRisk) * 100));

  const summary =
    score >= 75
      ? `Well-shielded — no nearby buildings at eye-level height close enough to overlook this unit.`
      : score >= 45
      ? `Some overlook risk from nearby buildings on the ${facing.toLowerCase()} side, but not directly close.`
      : worstDirection
      ? `Notable overlook risk — a building roughly ${Math.round(worstDirection.distM)}m away on the ${facing.toLowerCase()} side is tall enough to see toward this unit.`
      : `Notable overlook risk on the ${facing.toLowerCase()} side.`;

  return {
    key: 'privacy',
    label: 'Privacy',
    score,
    summary: summary + ' (Estimated from building proximity/height — not a measurement of actual window sightlines.)',
    basis: `${riskCount} facing-side directions checked within ${OVERLOOK_DIST_M}m, peak risk ${(peakRisk * 100).toFixed(0)}%, avg risk ${(avgRisk * 100).toFixed(0)}%`,
  };
}
