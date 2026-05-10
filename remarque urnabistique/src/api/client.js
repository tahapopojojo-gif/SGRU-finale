import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    // withCredentials only needed for cookie-based Sanctum, not token auth
    withCredentials: false,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        if (status === 422) {
            const errors = error.response?.data?.errors;
            const message = errors
                ? Object.values(errors).flat().join('\n')
                : error.response?.data?.message || 'Erreur de validation.';
            return Promise.reject(new Error(message));
        }

        if (status === 429) {
            return Promise.reject(new Error('Trop de tentatives. Réessayez dans 1 minute.'));
        }

        if (status === 403) {
            return Promise.reject(new Error(error.response?.data?.message || 'Accès refusé.'));
        }

        const message = error.response?.data?.message || 'Une erreur est survenue.';
        return Promise.reject(new Error(message));
    }
);

export default api;