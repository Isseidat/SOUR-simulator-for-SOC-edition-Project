import mongoose from 'mongoose';
import { ALERT_STATUS, ALERT_SEVERITY } from '../constants/alertConstant.js';

const alertSchema = new mongoose.Schema({
  alert_id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['Phishing Email', 'Brute Force Attack', 'Malware Detection', 'Suspicious Login', 'Port Scan Detection', 
          'NoSQL Injection Detection', 'Cross-Site Scripting (XSS)', 'Insecure Direct Object Reference (IDOR)', 'Credential Stuffing', 'Server-Side Request Forgery (SSRF)'],
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