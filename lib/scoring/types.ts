// lib/scoring/types.ts
// Shared types for the LiveScore feature — a per-FLAT rating (floor + facing
// specific), not a neighbourhood score like AsliVastu. Sun/Shade are built on
// the same solar geometry lib/solarReport.ts already uses. View/Privacy are
// deterministic floor-based cutoffs (no external building-data dependency —
// a free public API proved too unreliable). Wind combines live Open-Meteo
// data with the same floor-based openness estimate.

export type SubScoreKey = 'sun' | 'shadeHeat' | 'view' | 'privacy' | 'wind';
// Not built (needs data this repo doesn't have a source for yet): 'noise'.

export interface SubScore {
  key: SubScoreKey;
  label: string;
  score: number;           // 0-100, higher = better
  summary: string;         // one-line human-readable explanation
  basis: string;           // what raw numbers this was computed from (transparency)
}

export interface LiveScoreWeights {
  sun: number;
  shadeHeat: number;
  view: number;
  privacy: number;
  wind: number;
}

export const DEFAULT_WEIGHTS: LiveScoreWeights = {
  sun: 0.3,
  shadeHeat: 0.25,
  view: 0.2,
  privacy: 0.15,
  wind: 0.1,
};

export interface LiveScoreInput {
  lat: number;
  lon: number;
  floor: number;
  facing: string;          // one of the 8 compass directions used elsewhere in the app
  tzOffsetMinutes: number;
  weights?: Partial<LiveScoreWeights>;
}

export interface LiveScoreResult {
  liveScore: number;       // 0-100 weighted composite
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  subScores: SubScore[];
  weights: LiveScoreWeights;
  unit: { floor: number; facing: string };
  dataNotes: string[];     // surfaced data-quality caveats (e.g. sparse OSM coverage, wind fetch failed)
  generatedAt: string;
}

export function scoreToGrade(score: number): LiveScoreResult['grade'] {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}
