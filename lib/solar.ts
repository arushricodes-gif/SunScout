// lib/solar.ts
// NOAA solar position algorithm — accurate to within ~1 minute for sunrise/sunset.
// All times are handled in UTC internally; local display uses tzOffsetMinutes.

export interface SolarPos {
  sunLat: number; sunLon: number;
  shadowLat: number; shadowLon: number;
  azimuth: number; elevation: number;
}

export interface PathPoint {
  lat: number; lon: number;
  shlat: number; shlon: number;
  time: string; el: number; az: number; iso: string;
}

export interface SunTimes {
  rise: string; set: string; noon: string;
  riseDate: Date; setDate: Date; noonDate: Date;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ── Core NOAA algorithm ───────────────────────────────────────────────────────

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Julian centuries since J2000.0 */
function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

function geomMeanLongSun(t: number): number {         // degrees
  return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
}

function geomMeanAnomalySun(t: number): number {      // degrees
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function eccentricityEarthOrbit(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

function sunEqOfCenter(t: number): number {           // degrees
  const m = geomMeanAnomalySun(t) * DEG2RAD;
  return Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
       + Math.sin(2 * m) * (0.019993 - 0.000101 * t)
       + Math.sin(3 * m) * 0.000289;
}

function sunTrueLong(t: number): number {             // degrees
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}

function sunApparentLong(t: number): number {         // degrees
  const o = sunTrueLong(t) - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * DEG2RAD);
  return o;
}

function meanObliquityOfEcliptic(t: number): number { // degrees
  return 23.0 + (26.0 + (21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))) / 60) / 60;
}

function obliquityCorrection(t: number): number {     // degrees
  return meanObliquityOfEcliptic(t) + 0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG2RAD);
}

function sunDeclination(t: number): number {          // degrees
  return RAD2DEG * Math.asin(Math.sin(obliquityCorrection(t) * DEG2RAD) * Math.sin(sunApparentLong(t) * DEG2RAD));
}

function equationOfTime(t: number): number {          // minutes
  const eps = obliquityCorrection(t) * DEG2RAD;
  const l0  = geomMeanLongSun(t) * DEG2RAD;
  const e   = eccentricityEarthOrbit(t);
  const m   = geomMeanAnomalySun(t) * DEG2RAD;
  const y   = Math.tan(eps / 2) ** 2;
  const eot = y * Math.sin(2 * l0)
            - 2 * e * Math.sin(m)
            + 4 * e * y * Math.sin(m) * Math.cos(2 * l0)
            - 0.5 * y * y * Math.sin(4 * l0)
            - 1.25 * e * e * Math.sin(2 * m);
  return RAD2DEG * eot * 4; // minutes
}

/** True solar noon in minutes past UTC midnight for a given date and longitude */
function solarNoonUTCMinutes(jd: number, lonDeg: number): number {
  const t   = julianCentury(jd);
  const eot = equationOfTime(t);
  return 720 - 4 * lonDeg - eot; // minutes past UTC midnight
}

