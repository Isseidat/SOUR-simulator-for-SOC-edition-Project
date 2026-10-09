import axios from "axios";

// -- MEMORY STATE CHO ACCESS TOKEN --
let memoryToken = null;
export const setMemoryToken = (token) => {
  memoryToken = token;
};
export const getMemoryToken = () => memoryToken;



// Khởi tạo cầu nối axios tới Backend
const axiosClient = axios.create({
  baseURL: "http://localhost:3000/api/v1", // Địa chỉ Backend
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true // Luôn gửi kèm Cookie
});

// Interceptor: Tự động đính kèm Token vào Header trước khi gửi request
axiosClient.interceptors.request.use(
  (config) => {
    const token = getMemoryToken(); // Lấy token từ RAM, không chạm vào localStorage
    
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor: Xử lý lỗi trả về (Hết hạn hoặc token không hợp lệ thì tự động logout)
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
     originalRequest._retry = true;
     
     try{
      // Gọi API xin cấp mới Access Token (Trình duyệt tự kẹp Cookie lên)
      const res = await axios.post("http://localhost:3000/api/v1/auth/refresh", {}, { withCredentials: true });

      if (res.data && res.data.accesstoken) {
        setMemoryToken(res.data.accesstoken); // Lưu token mới vào RAM
        originalRequest.headers["Authorization"] = `Bearer ${res.data.accesstoken}`;
        return axiosClient(originalRequest);
      }
      
     }
     catch (refreshError) {
     setMemoryToken(null);
     localStorage.removeItem("user");
     if (!window.location.pathname.includes("/login")) 
     {
       window.location.href = "/login?expired=true";
     }
     return Promise.reject(refreshError);

        
      }
    }
  }
);

export default axiosClient;
