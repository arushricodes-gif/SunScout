// app/api/solar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getSunTimes, buildPathData, getSolarPos, getEdge,
  calculateSolarRadiation, computeSolarAzimuth,
} from '@/lib/solar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat       = parseFloat(searchParams.get('lat')  || '51.505');
  const lon       = parseFloat(searchParams.get('lon')  || '-0.09');
  const dateStr   = searchParams.get('date')    || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const tzOffset  = parseInt(searchParams.get('tzOffset') || '0', 10); // minutes east of UTC
  const simTimeP  = searchParams.get('simTime') || null; // HH:MM local

  // 1. Sun times for the requested local date
  const sunTimes = getSunTimes(lat, lon, dateStr, tzOffset);

  // 2. Full-day path data
  const pathData = buildPathData(lat, lon, 250, sunTimes.riseDate, sunTimes.setDate, tzOffset);

  // 3. Sim position
  let simDate: Date;
  if (simTimeP) {
    const [hh, mm] = simTimeP.split(':').map(Number);
    const [y, mo, d] = dateStr.split('-').map(Number);
    // Build a UTC Date that represents HH:MM in the local timezone
    simDate = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0) - tzOffset * 60000);
  } else {
    simDate = new Date();
  }
  const simPos = getSolarPos(lat, lon, 250, simDate);

  // 4. Rise/set edge points
  const riseAz   = computeSolarAzimuth(lat, lon, sunTimes.riseDate);
  const setAz    = computeSolarAzimuth(lat, lon, sunTimes.setDate);
  const riseEdge = getEdge(lat, lon, riseAz, 250);
  const setEdge  = getEdge(lat, lon, setAz, 250);

  // 5. Radiation
  const radiation = calculateSolarRadiation(simPos.elevation);

  // 6. Seasonal paths (use same year as dateStr)
  const year = parseInt(dateStr.slice(0, 4), 10);
  const seasonDates: Record<string, string> = {
    Summer: `${year}-06-21`,
    Autumn: `${year}-10-15`,
    Spring: `${year}-04-01`,
    Winter: `${year}-12-21`,
  };
  const seasonal: Record<string, [number, number][]> = {};
  for (const [sid, sd] of Object.entries(seasonDates)) {
    const st = getSunTimes(lat, lon, sd, tzOffset);
    const pts: [number, number][] = [];
    let c = new Date(st.riseDate.getTime());
    while (c <= st.setDate) {
      const p = getSolarPos(lat, lon, 250, c);
      pts.push([p.sunLat, p.sunLon]);
      c = new Date(c.getTime() + 20 * 60000);
    }
    seasonal[sid] = pts;
  }

  return NextResponse.json({
    sunTimes: { rise: sunTimes.rise, set: sunTimes.set, noon: sunTimes.noon },
    pathData,
    simPos: {
      sunLat: simPos.sunLat, sunLon: simPos.sunLon,
      shadowLat: simPos.shadowLat, shadowLon: simPos.shadowLon,
      azimuth: simPos.azimuth, elevation: simPos.elevation,
    },
    riseEdge, setEdge,
    radiation,
    seasonal,
  });
}