/** Hour angle at sunrise (positive) / sunset (negative) in degrees */
function hourAngleAtHorizon(latDeg: number, declDeg: number): number | null {
  const latR  = latDeg  * DEG2RAD;
  const declR = declDeg * DEG2RAD;
  const cosHA = (Math.cos(90.833 * DEG2RAD) / (Math.cos(latR) * Math.cos(declR))) - Math.tan(latR) * Math.tan(declR);
  if (cosHA < -1 || cosHA > 1) return null; // polar day/night
  return RAD2DEG * Math.acos(cosHA);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Solar elevation (degrees above horizon) for a UTC Date at lat/lon */
export function computeSolarElevation(lat: number, lon: number, date: Date): number {
  const jd   = julianDay(date);
  const t    = julianCentury(jd);
  const eot  = equationOfTime(t);
  const decl = sunDeclination(t) * DEG2RAD;
  const latR = lat * DEG2RAD;

  // True solar time in minutes
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const tst    = utcMin + eot + 4 * lon; // minutes
  const ha     = (tst / 4 - 180) * DEG2RAD; // hour angle in radians

  const sinAlt = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  return RAD2DEG * Math.asin(Math.max(-1, Math.min(1, sinAlt)));
}

/** Solar azimuth (compass degrees, 0=N, 90=E) for a UTC Date at lat/lon */
export function computeSolarAzimuth(lat: number, lon: number, date: Date): number {
  const jd   = julianDay(date);
  const t    = julianCentury(jd);
  const eot  = equationOfTime(t);
  const decl = sunDeclination(t) * DEG2RAD;
  const latR = lat * DEG2RAD;

  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const tst    = utcMin + eot + 4 * lon;
  const ha     = (tst / 4 - 180) * DEG2RAD;

  const sinAlt = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  const el     = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz = (Math.sin(decl) - Math.sin(latR) * Math.sin(el)) / (Math.cos(latR) * Math.cos(el));
  let az = RAD2DEG * Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 360 - az;
  return az;
}

/**
 * Compute sunrise, solar noon, and sunset for a given LOCAL calendar date (YYYY-MM-DD)
 * and timezone offset (minutes east of UTC).
 *
 * Uses the NOAA analytical formula — same approach as the original Python `astral` library.
 */
export function getSunTimes(lat: number, lon: number, dateStr: string, tzOffsetMinutes: number): SunTimes {
  const [y, mo, d] = dateStr.split('-').map(Number);
  // Local midnight expressed as UTC milliseconds
  const localMidMs = Date.UTC(y, mo - 1, d, 0, 0, 0) - tzOffsetMinutes * 60000;

  const bsearch = (loH: number, hiH: number, rising: boolean): Date => {
    let lo = new Date(localMidMs + loH * 3600000);
    let hi = new Date(localMidMs + hiH * 3600000);
    for (let i = 0; i < 64; i++) {
      const mid = new Date((lo.getTime() + hi.getTime()) / 2);
      (computeSolarElevation(lat, lon, mid) < -0.833) === rising ? lo = mid : hi = mid;
    }
    return new Date((lo.getTime() + hi.getTime()) / 2);
  };

  const riseDate = bsearch(0, 14, true);   // sunrise between 02:00–11:00 local
  const setDate  = bsearch(10, 24, false); // sunset  between 13:00–23:00 local

  // Solar noon: ternary search for max elevation 09:00–16:00 local
  let lo = new Date(localMidMs + 9  * 3600000);
  let hi = new Date(localMidMs + 16 * 3600000);
  for (let i = 0; i < 64; i++) {
    const m1 = new Date(lo.getTime() + (hi.getTime() - lo.getTime()) / 3);
    const m2 = new Date(lo.getTime() + (hi.getTime() - lo.getTime()) * 2 / 3);
    if (computeSolarElevation(lat, lon, m1) < computeSolarElevation(lat, lon, m2)) lo = m1; else hi = m2;
  }
  const noonDate = new Date((lo.getTime() + hi.getTime()) / 2);

  const fmt = (dt: Date): string => {
    const local = new Date(dt.getTime() + tzOffsetMinutes * 60000);
    return `${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
  };

  return { rise: fmt(riseDate), set: fmt(setDate), noon: fmt(noonDate), riseDate, setDate, noonDate };
}
/** Sun position as a map lat/lon (for visualisation) */
export function getSolarPos(lat: number, lon: number, radiusMeters: number, date: Date): SolarPos {
  const az = computeSolarAzimuth(lat, lon, date);
  const el = computeSolarElevation(lat, lon, date);

  const sc     = Math.cos(Math.max(0, el) * DEG2RAD);
  const cosLat = Math.cos(lat * DEG2RAD);

  const sunLat    = lat + (radiusMeters * sc / 111111) * Math.cos(az * DEG2RAD);
  const sunLon    = lon + (radiusMeters * sc / (111111 * cosLat)) * Math.sin(az * DEG2RAD);
  const shadowLat = lat + (radiusMeters * 0.7 / 111111) * Math.cos((az + 180) * DEG2RAD);
  const shadowLon = lon + (radiusMeters * 0.7 / (111111 * cosLat)) * Math.sin((az + 180) * DEG2RAD);

  return { sunLat, sunLon, shadowLat, shadowLon, azimuth: az, elevation: el };
}

/** Build path data at 10-minute intervals from sunrise to sunset */
export function buildPathData(
  lat: number, lon: number, radiusMeters: number,
  riseDate: Date, setDate: Date, tzOffsetMinutes: number
): PathPoint[] {
  const pts: PathPoint[] = [];
  // Start 30 min before rise, end 30 min after set, to capture the transition
  let curr = new Date(riseDate.getTime() - 30 * 60000);
  const end = new Date(setDate.getTime() + 30 * 60000);
  while (curr <= end) {
    const pos  = getSolarPos(lat, lon, radiusMeters, curr);
    const local = new Date(curr.getTime() + tzOffsetMinutes * 60000);
    const timeStr = `${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
    pts.push({
      lat: pos.sunLat, lon: pos.sunLon,
      shlat: pos.shadowLat, shlon: pos.shadowLon,
      time: timeStr,
      el: Math.round(pos.elevation * 100) / 100,
      az: Math.round(pos.azimuth * 100) / 100,
      iso: curr.toISOString(),
    });
    curr = new Date(curr.getTime() + 10 * 60000);
  }
  return pts;
}

/** Edge point on radius circle at a given azimuth */
export function getEdge(lat: number, lon: number, azDeg: number, radiusMeters: number): [number, number] {
  const rad = azDeg * DEG2RAD;
  return [
    lat + (radiusMeters / 111111) * Math.cos(rad),
    lon + (radiusMeters / (111111 * Math.cos(lat * DEG2RAD))) * Math.sin(rad),
  ];
}

/** Estimated solar radiation W/m² */
export function calculateSolarRadiation(elevationDeg: number): number {
  if (elevationDeg <= 0) return 0;
  const elRad = elevationDeg * DEG2RAD;
  const airMass = 1 / (Math.sin(elRad) + 0.001);
  const transmission = Math.pow(0.7, Math.pow(airMass, 0.678));
  return Math.round(1367 * Math.sin(elRad) * transmission * 100) / 100;
}
