import mongoose from 'mongoose';
import { ALERT_SEVERITY } from '../constants/alertConstant.js';

const playbookSchema = new mongoose.Schema({

  playbook_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  name: { 
    type: String, 
    required: true 
  },
  
  alert_type: { 
    type: String, 
    required: true 
  },
  
  severity: { 
    type: String, 
    enum: Object.values(ALERT_SEVERITY), 
    default: ALERT_SEVERITY.MEDIUM 
  },
  
  description: { 
    type: String, 
    default: '' 
  },
  
  webhook_path: { 
    type: String, 
    required: true 
  },
  
  // Phân biệt: false = 10 kịch bản gốc hệ thống, true = kịch bản tạo mới động
  is_custom: { 
    type: Boolean, 
    default: false 
  },

  is_active: {
    type: Boolean,
    default: true
  },

  version: { 
    type: Number, 
    default: 1 
  }
}, { timestamps: true });

export const Playbook = mongoose.model('Playbook', playbookSchema);
