import mongoose from 'mongoose';
import { ALERT_STATUS, ALERT_SEVERITY, EMAIL_TYPE, ALERT_TAGS } from '../constants/alertConstant.js';

const alertSchema = new mongoose.Schema({
  alert_id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: Object.values(EMAIL_TYPE),
    required: true
  },
  severity: { 
    type: String, 
    enum: Object.values(ALERT_SEVERITY),
    default: ALERT_SEVERITY.LOW,
    required: true
  },
  source_ip: { type: String, required: true },
  destination_ip: { type: String, required: true },
  victim_email: { type: String },
  payload: { type: Object, required: true },
  status: { 
    type: String, 
    enum: Object.values(ALERT_STATUS),
    default: ALERT_STATUS.NEW
  },
  // Mảng tags đánh dấu luồng xử lý của SOAR chống trùng lặp (soar-processing, soar-done, soar-error)
  tags: { 
    type: [String], 
    default: [] 
  }
}, { timestamps: true });

export const Alert = mongoose.model('Alert', alertSchema);