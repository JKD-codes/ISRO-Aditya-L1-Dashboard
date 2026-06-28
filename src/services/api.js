import axios from 'axios';
import { API_BASE, SDO_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
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
  const { data } = await api.get('/health', { timeout: 3000 });
  return data;
};

export const getAdityaSolexs = async () => {
  const { data } = await api.get('/aditya/solexs');
  return data;
};

export const getAdityaHelios = async () => {
  const { data } = await api.get('/aditya/helios');
  return data;
};

export default api;

