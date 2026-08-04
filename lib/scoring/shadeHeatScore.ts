// lib/scoring/shadeHeatScore.ts
// "Will this unit be an oven?" — same underlying solar data as sunScore.ts,
// but reweighted: instead of total usable hours across the year, this looks
// specifically at summer (Apr–Jun) exposure and combines it with a facing
// multiplier, since west/south-west facing units catch the hottest part of
// the afternoon and stay noticeably warmer than east/north-facing units with
// the same raw sun-hour total. Higher score = cooler/more comfortable.
//
// CAVEAT (surface this in the UI): this is a heat-load *proxy*, not a
// measured temperature. It doesn't account for cross-ventilation, glazing,
// insulation, or actual local climate data — it's directly comparable
// across two units analysed by this same tool, not an absolute forecast.

import type { SolarSummary } from '../solarReport';
import type { SubScore } from './types';
import { clamp } from './types';

const SUMMER_MONTHS = ['April', 'May', 'June'];

// Afternoon-facing directions catch the hottest hours (roughly 1–4pm) and
// run hotter for a given amount of raw sun exposure than morning-facing
// directions with the same hour count. West-facing is the classic
// "hot in the evening" complaint in Indian apartments.
const FACING_HEAT_MULTIPLIER: Record<string, number> = {
  West: 1.3,
  'South-West': 1.2,
  South: 1.0,
  'North-West': 1.05,
  'South-East': 0.9,
  East: 0.8,
  'North-East': 0.7,
  North: 0.6,
};

const CEILING_HEAT_LOAD = 7; // summerAvgHours * multiplier, calibrated against worst case (~5.5h * 1.3)

export function computeShadeHeatScore(summary: SolarSummary, facing: string): SubScore {
  const summerRows = summary.monthlySummary.filter(m => SUMMER_MONTHS.includes(m.month));
  const summerAvgHours = summerRows.length
    ? summerRows.reduce((s, m) => s + m.usableHours, 0) / summerRows.length
    : 0;

  const multiplier = FACING_HEAT_MULTIPLIER[facing] ?? 1.0;
  const heatLoad = summerAvgHours * multiplier;

  const normalized = 1 - clamp(heatLoad / CEILING_HEAT_LOAD, 0, 1);
  const score = Math.round(normalized * 100);

  const summaryLine =
    heatLoad < 1.5
      ? `Well-shaded through summer — low direct heat exposure (${facing}-facing).`
      : heatLoad < 4
      ? `Moderate summer sun exposure (${summerAvgHours.toFixed(1)}h/day avg, ${facing}-facing).`
      : `High summer heat exposure — expect strong afternoon warmth (${summerAvgHours.toFixed(1)}h/day avg, ${facing}-facing).`;

  return {
    key: 'shadeHeat',
    label: 'Shade & Heat',
    score,
    summary: summaryLine,
    basis: `summerAvgUsableHours=${summerAvgHours.toFixed(1)}h × facingMultiplier(${facing})=${multiplier} → heatLoad=${heatLoad.toFixed(1)} (estimate, not measured temperature)`,
  };
}
