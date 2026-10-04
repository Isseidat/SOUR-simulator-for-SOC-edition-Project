import axios from "axios";

// Khởi tạo cầu nối axios tới Backend
const axiosClient = axios.create({
  baseURL: "http://localhost:3000/api/v1", // Địa chỉ Backend
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Tự động đính kèm Token vào Header trước khi gửi request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Lấy token JWT
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
  (error) => {
    const status = error.response ? error.response.status : null;
    const msg = error.response?.data?.message || "";

    // Bắt mã 401 (Unauthorized) hoặc 403 (Token hết hạn/không hợp lệ)
    if (
      status === 401 ||
      (status === 403 &&
        (msg.includes("Token") ||
          msg.includes("hết hạn") ||
          msg.includes("xác thực")))
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
