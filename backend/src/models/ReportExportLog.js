import mongoose from 'mongoose';
import { EXPORT_FORMAT, SCOPE, USER_ROLES } from '../constants/index.js';

const reportExportLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exported_by_email: {
      type: String,
      required: true,
      trim: true,
    },
    exported_by_name: {
      type: String,
      default: '',
      trim: true,
    },
    exported_by_role: {
      type: String,
      default: USER_ROLES.VIEWER,
    },
    format: {
      type: String,
      enum: Object.values(EXPORT_FORMAT),
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: Object.values(SCOPE),
      required: true,
    },
    alert_id: {
      type: String,
      default: null,
    },
    file_name: {
      type: String,
      required: true,
      trim: true,
    },
    ip_address: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const ReportExportLog = mongoose.model('ReportExportLog', reportExportLogSchema);
