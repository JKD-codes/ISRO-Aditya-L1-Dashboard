import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const useMLStore = create((set, get) => ({
  // State Slices
  mlForecast: null,
  nowcastClass: null,
  solexsLive: [],
  heliosLive: [],
  neupertResult: null,
  modelConfidence: 0,
  featureVector: null,
  wsConnected: false,
  alertHistory: [],

  // Actions
  setWsConnected: (status) => set({ wsConnected: status }),
  addAlertToHistory: (alert) => set((state) => {
    // Keep max 50 entries, newest first
    const newHistory = [alert, ...state.alertHistory].slice(0, 50);
    return { alertHistory: newHistory };
  }),

  fetchForecast: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/forecast`);
      set({ mlForecast: res.data });
      
      // Update confidence if provided in the forecast response
      if (res.data?.confidence !== undefined) {
        set({ modelConfidence: res.data.confidence });
      }
    } catch (error) {
      console.error('Error fetching ML forecast:', error);
    }
  },

  fetchDualPayload: async () => {
    try {
      const [solexsRes, heliosRes] = await Promise.all([
        axios.get(`${API_BASE}/api/aditya/solexs`),
        axios.get(`${API_BASE}/api/aditya/helios`)
      ]);

      const solexsData = solexsRes.data?.data || [];
      const heliosData = heliosRes.data?.data || [];

      // Calculate flux_log for each SoLEXS data point
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

  fetchNeupert: async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ml/neupert`);
      set({ neupertResult: res.data });
    } catch (error) {
      console.error('Error fetching Neupert effect data:', error);
    }
  },

  // Polling initializer
  startPolling: () => {
    // Initial fetches
    get().fetchForecast();
    get().fetchDualPayload();
    get().fetchNeupert(); 

    // Poll fetchForecast() every 60 seconds
    setInterval(() => {
      get().fetchForecast();
    }, 60000);

    // Poll fetchDualPayload() every 30 seconds
    setInterval(() => {
      get().fetchDualPayload();
    }, 30000);
  }
}));

export default useMLStore;
