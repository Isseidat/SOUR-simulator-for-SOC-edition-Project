import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/authConstants.js';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: Object.values(USER_ROLES), default: USER_ROLES.ANALYST},
  isOnline: { type: Boolean, default: false },
  lastLoginAt: { type: Date, default: null },
  lastActiveAt: { type: Date, default: null },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
