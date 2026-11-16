import { ReportExportLog } from '../models/ReportExportLog.js';
import { User } from '../models/User.js';
import { EXPORT_FORMAT, SCOPE, USER_ROLES } from '../constants/index.js';

const VALID_FORMATS = Object.values(EXPORT_FORMAT);
const VALID_SCOPES = Object.values(SCOPE);

export const createReportExportLogService = async ({
  user,
  payload,
  ipAddress = '',
}) => {
  const { format, scope, alert_id = null, file_name } = payload || {};

  if (!VALID_FORMATS.includes(format)) {
    const err = new Error('Định dạng báo cáo không hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_SCOPES.includes(scope)) {
    const err = new Error('Phạm vi xuất báo cáo không hợp lệ.');
    err.statusCode = 400;
    throw err;
  }

  if (!file_name || typeof file_name !== 'string') {
    const err = new Error('Thiếu tên file báo cáo.');
    err.statusCode = 400;
    throw err;
  }

  const dbUser = user?.id
    ? await User.findById(user.id).select('username name email role').lean()
    : null;

  const doc = await ReportExportLog.create({
    user_id: user.id,
    exported_by_email: dbUser?.email || user.email || 'unknown@soc.local',
    exported_by_name: dbUser?.name || dbUser?.username || '',
    exported_by_role: dbUser?.role || user.role || USER_ROLES.VIEWER,
    format,
    scope,
    alert_id: scope === SCOPE.SINGLE ? alert_id : null,
    file_name: file_name.trim(),
    ip_address: ipAddress,
  });

  return doc;
};

export const getReportExportLogsService = async ({
  page = 1,
  limit = 20,
  format,
  scope,
  search,
}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const query = {};
  if (format && VALID_FORMATS.includes(format)) query.format = format;
  if (scope && VALID_SCOPES.includes(scope)) query.scope = scope;
  if (search && String(search).trim()) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { exported_by_email: regex },
      { exported_by_name: regex },
      { file_name: regex },
      { alert_id: regex },
    ];
  }

  const [data, total] = await Promise.all([
    ReportExportLog.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    ReportExportLog.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};
