import axiosClient from './axiosClient';

// Lấy danh sách alerts
export const getAlerts = async (params = {}) => {
  const response = await axiosClient.get('/alerts', { params });
  return response;
};

// Lấy chi tiết 1 alert
export const getAlertById = async (id) => {
  const response = await axiosClient.get(`/alerts/${id}`);
  return response;
};

// Sinh alert giả lập (Dành cho Demo)
export const generateMockAlerts = async (count = 5) => {
  const response = await axiosClient.post('/alerts/generate', { count });
  return response;
};

// Sinh 1 alert cu the (20 kich ban)
export const generateCustomAlert = async (type, isTruePositive) => {
  const response = await axiosClient.post('/alerts/generate-custom', { type, isTruePositive });
  return response;
};

// Đếm các Alert 'New' trong vòng 30p kể từ lần sinh mới nhất
export const getRecentNewAlertsCount = async () => {
  const response = await axiosClient.get('/alerts/stats/recent-new');
  return response;
};

