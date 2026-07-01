import { create } from 'zustand';
import { getGoesXrays, getSolarProbs, getSolarRegions, fetchNowcast, fetchForecast, fetchSoLEXS, fetchHEL1OS } from '../services/api';

export const useStore = create((set, get) => ({
  // Simulation / Demo mode
  demoActive: false,
  demoTimer: null,
  demoTimeElapsed: 0,
  
  // Pipeline Data
  pipelineNowcast: null,
  pipelineForecast: null,
  solexsData: null,
  heliosData: null,
  
  // Goes Data and state
  goesData: [],
  loading: true,
  error: null,
  activityLevel: 'QUIET', // "QUIET", "ACTIVE", "STORM"
  activityColor: '#00E5A0',
  lastUpdate: null,

  // Solar Probabilities (Real & Heuristic)
  solarProbs: { B: 95, C: 40, M: 15, X: 5 },
  rawProbData: null,

  // Active Regions
  activeRegions: [
    { number: '4478', region: '4478', coordinate: 'S06E52', location: 'S06E52', area: 640, mag: 'Beta-Gamma-Delta', class: 'X', Probabilities: {C: 85, M: 45, X: 20} },
    { number: '4475', region: '4475', coordinate: 'S09E21', location: 'S09E21', area: 210, mag: 'Beta-Gamma', class: 'M', Probabilities: {C: 65, M: 25, X: 8} },
    { number: '4473', region: '4473', coordinate: 'S14W35', location: 'S14W35', area: 120, mag: 'Beta', class: 'C', Probabilities: {C: 40, M: 10, X: 2} },
    { number: '4476', region: '4476', coordinate: 'N08W03', location: 'N08W03', area: 50, mag: 'Alpha', class: 'C', Probabilities: {C: 15, M: 3, X: 1} },
  ],

  // Forecast mode: 'nowcast' or 'forecast'
  forecastMode: 'nowcast',
  setForecastMode: (mode) => set({ forecastMode: mode }),

  // Presentation Mode
  presentationMode: localStorage.getItem('presentationMode') === 'true',
  togglePresentationMode: () => {
    const next = !get().presentationMode;
    localStorage.setItem('presentationMode', String(next));
    set({ presentationMode: next });
  },

  // Alerts state
  activeAlert: null,
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  clearAlert: () => set({ activeAlert: null }),
  lastAlertTime: null,
  preOnsetBaseline: null,
  belowBaselineCount: 0,

  // Groq Insight
  latestInsight: null,
  setLatestInsight: (insight) => set({ latestInsight: insight }),
  
  // UI Selection State
  selectedActiveRegion: null,
  setSelectedActiveRegion: (regionId) => set({ selectedActiveRegion: regionId }),
  
  // Filters for Event Log
  flareEventFilters: {
    class: 'ALL', // ALL, B, C, M, X
    adityaObservedOnly: false,
  },
  setFlareEventFilters: (filters) => set((state) => ({ 
    flareEventFilters: { ...state.flareEventFilters, ...filters } 
  })),

  fetchPipelineData: async () => {
    try {
      const [nowcast, forecast, solexs, helios] = await Promise.all([
        fetchNowcast(),
        fetchForecast(),
        fetchSoLEXS(),
        fetchHEL1OS()
      ]);
      set({
        pipelineNowcast: nowcast,
        pipelineForecast: forecast,
        solexsData: solexs,
        heliosData: helios
      });
    } catch (e) {
      console.error("Failed to fetch pipeline data:", e);
    }
  },

  // Initialize and start periodic fetch
  initStore: async () => {
    // Initial fetch
    await get().fetchData();
    await get().fetchProbsAndRegions();
    await get().fetchPipelineData();

    // Setup 60s interval for GOES
    const goesIntervalId = setInterval(() => {
      if (!get().demoActive) {
        get().fetchData();
      }
    }, 60000);

    // Setup 10-minute interval for solar probabilities and active regions
    const probsIntervalId = setInterval(() => {
      if (!get().demoActive) {
        get().fetchProbsAndRegions();
      }
    }, 600000);

    // Setup 30s interval for pipeline data
    const pipelineIntervalId = setInterval(() => {
      if (!get().demoActive) {
        get().fetchPipelineData();
      }
    }, 30000);

    // Presentation mode listener
    const handleKeyDown = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        get().togglePresentationMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(goesIntervalId);
      clearInterval(probsIntervalId);
      clearInterval(pipelineIntervalId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  },

  fetchProbsAndRegions: async () => {
    try {
      const [probsData, regionsData] = await Promise.all([
        getSolarProbs(),
        getSolarRegions()
      ]);
      if (regionsData && regionsData.length > 0) {
        set({ activeRegions: regionsData });
      }
      get().calculateProbs(probsData);
    } catch (err) {
      console.error("Failed to fetch probabilities/regions:", err);
      get().calculateProbs(null); // Fallback to live goes heuristic
    }
  },

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getGoesXrays();
      set({ goesData: data, lastUpdate: new Date(), loading: false });
      get().calculateActivity(data);
      get().detectFlareOnset(data);
    } catch (err) {
      console.error("Failed to fetch GOES data in store:", err);
      set({ error: err.message, loading: false });
      if (get().goesData.length === 0) {
        set({ activityLevel: 'QUIET', activityColor: '#00E5A0' });
      }
    }
  },

  calculateActivity: (data) => {
    if (get().demoActive) {
      set({ activityLevel: 'STORM', activityColor: '#FF3B3B' });
      return;
    }

    if (!data || data.length === 0) {
      set({ activityLevel: 'QUIET', activityColor: '#00E5A0' });
      return;
    }

    const channelB = data.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
    const pointsToCheck = channelB.length > 0 ? channelB : data;
    const last10 = pointsToCheck.slice(-10);
    const avgFlux = last10.reduce((acc, curr) => acc + (curr.flux || 0), 0) / (last10.length || 1);

    let level = 'QUIET';
    let color = '#00E5A0';

    if (avgFlux >= 1e-5) {
      level = 'STORM';
      color = '#FF3B3B';
    } else if (avgFlux >= 1e-6) {
      level = 'ACTIVE';
      color = '#FFB347';
    }

    set({ activityLevel: level, activityColor: color });
  },

  calculateProbs: (data) => {
    if (get().demoActive) {
      set({ solarProbs: { B: 99, C: 95, M: 65, X: 22 } });
      return;
    }

    if (data && data.length > 0) {
      // union probability calculation across regions: P = 1 - prod(1 - p_i/100)
      let c_prod = 1.0;
      let m_prod = 1.0;
      let x_prod = 1.0;

      data.forEach(region => {
        const probs = region.Probabilities;
        if (probs) {
          c_prod *= (1 - (probs.C || 0) / 100);
          m_prod *= (1 - (probs.M || 0) / 100);
          x_prod *= (1 - (probs.X || 0) / 100);
        }
      });

      const C_prob = Math.round((1 - c_prod) * 100);
      const M_prob = Math.round((1 - m_prod) * 100);
      const X_prob = Math.round((1 - x_prod) * 100);
      const B_prob = Math.min(99, Math.round(C_prob * 1.5));

      set({
        solarProbs: { B: B_prob, C: C_prob, M: M_prob, X: X_prob },
        rawProbData: data
      });
    } else {
      // Fallback if API empty or fails — use current solar context:
      // AR4478 is Beta-Gamma-Delta with M:45%, X:20% as of June 26, 2026
      // So realistic fallback: B=75, C=55, M=45, X=20
      const B_prob = 75;
      const C_prob = 55;
      const M_prob = 45;
      const X_prob = 20;

      set({ solarProbs: { B: B_prob, C: C_prob, M: M_prob, X: X_prob } });
    }
  },

  detectFlareOnset: (data) => {
    if (get().demoActive) return;
    if (!data || data.length < 10) return;

    const channelB = data.filter(d => d.energy === '0.1-0.8nm' || d.energy_band === '0.1-0.8nm');
    const points = channelB.length >= 10 ? channelB.slice(-10) : data.slice(-10);
    if (points.length < 10) return;

    const fluxVals = points.map(p => p.flux || 0);
    const flux9 = fluxVals[9];
    const flux4 = fluxVals[4];

    // Compute rate_of_rise = (flux[9] - flux[4]) / (5 * 60)
    const rateOfRise = (flux9 - flux4) / 300;

    // Compute mean of flux[0:5]
    const mean0to5 = fluxVals.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const fluxRatio = mean0to5 > 0 ? (flux9 / mean0to5) : 1;

    // Onset alert detection
    const now = Date.now();
    const lastAlert = get().lastAlertTime;

    // Detection criteria:
    const isAboveNoise = flux9 > 5e-8; // Lowered from 1e-7 for B-class detection
    const isDoubled = fluxRatio > 2.0;  // Lowered from 2.5 for better sensitivity
    const isRising = rateOfRise > 0;

    if (isAboveNoise && isDoubled && isRising) {
      if (!lastAlert || (now - lastAlert > 30 * 60 * 1000)) {
        // Classify onset class
        let classStr = 'B';
        if (flux9 >= 1e-4) classStr = 'X';
        else if (flux9 >= 1e-5) classStr = 'M';
        else if (flux9 >= 1e-6) classStr = 'C';
        // B-class: 1e-7 to 1e-6 (now detectable with 5e-8 threshold)

        // Approximate peak class (e.g. C3.2)
        const subClass = (flux9 / Math.pow(10, Math.floor(Math.log10(flux9)))).toFixed(1);
        const fullClass = `${classStr}${subClass}`;

        // Find nearest active region (default to highest area/prob)
        const sorted = [...(get().activeRegions || [])].sort((a, b) => (b.area || 0) - (a.area || 0));
        const nearestRegion = sorted.length > 0 ? sorted[0].region : '3664';

        set({
          activeAlert: {
            id: 'AUTO_ALERT_' + now,
            class: fullClass,
            time: new Date().toISOString(),
            region: nearestRegion,
            type: 'ONSET',
            severity: classStr === 'X' ? 'ALERT' : classStr === 'M' ? 'WARNING' : 'WATCH'
          },
          lastAlertTime: now,
          preOnsetBaseline: mean0to5,
          belowBaselineCount: 0
        });
      }
    }

    // Auto-dismiss logic: below baseline for 3 consecutive readings, or max 60 minutes
    const alert = get().activeAlert;
    if (alert && alert.type === 'ONSET') {
      const elapsedMins = (now - get().lastAlertTime) / (60 * 1000);
      const baseline = get().preOnsetBaseline;

      if (elapsedMins >= 60) {
        get().clearAlert();
      } else if (baseline && flux9 < baseline) {
        const nextCount = get().belowBaselineCount + 1;
        if (nextCount >= 3) {
          get().clearAlert();
        } else {
          set({ belowBaselineCount: nextCount });
        }
      } else {
        set({ belowBaselineCount: 0 });
      }
    }
  },

  // Demo simulation trigger
  triggerDemoMode: (flareClass = 'M5.2') => {
    const currentTimer = get().demoTimer;
    if (currentTimer) clearInterval(currentTimer);

    const nowUTC = new Date().toISOString().replace('T', ' ').substring(0, 19);

    set({
      demoActive: true,
      activityLevel: 'STORM',
      activityColor: '#FF3B3B',
      solarProbs: { B: 99, C: 95, M: 65, X: 22 },
      activeAlert: {
        id: 'DEMO_ALERT_' + Date.now(),
        class: flareClass,
        level: 'STORM',
        message: `${flareClass} FLARE ONSET · AR4478 · S06E52 · ${nowUTC} UTC · IMPACT: MODERATE`,
        timestamp: new Date().toISOString(),
        region: '4478',
        severity: flareClass.startsWith('X') ? 'ALERT' : 'WARNING',
        type: 'ONSET'
      },
      latestInsight: `[1] At ${nowUTC} UTC, GOES-18 XRS-B detected an ${flareClass} class flare onset from AR4478 at S06E52, currently the most complex region on the Earth-facing disk. [2] Aditya-L1's HEL1OS registered an impulsive hard X-ray spike 3 minutes prior to the SoLEXS soft X-ray peak, confirming particle acceleration via the Neupert Effect. [3] Moderate HF radio blackout (R2) expected on the sunlit hemisphere over the next 60-90 minutes; satellite operators should monitor for energetic particle flux increases.`
    });

    const interval = setInterval(() => {
      const elapsed = get().demoTimeElapsed + 1;
      if (elapsed >= 60) {
        get().stopDemoMode();
      } else {
        set({ demoTimeElapsed: elapsed });
      }
    }, 1000);

    set({ demoTimer: interval, demoTimeElapsed: 0 });
  },

  stopDemoMode: () => {
    const currentTimer = get().demoTimer;
    if (currentTimer) clearInterval(currentTimer);
    
    set({
      demoActive: false,
      demoTimer: null,
      demoTimeElapsed: 0,
      activeAlert: null,
      latestInsight: null
    });

    get().fetchData();
    get().fetchProbsAndRegions();
  }
}));


