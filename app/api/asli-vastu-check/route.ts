// app/api/asli-vastu-check/route.ts
//
// Bridges SunScout -> AsliVastu (Flow 1 of the BlindSpot cross-tool popup).
//
// Given a lat/lng the user just searched in SunScout, this:
//   1. Reverse-geocodes it to an Indian PIN code via Nominatim
//   2. Checks that PIN against AsliVastu's live covered-PIN list
//   3. Returns either a direct report URL, or a "not covered yet" flag
//
// Kept server-side (rather than called from the browser) so we don't need
// CORS on Nominatim/AsliVastu and don't leak retry/caching logic to the client.

import { NextRequest, NextResponse } from 'next/server';
import fallbackCoverage from '@/lib/asliVastuCoverage.json';
import areaNames from '@/lib/asliVastuAreaNames.json';

const ASLIVASTU_ALL_URL = 'https://aslivastu.com/api/all';
const ASLIVASTU_REPORT_BASE = 'https://aslivastu.com/report';

const AREA_NAME_MAP: Record<string, string> = areaNames;

// AsliVastu's own DIM/city split uses PIN prefixes: 560xxx = Bangalore, else Delhi NCR.
// Mirrors the check already used in aslivastu-web/pages/index.js.
function cityForPin(pin: string): 'Delhi NCR' | 'Bangalore' {
  return pin.startsWith('560') ? 'Bangalore' : 'Delhi NCR';
}

async function getCoveredPins(): Promise<string[]> {
  try {
    // Revalidate hourly — AsliVastu's dataset updates periodically (scores.py pipeline),
    // no need to hit it on every single search.
    const r = await fetch(ASLIVASTU_ALL_URL, { next: { revalidate: 3600 } });
    if (!r.ok) throw new Error(`AsliVastu /api/all returned ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Unexpected /api/all shape');
    return data.map((d: { pin_code: string }) => d.pin_code);
  } catch (e) {
    // Live fetch failed (network hiccup, AsliVastu deploy mid-flight, etc.)
    // — fall back to the baked-in snapshot rather than showing nothing.
    console.warn('asli-vastu-check: live coverage fetch failed, using fallback snapshot', e);
    return fallbackCoverage.pins;
  }
}

// Normalize for loose name comparison: lowercase, strip punctuation/spacing
// quirks so "Rajaji Nagar" and "Rajajinagar" both match "Rajajinagar".
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Try to match a Nominatim-returned locality name against AsliVastu's own
// PIN -> area-name map (e.g. "560010": "Rajajinagar"). Used as a fallback
// when Nominatim's postcode field is missing or points at a neighboring PIN
// — common for large/well-known localities where OSM's postcode tagging is thin.
function matchPinByName(candidates: (string | undefined)[]): string | null {
  const normalizedCandidates = candidates.filter(Boolean).map((c) => normalize(c as string));
  for (const [pin, name] of Object.entries(AREA_NAME_MAP)) {
    const normalizedName = normalize(name);
    if (normalizedCandidates.some((c) => c === normalizedName || c.includes(normalizedName) || normalizedName.includes(c))) {
      return pin;
    }
  }
  return null;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ pin: string | null; nameCandidates: (string | undefined)[] }> {
  // Nominatim is a shared public service and occasionally returns transient
  // errors, empty bodies, or a 429 under load — retry a couple of times
  // (longer backoff specifically on 429) before giving up, and cache the
  // result for this exact coordinate for a while so repeated checks at the
  // same/nearby spot during a session don't hit it again at all.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16`,
        {
          headers: {
            'User-Agent': 'SunScout_NextJS/1.0 (+https://sun-scout.com)',
            'Accept-Language': 'en',
          },
          next: { revalidate: 3600 },
        }
      );
      if (r.status === 429) throw new Error('rate_limited');
      if (!r.ok) throw new Error(`Nominatim returned ${r.status}`);
      const data = await r.json();
      const addr = data?.address || {};
      const pin: string | undefined = addr.postcode;
      const nameCandidates = [addr.suburb, addr.neighbourhood, addr.city_district, addr.town, addr.village];
      return {
        pin: pin && /^\d{6}$/.test(pin) ? pin : null,
        nameCandidates,
      };
    } catch (e) {
      if (attempt === 3) {
        console.warn('asli-vastu-check: reverse geocode failed after retries', e);
        return { pin: null, nameCandidates: [] };
      }
      const isRateLimit = e instanceof Error && e.message === 'rate_limited';
      await new Promise((res) => setTimeout(res, (isRateLimit ? 1200 : 400) * attempt));
    }
  }
  return { pin: null, nameCandidates: [] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const [{ pin: reverseGeocodedPin, nameCandidates }, coveredPins] = await Promise.all([
    reverseGeocode(lat, lon),
    getCoveredPins(),
  ]);

  // Fast path: postcode came back and it's directly covered.
  let pin = reverseGeocodedPin && coveredPins.includes(reverseGeocodedPin) ? reverseGeocodedPin : null;

  // Fallback: postcode missing, or it resolved to a PIN outside the covered set
  // (common near locality boundaries) — try matching the returned locality name instead.
  if (!pin) {
    const nameMatch = matchPinByName(nameCandidates);
    if (nameMatch && coveredPins.includes(nameMatch)) pin = nameMatch;
  }

  if (!pin) {
    return NextResponse.json({
      covered: false,
      pin: null,
      reason: reverseGeocodedPin ? 'pin_not_covered' : 'no_pin_resolved',
    });
  }

  return NextResponse.json({
    covered: true,
    pin,
    city: cityForPin(pin),
    url: `${ASLIVASTU_REPORT_BASE}/${pin}`,
  });
}