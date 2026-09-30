import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi tải trang, kiểm tra xem có token cũ chưa (để duy trì đăng nhập)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Tạm thời mock user, thực tế có thể lấy từ /api/auth/me
      setUser({ email: 'admin@company.com', role: 'Admin' });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      if (response.token) {
        localStorage.setItem('token', response.token);
        setUser({ email, role: 'Admin' }); // Giả định
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi đăng nhập' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
