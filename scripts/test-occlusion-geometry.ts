// scripts/test-occlusion-geometry.ts
// Validates lib/occlusion.ts's ray-cast math AND the scoring layers built on
// it, by mocking global fetch instead of hitting the real Overpass API (this
// sandbox's network allowlist doesn't include overpass-api.de). On a real
// dev machine, scripts/test-live-score.ts exercises the real APIs instead.
//
// Run with: npx tsx scripts/test-occlusion-geometry.ts

const OBS_LAT = 12.9716;
const OBS_LON = 77.5946;

const metersToLatDeg = (m: number) => m / 111320;
const metersToLonDeg = (m: number, atLat: number) => m / (111320 * Math.cos((atLat * Math.PI) / 180));

function buildSyntheticBuildingResponse() {
  const centerLat = OBS_LAT - metersToLatDeg(20); // 20m south of observer
  const centerLon = OBS_LON;
  const halfSize = 8; // 16m x 16m footprint
  const corners = [
    { lat: centerLat - metersToLatDeg(halfSize), lon: centerLon - metersToLonDeg(halfSize, OBS_LAT) },
    { lat: centerLat - metersToLatDeg(halfSize), lon: centerLon + metersToLonDeg(halfSize, OBS_LAT) },
    { lat: centerLat + metersToLatDeg(halfSize), lon: centerLon + metersToLonDeg(halfSize, OBS_LAT) },
    { lat: centerLat + metersToLatDeg(halfSize), lon: centerLon - metersToLonDeg(halfSize, OBS_LAT) },
  ];
  const ring = [...corners, corners[0]];
  return { elements: [{ type: 'way', tags: { building: 'yes', height: '30' }, geometry: ring }] };
}

const originalFetch = global.fetch;

function mockFetchReturning(response: any) {
  (global as any).fetch = async (url: string, opts?: any) => {
    if (typeof url === 'string' && url.includes('overpass-api.de')) {
      return { ok: true, json: async () => response } as any;
    }
    return originalFetch(url as any, opts);
  };
}

async function testGeometry() {
  console.log('=== TEST 1: ray-cast geometry (30m building 20m due south) ===');
  mockFetchReturning(buildSyntheticBuildingResponse());
  const { computeOcclusionProfile } = await import('../lib/occlusion');

  const profile = await computeOcclusionProfile(OBS_LAT, OBS_LON, 0);
  if (!profile) { console.error('FAIL: profile was null.'); process.exit(1); }

  const southSample = profile.samples.reduce((a, b) => Math.abs(a.azimuth - 180) < Math.abs(b.azimuth - 180) ? a : b);
  const northSample = profile.samples.reduce((a, b) => Math.abs(a.azimuth - 0) < Math.abs(b.azimuth - 0) ? a : b);

  console.log(`South ray: distM=${southSample.distM?.toFixed(1)}, blockAngle=${southSample.blockAngleDeg.toFixed(1)}°`);
  console.log(`North ray: distM=${northSample.distM}, blockAngle=${northSample.blockAngleDeg.toFixed(1)}°`);

  const southOk = southSample.distM !== null && southSample.distM < 20 && southSample.blockAngleDeg > 30;
  const northOk = northSample.distM === null && northSample.blockAngleDeg === 0;
  console.log(`South correctly blocked: ${southOk ? 'PASS' : 'FAIL'}, North correctly open: ${northOk ? 'PASS' : 'FAIL'}`);
  if (!southOk || !northOk) { console.error('GEOMETRY TEST FAILED'); process.exit(1); }
  console.log('GEOMETRY TEST PASSED.\n');
  return profile;
}

async function testScoringWithData(profile: any) {
  console.log('=== TEST 2: scoring sanity (real building data present) ===');
  const { computeViewScore } = await import('../lib/scoring/viewScore');
  const { computePrivacyScore } = await import('../lib/scoring/privacyScore');
  const { computeWindScore } = await import('../lib/scoring/windScore');

  const view = computeViewScore(profile, 'South', 0);
  const viewNorth = computeViewScore(profile, 'North', 0);
  const privacy = computePrivacyScore(profile, 'South', 0);
  const wind = computeWindScore({ avgSpeedKmh: 15, currentSpeedKmh: 15 }, profile, 0);

  console.log(`View (facing South, toward building): ${view.score} — ${view.summary}`);
  console.log(`View (facing North, away):             ${viewNorth.score} — ${viewNorth.summary}`);
  console.log(`Privacy (South, 12m/30m building):      ${privacy.score} — ${privacy.summary}`);
  console.log(`Wind:                                    ${wind.score} — ${wind.summary}`);

  const directionalityOk = view.score < viewNorth.score;
  const privacyLowOk = privacy.score < 60;
  console.log(`\nDirectionality sane: ${directionalityOk ? 'PASS' : 'FAIL'}`);
  console.log(`Privacy penalized by close tall building: ${privacyLowOk ? 'PASS' : 'FAIL'}`);
  if (!directionalityOk || !privacyLowOk) { console.error('SCORING SANITY CHECK FAILED'); process.exit(1); }
  console.log('SCORING SANITY CHECK PASSED.\n');
}

async function testFallbackPriors() {
  console.log('=== TEST 3: floor-based fallback priors (no building data at all) ===');
  mockFetchReturning({ elements: [] });
  const { computeOcclusionProfile } = await import('../lib/occlusion');
  const { computeViewScore } = await import('../lib/scoring/viewScore');
  const { computePrivacyScore } = await import('../lib/scoring/privacyScore');

  const groundProfile = await computeOcclusionProfile(OBS_LAT, OBS_LON, 0);
  const highProfile = await computeOcclusionProfile(OBS_LAT, OBS_LON, 15);

  const groundView = computeViewScore(groundProfile, 'South', 0);
  const highView = computeViewScore(highProfile, 'South', 15);
  const groundPrivacy = computePrivacyScore(groundProfile, 'South', 0);
  const highPrivacy = computePrivacyScore(highProfile, 'South', 15);

  console.log(`Ground floor (0)  View: ${groundView.score} — ${groundView.summary}`);
  console.log(`15th floor        View: ${highView.score} — ${highView.summary}`);
  console.log(`Ground floor (0)  Privacy: ${groundPrivacy.score}`);
  console.log(`15th floor        Privacy: ${highPrivacy.score}`);

  const bugFixed = groundView.score < 40 && highView.score > groundView.score;
  console.log(`\nGround floor no longer defaults to flat neutral 50: ${bugFixed ? 'PASS' : 'FAIL'}`);
  if (!bugFixed) { console.error('FALLBACK PRIOR TEST FAILED'); process.exit(1); }
  console.log('FALLBACK PRIOR TEST PASSED.');
}

async function main() {
  const profile = await testGeometry();
  await testScoringWithData(profile);
  await testFallbackPriors();
  console.log('\nALL TESTS PASSED.');
}

main().catch(err => { console.error('Test errored:', err); process.exit(1); });
