import axios from 'axios';

export const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching JWT Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sih_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ApiService = {
  // Auth
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),

  // Cases
  listCases: (params?: any) => api.get('/cases', { params }),
  createCase: (data: any) => api.post('/cases', data),
  getCaseById: (caseId: string) => api.get(`/cases/${caseId}`),
  updateCase: (caseId: string, data: any) => api.patch(`/cases/${caseId}`, data),

  // Documents
  listDocuments: (caseId: string) => api.get(`/cases/${caseId}/documents`),
  uploadDocument: (caseId: string, formData: FormData) =>
    api.post(`/cases/${caseId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  reprocessDocument: (caseId: string, docId: string) =>
    api.post(`/cases/${caseId}/documents/${docId}/process`),
  deleteDocument: (caseId: string, docId: string) =>
    api.delete(`/cases/${caseId}/documents/${docId}`),

  // Graph
  getGraph: (caseId: string, params?: any) => api.get(`/cases/${caseId}/graph`, { params }),
  buildGraph: (caseId: string) => api.post(`/cases/${caseId}/graph/build`),
  getNode: (caseId: string, nodeId: string) => api.get(`/cases/${caseId}/graph/nodes/${nodeId}`),
  getEdge: (caseId: string, edgeId: string) => api.get(`/cases/${caseId}/graph/edges/${edgeId}`),
  getNeighborhood: (caseId: string, nodeId: string) =>
    api.get(`/cases/${caseId}/graph/neighborhood/${nodeId}`),

  // Entity Resolution
  listResolutionCandidates: (caseId: string, status?: string) =>
    api.get(`/cases/${caseId}/entities/resolution-candidates`, { params: { status } }),
  resolveCandidate: (caseId: string, candidateId: string, action: 'ACCEPT' | 'REJECT') =>
    api.post(`/cases/${caseId}/entities/resolution/${candidateId}`, { action }),

  // Analytics
  runAnalytics: (caseId: string) => api.post(`/cases/${caseId}/analytics/run`),
  getAnalyticsOverview: (caseId: string) => api.get(`/cases/${caseId}/analytics/overview`),
  getCentrality: (caseId: string) => api.get(`/cases/${caseId}/analytics/centrality`),
  getCommunities: (caseId: string) => api.get(`/cases/${caseId}/analytics/communities`),
  getPatterns: (caseId: string) => api.get(`/cases/${caseId}/analytics/patterns`),
  getTimeline: (caseId: string, params?: any) => api.get(`/cases/${caseId}/analytics/timeline`, { params }),
  getNodeScore: (caseId: string, nodeId: string) =>
    api.get(`/cases/${caseId}/analytics/nodes/${nodeId}/score`),

  // Alerts
  listAlerts: (caseId: string, params?: any) => api.get(`/cases/${caseId}/alerts`, { params }),
  updateAlertStatus: (caseId: string, alertId: string, status: string) =>
    api.patch(`/cases/${caseId}/alerts/${alertId}`, { status }),

  // Assistant
  queryAssistant: (caseId: string, question: string) =>
    api.post(`/cases/${caseId}/assistant/query`, { question }),

  // Reports
  generateReport: (caseId: string) => api.post(`/cases/${caseId}/reports/generate`),
  // Authenticated report exports. Do not use window.open() here because it cannot
  // attach the JWT Authorization header required by the backend.
  downloadReport: (caseId: string, format: 'pdf' | 'json' | 'csv') =>
    api.get(`/cases/${caseId}/reports/export/${format}`, { responseType: 'blob' }),

  // Turnkey Demo Seeder
  loadTurnkeyDemo: () => api.post('/demo/load'),
};
