import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  try {
    const r = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = await r.json();
    const tz = data.timeZone;
    const now = new Date();
    const utcStr   = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const localStr = now.toLocaleString('en-US', { timeZone: tz });
    const offsetMinutes = Math.round(
      (new Date(localStr).getTime() - new Date(utcStr).getTime()) / 60000
    );
    return NextResponse.json({ tz, offsetMinutes });
  } catch {
    const offsetMinutes = Math.round(lon / 15) * 60;
    return NextResponse.json({ tz: 'UTC', offsetMinutes });
  }
}
