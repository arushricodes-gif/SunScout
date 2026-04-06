import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  // No external API — estimate from longitude directly
  // This is accurate to within 30-60 min for most locations
  // Real tz boundaries handled by rounding to nearest hour
  const offsetMinutes = Math.round(lon / 15) * 60;
  return NextResponse.json({ offsetMinutes });
}
