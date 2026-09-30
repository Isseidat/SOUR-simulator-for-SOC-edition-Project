import mongoose from 'mongoose';

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
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true 
  },
  source_ip: { type: String, required: true },
  destination_ip: { type: String, required: true },
  victim_email: { type: String },
  payload: { type: Object, required: true },
  status: { 
    type: String, 
    enum: ['New', 'In Progress', 'Resolved', 'Closed - False Positive', 'Closed - Error'],
    default: 'New' 
  },
  // Mảng tags đánh dấu luồng xử lý của SOAR chống trùng lặp (soar-processing, soar-done, soar-error)
  tags: { 
    type: [String], 
    default: [] 
  }
}, { timestamps: true });

export const Alert = mongoose.model('Alert', alertSchema);