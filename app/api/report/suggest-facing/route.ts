// app/api/report/suggest-facing/route.ts
// Lightweight endpoint the report modal calls as soon as it opens (before
// floor/facing are picked or "Generate" is clicked) to pre-fill a best-guess
// facing direction. Kept separate from /api/report/analyse's building-height
// check because this needs to run earlier and is a much smaller query.

import { NextRequest, NextResponse } from 'next/server';
import { estimateFacing } from '@/lib/estimateFacing';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ suggestion: null }, { status: 400 });
  }

  const suggestion = await estimateFacing(lat, lon).catch(() => null);
  return NextResponse.json({ suggestion });
}
