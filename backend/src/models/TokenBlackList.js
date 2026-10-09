import mongoose from 'mongoose';

const tokenBlackListSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String,
    default: 'User Logout'
  },
  expiredAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Tự động xóa token khi hết hạn
  }
}, { timestamps: true });

export default mongoose.model('TokenBlackList', tokenBlackListSchema);