import mongoose from 'mongoose';

const executionLogSchema = new mongoose.Schema({
  execution_id: { type: String, required: true },
  alert_id: { type: String, required: true },
  step_name: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILED', 'IN_PROGRESS'], 
    default: 'SUCCESS' 
  },
  // Đối tượng đã thực hiện hành động này (SOAR-System hoặc Email của Analyst)
  executed_by: { 
    type: String, 
    default: 'SOAR-System' 
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const ExecutionLog = mongoose.model('ExecutionLog', executionLogSchema);