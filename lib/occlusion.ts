// lib/occlusion.ts
// Real ray-casting against actual OSM building footprints — this is the
// engine both View Score and Privacy Score are built on. Previously an
// empty stub in this repo; this is the first real implementation.
//
// APPROACH: fetch building footprint polygons (not just centers/tags, like
// buildingHeights.ts and estimateFacing.ts use — this needs the actual
// geometry) within RADIUS_M of the property via a single Overpass call
// (`out geom;`). Convert to a local flat meter-plane centered on the
// observer point. Cast a ray outward at each of N sampled azimuths from
// the observer's eye height (derived from floor, same 3m/floor convention
// solarReport.ts already uses); find the nearest building edge each ray
// hits, and the angle from the observer up to that building's roofline.
// That angle is the "sky-blocking angle" in that direction — near 0° means
// open sky, near 90° means a wall right in front of you.
//
// HONESTY: this reuses the SAME single-call, fail-soft Overpass pattern
// already proven in lib/buildingHeights.ts (one query, 8s timeout, null on
// failure — never block the response). Building heights use the same
// ASSUMED_HEIGHT_M fallback as buildingHeights.ts when OSM has no height
// tag, so a report never disagrees with itself about what height was
// assumed. This is a real geometric computation from real building
// footprints, not a simulation — but footprint/height data quality varies
// by area (dense OSM coverage in city centers, sparse elsewhere), so a
// caller should always surface data completeness (see `buildingsFound` /
// `buildingsMissingHeight` / `dataQuality` on the returned profile)
// alongside any score.

import { ASSUMED_HEIGHT_M } from './buildingHeights';
import './networkFix';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 120;           // tight enough to matter for view/privacy
const FETCH_TIMEOUT_MS = 15000; // `out geom` is heavier than buildingHeights.ts's `out tags` query, needs more headroom
const SAMPLE_COUNT = 36;        // one ray every 10°
const MAX_RAY_DIST_M = RADIUS_M;

interface LocalPoint { x: number; y: number; } // meters, relative to observer, x=east, y=north

interface BuildingFootprint {
  ring: LocalPoint[];   // closed polygon in local meters
  heightM: number;
  heightIsAssumed: boolean;
}

export interface RaySample {
  azimuth: number;         // 0=N, 90=E, compass degrees
  distM: number | null;    // distance to nearest building edge hit, or null if open to RADIUS_M
  heightM: number | null;  // height of the building hit, or null if open
  blockAngleDeg: number;   // angle from eye height up to the roofline — 0 = open sky
}

export interface OcclusionProfile {
  samples: RaySample[];
  eyeHeightM: number;
  radiusM: number;
  buildingsFound: number;
  buildingsMissingHeight: number;
  dataQuality: 'good' | 'sparse' | 'none';
}

// ── Overpass fetch + local-plane projection ─────────────────────────────

interface OverpassGeomElement {
  type: string;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

function toLocalMeters(lat: number, lon: number, obsLat: number, obsLon: number): LocalPoint {
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((obsLat * Math.PI) / 180);
  return {
    x: (lon - obsLon) * mPerDegLon,
    y: (lat - obsLat) * mPerDegLat,
  };
}

function parseHeight(tags: Record<string, string> | undefined): { heightM: number; assumed: boolean } {
  if (!tags) return { heightM: ASSUMED_HEIGHT_M, assumed: true };
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!Number.isNaN(h)) return { heightM: h, assumed: false };
  }
  if (tags['building:levels']) {
    const levels = parseFloat(tags['building:levels']);
    if (!Number.isNaN(levels)) return { heightM: levels * 3, assumed: false };
  }
  return { heightM: ASSUMED_HEIGHT_M, assumed: true };
}

