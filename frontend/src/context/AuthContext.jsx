import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import axiosClient from "../api/axiosClient";

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

  const logout = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const scheduleAutoLogout = (token) => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const timeLeft = payload.exp * 1000 - Date.now();
    if (timeLeft <= 0) {
      logout();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    } else {
      logoutTimerRef.current = setTimeout(() => {
        logout();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login?expired=true";
        }
      }, timeLeft);
    }
  };

  // Khi tải trang, kiểm tra xem token còn hạn không
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        setUser({
          id: payload.id,
          email: payload.email || "admin@company.com",
          role: payload.role || "Admin",
        });
        scheduleAutoLogout(token);
      } else {
        // Token đã hết hạn từ trước -> Văng ra đăng nhập
        logout();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login?expired=true";
        }
      }
    }
    setLoading(false);

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
      if (response.token) {
        localStorage.setItem("token", response.token);
        const payload = parseJwt(response.token);
        const userData = {
          id: payload?.id || response.user?.id,
          email: payload?.email || response.user?.email || email,
          role: payload?.role || response.user?.role || "Admin",
        };
        setUser(userData);
        scheduleAutoLogout(response.token);
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
