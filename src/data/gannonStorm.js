/**
 * gannonStorm.js — Gannon Storm (X2.2, May 10 2024) data provider.
 *
 * Priority: Fetch real processed data from backend API → synthetic fallback.
 *
 * The backend serves parallel-array format: { timestamps: [...], flux: [...] }
 * The frontend expects per-point objects: [{ time_tag, flux }, ...]
 * fetchGannonStormData() handles this transform explicitly.
 */

import { API_BASE } from '../config';

// ─── Synchronous Synthetic Fallback ──────────────────────────────────────────
// Kept as-is for instant initial render before API responds.

export function generateGannonStormData() {
  const peakTime = new Date("2024-05-10T06:54:00Z");
  const solexsData = [];
  const heliosData = [];

  const SOLEXS_BACKGROUND = 1e-8;
  const SOLEXS_PEAK = 2.1e-4;

  function solexsFlux(minuteFromPeak) {
    if (minuteFromPeak < -40) return SOLEXS_BACKGROUND;
    if (minuteFromPeak < 0) {
      // Exponential rise over 40 minutes
      const riseProgress = (minuteFromPeak + 40) / 40;
      return SOLEXS_BACKGROUND * Math.pow(SOLEXS_PEAK / SOLEXS_BACKGROUND, riseProgress * riseProgress);
    } else {
      // Slow exponential decay over ~80 minutes
      return SOLEXS_PEAK * Math.exp(-minuteFromPeak / 28);
    }
  }

  const HELIOS_BACKGROUND = 47; // counts/sec
  const HELIOS_PEAK = 6200;

  function heliosCountRate(minuteFromPeak) {
    // HEL1OS peaks 3 minutes BEFORE SoLEXS (Neupert Effect)
    const heliosPeak = minuteFromPeak + 3;
    if (Math.abs(heliosPeak) < 8) {
      // Impulsive: very sharp spike, Gaussian with sigma=2min
      return HELIOS_BACKGROUND + (HELIOS_PEAK - HELIOS_BACKGROUND) * Math.exp(-heliosPeak * heliosPeak / 8);
    }
    return HELIOS_BACKGROUND + Math.max(0, 50 * Math.exp(-Math.abs(heliosPeak) / 3));
  }

  const noise = () => 1 + (Math.random() - 0.5) * 0.04;

  for (let i = 0; i < 120; i++) {
    const offsetMinutes = i - 60;
    const timeTag = new Date(peakTime.getTime() + offsetMinutes * 60 * 1000).toISOString();

    const sf = solexsFlux(offsetMinutes) * noise();
    const hc = heliosCountRate(offsetMinutes) * noise();

    solexsData.push({
      time_tag: timeTag,
      flux: Math.max(1e-9, sf)
    });

    heliosData.push({
      time_tag: timeTag,
      counts_per_sec: Math.max(0, Math.round(hc))
    });
  }

  return {
    event: "X2.2 Solar Flare — Gannon Storm (May 10, 2024)",
    peakTime: peakTime.toISOString(),
    solexs: solexsData,
    helios: heliosData,
    dataSource: "synthetic_fallback"
  };
}

// ─── Async API Fetcher (Real Data Priority) ──────────────────────────────────
//
// Fetches from /api/gannon-storm/solexs and /api/gannon-storm/helios.
// Performs explicit transform: parallel arrays → per-point objects.
// Falls back to generateGannonStormData() on any error.

export async function fetchGannonStormData() {
  const base = API_BASE || 'http://localhost:8000';

  try {
    const [solexsRes, heliosRes] = await Promise.all([
      fetch(`${base}/api/gannon-storm/solexs`),
      fetch(`${base}/api/gannon-storm/helios`)
    ]);

    if (!solexsRes.ok || !heliosRes.ok) {
      throw new Error(`API error: SoLEXS=${solexsRes.status}, HEL1OS=${heliosRes.status}`);
    }

    const solexsRaw = await solexsRes.json();
    const heliosRaw = await heliosRes.json();

    // ── EXPLICIT TRANSFORM ──────────────────────────────────────────────
    // Backend returns: { timestamps: [...], flux: [...], is_real_data, ... }
    // Frontend needs:  [{ time_tag, flux }, ...]
    //
    // This transform converts the parallel-array response into per-point
    // objects matching the shape DualPayloadChart and other components expect.
    // ─────────────────────────────────────────────────────────────────────

    const solexsTimestamps = solexsRaw.timestamps || [];
    const solexsFlux = solexsRaw.flux || [];
    const solexsData = solexsTimestamps.map((ts, i) => ({
      time_tag: ts,
      flux: solexsFlux[i] !== null && solexsFlux[i] !== undefined ? solexsFlux[i] : 0
    }));

    const heliosTimestamps = heliosRaw.timestamps || [];
    const heliosFlux = heliosRaw.flux || [];
    const heliosData = heliosTimestamps.map((ts, i) => ({
      time_tag: ts,
      counts_per_sec: heliosFlux[i] !== null && heliosFlux[i] !== undefined ? heliosFlux[i] : 0
    }));

    const isReal = solexsRaw.is_real_data === true;

    return {
      event: solexsRaw.event || "X2.2 Solar Flare — Gannon Storm (May 10, 2024)",
      peakTime: "2024-05-10T06:54:00Z",
      solexs: solexsData,
      helios: heliosData,
      dataSource: isReal ? "real_pradan" : "synthetic_fallback",
      observationDate: solexsRaw.observation_date || "2024-05-10"
    };
  } catch (err) {
    console.warn("[gannonStorm] API fetch failed, using synthetic fallback:", err.message);
    return generateGannonStormData();
  }
}

// Default export for backward compatibility (sync synthetic)
export const gannonStormData = generateGannonStormData();
