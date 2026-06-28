import axios from 'axios';
import { API_BASE, SDO_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 3000,
});

export const getGoesRealtime = async () => {
  const { data } = await api.get('/goes/xrays');
  return data;
};

export const getGoesXrays = async () => {
  const { data } = await api.get('/goes/xrays');
  return data;
};

export const getGoesFlares = async () => {
  const { data } = await api.get('/goes/flares');
  return data;
};

export const getSolarRegions = async () => {
  const { data } = await api.get('/solar/regions');
  return data;
};

export const getSolarProbs = async () => {
  const { data } = await api.get('/solar/probs');
  return data;
};

export const getAlerts = async () => {
  const { data } = await api.get('/alerts');
  return data;
};

export const getKpIndex = async () => {
  const { data } = await api.get('/kp-index');
  return data;
};

export const getSolarCycle = async () => {
  const { data } = await api.get('/solar-cycle');
  return data;
};

export const getSdoLatestUrl = () => {
  return SDO_URL;
};

export const checkApiHealth = async () => {
  try {
    const { data } = await api.get('/health', { timeout: 2000 });
    return data;
  } catch (e) {
    return null;
  }
};

export async function fetchNowcast() {
  const res = await fetch(`${API_BASE}/api/pipeline/nowcast`);
  if (!res.ok) throw new Error('Pipeline offline');
  return res.json();
}

export async function fetchForecast() {
  const res = await fetch(`${API_BASE}/api/pipeline/forecast`);
  if (!res.ok) throw new Error('Pipeline offline');
  return res.json();
}

export async function fetchSoLEXS() {
  const res = await fetch(`${API_BASE}/api/aditya/solexs`);
  if (!res.ok) throw new Error('SoLEXS data unavailable');
  return res.json();
}

export async function fetchHEL1OS() {
  const res = await fetch(`${API_BASE}/api/aditya/helios`);
  if (!res.ok) throw new Error('HEL1OS data unavailable');
  return res.json();
}

// Keep compatible aliases for stores
export const getAdityaSolexs = fetchSoLEXS;
export const getAdityaHelios = fetchHEL1OS;

export default api;
