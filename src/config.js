const isDev = import.meta.env.DEV;
export const API_BASE = isDev
  ? 'http://localhost:8000'
  : import.meta.env.VITE_API_URL || '';
export const SDO_URL = `${API_BASE}/api/sdo/latest`;
