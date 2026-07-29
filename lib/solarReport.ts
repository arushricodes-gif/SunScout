// lib/solarReport.ts
// Shared deterministic solar computation, extracted from app/api/report/route.ts
// so both the numeric report and the vision-analysis report use the same ground truth.
//
// IMPORTANT: this used to build its monthly/seasonal grid by making ~160
// sequential HTTP requests back to this app's own /api/solar route (one per
// time slot). On a serverless deployment that self-fetch is slow and its
// reliability varies with load/cold-starts/network conditions — which is
// exactly why the AI report sometimes came back with full ground-truth data
// and sometimes fell back to "computation unavailable" depending on the
// location/request, even though nothing about the math itself was
// location-dependent. All of /api/solar's logic is pure, synchronous math
// (see lib/solar.ts), so we call it directly here instead — same numbers,
// no network round trip, and identical reliability for every location.

import { getSunTimes, buildPathData, getSolarPos } from './solar';
import type { BuildingHeightNote } from './buildingHeights';

export const MONTHS = [
    { name: 'January',   date: '2025-01-15' },
    { name: 'February',  date: '2025-02-15' },
    { name: 'March',     date: '2025-03-15' },
    { name: 'April',     date: '2025-04-15' },
    { name: 'May',       date: '2025-05-15' },
    { name: 'June',      date: '2025-06-21' },
    { name: 'July',      date: '2025-07-15' },
    { name: 'August',    date: '2025-08-15' },
    { name: 'September', date: '2025-09-15' },
    { name: 'October',   date: '2025-10-15' },
    { name: 'November',  date: '2025-11-15' },
    { name: 'December',  date: '2025-12-21' },
  ];
  
  const SEASONAL_SLOTS = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00'];
  const REPORT_RADIUS_M = 250; // matches app/api/solar/route.ts

  /** Convert a local date+time+tzOffset into the UTC instant lib/solar.ts expects. */
  function simDateFor(dateStr: string, time: string, tzOffsetMinutes: number): Date {
    const [hh, mm] = time.split(':').map(Number);
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, mo - 1, d, hh, mm, 0) - tzOffsetMinutes * 60000);
  }

  /** Sun azimuth/elevation at one specific local date+time — mirrors /api/solar's simPos. */
  function computeSimPos(lat: number, lon: number, dateStr: string, time: string, tzOffsetMinutes: number) {
    return getSolarPos(lat, lon, REPORT_RADIUS_M, simDateFor(dateStr, time, tzOffsetMinutes));
  }

  /** Sunrise/sunset/noon + full sun-path for one local date — mirrors /api/solar's sunTimes+pathData. */
  function computeDayData(lat: number, lon: number, dateStr: string, tzOffsetMinutes: number) {
    const sunTimes = getSunTimes(lat, lon, dateStr, tzOffsetMinutes);
    const pathData = buildPathData(lat, lon, REPORT_RADIUS_M, sunTimes.riseDate, sunTimes.setDate, tzOffsetMinutes);
    return { sunTimes, pathData };
  }
  
  function shadowLength(elevation: number, objectHeight = 10): number {
    if (elevation <= 0) return 999;
    return Math.round(objectHeight / Math.tan(elevation * Math.PI / 180));
  }
  
  export function compassDir(azimuth: number): string {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(azimuth / 45) % 8];
  }
  const FACING_ANGLE: Record<string, number> = {
    'North': 0, 'North-East': 45, 'East': 90, 'South-East': 135,
    'South': 180, 'South-West': 225, 'West': 270, 'North-West': 315,
  };
  
  function clearanceElevationFor(floor: number): number {
    const floorHeight = floor * 3;
    if (floorHeight < 9)  return Math.atan2(9 - floorHeight, 8)   * 180 / Math.PI;
    if (floorHeight < 24) return Math.max(0, Math.atan2(20 - floorHeight, 15) * 180 / Math.PI);
    if (floorHeight < 45) return Math.max(0, Math.atan2(40 - floorHeight, 25) * 180 / Math.PI);
    return 0;
  }
  
  function isVisibleToUnit(p: { el: number; az: number }, clearanceEl: number, targetAz: number): boolean {
    if (p.el <= 0 || p.el < clearanceEl) return false;
    let diff = Math.abs(p.az - targetAz);
    if (diff > 180) diff = 360 - diff;
    return diff <= 90;
  }
  
  function usableHoursForUnit(
    pathData: { el: number; az: number; iso: string }[],
    floor: number,
    facing: string
  ): number {
    if (pathData.length < 2) return 0;
    const clearanceEl = clearanceElevationFor(floor);
    const targetAz = FACING_ANGLE[facing] ?? 180;
  
    let totalMs = 0;
    for (let i = 0; i < pathData.length - 1; i++) {
      const gapMs = new Date(pathData[i + 1].iso).getTime() - new Date(pathData[i].iso).getTime();
      if (isVisibleToUnit(pathData[i], clearanceEl, targetAz)) totalMs += gapMs;
    }
    return Math.round((totalMs / 3600000) * 10) / 10;
  }
  
  function peakWindow(pathData: {el: number, time: string}[]): string {
    const high = pathData.filter(p => p.el > 35);
    if (!high.length) return 'no overhead sun';
    return `${high[0].time}–${high[high.length-1].time}`;
  }
  
  /**
   * IMPORTANT CAVEAT: this estimates neighboring-building clearance using fixed
   * assumed obstruction heights (9m/20m/40m at fixed offsets) rather than real
   * building footprints — it is a generic urban-density heuristic, not a
   * measurement of the actual buildings near this specific property. Treat its
   * output as an estimate, and say so in any report that surfaces it. A real
   * fix requires fetching building footprint/height data (e.g. via Overpass)
   * and doing an actual ray-cast — flag to the user if they want that built.
   */
  function floorClearanceTime(pathData: {el: number, az: number, time: string}[], floor: number, facing: string): string {
    const floorHeight = floor * 3;
  
    let clearanceElevation = 0;
    if (floorHeight < 9) {
      clearanceElevation = Math.atan2(9 - floorHeight, 8) * 180 / Math.PI;
    } else if (floorHeight < 24) {
      clearanceElevation = Math.max(0, Math.atan2(20 - floorHeight, 15) * 180 / Math.PI);
    } else if (floorHeight < 45) {
      clearanceElevation = Math.max(0, Math.atan2(40 - floorHeight, 25) * 180 / Math.PI);
    } else {
      clearanceElevation = 0;
    }
  
    const facingAngle: Record<string, number> = {
      'North': 0, 'North-East': 45, 'East': 90, 'South-East': 135,
      'South': 180, 'South-West': 225, 'West': 270, 'North-West': 315,
    };
    const targetAz = facingAngle[facing] ?? 180;
  
    const validPoints = pathData.filter(p => {
      if (p.el <= 0) return false;
      let diff = Math.abs(p.az - targetAz);
      if (diff > 180) diff = 360 - diff;
      return diff <= 90 && p.el >= clearanceElevation;
    });
  
    if (!validPoints.length) return 'no direct sun this side';
    if (clearanceElevation <= 0) return `from ~${validPoints[0].time} (clear sightline)`;
    return `from ~${validPoints[0].time} (clears ${Math.round(clearanceElevation)}° obstruction — estimated, not measured)`;
  }
  
  export interface MonthlySummary {
    month: string; sunrise: string; sunset: string;
    noonElevation: number; noonAzimuth: number;
    usableHours: number; peakWindow: string; floorClearance: string;
  }
  
  export interface SeasonalSlot {
    time: string; elevation: number; azimuth: number; direction: string;
    inSun: boolean; shadowLength: number;
  }
  
  export interface SolarSummary {
    monthlySummary: MonthlySummary[];
    seasonalDetail: { season: string; slots: SeasonalSlot[] }[];
    solarFeasibility: {
      verdict: string; avgUsableHours: number;
      bestMonths: string[]; worstMonths: string[];
    };
    // Attached by app/api/report/analyse/route.ts after computeSolarSummary
    // returns — not set by this file itself. Optional/nullable because the
    // Overpass check fails soft.
    buildingHeightNote?: BuildingHeightNote | null;
  }
  
  export async function computeSolarSummary(
    lat: number, lon: number, floor: number, facing: string, tzOffset: number
  ): Promise<SolarSummary> {
    const monthlyRaw = MONTHS.map(m => {
      const { sunTimes, pathData } = computeDayData(lat, lon, m.date, tzOffset);
      const noonPos = computeSimPos(lat, lon, m.date, '12:00', tzOffset);
      return {
        sunTimes: { rise: sunTimes.rise, set: sunTimes.set, noon: sunTimes.noon },
        pathData,
        simPos: { elevation: noonPos.elevation, azimuth: noonPos.azimuth },
      };
    });
  
    const seasons = [
      { name: 'Summer Solstice',  date: '2025-06-21' },
      { name: 'Winter Solstice',  date: '2025-12-21' },
      { name: 'Spring Equinox',   date: '2025-03-20' },
      { name: 'Autumn Equinox',   date: '2025-09-23' },
    ];
  
    const seasonalDetail = seasons.map(s => {
      const slots = SEASONAL_SLOTS.map(t => computeSimPos(lat, lon, s.date, t, tzOffset));
      return { season: s.name, slots: slots.map((d, i) => ({
        time: SEASONAL_SLOTS[i],
        elevation: Math.round(d.elevation || 0),
        azimuth: Math.round(d.azimuth || 0),
        direction: compassDir(d.azimuth || 0),
        inSun: (d.elevation || 0) > 0,
        shadowLength: shadowLength(d.elevation || 0),
      }))};
    });
  
    const monthlySummary: MonthlySummary[] = MONTHS.map((m, i) => {
      const base = monthlyRaw[i];
      const pathData = base.pathData || [];
      return {
        month: m.name,
        sunrise: base.sunTimes?.rise || 'N/A',
        sunset: base.sunTimes?.set || 'N/A',
        noonElevation: Math.round(base.simPos?.elevation || 0),
        noonAzimuth: Math.round(base.simPos?.azimuth || 0),
        usableHours: usableHoursForUnit(pathData, floor, facing),
        peakWindow: peakWindow(pathData),
        floorClearance: floorClearanceTime(pathData, floor, facing),
      };
    });
  
    const avgUsable = monthlySummary.reduce((s, m) => s + m.usableHours, 0) / 12;
    const feasibility = avgUsable >= 5 ? 'Excellent' : avgUsable >= 3.5 ? 'Good' : avgUsable >= 2 ? 'Marginal' : 'Not Recommended';
  
    return {
      monthlySummary,
      seasonalDetail,
      solarFeasibility: {
        verdict: feasibility,
        avgUsableHours: Math.round(avgUsable * 10) / 10,
        bestMonths: [...monthlySummary].sort((a,b) => b.usableHours - a.usableHours).slice(0,3).map(m => m.month),
        worstMonths: [...monthlySummary].sort((a,b) => a.usableHours - b.usableHours).slice(0,3).map(m => m.month),
      },
    };
  }