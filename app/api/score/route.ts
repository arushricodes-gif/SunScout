// app/api/score/route.ts — LiveScore for a specific flat (lat/lon + floor + facing).
// Mirrors app/api/report/route.ts's param handling. This one calls Overpass
// (for View/Privacy) and Open-Meteo (for Wind) in addition to the pure solar
// math, so it's a bit slower than a pure computation — but still no Gemini
// call, no API key needed.
import { NextRequest, NextResponse } from 'next/server';
import { computeLiveScore } from '@/lib/scoring/scoreAggregator';
import type { LiveScoreWeights } from '@/lib/scoring/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat      = parseFloat(searchParams.get('lat') || '12.97');
  const lon      = parseFloat(searchParams.get('lon') || '77.59');
  const tzOffset = parseInt(searchParams.get('tzOffset') || '330', 10);
  const floor    = parseInt(searchParams.get('floor') || '5', 10);
  const facing   = searchParams.get('facing') || 'South';

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid lat/lon' }, { status: 400 });
  }

  const weightKeys: (keyof LiveScoreWeights)[] = ['sun', 'shadeHeat', 'view', 'privacy', 'wind'];
  const weights: Partial<LiveScoreWeights> = {};
  for (const key of weightKeys) {
    const raw = searchParams.get(`${key}Weight`);
    if (raw !== null) {
      const val = parseFloat(raw);
      if (!Number.isNaN(val)) weights[key] = val;
    }
  }

  try {
    const result = await computeLiveScore({
      lat, lon, floor, facing,
      tzOffsetMinutes: tzOffset,
      weights,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('LiveScore computation failed:', err);
    return NextResponse.json({ error: 'Score computation failed' }, { status: 500 });
  }
}
