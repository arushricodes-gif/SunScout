// lib/scoring/scoreAggregator.ts
// Orchestrates the full LiveScore: runs computeSolarSummary (Sun/Shade),
// computeOcclusionProfile (View/Privacy — and reused for Wind's openness
// component), and fetchWindReading, then combines all five sub-scores into
// one weighted composite. This is a per-FLAT score — every input is
// floor + facing specific, same as the existing report — not a
// neighbourhood-level score like AsliVastu.
//
// The occlusion profile is computed ONCE and shared between View, Privacy,
// and Wind — same pattern as solarSummary being shared between Sun and
// Shade&Heat — so we never hit Overpass twice for one score request.

import { computeSolarSummary } from '../solarReport';
import { computeOcclusionProfile } from '../occlusion';
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

  // Run the three independent data sources in parallel — solar math is pure/
  // synchronous-fast, occlusion and wind are both network calls to different
  // services, so there's no reason to serialize them.
  const [solarSummary, occlusionProfile, windReading] = await Promise.all([
    computeSolarSummary(lat, lon, floor, facing, tzOffsetMinutes),
    computeOcclusionProfile(lat, lon, floor),
    fetchWindReading(lat, lon),
  ]);

  const sunScore = computeSunScore(solarSummary);
  const shadeHeatScore = computeShadeHeatScore(solarSummary, facing);
  const viewScore = computeViewScore(occlusionProfile, facing, floor);
  const privacyScore = computePrivacyScore(occlusionProfile, facing, floor);
  const windScore = computeWindScore(windReading, occlusionProfile, floor);

  const subScores = [sunScore, shadeHeatScore, viewScore, privacyScore, windScore];

  const weighted =
    sunScore.score * weights.sun +
    shadeHeatScore.score * weights.shadeHeat +
    viewScore.score * weights.view +
    privacyScore.score * weights.privacy +
    windScore.score * weights.wind;
  const liveScore = Math.round(clamp(weighted));

  const dataNotes: string[] = [];
  if (!occlusionProfile) {
    dataNotes.push('Building data lookup failed — View, Privacy, and Wind scores fell back to floor-based estimates, not real building assessments.');
  } else if (occlusionProfile.dataQuality === 'sparse') {
    dataNotes.push(`Only ${occlusionProfile.buildingsFound - occlusionProfile.buildingsMissingHeight} of ${occlusionProfile.buildingsFound} nearby buildings had real OSM height data — the rest were assumed.`);
  } else if (occlusionProfile.dataQuality === 'none') {
    dataNotes.push('No building footprint data found near this address — View, Privacy, and Wind scores fell back to floor-based estimates.');
  }
  if (!windReading) {
    dataNotes.push('Live wind data unavailable — Wind score is a neutral placeholder.');
  } else {
    dataNotes.push('Wind score reflects current-day forecast conditions, not a year-round average.');
  }
  dataNotes.push('Privacy score is a proximity/height estimate, not a measurement of actual window sightlines.');

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
