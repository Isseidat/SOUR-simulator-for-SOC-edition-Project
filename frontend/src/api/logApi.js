import axiosClient from './axiosClient';

// Lấy danh sách lịch sử chạy n8n SOAR
export const getLogs = async (params) => {
  return await axiosClient.get('/logs', { params });
};
