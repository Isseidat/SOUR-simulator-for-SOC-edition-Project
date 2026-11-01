import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Viewer'], default: 'Viewer' },
  isOnline: { type: Boolean, default: false },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
