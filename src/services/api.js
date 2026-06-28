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
    return data;
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
    return data;
  } catch (e) {
    return [{ time: new Date().toISOString(), flux: generateMockFlux() * 1.5 }];
  }
};

export const getAdityaHelios = async () => {
  try {
    const { data } = await api.get('/aditya/helios');
    return data;
  } catch (e) {
    return [{ time: new Date().toISOString(), flux: generateMockFlux() * 0.3 }];
  }
};

export default api;
