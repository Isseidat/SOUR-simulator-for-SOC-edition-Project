import mongoose from 'mongoose';

const playbookSchema = new mongoose.Schema({
  // Mã định danh kịch bản (duy nhất, ví dụ: pb_phishing_email, pb_ransomware_11)
  playbook_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Tên hiển thị kịch bản (VD: Kịch bản 1: Phishing Email)
  name: { 
    type: String, 
    required: true 
  },
  
  // Khớp với alert.type để tự động bắt đúng kịch bản (VD: Phishing Email, Brute Force Attack)
  alert_type: { 
    type: String, 
    required: true 
  },
  
  // Mức độ ưu tiên/nguy cấp
  severity: { 
    type: String, 
    enum: ['Critical', 'High', 'Medium', 'Low'], 
    default: 'Medium' 
  },
  
  // Mô tả quy trình xử lý
  description: { 
    type: String, 
    default: '' 
  },
  
  // Đường dẫn Webhook n8n tương ứng (VD: /webhook/trigger-phishing)
  webhook_path: { 
    type: String, 
    required: true 
  },
  
  // Phân biệt: false = 10 kịch bản gốc hệ thống, true = kịch bản tạo mới động
  is_custom: { 
    type: Boolean, 
    default: false 
  },

  // Trạng thái kích hoạt (true = cho phép chạy tự động khi có alert)
  is_active: {
    type: Boolean,
    default: true
  },

  // Quản lý phiên bản kịch bản
  version: { 
    type: Number, 
    default: 1 
  }
}, { timestamps: true });

export const Playbook = mongoose.model('Playbook', playbookSchema);
