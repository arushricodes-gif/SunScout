// lib/networkFix.ts
// Node's built-in fetch (undici) can fail with a bare "fetch failed" against
// some hosts when it tries IPv6 first and the network path doesn't route it
// properly — even when curl (IPv4-first by default) succeeds against the
// exact same host from the same machine. Forcing IPv4-first DNS resolution
// is the standard fix. Import this (for its side effect) before any fetch()
// call to an external API that might hit this — windScore.ts's Open-Meteo
// call does.
import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Not available on very old Node versions — harmless no-op there.
}
