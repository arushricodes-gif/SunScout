// app/api/report/store/route.ts
// Persists a shareable, stable public URL for a report — separate from the
// in-browser blob URL that only exists in the tab that generated it. Uses
// Vercel Blob because this app already deploys on Vercel and Blob needs no
// schema/DB setup: once a Blob store is linked to the project,
// BLOB_READ_WRITE_TOKEN is injected automatically.
//
// Security note: this endpoint does NOT accept raw HTML from the caller.
// Earlier versions did, which meant anyone could POST arbitrary HTML here
// and have it published publicly under this project's own storage --
// usable for phishing or hosting unrelated content under a trusted-looking
// URL, no report involved at all. Instead, this takes the same structured
// inputs /api/report/pdf takes, and builds the HTML itself by calling that
// route's own (already-escaping) builder -- so only a real, safely-escaped
// SunScout report can ever end up stored here, regardless of what a caller
// sends.

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { POST as buildReportPdf } from '../pdf/route';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address } = body;

  // Build the report HTML the same trusted, escaped way /api/report/pdf
  // does -- by actually calling that route, not by trusting anything the
  // caller claims is pre-built HTML.
  const pdfRes = await buildReportPdf(new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  if (!pdfRes.ok) {
    return NextResponse.json({ error: 'Could not build the report to share.' }, { status: 502 });
  }
  const html = await pdfRes.text();

  // This is the #1 reason share-link creation fails: no Blob store has been
  // created/linked in the Vercel project yet (Storage tab → Create → Blob).
  // Surface that plainly instead of letting it fall through to a generic
  // "something went wrong" — this is a one-time setup step, not a bug.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is not set — no Vercel Blob store linked to this project.');
    return NextResponse.json(
      { error: 'Shareable links need a Vercel Blob store connected to this project. In the Vercel dashboard: Storage tab → Create Database → Blob, then link it to this project and redeploy.' },
      { status: 501 }
    );
  }

  // Cheap ID: timestamp + random suffix. Not guessable enough to rely on for
  // anything sensitive, but these reports are meant to be shared anyway.
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = (address || 'report').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

  try {
    const blob = await put(`reports/${slug}-${id}.html`, html, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: false,
    });
    return NextResponse.json({ id, url: blob.url });
  } catch (err: any) {
    console.error('Failed to store shareable report:', err);
    return NextResponse.json(
      { error: err?.message || 'Could not create a shareable link right now. The downloaded/opened report still works.' },
      { status: 502 }
    );
  }
}
