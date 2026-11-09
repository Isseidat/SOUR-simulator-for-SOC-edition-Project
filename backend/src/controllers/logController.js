import * as logService from '../services/logService.js'

// GET /api/v1/logs - Lấy danh sách lịch sử thực thi SOAR kèm bộ lọc
export const getExecutionLogs = async (req, res) => {
  try {
    const { alert_id, status, limit = 10, page = 1, search } = req.query;
    
    const result = await logService.getExecutionLogsService ({ alert_id, status, limit, page, search});

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
