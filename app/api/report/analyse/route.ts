// app/api/report/analyse/route.ts
// Sends real map screenshots to Gemini Vision for shadow analysis, grounded
// in a deterministic solar-geometry summary so the AI narrates real numbers
// instead of estimating them from pixels. Also detects and auto-continues
// responses that get cut off by Gemini's own output-token limit.

import { NextRequest, NextResponse } from 'next/server';
import { computeSolarSummary } from '@/lib/solarReport';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(req: NextRequest) {
  const { screenshots, lat, lon, address, floor, facing, tzOffset } = await req.json();

  if (!screenshots || screenshots.length === 0) {
    return NextResponse.json({ analysis: 'No screenshots provided.' }, { status: 400 });
  }

  const latN = parseFloat(lat), lonN = parseFloat(lon), floorN = parseInt(floor);
  const tz = tzOffset ?? 330;

  let solarSummary: Awaited<ReturnType<typeof computeSolarSummary>> | null = null;
  let groundTruthText = '';
  try {
    solarSummary = await computeSolarSummary(latN, lonN, floorN, facing, tz);
    groundTruthText = `
GROUND TRUTH (computed from precise solar geometry — treat every number below as fact, do NOT re-derive or override it from the images):
${solarSummary.monthlySummary.map((m) =>
  `${m.month}: Rise ${m.sunrise}, Set ${m.sunset}, Noon elevation ${m.noonElevation}°, Usable sun ${m.usableHours}h, Peak ${m.peakWindow}, Floor ${floorN} ${facing}-facing gets sun ${m.floorClearance}`
).join('\n')}
Overall feasibility: ${solarSummary.solarFeasibility.verdict} (avg ${solarSummary.solarFeasibility.avgUsableHours}h/day usable)
Best months: ${solarSummary.solarFeasibility.bestMonths.join(', ')} · Worst months: ${solarSummary.solarFeasibility.worstMonths.join(', ')}
Note: floor clearance is an estimate based on typical urban obstruction heights, not a measurement of this property's actual neighboring buildings. "Peak Window" reflects sky-wide overhead sun timing, not this specific facing direction.`;
  } catch (err) {
    console.error('Failed to compute ground-truth solar summary:', err);
    groundTruthText = '\n(Ground-truth solar computation unavailable — rely more cautiously on visual inspection and say so explicitly.)';
  }

  const prompt = `You are a solar intelligence analyst helping a home buyer in India.

Property: ${address} (${latN.toFixed(4)}°N, ${lonN.toFixed(4)}°E)
Unit: Floor ${floorN} (≈${floorN * 3}m height), ${facing}-facing
${groundTruthText}

You also have ${screenshots.length} screenshots of the actual 3D map at this location. The orange circle/dot marks the exact property location; darker areas are rendered shadows from OpenStreetMap building data. Use these images ONLY for narrative color and visual confirmation (e.g. "as the images show, a taller block sits to the southeast") — do NOT estimate hours of sun, shadow duration, or building heights from the images; use the ground-truth numbers above for all figures. If a screenshot looks blank, black, or unreadable, say so explicitly rather than guessing what it would show.

Write concise, complete sections — do not run out of space. Keep each section tight (3-5 sentences or bullets) so the full response fits comfortably.

FORMATTING RULES (follow exactly, every time, regardless of location):
- Start each section heading on its own line as "1. TITLE" (plain text, no ** bold markers, no # markdown).
- Use plain "- " for bullet points, not "*".
- Do not use markdown bold (**) anywhere except to emphasize a single key figure inline.
- Always include all 4 numbered sections below, in order, even if a section is short for this location.

Provide:

1. SHADOW ANALYSIS BY SEASON & TIME
For each screenshot, briefly describe what you observe and connect it to the ground-truth numbers for that season.

2. FLOOR ${floorN} SPECIFIC ANALYSIS
Using the ground-truth floor clearance data: when does direct sunlight first reach this unit in summer vs winter, and roughly how many hours per day in best/worst months?

3. ${facing.toUpperCase()}-FACING WINDOW ASSESSMENT
When does the sun shine directly into a ${facing}-facing window here, and is this a good or bad facing for this specific location?

4. HOME BUYER VERDICT
3-4 honest sentences: is the sunlight situation good, acceptable, or poor? What floor would you recommend as a minimum? Any specific concerns visible in the shadow patterns?`;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { analysis: 'Server is missing GEMINI_API_KEY — cannot run AI shadow analysis.' },
      { status: 500 }
    );
  }

  try {
    const labelLine = screenshots
      .map((s: { label: string }, i: number) => `Image ${i + 1}: ${s.label}`)
      .join('\n');

    const imageParts = screenshots.map((s: { base64: string }) => {
      const match = s.base64.match(/^data:(image\/\w+);base64,(.+)$/);
      return {
        inlineData: {
          mimeType: match ? match[1] : 'image/jpeg',
          data: match ? match[2] : s.base64,
        },
      };
    });

    const contents = [{ role: 'user', parts: [{ text: `${prompt}\n\nImage order:\n${labelLine}` }, ...imageParts] }];

    async function callGemini(msgContents: any[]) {
      const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: msgContents,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Gemini Vision request failed:', res.status, errText);
        return null;
      }
      return res.json();
    }

    let data = await callGemini(contents);
    if (!data) {
      return NextResponse.json(
        { analysis: 'AI analysis request failed. Please try again in a moment.', summary: solarSummary },
        { status: 502 }
      );
    }

    let candidate = data?.candidates?.[0];
    let analysis = candidate?.content?.parts?.[0]?.text || '';
    let finishReason = candidate?.finishReason;

    // If Gemini ran out of output tokens mid-response, ask it to continue from
    // exactly where it stopped, rather than shipping a report that dead-ends
    // mid-sentence. Cap at 2 continuations so a pathological loop can't run forever.
    let continuations = 0;
    while (finishReason === 'MAX_TOKENS' && continuations < 2) {
      continuations++;
      console.warn(`Gemini hit MAX_TOKENS, requesting continuation #${continuations}`);
      const followUpContents = [
        ...contents,
        { role: 'model', parts: [{ text: analysis }] },
        { role: 'user', parts: [{ text: 'Continue exactly where you left off, mid-sentence if needed. Do not repeat anything you already wrote, and do not restart the section headers.' }] },
      ];
      const contData = await callGemini(followUpContents);
      if (!contData) break;
      const contCandidate = contData?.candidates?.[0];
      const contText = contCandidate?.content?.parts?.[0]?.text || '';
      if (!contText) break;
      analysis += '\n' + contText;
      finishReason = contCandidate?.finishReason;
      candidate = contCandidate;
    }

    if (!analysis || analysis.trim().length < 100) {
      console.error(
        'Gemini analysis came back empty/short. finishReason:', finishReason,
        'full response:', JSON.stringify(data).slice(0, 2000)
      );
      return NextResponse.json(
        {
          analysis: `AI analysis was incomplete (reason: ${finishReason || 'unknown'}). The data table above is still accurate — try regenerating the report for the full write-up.`,
          summary: solarSummary,
        },
        { status: 200 }
      );
    }

    if (finishReason === 'MAX_TOKENS') {
      console.warn('Analysis still truncated after continuations, shipping partial text with a note.');
      analysis += '\n\n*(Note: this analysis was cut short by a length limit — the data table above remains fully accurate.)*';
    }

    return NextResponse.json({ analysis, summary: solarSummary });
  } catch (err: any) {
    console.error('Gemini Vision error:', err);
    return NextResponse.json(
      { analysis: 'Could not reach Gemini Vision. Please try again in a moment.', summary: solarSummary },
      { status: 502 }
    );
  }
}