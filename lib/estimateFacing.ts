// lib/estimateFacing.ts
// Best-effort auto-detection of which way a unit likely faces, used to
// pre-fill (not force) the facing selector before report generation. This
// is a heuristic, not a fact: no public dataset records which way an
// individual unit's windows/balcony face. What we CAN check is which
// compass direction around the property has the fewest nearby building
// footprints — i.e. the most open side, likely a street, courtyard, or open
// space — and use that as a proxy for the outward-facing direction. This
// can be wrong (buildings with openings on multiple sides, misaligned
// footprints, sparse OSM coverage), so the UI must always present it as an
// assumption and let the person override it, and the report must disclose
// it rather than silently using it as fact.
//
// Deliberately ONE Overpass call, not several sequential retries at
// different radii — an earlier version tried 60m/120m/250m one after
// another, and the combined worst-case latency (up to ~24s across three
// 8s-timeout calls) could exceed Vercel's default serverless function time
// limit, killing the request outright before it ever returned. This mirrors
// the single-call pattern already proven reliable in buildingHeights.ts.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 150; // same radius as the proven-working building-height check
const FETCH_TIMEOUT_MS = 8000;
const MIN_BUILDINGS_FOR_CONFIDENCE = 4; // below this we still guess, just at lower confidence — see thinSample below

const DIRECTIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];

export interface FacingSuggestion {
  direction: string; // one of DIRECTIONS
  confidence: 'low' | 'medium';
  sentence: string;
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bucketOf(bearingDeg: number): number {
  return Math.round(bearingDeg / 45) % 8;
}

interface OverpassElement {
  type: string;
  center?: { lat: number; lon: number };
}

export async function estimateFacing(lat: number, lon: number): Promise<FacingSuggestion | null> {
  const query = `[out:json][timeout:8];way["building"](around:${RADIUS_M},${lat},${lon});out center;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('estimateFacing: Overpass returned', res.status);
      return null;
    }

    const data = await res.json();
    const elements: OverpassElement[] = (data?.elements || []).filter((e: OverpassElement) => e.center);

    if (elements.length === 0) {
      console.warn('estimateFacing: no building data near', lat, lon);
      return null;
    }

    const thinSample = elements.length < MIN_BUILDINGS_FOR_CONFIDENCE;

    const counts = new Array(8).fill(0);
    for (const el of elements) {
      const b = bearing(lat, lon, el.center!.lat, el.center!.lon);
      counts[bucketOf(b)]++;
    }

    const minCount = Math.min(...counts);
    const candidates = counts.reduce<number[]>((acc, c, i) => (c === minCount ? [...acc, i] : acc), []);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]; // random tie-break so ties don't systematically favor one compass label
    const direction = DIRECTIONS[chosen];
    const avg = counts.reduce((a, b) => a + b, 0) / 8;
    const confidence: 'low' | 'medium' = !thinSample && candidates.length === 1 && minCount < avg ? 'medium' : 'low';

    const sampleNote = thinSample
      ? ` (based on only ${elements.length} nearby buildings — a thin sample, treat this guess loosely)`
      : '';
    const sentence = `Facing assumed as ${direction} — the side with the fewest nearby building footprints (${minCount} within ${RADIUS_M}m) around this point${sampleNote}, used as a proxy for the most open/outward side of the building. This is an estimate from map data, not a confirmed unit orientation — the actual unit may face a different way even within the same building.`;

    return { direction, confidence, sentence };
  } catch (err) {
    clearTimeout(timeout);
    console.error('estimateFacing errored:', err);
    return null;
  }
}