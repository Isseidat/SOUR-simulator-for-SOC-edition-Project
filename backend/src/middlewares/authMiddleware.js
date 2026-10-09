import jwt from 'jsonwebtoken';
import TokenBlacklist from '../models/TokenBlackList.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️ [Auth Middleware] Biến môi trường JWT_SECRET chưa được thiết lập. Vui lòng kiểm tra file .env');
  process.exit(1);
}

export const verifyToken = async (req, res, next) => {
  
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Yêu cầu Token xác thực' });
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, tokenExpired: true, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    console.log(`[Auth Middleware]: Kiểm tra quyền truy cập cho người dùng: ${JSON.stringify(req.user)}`);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Quyền truy cập bị từ chối. Bạn cần quyền [${roles.join(', ')}] để thực hiện thao tác này.` 
      });
    }
    next();
  };
};