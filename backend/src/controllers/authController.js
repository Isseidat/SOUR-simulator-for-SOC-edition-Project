import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendOtpEmail } from '../utils/mailer.js';
import TokenBlacklist from '../models/TokenBlackList.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('⚠️ [Auth Controller] Biến môi trường JWT_SECRET hoặc JWT_REFRESH_SECRET chưa được thiết lập. Vui lòng kiểm tra file .env');
  process.exit(1); 
} else {
  console.log('✅ [Auth Controller] JWT_SECRET và JWT_REFRESH_SECRET chạy thành công.');
}

// Khởi tạo tài khoản mẫu ban đầu nếu hệ thống chưa có dữ liệu
export const seedDefaultUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await User.create([
        {
          username: 'Quản Trị Viên SOC',
          email: 'admin@company.com',
          password: hashedPassword,
          role: 'Admin',
          isOnline: false,
        },
        {
          username: 'Chuyên Viên Phân Tích',
          email: 'viewer@company.com',
          password: hashedPassword,
          role: 'Viewer',
          isOnline: false,
        }
      ]);
      console.log('✅ [Seed] Đã khởi tạo 2 tài khoản mẫu: admin@company.com và viewer@company.com');
    }
  } catch (err) {
    console.error('⚠️ [Seed Error]:', err.message);
  }
};

// API Đăng ký / Tạo tài khoản mới (Chỉ dành cho Quản trị viên Admin)
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ Tên người dùng, Email và Mật khẩu' });
    }

    // Kiểm tra email hoặc username đã tồn tại chưa
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }] 
    });
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase().trim() ? 'Email' : 'Tên tài khoản (Username)';
      return res.status(400).json({ success: false, message: `${field} đã tồn tại trong hệ thống` });
    }

    // Băm mật khẩu (Hash password)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo User mới (Chỉ chấp nhận role 'Admin' hoặc 'Viewer', mặc định 'Viewer')
    const newUser = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role === 'Admin' ? 'Admin' : 'Viewer',
      isOnline: false,
      lastLoginAt: null,
      lastActiveAt: null
    });

    res.status(201).json({ 
      success: true, 
      message: 'Tạo tài khoản thành công', 
      user: { 
        id: newUser._id.toString(),
        _id: newUser._id.toString(),
        username: newUser.username, 
        email: newUser.email,
        role: newUser.role,
        isOnline: newUser.isOnline,
        lastLoginAt: newUser.lastLoginAt,
        createdAt: newUser.createdAt
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// API Lấy danh sách tất cả tài khoản (Chỉ Admin)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetOtp -resetOtpExpires').sort({ createdAt: -1 });

    // Tính toán trạng thái online chính xác
    const processedUsers = users.map(u => {
      const uObj = u.toObject();
      const lastActive = uObj.lastActiveAt || uObj.lastLoginAt;
      // Nếu có tín hiệu hoạt động trong vòng 60 phút gần nhất thì coi là Online
      const isRecentlyActive = lastActive && (Date.now() - new Date(lastActive).getTime()) < 60 * 60 * 1000;
      uObj.isOnline = Boolean(uObj.isOnline && isRecentlyActive);
      return uObj;
    });

    res.status(200).json({ 
      success: true, 
      users: processedUsers,
      total: processedUsers.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// API Xóa tài khoản (Chỉ Admin, không được tự xóa chính mình)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Không được tự xóa tài khoản của chính mình
    if (req.user?.id === id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản cần xóa' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Đã xóa tài khoản "${deletedUser.username}" (${deletedUser.email}) thành công` 
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

    // Cập nhật trạng thái trực tuyến và thời gian đăng nhập
    user.isOnline = true;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

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
      user: { 
        id: user._id.toString(), 
        username: user.username, 
        role: user.role, 
        email: user.email,
        isOnline: true,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// API ACCESS TOKEN TỪ REFRESH TOKEN
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

    // Cập nhật hoạt động
    user.isOnline = true;
    user.lastActiveAt = new Date();
    await user.save();

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
      if (decoded?.id) {
        await User.findByIdAndUpdate(decoded.id, { isOnline: false });
      }
    }

    if (refreshtoken) {
      const decode = jwt.decode(refreshtoken);
      const expiredAt = decode?.exp ? new Date(decode.exp * 1000) : new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 giờ
      await TokenBlacklist.create({ token: refreshtoken, reason: 'Logout', expiredAt });
      if (decode?.id) {
        await User.findByIdAndUpdate(decode.id, { isOnline: false });
      }
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
