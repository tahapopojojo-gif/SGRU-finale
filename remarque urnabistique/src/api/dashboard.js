import api from './client';

export const dashboardApi = {

    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data.data;
    },
};