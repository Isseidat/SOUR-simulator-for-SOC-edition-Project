import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendOtpEmail } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'soar_jwt_secret_key_2026';

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
      user: { id: newUser._id, username: newUser.username, role: newUser.role } 
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

    // Tạo JWT Token có thời hạn 1 ngày
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
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