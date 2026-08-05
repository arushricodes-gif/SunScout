// lib/scoring/scoreAggregator.ts
// Orchestrates the full LiveScore: Sun/Shade from computeSolarSummary (real
// solar geometry), View/Privacy from deterministic floor cutoffs (no
// external building-data dependency — see viewScore.ts/privacyScore.ts for
// why), Wind from live Open-Meteo + the same floor cutoff. This is a
// per-FLAT score — every input is floor + facing specific — not a
// neighbourhood-level score like AsliVastu.

import { computeSolarSummary } from '../solarReport';
import { computeSunScore } from './sunScore';
import { computeShadeHeatScore } from './shadeHeatScore';
import { computeViewScore } from './viewScore';
import { computePrivacyScore } from './privacyScore';
import { computeWindScore, fetchWindReading } from './windScore';
import {
  DEFAULT_WEIGHTS,
  scoreToGrade,
  clamp,
  type LiveScoreInput,
  type LiveScoreResult,
  type LiveScoreWeights,
} from './types';

function normalizeWeights(w: Partial<LiveScoreWeights> | undefined): LiveScoreWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...w };
  const total = merged.sun + merged.shadeHeat + merged.view + merged.privacy + merged.wind;
  if (total <= 0) return DEFAULT_WEIGHTS;
  return {
    sun: merged.sun / total,
    shadeHeat: merged.shadeHeat / total,
    view: merged.view / total,
    privacy: merged.privacy / total,
    wind: merged.wind / total,
  };
}

export async function computeLiveScore(input: LiveScoreInput): Promise<LiveScoreResult> {
  const { lat, lon, floor, facing, tzOffsetMinutes } = input;
  const weights = normalizeWeights(input.weights);

  // Sun/Shade math is pure/synchronous-fast. Wind is the only remaining
  // network call (Open-Meteo, which has been reliable) — run it alongside.
  const [solarSummary, windReading] = await Promise.all([
    computeSolarSummary(lat, lon, floor, facing, tzOffsetMinutes),
    fetchWindReading(lat, lon),
  ]);

  const sunScore = computeSunScore(solarSummary);
  const shadeHeatScore = computeShadeHeatScore(solarSummary, facing);
  const viewScore = computeViewScore(floor, facing);
  const privacyScore = computePrivacyScore(floor, facing);
  const windScore = computeWindScore(windReading, floor);

  const subScores = [sunScore, shadeHeatScore, viewScore, privacyScore, windScore];

  const weighted =
    sunScore.score * weights.sun +
    shadeHeatScore.score * weights.shadeHeat +
    viewScore.score * weights.view +
    privacyScore.score * weights.privacy +
    windScore.score * weights.wind;
  const liveScore = Math.round(clamp(weighted));

  const dataNotes: string[] = [
    'View and Privacy are deterministic floor-based estimates, not live building lookups — a free public building-data API proved too unreliable to depend on for a live score, so this trades some precision for 100% reliability and instant response.',
  ];
  if (!windReading) {
    dataNotes.push('Live wind data unavailable — Wind score fell back to a neutral baseline.');
  } else {
    dataNotes.push('Wind score reflects current-day forecast conditions, not a year-round average.');
  }

  return {
    liveScore,
    grade: scoreToGrade(liveScore),
    subScores,
    weights,
    unit: { floor, facing },
    dataNotes,
    generatedAt: new Date().toISOString(),
  };
}
