// app/api/tile-proxy/route.ts
// Proxies map tiles through our own origin so the iframe canvas never touches
// a genuinely cross-origin image — avoids the tainted-canvas SecurityError
// that was silently killing screenshot capture.
//
// tile-a.openstreetmap.fr is a small, volunteer-run community server — it
// works, but its own admins have logged intermittent 502s. That's the real
// source of "map glitches, doesn't load fully": occasional individual tile
// requests failing outright, leaving grey/missing squares. (tile-a/b/c are
// confirmed to be the exact same backend, so round-robining between them, as
// a previous version of this file did, gives zero real benefit.) Fixed here
// with a short retry against the same host, then a fallback to a different,
// more heavily-provisioned provider (CARTO) so a hiccup never leaves a
// permanent hole in the map.

import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = [
  'tile-a.openstreetmap.fr',
  'server.arcgisonline.com',
  'basemaps.cartocdn.com',
];

async function tryFetch(url: string, attempts = 2): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) return res;
    } catch {
      // network error / timeout — fall through to retry or fallback below
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return new Response('missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('invalid url', { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 });
  }

  let res = await tryFetch(url);

  // Primary tile server hiccuped even after retrying — fall back to CARTO's
  // basemap tiles (different visual style, but keeps the map fully covered
  // instead of showing a grey gap) when we can derive a {z}/{x}/{y} tile.
  if (!res && parsed.hostname === 'tile-a.openstreetmap.fr') {
    const m = parsed.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (m) {
      const [, z, x, y] = m;
      const fallbackUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
      res = await tryFetch(fallbackUrl, 1);
    }
  }

  if (!res) return new Response('upstream error', { status: 502 });

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
