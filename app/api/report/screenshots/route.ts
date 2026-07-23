// app/api/report/screenshots/route.ts
// Uses Browserless to capture map screenshots (works on Vercel)

import { NextRequest, NextResponse } from 'next/server';

const CAPTURES = [
  { label: 'Summer · Morning',   date: '2025-06-21', time: '09:00', season: 'Summer' },
  { label: 'Summer · Noon',      date: '2025-06-21', time: '12:00', season: 'Summer' },
  { label: 'Summer · Afternoon', date: '2025-06-21', time: '15:00', season: 'Summer' },
  { label: 'Winter · Morning',   date: '2025-12-21', time: '09:00', season: 'Winter' },
  { label: 'Winter · Noon',      date: '2025-12-21', time: '12:00', season: 'Winter' },
  { label: 'Winter · Afternoon', date: '2025-12-21', time: '15:00', season: 'Winter' },
  { label: 'Spring · Morning',   date: '2025-03-20', time: '09:00', season: 'Spring' },
  { label: 'Spring · Noon',      date: '2025-03-20', time: '12:00', season: 'Spring' },
  { label: 'Spring · Afternoon', date: '2025-03-20', time: '15:00', season: 'Spring' },
  { label: 'Autumn · Morning',   date: '2025-09-23', time: '09:00', season: 'Autumn' },
  { label: 'Autumn · Noon',      date: '2025-09-23', time: '12:00', season: 'Autumn' },
  { label: 'Autumn · Afternoon', date: '2025-09-23', time: '15:00', season: 'Autumn' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat') || '12.97';
  const lon = searchParams.get('lon') || '77.59';
  const baseUrl = req.nextUrl.origin;
  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'BROWSERLESS_TOKEN not set' }, { status: 500 });
  }

  const screenshots = [];

  for (const cap of CAPTURES) {
    const targetUrl = `${baseUrl}/?lat=${lat}&lon=${lon}&date=${cap.date}&simTime=${encodeURIComponent(cap.time)}&animating=false`;

    try {
      const res = await fetch(`https://chrome.browserless.io/screenshot?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          options: { type: 'jpeg', quality: 80, fullPage: false },
          viewport: { width: 1200, height: 700 },
          waitFor: 4000, // wait 4s for map to render
        }),
      });

      if (!res.ok) throw new Error(`Screenshot failed: ${res.status}`);

      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      screenshots.push({
        label: cap.label,
        season: cap.season,
        time: cap.time,
        base64,
      });
    } catch (err) {
      console.error(`Failed to capture ${cap.label}:`, err);
      // Continue with other screenshots even if one fails
    }
  }

  if (screenshots.length === 0) {
    return NextResponse.json({ error: 'All screenshots failed' }, { status: 500 });
  }

  return NextResponse.json({ screenshots });
}