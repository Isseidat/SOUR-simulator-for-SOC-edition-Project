import { ExecutionLog } from '../models/ExecutionLog.js';
import { Alert } from '../models/Alert.js';

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
        { executed_by: regex },
        { victim_email: regex }
      ];
    }

    const limitNum = Number(limit) || 10;
    const pageNum = Number(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    const totalLogs = await ExecutionLog.countDocuments(filter);
    
    const rawLogs = await ExecutionLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Tra cứu thông tin Alert (victim_email) tương ứng với từng alert_id
    const alertIds = [...new Set(rawLogs.map(l => l.alert_id).filter(Boolean))];
    const relatedAlerts = await Alert.find({ alert_id: { $in: alertIds } })
      .select('alert_id victim_email type severity')
      .lean();
    const alertMap = new Map(relatedAlerts.map(a => [a.alert_id, a]));

    const logs = rawLogs.map((l) => {
      const alertInfo = alertMap.get(l.alert_id);
      const email = l.victim_email || alertInfo?.victim_email || 'isseidat159@gmail.com';
      return {
        ...l,
        victim_email: email,
        alert_type: alertInfo?.type,
        alert_severity: alertInfo?.severity
      };
    });

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
