import { config } from '../config/env.js';
import * as authService from '../services/authService.js';

const JWT_SECRET = config.jwt.secret;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;

// API Đăng ký / Tạo tài khoản mới (Chỉ dành cho Quản trị viên Admin)
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ Tên người dùng, Email và Mật khẩu' });
    }

    // Gọi Service Register
    const { message, user } = await authService.registerUser({ username, email, password, role });

    return res.status(201).json({ 
      success: true, 
      message, 
      user
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// API Lấy danh sách tất cả tài khoản (Chỉ Admin)
export const getUsers = async (req, res) => {
  try {
    const users = await authService.getUsersInfo();
    return res.status(200).json({ 
      success: true, 
      users,
      total: users.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API Xóa tài khoản (Chỉ Admin, không được tự xóa chính mình)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserID = req.user?.id;
    const deletedUser = await authService.deleteDataUser({ targetUserID: id, currentUserID });

    return res.status(200).json({ 
      success: true, 
      message: `Đã xóa tài khoản "${deletedUser.username}" (${deletedUser.email}) thành công`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// API Đăng nhập
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin Email và Mật khẩu' });
    }

    const { message, accesstoken, refreshtoken, user } = await authService.loginForUser({ email, password });

    res.cookie('refreshtoken', refreshtoken, {
      httpOnly: true, 
      secure: false, 
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 ngày
    });

    return res.status(200).json({
      success: true,
      message,
      accesstoken,
      user
    });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// API ACCESS TOKEN TỪ REFRESH TOKEN
export const refreshToken = async (req, res) => {
  try {
    const refreshtoken = req.cookies?.refreshtoken;
    const newAccessToken = await authService.refreshAccessToken ({ refreshtoken });

    return res.status(200).json({
      success: true,
      accesstoken: newAccessToken
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, tokenExpired: true, message: 'Refresh Token không hợp lệ hoặc đã hết hạn' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API đăng xuất
export const logout = async (req, res) => {
  try {
    const accesstoken = req.headers.authorization?.split(' ')[1];
    const refreshtoken = req.cookies?.refreshtoken;

    const { message } = await authService.logoutUser({ accesstoken, refreshtoken });
    
    // Xóa cookie ở máy khách
    res.clearCookie('refreshtoken');
    
    return res.status(200).json({ 
      success: true, 
      message 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// API Quên Mật Khẩu - Gửi OTP 6 số qua Gmail (Hiệu lực 60s)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { message, expiresInSeconds, devOtp } = await authService.forgotPasswordUser({ email });

    return res.status(200).json({
      success: true,
      message,
      expiresInSeconds,
      ...(devOtp ? { devOtp } : {})
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message }); 
  }
};


// API Xác Thực OTP & Đặt Lại Mật Khẩu
export const resetPassword = async (req, res) => {  
  try {
    const { email, otp, newPassword } = req.body;
  
    const { message } = await authService.verifyOtpAndResetPassword({ email, otp, newPassword });

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
