// app/api/report/store/route.ts
// Persists an already-built report HTML string (from /api/report/pdf) so it
// has a stable, shareable public URL — separate from the in-browser blob URL
// that only exists in the tab that generated it. Uses Vercel Blob because
// this app already deploys on Vercel and Blob needs no schema/DB setup:
// once a Blob store is linked to the project, BLOB_READ_WRITE_TOKEN is
// injected automatically.

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const { html, address } = await req.json();

  if (!html || typeof html !== 'string') {
    return NextResponse.json({ error: 'Missing report HTML' }, { status: 400 });
  }

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