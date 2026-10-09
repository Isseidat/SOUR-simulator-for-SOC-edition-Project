import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import axiosClient, { setMemoryToken } from "../api/axiosClient";

const AuthContext = createContext();

// Helper giải mã an toàn payload của JWT
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);

  const logout = async () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    
    // Xóa Memory Token và user
    setMemoryToken(null);
    localStorage.removeItem("user");
    setUser(null);
    
    // Gọi API để Server xóa HTTP-Only Cookie
    try {
      await axiosClient.post("/auth/logout");
    } catch (e) {
      // Bỏ qua lỗi nếu mạng rớt
    }
    
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  };



  // Khi tải trang (F5), thực hiện Silent Refresh ngay lập tức để lấy Token vào Memory
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tự động gửi Cookie lên Server để xin Access Token
        const response = await axiosClient.post("/auth/refresh");
        
        if (response.accesstoken) {
          setMemoryToken(response.accesstoken); // Nạp vào Memory
          const payload = parseJwt(response.accesstoken);
          
          if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
            setUser({
              id: payload.id,
              email: payload.email || "admin@company.com",
              role: payload.role || "Admin",
            });
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log("Phiên đăng nhập hết hạn hoặc chưa đăng nhập.");
      }
      
      // Nếu không lấy được token, dọn dẹp và bắt Login (chỉ khi đang không ở trang login)
      setMemoryToken(null);
      localStorage.removeItem("user");
      setUser(null);
      setLoading(false);
      
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    };

    initAuth();

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axiosClient.post("/auth/login", {
        email,
        password,
      });
      if (response.accesstoken) {
        setMemoryToken(response.accesstoken); // Chuyển sang lưu Memory, không dùng LocalStorage
        
        const payload = parseJwt(response.accesstoken);
        const userData = {
          id: payload?.id || response.user?.id,
          email: payload?.email || response.user?.email || email,
          role: payload?.role || response.user?.role || "Admin",
        };
        setUser(userData);
        
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Lỗi đăng nhập",
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
