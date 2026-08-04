// lib/scoring/sunScore.ts
// "Do I get enough natural light?" — built directly on solarFeasibility.avgUsableHours,
// which lib/solarReport.ts already computes per floor+facing (i.e. per FLAT, not per
// building or neighbourhood). No new math needed here, just normalization into a
// 0-100 score with a human-readable summary.

import type { SolarSummary } from '../solarReport';
import type { SubScore } from './types';
import { clamp } from './types';

// Calibration: avgUsableHours of ~6h/day is about as good as it gets for a
// single-facing residential unit in India (a fully unobstructed south-facing
// unit rarely clears this) — so we treat 6h as the 100-score ceiling rather
// than a theoretical max like 12h, which no real unit hits.
const CEILING_HOURS = 6;
const FLOOR_HOURS = 0.5; // below this, effectively no usable direct sun

export function computeSunScore(summary: SolarSummary): SubScore {
  const { avgUsableHours, verdict, bestMonths, worstMonths } = summary.solarFeasibility;

  const normalized = (avgUsableHours - FLOOR_HOURS) / (CEILING_HOURS - FLOOR_HOURS);
  const score = Math.round(clamp(normalized * 100));

  const summaryLine =
    avgUsableHours < FLOOR_HOURS
      ? `Very little direct sun reaches this unit year-round (${avgUsableHours}h/day avg).`
      : `Averages ${avgUsableHours}h of usable direct sun per day (best: ${bestMonths[0]}, worst: ${worstMonths[0]}).`;

  return {
    key: 'sun',
    label: 'Sun',
    score,
    summary: summaryLine,
    basis: `avgUsableHours=${avgUsableHours}h, feasibility verdict="${verdict}"`,
  };
}
