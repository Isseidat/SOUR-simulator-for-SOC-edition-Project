import jwt from 'jsonwebtoken';
import TokenBlacklist from '../models/TokenBlackList.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = config.jwt.secret;

export const verifyToken = async (req, res, next) => {
  
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Yêu cầu Token Xác thực' });
  }
  
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu Token xác thực' });
  }

  try {
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(403).json({ success: false, message: 'Token đã bị thu hồi. Vui lòng đăng nhập lại.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = await User.findById(decoded.id).select('_id email role').lean();

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        userDeleted: true,
        message: 'Tài khoản không tồn tại hoặc bị xóa'
      });
    }

    req.user = {
      id: currentUser._id.toString(),
      email: currentUser.email,
      role: currentUser.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, tokenExpired: true, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    logger.debug(
      { userId: req.user?.id, userRole: req.user?.role, requiredRoles: roles },
      'Checking role authorization'
    );
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Quyền truy cập bị từ chối. Bạn cần quyền [${roles.join(', ')}] để thực hiện thao tác này.` 
      });
    }
    next();
  };
};