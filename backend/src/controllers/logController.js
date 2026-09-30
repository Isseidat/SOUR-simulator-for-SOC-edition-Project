import { ExecutionLog } from '../models/ExecutionLog.js';

// GET /api/v1/logs - Lấy danh sách lịch sử thực thi SOAR kèm bộ lọc
export const getExecutionLogs = async (req, res) => {
  try {
    const { alert_id, status, limit = 10, page = 1, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    
    const query = search || alert_id;
    if (query && query.trim()) {
      const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { alert_id: regex },
        { execution_id: regex },
        { step_name: regex },
        { message: regex },
        { executed_by: regex }
      ];
    }

    const limitNum = Number(limit) || 10;
    const pageNum = Number(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    const totalLogs = await ExecutionLog.countDocuments(filter);
    
    const logs = await ExecutionLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total: totalLogs,
      page: pageNum,
      totalPages: Math.ceil(totalLogs / limitNum),
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
