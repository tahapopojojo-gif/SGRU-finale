import axiosInstance from './axiosInstance';

// POST /api/register
export const register = async (userData) => {
  const response = await axiosInstance.post('/register', userData);
  return response.data.data || response.data;
};

// POST /api/login
export const login = async (email, password) => {
  const response = await axiosInstance.post('/login', { email, password });
  const payload = response.data.data || response.data;
  const { token, user } = payload;

  // Store token in localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  return { token, user };
};

// POST /api/logout
export const logout = async () => {
  try {
    await axiosInstance.post('/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// GET /api/me
export const getCurrentUser = async () => {
  const response = await axiosInstance.get('/me');
  return response.data.data || response.data;
};

// GET /api/remarques (for citoyen)
export const getRemarks = async (params = {}) => {
  const response = await axiosInstance.get('/remarques', { params });
  return response.data;
};

// POST /api/remarques (citoyen submits a remark, supports photo upload)
export const createRemark = async (formData) => {
  const response = await axiosInstance.post('/remarques', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Add default export for backwards compatibility
export default {
  register,
  login,
  logout,
  getCurrentUser,
  getRemarks,
  createRemark,
};