// lib/scoring/windScore.ts
// "Will this unit get cross-ventilation?" — combines live wind speed from
// Open-Meteo (reliable so far, unlike Overpass) with a deterministic
// floor-based openness estimate (same reasoning as viewScore.ts — no live
// building-data dependency).
//
// CAVEAT: Open-Meteo's forecast is CURRENT/short-term weather, not a
// year-round climatological average.

import type { SubScore } from './types';
import { clamp } from './types';
import { floorViewPrior } from './floorPriors';
import '../networkFix';

const FETCH_TIMEOUT_MS = 6000;
const COMFORT_CEILING_KMH = 20;

export interface WindReading {
  avgSpeedKmh: number;
  currentSpeedKmh: number;
}

export async function fetchWindReading(lat: number, lon: number): Promise<WindReading | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=windspeed_10m&forecast_days=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SunScout/1.0 (+https://sun-scout.com; property solar/shadow analysis app)' },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[windScore] Open-Meteo returned HTTP ${res.status} for (${lat},${lon})`);
      return null;
    }

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

export function computeWindScore(wind: WindReading | null, floor: number): SubScore {
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
  const openComponent = floorViewPrior(floor); // deterministic, same cutoffs as View score

  const score = Math.round(clamp(openComponent * 0.6 + windComponent * 0.4));

  const summary =
    score >= 70
      ? `Good ventilation potential — floor level supports airflow and wind is steady (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today).`
      : score >= 40
      ? `Moderate ventilation potential (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today, floor ${floor}).`
      : `Limited ventilation potential — lower floor and/or light wind (avg ${wind.avgSpeedKmh.toFixed(1)} km/h today).`;

  return {
    key: 'wind',
    label: 'Wind & Ventilation',
    score,
    summary: summary + ' (Live forecast + floor-based openness estimate, not a year-round average.)',
    basis: `avgWindSpeed=${wind.avgSpeedKmh.toFixed(1)}km/h (live), floorOpenness=${openComponent} (deterministic cutoff, floor=${floor})`,
  };
}
