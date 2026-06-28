// Programmatic generation of the May 10-11, 2024 X2.2 solar flare event (Gannon Storm)
// Demonstrates the Neupert Effect (HEL1OS hard X-ray peak precedes SoLEXS soft X-ray peak)

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
    helios: heliosData
  };
}

export const gannonStormData = generateGannonStormData();

