const BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('aces_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

export const api = {
  get: (path) => fetch(`${BASE}${path}`, { headers: headers() }).then(handle),
  post: (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  put: (path, body) => fetch(`${BASE}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  delete: (path) => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handle),
};
