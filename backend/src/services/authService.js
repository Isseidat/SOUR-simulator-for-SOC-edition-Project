import bcrypt from "bcryptjs";
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import TokenBlacklist from "../models/TokenBlackList.js";
import { sendOtpEmail } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Khởi tạo tài khoản mẫu cho User
export const seedDefaultUsers  = async () => {
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
    } catch (error) {
        console.error(` [Send Error]:` ,error.message);
    }
};


// Đăng ký tài khoản mới
export const registerUser = async ({ username, email, password, role }) => {
    // Kiểm tra email và username tồn tại
    const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase().trim()}, { username: username.trim()}]
    });
    if (existingUser) {
        const field = existingUser.email === email.toLowerCase().trim() ? 'Email' : 'Tên tài khoản Username';
        throw new Error(`${field} đã tồn tại trong hệ thống`);
    }
    
    //Băm password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //Tạo User mới
    const newUser = await User.create({
        username: username.trim(),
        email : email.toLowerCase().trim(),
        password: hashedPassword,
        role: role === 'Admin' ? 'Admin' : 'Viewer',
        isOnline: false,
        lastLoginAt: null,
        lastActiveAt: null
    })
    return {
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
    }
};


// Lấy dữ liệu User
export const getUsersInfo = async () => {

    // Tính toán trong vòng 60p
    const users = await User.find({}, '-password -resetOtp -resetOtpExpires').sort({ createdAt: -1 });
    const processedUsers = users.map(u => {

        const uObj = u.toObject();
        const lastActive = uObj.lastActiveAt || uObj.lastLoginAt;

        //CHeck trong vòng 60p
        const isRecentlyActive = lastActive && (Date.now() - new Date(lastActive).getTime()) < 60 * 60 * 1000;
        uObj.isOnline = Boolean(uObj.isOnline && isRecentlyActive);
        return uObj;
    });
    return processedUsers;
}


export const deleteDataUser = async ({targetUserID, currentUserID}) => {
    //Chặn xóa tài khoản đang hoạt động
    if ( currentUserID === targetUserID) {
        throw new Error('Không thể xóa tài khoản đang sử dụng');
    }
    
    const deletedUser = await User.findByIdAndDelete(targetUserID);
    if (!deletedUser) {
        throw new Error('Không tìm thấy tài khoản cần xóa');
    }
    return deletedUser;
}


// Đăng nhập
export const loginForUser = async ({ email, password }) => {
    // Tìm User theo email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new Error('Email không tồn tại');
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Sai mật khẩu');
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

    return {
        message: 'Đăng nhập thành công',
        accesstoken,
        refreshtoken,
        user: {
            id: user._id.toString(), 
            username: user.username, 
            role: user.role, 
            email: user.email,
            isOnline: true,
            lastLoginAt: user.lastLoginAt
        }
    }
}

export const refreshAccessToken = async ({ refreshtoken }) => {

    if (!refreshtoken) {
        throw new Error('Vui lòng cung cấp Refresh Token');
    }

    const isBlacklisted = await TokenBlacklist.findOne({ token: refreshtoken });
    if (isBlacklisted) { 
        throw new Error('Refresh Token đã bị thu hồi. Vui lòng đăng nhập lại.');
    }

    const decoded = jwt.verify(refreshtoken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
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

    return newAccessToken;
}


export const logoutUser = async ({ accesstoken, refreshtoken }) => {

    if (!accesstoken && !refreshtoken) {
        throw new Error('Không tìm thấy Token xác thực để đăng xuất');
    }

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

    return {message: 'Đăng xuất thành công, Token đã được đưa vào danh sách đen'};
}


export const forgotPasswordUser = async ({ email }) => {

    if (!email) {
        throw new Error ('Vui lòng cung cấp địa chỉ email' );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
        throw new Error ('Email này không tồn tại trong hệ thống' );
    }

    // Sinh mã ngẫu nhiên 6 chữ số (100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Đặt thời gian hết hạn đúng 60 giây (60 * 1000 ms)
    const expires = new Date(Date.now() + 60 * 1000);

    user.resetOtp = otp;
    user.resetOtpExpires = expires;
    await user.save();

    // Gửi email
    const mailResult = await sendOtpEmail(user.email, otp);

    return { 
      message: 'Mã xác thực OTP đã được gửi về Gmail của bạn (hiệu lực trong 60 giây).', 
      expiresInSeconds: 60,
      devOtp: mailResult.mock ? otp: undefined 
    };
}


export const verifyOtpAndResetPassword = async ({ email, otp, newPassword }) => {
    
    if (!email || !otp || !newPassword) {
      throw new Error ( 'Vui lòng điền đầy đủ email, mã OTP và mật khẩu mới' );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new Error ( 'Người dùng không tồn tại' );
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      throw new Error ( 'Chưa có yêu cầu đặt lại mật khẩu nào cho email này' );
    }

    // Kiểm tra hết hạn (Quá 60s)
    if (new Date() > new Date(user.resetOtpExpires)) {
      throw new Error ( 'Mã OTP đã hết hạn (chỉ có hiệu lực trong 60 giây). Vui lòng yêu cầu gửi mã mới.' );
    }

    // Kiểm tra khớp OTP
    if (user.resetOtp !== otp.trim()) {
      throw new Error ( 'Mã OTP không chính xác. Vui lòng thử lại.' );
    }

    // Băm mật khẩu mới và lưu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return {
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
    }
}