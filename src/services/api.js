import axios from 'axios';
import { API_BASE, SDO_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 3000,
});

// Dynamic Mock Generators
const generateMockFlux = () => {
  const now = Date.now();
  const baseFlux = 2e-7;
  const noise = (Math.random() - 0.5) * 5e-8;
  const wave = Math.sin(now / 20000) * 1e-7;
  return baseFlux + noise + wave;
};

const generateMockGoesSeries = () => {
  const data = [];
  let time = new Date();
  time.setMinutes(time.getMinutes() - 60);
  
  for(let i=0; i<60; i++) {
    data.push({
      time_tag: time.toISOString(),
      flux: generateMockFlux()
    });
    time.setMinutes(time.getMinutes() + 1);
  }
  return data;
};

export const getGoesRealtime = async () => {
  try {
    const { data } = await api.get('/goes/xrays');
    return data;
  } catch (e) {
    return generateMockGoesSeries();
  }
};

export const getGoesXrays = async () => {
  try {
    const { data } = await api.get('/goes/xrays');
    return data;
  } catch (e) {
    return generateMockGoesSeries();
  }
};

export const getGoesFlares = async () => {
  try {
    const { data } = await api.get('/goes/flares');
    return data;
  } catch (e) {
    return []; // No recent large flares
  }
};

export const getSolarRegions = async () => {
  try {
    const { data } = await api.get('/solar/regions');
    if (!data || !data.length) throw new Error("Empty data");
    
    // Find the most recent date in the dataset
    const latestDate = data.reduce((max, r) => (r.observed_date > max ? r.observed_date : max), data[0].observed_date);
    
    // Filter to latest date, must have location, and on visible disk (lon between -90 and 90)
    const currentRegions = data.filter(r => 
      r.observed_date === latestDate && 
      r.location && 
      r.longitude !== null && 
      Math.abs(r.longitude) <= 90
    );

    return currentRegions.map(r => ({
      id: `AR${r.region}`,
      region: r.region,
      number: String(r.region),
      location: r.location,
      coordinate: r.location,
      lat: r.latitude,
      lon: r.longitude,
      area: r.area || Math.floor(Math.random() * 100 + 20), // Fallback if null so it still renders
      mag: r.mag_class || r.mag_string || 'Alpha',
      m_flare_prob: r.m_flare_probability || 0,
      x_flare_prob: r.x_flare_probability || 0,
      c_flare_prob: r.c_flare_probability || 0,
    }));
  } catch (e) {
    return [
      { id: 'AR4478', mag: 'Beta-Gamma-Delta', area: 640, location: 'S06E52' },
      { id: 'AR4475', mag: 'Beta', area: 210, location: 'S09E21' },
      { id: 'AR4473', mag: 'Alpha', area: 120, location: 'S14W35' },
      { id: 'AR4476', mag: 'Beta-Gamma', area: 50, location: 'N08W03' }
    ];
  }
};

export const getSolarProbs = async () => {
  try {
    const { data } = await api.get('/solar/probs');
    return data;
  } catch (e) {
    return {
      'C': { value: 75, trend: 'up' },
      'M': { value: 45, trend: 'up' },
      'X': { value: 20, trend: 'stable' }
    };
  }
};

export const getAlerts = async () => {
  try {
    const { data } = await api.get('/alerts');
    return data;
  } catch (e) {
    return [];
  }
};

export const getKpIndex = async () => {
  try {
    const { data } = await api.get('/kp-index');
    return data;
  } catch (e) {
    return {
      current: 4.3 + Math.random() * 0.5,
      history: Array.from({length: 8}, (_,i) => ({
        time: new Date(Date.now() - (7-i)*3600000).toISOString(),
        value: 3 + Math.random()*2
      }))
    };
  }
};

export const getSolarCycle = async () => {
  try {
    const { data } = await api.get('/solar-cycle');
    return data;
  } catch (e) {
    return {
      cycleNumber: 25,
      progression: 68,
      ssn: 145,
      predictedMax: 'Jul 2025'
    };
  }
};

export const getSdoLatestUrl = () => {
  return SDO_URL;
};

export const checkApiHealth = async () => {
  try {
    const { data } = await api.get('/health', { timeout: 2000 });
    return data;
  } catch (e) {
    return { status: 'mock' };
  }
};

export const getAdityaSolexs = async () => {
  try {
    const { data } = await api.get('/aditya/solexs');
    if (data.data && Array.isArray(data.data)) {
      return {
        timestamps: data.data.map(d => d.time_tag),
        flux: data.data.map(d => d.flux),
        is_real_data: false,
        data_source: "rolling_live"
      };
    }
    return data;
  } catch (e) {
    const now = new Date();
    return { timestamps: [now.toISOString()], flux: [generateMockFlux() * 1.5] };
  }
};

export const getAdityaHelios = async () => {
  try {
    const { data } = await api.get('/aditya/helios');
    if (data.data && Array.isArray(data.data)) {
      return {
        timestamps: data.data.map(d => d.time_tag),
        flux: data.data.map(d => d.flux),
        is_real_data: false,
        data_source: "rolling_live"
      };
    }
    return data;
  } catch (e) {
    const now = new Date();
    return { timestamps: [now.toISOString()], flux: [generateMockFlux() * 0.3] };
  }
};

export const fetchNowcast = async () => {
  try {
    const { data } = await api.get('/pipeline/nowcast');
    return data;
  } catch (e) {
    return [];
  }
};

export const fetchForecast = async () => {
  try {
    const { data } = await api.get('/pipeline/forecast');
    return data;
  } catch (e) {
    return [];
  }
};

export const fetchSoLEXS = getAdityaSolexs;
export const fetchHEL1OS = getAdityaHelios;

export default api;
