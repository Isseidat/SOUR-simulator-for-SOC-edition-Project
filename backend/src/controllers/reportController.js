import * as reportService from '../services/reportService.js';

// POST /api/reports/export-logs - Ghi nhận lịch sử người dùng trích xuất báo cáo
export const createReportExportLog = async (req, res) => {
  try {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim()) ||
      req.ip ||
      '';

    const data = await reportService.createReportExportLogService({
      user: req.user,
      payload: req.body,
      ipAddress,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/export-logs - Tra cứu lịch sử trích xuất báo cáo (Admin)
export const getReportExportLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, format, scope, search } = req.query;
    const result = await reportService.getReportExportLogsService({
      page,
      limit,
      format,
      scope,
      search,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
