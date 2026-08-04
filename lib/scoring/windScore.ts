// lib/scoring/windScore.ts
// "Will this unit get cross-ventilation?" — combines two REAL data sources:
//   1. Live wind speed from Open-Meteo (the same API SunScoutApp.tsx already
//      calls client-side for the sidebar wind panel — this reuses that,
//      server-side, for scoring).
//   2. Overall building openness from the occlusion ray-cast profile (wind
//      needs open paths in AND out, not just a good facing side — so this
//      uses ALL sampled directions, not just the facing arc like View/Privacy do).
//
// CAVEAT: Open-Meteo's forecast is CURRENT/short-term weather, not a
// year-round climatological average — this score reflects conditions
// around the time of the request, not a guaranteed year-round pattern.
// Say so in the UI. This is intentionally separate from the deterministic,
// date-independent Sun/Shade scores.

import type { OcclusionProfile } from '../occlusion';
import type { SubScore } from './types';
import { clamp } from './types';
import { floorViewPrior } from './floorPriors';
import '../networkFix';

const FETCH_TIMEOUT_MS = 6000;
const COMFORT_CEILING_KMH = 20; // wind speed at/above this is treated as "great ventilation", not just "windy"

export interface WindReading {
  avgSpeedKmh: number;
  currentSpeedKmh: number;
}

export async function fetchWindReading(lat: number, lon: number): Promise<WindReading | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=windspeed_10m&forecast_days=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const d = await res.json();
    const hourly: number[] = d?.hourly?.windspeed_10m || [];
    const current: number = d?.current_weather?.windspeed ?? (hourly.length ? hourly[0] : 0);
    if (!hourly.length && !current) return null;

    const avg = hourly.length ? hourly.reduce((s: number, v: number) => s + v, 0) / hourly.length : current;
    return { avgSpeedKmh: avg, currentSpeedKmh: current };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export function computeWindScore(
  wind: WindReading | null,
  profile: OcclusionProfile | null,
  floor: number
): SubScore {
  if (!wind) {
    return {
      key: 'wind',
      label: 'Wind & Ventilation',
      score: 50,
      summary: 'Live wind data unavailable for this location — showing a neutral score.',
      basis: 'Open-Meteo request failed or timed out.',
    };
  }

  const windComponent = clamp((wind.avgSpeedKmh / COMFORT_CEILING_KMH) * 100);

  let openComponent: number;
  if (profile && profile.dataQuality !== 'none') {
    const OPEN_THRESHOLD_DEG = 12;
    const openCount = profile.samples.filter(s => s.blockAngleDeg <= OPEN_THRESHOLD_DEG).length;
    openComponent = (openCount / profile.samples.length) * 100;
  } else {
    // No building data — fall back to the same floor-based prior View/Privacy
    // use, rather than a context-blind 50. Ground floor units get less airflow
    // credit than high floors even before any building data is known.
    openComponent = floorViewPrior(floor);
  }

  // Ventilation needs both — a windy area with a fully boxed-in unit still won't
  // get cross-breeze, so weight openness slightly higher than raw wind speed.
  const score = Math.round(clamp(openComponent * 0.6 + windComponent * 0.4));

  const summary =
    score >= 70
      ? `Good ventilation potential — open surroundings and steady wind (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today).`
      : score >= 40
      ? `Moderate ventilation potential — some obstruction or lighter wind (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today).`
      : `Limited ventilation potential — boxed-in surroundings and/or low wind (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today).`;

  return {
    key: 'wind',
    label: 'Wind & Ventilation',
    score,
    summary: summary + ' (Based on current-day forecast, not a year-round average.)',
    basis: `avgWindSpeed=${wind.avgSpeedKmh.toFixed(1)}km/h, buildingOpenness=${openComponent.toFixed(0)}%`,
  };
}
