import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const useMLStore = create((set, get) => ({
  // ===== Existing State =====
  mlForecast: null,
  nowcastClass: null,
  solexsLive: [],
  heliosLive: [],
  neupertResult: null,
  modelConfidence: 0,
  featureVector: null,
  wsConnected: false,
  alertHistory: [],

  // ===== NEW: Nowcast State =====
  nowcastResult: null,       // { solexs, helios, cross_validation, status }
  nowcastStatus: null,       // { solexs_detections_total, helios_detections_total, last_solexs, last_helios }

  // ===== NEW: Master Catalogue =====
  masterCatalogue: [],       // Array of flare events from SQLite
  catalogueStats: null,      // { total_events, cross_validated, by_class }

  // ===== NEW: Model Metrics =====
  modelMetrics: null,        // { accuracy, TSS, HSS, TPR, FAR, confusion_matrix, per_class }

  // ===== NEW: Feature Importances =====
  featureImportances: null,  // { feature_importances: {name: value}, feature_names: [] }

  // ===== Actions =====
  setWsConnected: (status) => set({ wsConnected: status }),

  addAlertToHistory: (alert) => set((state) => {
    const newHistory = [alert, ...state.alertHistory].slice(0, 100); // Keep 100
    return { alertHistory: newHistory };
  }),

  // ----- Forecast -----
  fetchForecast: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/forecast`);
      set({ mlForecast: res.data });
      if (res.data?.lead_time_mins !== undefined) {
        set({ modelConfidence: res.data.horizons?.[0]?.confidence || 0 });
      }
    } catch (error) {
      console.error('Error fetching ML forecast:', error);
    }
  },

  // ----- Dual Payload Live Data -----
  fetchDualPayload: async () => {
    try {
      const [solexsRes, heliosRes] = await Promise.all([
        axios.get(`${API_BASE}/api/aditya/solexs`),
        axios.get(`${API_BASE}/api/aditya/helios`)
      ]);

      const solexsData = solexsRes.data?.data || [];
      const heliosData = heliosRes.data?.data || [];

      const processedSolexs = solexsData.map(item => ({
        ...item,
        flux_log: item.flux > 0 ? Math.log10(item.flux) : 0
      }));

      set({
        solexsLive: processedSolexs,
        heliosLive: heliosData
      });
    } catch (error) {
      console.error('Error fetching dual payload:', error);
    }
  },

  // ----- Neupert Effect -----
  fetchNeupert: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/neupert`);
      set({ neupertResult: res.data });
    } catch (error) {
      console.error('Error fetching Neupert effect data:', error);
    }
  },

  // ----- NEW: Nowcast -----
  fetchNowcast: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/nowcast`);
      set({
        nowcastResult: res.data,
        nowcastStatus: res.data?.status || null,
      });

      // If a detection occurred, add to alert history
      const cv = res.data?.cross_validation;
      if (cv && (cv.solexs_detected || cv.helios_detected)) {
        const detection = res.data.solexs || res.data.helios;
        if (detection) {
          get().addAlertToHistory({
            id: `NOWCAST_${Date.now()}`,
            flareClass: detection.class || 'HXR',
            time: detection.time || new Date().toISOString(),
            channel: cv.solexs_detected && cv.helios_detected ? 'BOTH'
              : cv.solexs_detected ? 'SoLEXS' : 'HEL1OS',
            crossValidated: cv.cross_validated,
            confidence: cv.combined_confidence,
            type: 'NOWCAST',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching nowcast:', error);
    }
  },

  // ----- NEW: Master Catalogue -----
  fetchCatalogue: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/catalogue`);
      set({
        masterCatalogue: res.data?.events || [],
        catalogueStats: res.data?.stats || null,
      });
    } catch (error) {
      console.error('Error fetching catalogue:', error);
    }
  },

  // ----- NEW: Model Metrics -----
  fetchModelMetrics: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/metrics`);
      set({ modelMetrics: res.data });
    } catch (error) {
      console.error('Error fetching model metrics:', error);
    }
  },

  // ----- NEW: Feature Importances -----
  fetchFeatureImportances: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/features`);
      set({ featureImportances: res.data });
    } catch (error) {
      console.error('Error fetching feature importances:', error);
    }
  },

  // ----- NEW: Feature Vector -----
  fetchFeatureVector: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/feature-vector`);
      set({ featureVector: res.data });
    } catch (error) {
      console.error('Error fetching feature vector:', error);
    }
  },

  // ----- Polling Initializer -----
  startPolling: () => {
    // Initial fetches
    get().fetchForecast();
    get().fetchDualPayload();
    get().fetchNeupert();
    get().fetchNowcast();
    get().fetchCatalogue();
    get().fetchModelMetrics();
    get().fetchFeatureImportances();
    get().fetchFeatureVector();

    // Poll forecast every 60s
    setInterval(() => { get().fetchForecast(); }, 60000);

    // Poll dual payload every 30s
    setInterval(() => { get().fetchDualPayload(); }, 30000);

    // Poll nowcast every 30s
    setInterval(() => { get().fetchNowcast(); }, 30000);

    // Poll Neupert every 60s
    setInterval(() => { get().fetchNeupert(); }, 60000);

    // Poll catalogue every 2 minutes
    setInterval(() => { get().fetchCatalogue(); }, 120000);

    // Poll feature vector every 30s
    setInterval(() => { get().fetchFeatureVector(); }, 30000);

    // Poll model metrics every 5 minutes (rarely changes)
    setInterval(() => { get().fetchModelMetrics(); }, 300000);
  }
}));

export default useMLStore;
