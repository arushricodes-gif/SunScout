// app/api/report/route.ts — full solar intelligence report, no screenshots needed
import { NextRequest, NextResponse } from 'next/server';
import { computeSolarSummary, compassDir } from '@/lib/solarReport';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat      = parseFloat(searchParams.get('lat') || '12.97');
  const lon      = parseFloat(searchParams.get('lon') || '77.59');
  const tzOffset = parseInt(searchParams.get('tzOffset') || '330', 10);
  const address  = searchParams.get('address') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const floor    = parseInt(searchParams.get('floor') || '5', 10);
  const facing   = searchParams.get('facing') || 'South';

  const { monthlySummary, seasonalDetail, solarFeasibility } =
    await computeSolarSummary(lat, lon, floor, facing, tzOffset);

  const keyMonths = [0, 5, 11];
  const floorAnalysis = keyMonths.map(idx => {
    const m = monthlySummary[idx];
    return `${m.month}: Sun rises ${m.sunrise}, unit gets sun ${m.floorClearance}, sets ${m.sunset}. Noon sun at ${m.noonElevation}° from ${compassDir(m.noonAzimuth)}.`;
  }).join('\n');

  const seasonalText = seasonalDetail.map(s =>
    `${s.season}:\n` + s.slots.map(sl =>
      `  ${sl.time}: elevation ${sl.elevation}°, from ${sl.direction} (${sl.azimuth}°), shadow ${sl.inSun ? sl.shadowLength + 'm long' : 'sun below horizon'}`
    ).join('\n')
  ).join('\n\n');

  const monthlyText = monthlySummary.map(m =>
    `${m.month}: Rise ${m.sunrise}, Set ${m.sunset}, Noon elevation ${m.noonElevation}°, Usable sun ${m.usableHours}h, Peak ${m.peakWindow}, Floor ${floor} ${facing}-facing gets sun ${m.floorClearance}`
  ).join('\n');

  const prompt = `You are a solar intelligence analyst advising a home buyer in India.

PROPERTY: ${address} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)
UNIT: Floor ${floor} (≈${floor * 3}m height), ${facing}-facing apartment

PRECISE SOLAR DATA — SEASONAL BREAKDOWN:
${seasonalText}

MONTHLY DATA:
${monthlyText}

KEY FLOOR-SPECIFIC DATA:
${floorAnalysis}

CONTEXT: In India, apartments typically have 3m floor height. A neighboring building blocking the sun at ground level may clear by floor 4-5. Floor clearance figures are estimates based on typical urban obstruction heights, not measurements of this specific property's actual neighbors — mention this as a caveat.

IMPORTANT — SUN-PATH REVERSAL AT THIS LATITUDE: This property is at ${lat.toFixed(1)}°N. At latitudes below ~23.4°N, the sun's summer declination can exceed the site's own latitude, meaning at solar noon in peak summer the sun passes to the NORTH of overhead rather than the south. For a south-facing unit, this often means LOWER usable sun hours in summer and HIGHER usable sun hours in winter, even though the sun is higher in the sky (higher noon elevation) during summer — because a south-facing unit is looking away from the sun's actual position for part of the summer day. If the data for this property shows winter usable-hours higher than summer, this is the reason — explain it plainly to the reader in the relevant section(s) so the numbers don't look like an error. Do NOT just state the numbers without this explanation if this pattern appears in the data.
Write a detailed home buyer solar report with these sections:

1. PROPERTY SOLAR OVERVIEW
2-3 sentences describing the overall solar character of this location and latitude.

2. YOUR UNIT — FLOOR ${floor}, ${facing.toUpperCase()}-FACING
The most important section. Be very specific:
- What time does direct sunlight first enter this unit in summer vs winter?
- How many hours of direct sun per day in the best and worst months?
- Which rooms (morning vs afternoon sun) benefit most?
- Is floor ${floor} high enough to avoid shadow from typical neighboring buildings?

3. MONTH-BY-MONTH GUIDE
For each month, one sentence: when does sun enter, how long, any concerns.

4. SEASONAL HIGHLIGHTS
4 bullet points — Summer, Winter, Spring, Autumn. Key practical facts. If usable sun hours are higher in winter than summer for this facing, explain why in plain language (sun-path shift at this latitude) — don't just report the number without explanation.

5. SOLAR PANEL SUITABILITY
Is this rooftop/floor good for solar? Peak generation window? Best/worst months?

6. HOME BUYER VERDICT
3-4 honest sentences. Would you recommend this unit for sunlight? What floor/facing would be ideal? Any red flags?

Be specific, practical, and honest. Use the actual numbers. Write like you're advising a friend about to spend ₹1 crore.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
      }),
    }
  );

  const geminiData = await geminiRes.json();
  const aiReport = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Report generation failed.';

  return NextResponse.json({
    address, lat, lon, floor, facing,
    generatedAt: new Date().toISOString(),
    monthlySummary, seasonalDetail, solarFeasibility, aiReport,
  });
}