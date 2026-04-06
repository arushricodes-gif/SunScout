// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  if (!q) return NextResponse.json({ result: null });

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'SunScout_NextJS/1.0' } }
    );
    const data = await r.json();
    if (data && data[0]) {
      return NextResponse.json({ result: [parseFloat(data[0].lat), parseFloat(data[0].lon)] });
    }
  } catch {}
  return NextResponse.json({ result: null });
}
