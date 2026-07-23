// app/api/report/pdf/route.ts
// Accepts screenshots + a deterministic monthly summary + AI analysis and
// builds the HTML report. The table renders straight from computed data so
// the buyer always gets real numbers even if the AI narrative is short/empty.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { lat, lon, address, floor, facing, screenshots, analysis, summary } = await req.json();
  const date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  // Gemini's output style varies slightly run to run (plain numbered lines,
  // "**1. TITLE**" bold-wrapped headers, "### " markdown headers, "*"/"-"
  // bullets) — normalize all of them before the section/bullet/paragraph pass
  // below, so formatting doesn't depend on which variant came back this time.
  const rawAnalysis = (analysis as string)
    .replace(/^#{1,4}\s*(.+)$/gm, '$1')                 // strip markdown ### headers, keep text
    .replace(/^\*\*(\d+\.\s.+?)\*\*\s*$/gm, '$1')        // unwrap **1. Title** -> 1. Title
    .replace(/^\*\s+/gm, '- ');                          // normalize "* bullet" -> "- bullet"

  const formattedAnalysis = rawAnalysis
    .replace(/^(\d+\. .+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#1a0a00;margin:24px 0 8px;font-family:Arial,sans-serif;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.+)$/gm, '<li style="margin-bottom:6px;color:#444;line-height:1.65;font-size:13.5px;">$1</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m: string) => `<ul style="margin:0 0 14px;padding-left:20px;">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:0 0 12px;color:#444;line-height:1.75;font-size:13.5px;font-family:Arial,sans-serif;">')
    .replace(/^/, '<p style="margin:0 0 12px;color:#444;line-height:1.75;font-size:13.5px;font-family:Arial,sans-serif;">')
    .replace(/$/, '</p>')
    .replace(/<p[^>]*><\/p>/g, ''); // drop empty paragraphs left by consecutive headers

  // Group screenshots by season
  const seasons = ['Summer', 'Winter', 'Spring', 'Autumn'];
  const grouped = seasons.map(s => ({
    season: s,
    shots: (screenshots as any[]).filter(sc => sc.label.startsWith(s)),
  })).filter(g => g.shots.length > 0);

  // Every season now captures the same 3 times of day (9am / Noon / 3pm), so
  // each shot gets a large, consistent card — no more seasons with a single
  // screenshot stretching full-width next to seasons cramped into a 3-col row.
  const screenshotGrids = grouped.map((g, idx) => `
    <div style="margin-bottom:36px;${idx > 0 ? 'page-break-before:always;' : ''}">
      <h3 style="font-size:14px;font-weight:700;color:#1a0a00;margin-bottom:14px;text-transform:uppercase;letter-spacing:.08em;padding-bottom:8px;border-bottom:1px solid #f0ede8;">${g.season}</h3>
      <div style="display:flex;flex-direction:column;gap:18px;">
        ${g.shots.map((shot: any) => `
          <div class="shot-card" style="border:1px solid #e8e4de;border-radius:14px;overflow:hidden;page-break-inside:avoid;break-inside:avoid;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
            <div style="width:100%;aspect-ratio:16/9;overflow:hidden;background:#0A0C10;">
              <img src="data:image/jpeg;base64,${shot.base64}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="${shot.label}"/>
            </div>
            <div style="padding:10px 16px;background:#f8f5f0;display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:13px;font-weight:700;color:#e07b00;">${shot.label.split(' · ')[1] || shot.label}</div>
              <div style="font-size:10px;color:#bbb;text-transform:uppercase;letter-spacing:.06em;">${g.season}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const monthlyTable = summary?.monthlySummary ? `
    <h2 style="font-size:16px;font-weight:700;color:#1a0a00;margin:32px 0 14px;">Monthly Sunlight Data</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;margin-bottom:24px;page-break-inside:avoid;">
      <thead>
        <tr style="background:#fff8ee;">
          ${['Month','Sunrise','Sunset','Noon Elevation','Usable Sun','Peak Window',`Floor ${floor} Clearance`]
            .map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #e8e4de;color:#5A2800;font-weight:700;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${summary.monthlySummary.map((m: any, i: number) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#fbfaf7'};">
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;font-weight:700;">${m.month}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.sunrise}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.sunset}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.noonElevation}°</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.usableHours}h</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.peakWindow}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #f0ede8;">${m.floorClearance}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${summary.solarFeasibility ? `
    <div style="display:flex;gap:14px;margin-bottom:28px;flex-wrap:wrap;page-break-inside:avoid;">
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:12px 16px;flex:1;min-width:140px;">
        <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Overall Verdict</div>
        <div style="font-size:20px;font-weight:800;color:#e07b00;">${summary.solarFeasibility.verdict}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">${summary.solarFeasibility.avgUsableHours}h/day avg</div>
      </div>
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:12px 16px;flex:1;min-width:140px;">
        <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Best Months</div>
        <div style="font-size:13px;font-weight:700;color:#1a0a00;">${summary.solarFeasibility.bestMonths.join(', ')}</div>
      </div>
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:12px 16px;flex:1;min-width:140px;">
        <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Worst Months</div>
        <div style="font-size:13px;font-weight:700;color:#1a0a00;">${summary.solarFeasibility.worstMonths.join(', ')}</div>
      </div>
    </div>` : ''}
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>SunScout Report — ${address}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#fff;color:#1a0a00}
    @media print{
      .no-print{display:none!important}
      body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .page-break{page-break-before:always}
      img{max-width:100%;}
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:20px;right:20px;z-index:100;display:flex;gap:10px;">
    <button onclick="window.print()" style="background:#e07b00;color:#fff;border:none;border-radius:10px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer;">⬇ Save as PDF</button>
    <button onclick="window.close()" style="background:#f0ede8;color:#555;border:none;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer;">Close</button>
  </div>

  <div style="max-width:900px;margin:0 auto;padding:48px 32px;">

    <!-- Header -->
    <div style="border-bottom:2px solid #f0ede8;padding-bottom:24px;margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:16px;">☀️</span>
        <span style="font-size:12px;font-weight:700;color:#e07b00;text-transform:uppercase;letter-spacing:.12em;">SunScout</span>
        <span style="font-size:11px;color:#bbb;">Home Buyer Solar Report · Visual AI Analysis</span>
      </div>
      <h1 style="font-size:26px;font-weight:800;color:#1a0a00;margin-bottom:5px;">${address}</h1>
      <div style="font-size:11px;color:#aaa;">📍 ${parseFloat(lat).toFixed(5)}°N, ${parseFloat(lon).toFixed(5)}°E · ${date}</div>
    </div>

    <!-- Unit details -->
    <div style="display:flex;gap:14px;margin-bottom:32px;flex-wrap:wrap;">
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:14px 18px;flex:1;min-width:120px;">
        <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Floor</div>
        <div style="font-size:32px;font-weight:800;color:#e07b00;line-height:1;">${floor}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">≈${parseInt(floor)*3}m height</div>
      </div>
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:14px 18px;flex:1;min-width:120px;">
        <div style="font-size:9px;color:#bbb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Facing</div>
        <div style="font-size:32px;font-weight:800;color:#e07b00;line-height:1;">${facing}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">window orientation</div>
      </div>
      <div style="background:#fff8ee;border:1px solid #e8e4de;border-radius:12px;padding:14px 18px;flex:3;min-width:200px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:32px;">🤖</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#1a0a00;">Visual Shadow Analysis</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px;">12 real 3D map screenshots + precise solar-geometry data</div>
        </div>
      </div>
    </div>

    <!-- Deterministic monthly table — always accurate, independent of AI narrative -->
    ${monthlyTable}

    <!-- Screenshots -->
    <h2 style="font-size:16px;font-weight:700;color:#1a0a00;margin-bottom:20px;">3D Shadow Screenshots</h2>
    ${screenshotGrids}

    <div class="page-break"></div>

    <!-- AI Analysis -->
    <div style="background:#fff8ee;border:1.5px solid #e8e4de;border-radius:16px;padding:28px;margin-top:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
        <span style="font-size:18px;">🤖</span>
        <h2 style="font-size:15px;font-weight:700;color:#1a0a00;">AI Narrative Analysis · Floor ${floor}, ${facing}-facing</h2>
      </div>
      ${formattedAnalysis}
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #f0ede8;padding-top:18px;margin-top:36px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div style="font-size:10px;color:#ccc;">SunScout · sun-scout.com · Part of BlindSpot</div>
      <div style="font-size:10px;color:#ccc;">3D Map: OSMBuildings · AI: Google Gemini Vision · Solar geometry: NOAA algorithm</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return POST(new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      address: searchParams.get('address'),
      floor: searchParams.get('floor') || '5',
      facing: searchParams.get('facing') || 'South',
      screenshots: [],
      analysis: 'No analysis available — use POST endpoint with screenshots.',
      summary: null,
    }),
  }));
}