import axiosInstance from './axiosInstance';

// ─── ZONES ───────────────────────────────────────────────────────────────────

// GET /api/zones (filtered by city automatically on the backend)
export const getZones = async () => {
  const response = await axiosInstance.get('/zones');
  return response.data.data || response.data;
};

// POST /api/zones
export const createZone = async (zoneData) => {
  const response = await axiosInstance.post('/zones', zoneData);
  return response.data.data || response.data;
};

// PATCH /api/zones/{id}
export const updateZone = async (zoneId, zoneData) => {
  const response = await axiosInstance.patch(`/zones/${zoneId}`, zoneData);
  return response.data.data || response.data;
};

// DELETE /api/zones/{id}
export const deleteZone = async (zoneId) => {
  const response = await axiosInstance.delete(`/zones/${zoneId}`);
  return response.data.data || response.data;
};

// ─── REMARQUES ───────────────────────────────────────────────────────────────

// GET /api/remarques (with optional filters: zone_id, statut, categorie)
export const getRemarks = async (params = {}) => {
  const response = await axiosInstance.get('/remarques', { params });
  return response.data.data || response.data;
};

// PATCH /api/remarques/{id} (update status + admin comment)
export const updateRemarkStatus = async (remarkId, data) => {
  const response = await axiosInstance.patch(`/remarques/${remarkId}`, data);
  return response.data.data || response.data;
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

// GET /api/dashboard/stats
export const getDashboardStats = async () => {
  const response = await axiosInstance.get('/dashboard/stats');
  return response.data.data || response.data;
};

// ─── SUPER ADMIN — USER MANAGEMENT ──────────────────────────────────────────

// GET /api/users
export const getAllUsers = async () => {
  const response = await axiosInstance.get('/users');
  return response.data.data || response.data;
};

// GET /api/users/pending
export const getPendingUsers = async () => {
  const response = await axiosInstance.get('/users/pending');
  return response.data.data || response.data;
};

// PATCH /api/users/{id} (approve / reject / suspend — statut only, role is immutable)
export const updateUser = async (userId, data) => {
  const response = await axiosInstance.patch(`/users/${userId}`, data);
  return response.data.data || response.data;
};

// GET /api/users
export const getUsers = async () => {
  const response = await axiosInstance.get('/users');
  return response.data.data || response.data;
};

// POST /api/users/send-group-email
export const sendGroupEmail = async (group, subject, message, zoneId = null) => {
  const payload = {
    group,
    subject,
    message,
    zone_id: group === 'zone' ? zoneId : null,
  };
  const response = await axiosInstance.post('/users/send-group-email', payload);
  return response.data;
};

// --- BACKWARDS COMPATIBILITY ALIASES ---

export const getStatsByZone = async () => [];
export const getStatsByCategory = async () => [];
export const getStatsByUrgency = async () => [];
export const getActivityOverTime = async () => [];
export const getTop5Zones = async () => [];
export const getKeyIndicators = async () => ({
  totalRemarks: 0, urgentCount: 0, avgUrgency: 0, topZone: '-'
});

export const getFilteredRemarksForExport = async (filters) => {
  const response = await axiosInstance.get('/remarques', { params: filters });
  return response.data.data || response.data || [];
};

export const generateCSV = (data) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
  return `${headers}\n${rows}`;
};

export const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

