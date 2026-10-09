import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendOtpEmail } from '../utils/mailer.js';
import TokenBlacklist from '../models/TokenBlackList.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('⚠️ [Auth Controller] Biến môi trường JWT_SECRET hoặc JWT_REFRESH_SECRET chưa được thiết lập. Vui lòng kiểm tra file .env');
  process.exit(1);  
}

// API Đăng ký tài khoản (Tạo Admin/Viewer)
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống' });
    }

    // Băm mật khẩu (Hash password)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo User mới
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'Viewer'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Đăng ký thành công', 
      user: { id: newUser._id.toString(), username: newUser.username, role: newUser.role } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// API Đăng nhập
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm User theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email không tồn tại' });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Sai mật khẩu' });
    }

    // Tạo JWT Token có thời hạn 5m
    const accesstoken = jwt.sign(
      { id: user._id.toString(), role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '5m' } 
    );

    const refreshtoken = jwt.sign(
      { id: user._id.toString()},
      JWT_REFRESH_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('refreshtoken', refreshtoken, {
      httpOnly: true, // Không thể truy cập bằng JS
      secure: false, // Set to true if using HTTPS
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 ngày
    });

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      accesstoken,
      user: { id: user._id.toString(), username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//API ACCESS TOKEN TỪ REFRESH TOKEN

export const refreshToken = async (req, res) => {
  try {
    const refreshtoken = req.cookies?.refreshtoken;
    if (!refreshtoken) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Refresh Token' });
    }

    const isBlacklisted = await TokenBlacklist.findOne({ token: refreshtoken });
    if (isBlacklisted) {
      return res.status(403).json({ success: false, message: 'Refresh Token đã bị thu hồi. Vui lòng đăng nhập lại.' });
    }

    const decoded = jwt.verify(refreshtoken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const newAccessToken = jwt.sign(
      { id: user._id.toString(), role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.status(200).json({
      success: true,
      accesstoken: newAccessToken
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, tokenExpired: true, message: 'Refresh Token không hợp lệ hoặc đã hết hạn' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const accesstoken = req.headers.authorization?.split(' ')[1];
    const refreshtoken = req.cookies?.refreshtoken;

    if (accesstoken) {
      const decoded = jwt.decode(accesstoken);
      const expiredAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 60 * 1000); // 30 phút
      await TokenBlacklist.create({ token: accesstoken, reason: 'Logout', expiredAt });
    }

    if (refreshtoken) {
      const decode = jwt.decode(refreshtoken);
      const expiredAt = decode?.exp ? new Date(decode.exp * 1000) : new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 giờ
      await TokenBlacklist.create({ token: refreshtoken, reason: 'Logout', expiredAt });
      
    }
    
    // Xóa cookie ở máy khách
    res.clearCookie('refreshtoken');
    
    res.status(200).json({ success: true, message: 'Đăng xuất thành công, Token vào blacklist' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// API Quên Mật Khẩu - Gửi OTP 6 số qua Gmail (Hiệu lực 60s)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email này không tồn tại trong hệ thống' });
    }

    // Sinh mã ngẫu nhiên 6 chữ số (100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Đặt thời gian hết hạn đúng 60 giây (60 * 1000 ms)
    const expires = new Date(Date.now() + 60 * 1000);

    user.resetOtp = otp;
    user.resetOtpExpires = expires;
    await user.save();

    // Gửi email
    const mailResult = await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi về Gmail của bạn (hiệu lực trong 60 giây).',
      expiresInSeconds: 60,
      // Trả về OTP trong response nếu đang chạy chế độ demo/mock để tiện kiểm thử
      ...(mailResult.mock ? { devOtp: otp } : {})
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// API Xác Thực OTP & Đặt Lại Mật Khẩu
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ email, mã OTP và mật khẩu mới' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'Chưa có yêu cầu đặt lại mật khẩu nào cho email này' });
    }

    // Kiểm tra hết hạn (Quá 60s)
    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP đã hết hạn (chỉ có hiệu lực trong 60 giây). Vui lòng yêu cầu gửi mã mới.' 
      });
    }

    // Kiểm tra khớp OTP
    if (user.resetOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác. Vui lòng thử lại.' });
    }

    // Băm mật khẩu mới và lưu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};