import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Auth API
export const registerUser = (data: any) => api.post('/auth/register', data);
export const loginUser = (data: any) => api.post('/auth/login', data);

// Collections API
export const createCollection = (data: { name: string; description?: string }) => api.post('/collections', data);
export const getMyCollections = () => api.get('/collections');
export const getCollection = (id: string) => api.get(`/collections/${id}`);
export const deleteCollection = (id: string) => api.delete(`/collections/${id}`);

export const uploadImages = (id: string, formData: FormData) =>
    api.post(`/collections/${id}/upload-images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const findMyPhotos = (id: string, descriptor: number[]) =>
    api.post(`/collections/${id}/find-my-photos`, { descriptor });

export default api;