async function fetchBuildingFootprints(lat: number, lon: number): Promise<BuildingFootprint[] | null> {
  const query = `[out:json][timeout:12];way["building"](around:${RADIUS_M},${lat},${lon});out geom;`;

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
      console.error(`[occlusion] Overpass returned HTTP ${res.status} for (${lat},${lon})`);
      return null;
    }

    const data = await res.json();
    const elements: OverpassGeomElement[] = data?.elements || [];
    if (!elements.length) {
      console.warn(`[occlusion] Overpass returned 0 elements for (${lat},${lon}) — genuinely no mapped buildings within ${RADIUS_M}m.`);
      return [];
    }

    const footprints = elements
      .filter(el => el.geometry && el.geometry.length >= 3)
      .map(el => {
        const { heightM, assumed } = parseHeight(el.tags);
        const ring = el.geometry!.map(pt => toLocalMeters(pt.lat, pt.lon, lat, lon));
        return { ring, heightM, heightIsAssumed: assumed };
      });

    console.log(`[occlusion] Fetched ${elements.length} elements, ${footprints.length} usable footprints for (${lat},${lon})`);
    return footprints;
  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[occlusion] Overpass fetch failed for (${lat},${lon}):`, err?.name === 'AbortError' ? `timed out after ${FETCH_TIMEOUT_MS}ms` : err?.message || err);
    return null;
  }
}

// ── Ray-vs-polygon-edge intersection (2D, local meter plane) ────────────

/** Distance along ray (dx,dy) from origin (0,0) to segment (p1,p2), or null if no hit. */
function rayHitsSegment(dx: number, dy: number, p1: LocalPoint, p2: LocalPoint): number | null {
  const ex = p2.x - p1.x, ey = p2.y - p1.y;
  // Solve: t*(dx,dy) = p1 + s*(ex,ey)  →  t*dx - s*ex = p1.x ; t*dy - s*ey = p1.y
  const det = dx * (-ey) - dy * (-ex);
  if (Math.abs(det) < 1e-9) return null; // parallel
  const t = (p1.x * (-ey) - p1.y * (-ex)) / det;
  const s = (dx * p1.y - dy * p1.x) / det;
  if (t < 0 || s < 0 || s > 1) return null;
  return t;
}

function nearestHitOnRing(dx: number, dy: number, ring: LocalPoint[]): number | null {
  let nearest: number | null = null;
  for (let i = 0; i < ring.length - 1; i++) {
    const d = rayHitsSegment(dx, dy, ring[i], ring[i + 1]);
    if (d !== null && d > 0 && (nearest === null || d < nearest)) nearest = d;
  }
  return nearest;
}

// ── Public API ────────────────────────────────────────────────────────

export function eyeHeightForFloor(floor: number): number {
  return floor * 3 + 1.5; // floor height convention matches lib/solarReport.ts; +1.5m for a standing/window sightline
}

export async function computeOcclusionProfile(
  lat: number, lon: number, floor: number
): Promise<OcclusionProfile | null> {
  const buildings = await fetchBuildingFootprints(lat, lon);
  const eyeHeightM = eyeHeightForFloor(floor);

  if (buildings === null) {
    return null; // fetch failed — caller decides fallback, never fabricate a score
  }

  const missingHeight = buildings.filter(b => b.heightIsAssumed).length;
  const dataQuality: OcclusionProfile['dataQuality'] =
    buildings.length === 0 ? 'none' : missingHeight / Math.max(buildings.length, 1) > 0.5 ? 'sparse' : 'good';

  const samples: RaySample[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const az = (360 / SAMPLE_COUNT) * i;
    const rad = (az * Math.PI) / 180;
    // Local plane: x=east, y=north. Azimuth 0=N(+y), 90=E(+x).
    const dx = Math.sin(rad);
    const dy = Math.cos(rad);

    let bestDist: number | null = null;
    let bestHeight: number | null = null;
    for (const b of buildings) {
      const d = nearestHitOnRing(dx, dy, b.ring);
      if (d !== null && d <= MAX_RAY_DIST_M && (bestDist === null || d < bestDist)) {
        bestDist = d;
        bestHeight = b.heightM;
      }
    }

    const blockAngleDeg =
      bestDist !== null && bestHeight !== null && bestHeight > eyeHeightM
        ? (Math.atan2(bestHeight - eyeHeightM, bestDist) * 180) / Math.PI
        : 0;

    samples.push({ azimuth: az, distM: bestDist, heightM: bestHeight, blockAngleDeg });
  }

  return {
    samples,
    eyeHeightM,
    radiusM: RADIUS_M,
    buildingsFound: buildings.length,
    buildingsMissingHeight: missingHeight,
    dataQuality,
  };
}
