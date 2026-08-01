import { createClient as createSupabaseClient, type Session } from '@supabase/supabase-js';

// Same Supabase project as BlindSpot -- this is what makes "one login"
// possible: both apps talk to the same auth users and the same `reports`
// table, they just each keep their own local session (browsers don't
// share storage across domains, so each app needs its own copy).
//
// Kept as a singleton (created once, reused) rather than a fresh client
// per call -- calling setSession() on one client instance and then
// immediately checking the session on a *different* freshly-created
// instance can race, since a brand-new client hasn't finished loading
// from storage yet even though the write already landed.
let _client: ReturnType<typeof createSupabaseClient> | null = null;
export function getBlindSpotClient() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export async function getBlindSpotSession(): Promise<Session | null> {
  const supabase = getBlindSpotClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export interface PendingSunScoutReport {
  address: string;
  lat: number;
  lon: number;
  floor: string;
  facing: string;
  summary: any; // structured monthly-summary/feasibility object, not plain text
  analysis: string;
  reportLabel?: string;
}

const PENDING_SAVE_KEY = 'blindspot_pending_save';

// Actually writes a report into the shared `reports` table. Requires an
// active session -- call getBlindSpotSession() first and redirect to
// BlindSpot's login if there isn't one (see redirectToBlindSpotLogin).
export async function saveReportToBlindSpot(report: PendingSunScoutReport) {
  const supabase = getBlindSpotClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in to BlindSpot');

  const { error } = await supabase.from('reports').insert({
    user_id: session.user.id,
    source: 'sunscout',
    title: report.reportLabel || report.address,
    data: {
      address: report.address,
      lat: report.lat,
      lon: report.lon,
      floor: report.floor,
      facing: report.facing,
      summary: report.summary,
      analysis: report.analysis,
      generatedAt: new Date().toISOString(),
    },
  } as any);
  if (error) throw error;
}

// Stashes the report the person was trying to save (sessionStorage
// survives the round trip to BlindSpot and back), then sends them to
// BlindSpot's login with instructions to return to our callback page,
// which finishes the save once they're signed in.
export function redirectToBlindSpotLogin(report: PendingSunScoutReport) {
  sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(report));
  const returnTo = `${window.location.origin}/blindspot-callback`;
  const blindspotLogin = `https://blindspotco.net/login?next=${encodeURIComponent(returnTo)}`;
  window.location.href = blindspotLogin;
}

export function getPendingSave(): PendingSunScoutReport | null {
  const raw = sessionStorage.getItem(PENDING_SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearPendingSave() {
  sessionStorage.removeItem(PENDING_SAVE_KEY);
}
