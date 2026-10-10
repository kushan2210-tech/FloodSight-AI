// Set window.FLOODSIGHT_API_BASE_URL to the FastAPI origin when the API runs separately.
// Empty base uses same-origin /api routes and only works when a backend proxy is configured.
const API_BASE = (window.FLOODSIGHT_API_BASE_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  listAnalyses: () => request('/api/analyses'),
  getAnalysis: (id) => request(`/api/analyses/${encodeURIComponent(id)}`),
  getStatus: (id) => request(`/api/analyses/${encodeURIComponent(id)}/status`),
  getFacts: (id) => request(`/api/analyses/${encodeURIComponent(id)}/facts`),
  getMap: (id) => request(`/api/analyses/${encodeURIComponent(id)}/map`),
  getReport: (id) => request(`/api/analyses/${encodeURIComponent(id)}/report`),
  createAnalysis: (payload) => request('/api/analyses', {
    method: 'POST', body: JSON.stringify(payload)
  })
};
