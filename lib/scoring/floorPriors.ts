// lib/scoring/floorPriors.ts
// Fallback estimates used ONLY when the Overpass building lookup fails or
// returns no data — floor level alone is a real, defensible predictor of
// view/privacy even with zero building data: a ground-floor unit is nearly
// always boxed in by compound walls, parked cars, or the next building over,
// while a 15th-floor unit is nearly always more open, regardless of what's
// nearby. This is NOT a substitute for real ray-casting — it's a better
// prior than a context-blind 50 when ray-casting isn't available.
//
// Every caller of these MUST label the result as floor-only-estimated in
// its summary — never present it as equivalent to a real building-based
// score.

import { clamp } from './types';

export function floorViewPrior(floor: number): number {
  // Ground floor: heavily boxed in. Climbs steadily, levels off ~15 floors.
  return Math.round(clamp(18 + floor * 4.5, 18, 85));
}

export function floorPrivacyPrior(floor: number): number {
  // Ground floor: street-level sightlines, passersby, close compound walls.
  // Higher floors: progressively fewer buildings tall enough to overlook.
  return Math.round(clamp(24 + floor * 4, 24, 88));
}
