import axios from 'axios';

// Create API client with fallback base URL matching local proxy port
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export const apiService = {
  createTrip: async (tripData) => {
    const response = await apiClient.post('/api/trips/create', tripData);
    return response.data;
  },
  
  getTrips: async () => {
    const response = await apiClient.get('/api/trips');
    return response.data;
  },
  
  getTripDetail: async (id) => {
    const response = await apiClient.get(`/api/trips/${id}`);
    return response.data;
  },
  
  getTripMap: async (id) => {
    const response = await apiClient.get(`/api/trips/${id}/map`);
    return response.data;
  },
  
  getTripLogs: async (id) => {
    const response = await apiClient.get(`/api/trips/${id}/logs`);
    return response.data;
  },
  
  getTripPdf: async (id) => {
    const response = await apiClient.get(`/api/trips/${id}/pdf`);
    return response.data;
  }
};

export default apiService;
