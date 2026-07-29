// lib/buildingHeights.ts
// Real OSM data check for the report's "honesty line": how many buildings
// near this property actually have height data in OpenStreetMap, and how
// many are missing it (meaning any height-dependent number in the report
// is, to that extent, an assumption rather than a measurement).
//
// This does NOT touch the Gemini prompt or the solar-geometry math — it's a
// separate, additive ground-truth check that both the analyse route and the
// PDF route can surface. If Overpass is unreachable or slow, it fails soft
// (returns null) rather than blocking report generation or guessing a number.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 150; // matches the shadow-relevant neighborhood, not the full 250m solar-path radius
const FETCH_TIMEOUT_MS = 8000;

// Generic low-rise assumption used when a building has no height/levels tag.
// This mirrors the same "typical urban obstruction" heuristic already
// disclosed in lib/solarReport.ts's floor-clearance estimate, kept as one
// named constant so the report and the math never disagree with each other.
export const ASSUMED_HEIGHT_M = 12;

export interface BuildingHeightNote {
  totalBuildings: number;
  missingHeightCount: number;
  assumedHeightM: number;
  sentence: string;
}

interface OverpassElement {
  type: string;
  tags?: Record<string, string>;
}

function hasHeightData(tags: Record<string, string> | undefined): boolean {
  if (!tags) return false;
  return Boolean(tags.height || tags['building:levels']);
}

export async function checkBuildingHeights(
  lat: number,
  lon: number
): Promise<BuildingHeightNote | null> {
  const query = `[out:json][timeout:8];way["building"](around:${RADIUS_M},${lat},${lon});out tags;`;

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
      console.error('Overpass building-height check failed:', res.status);
      return null;
    }

    const data = await res.json();
    const elements: OverpassElement[] = data?.elements || [];
    if (elements.length === 0) return null;

    const total = elements.length;
    const missing = elements.filter(el => !hasHeightData(el.tags)).length;

    const sentence =
      missing === 0
        ? `All ${total} nearby buildings had OSM height data — no assumptions were needed for building heights in this report.`
        : `${missing} of ${total} nearby buildings had no height data in OpenStreetMap; where that happened, we assumed ${ASSUMED_HEIGHT_M}m (a typical low-rise estimate) rather than leaving it blank.`;

    return { totalBuildings: total, missingHeightCount: missing, assumedHeightM: ASSUMED_HEIGHT_M, sentence };
  } catch (err) {
    clearTimeout(timeout);
    console.error('Overpass building-height check errored:', err);
    return null;
  }
}
