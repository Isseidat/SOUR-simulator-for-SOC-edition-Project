import axios from 'axios';

// Khởi tạo cầu nối axios tới Backend
const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1', // Địa chỉ Backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động đính kèm Token vào Header trước khi gửi request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Lấy token JWT
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý lỗi trả về (vd: Hết hạn token thì văng ra login)
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Xóa token và văng ra trang đăng nhập
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
