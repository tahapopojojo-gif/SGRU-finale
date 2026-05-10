import api from './client';

export const authApi = {

    login: async (email, password) => {
        const response = await api.post('/login', { email, password });
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    },

    logout: async () => {
        await api.post('/logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    me: async () => {
        const response = await api.get('/me');
        return response.data.data;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
};