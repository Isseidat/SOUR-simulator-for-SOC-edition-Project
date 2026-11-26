import { ExecutionLog } from '../models/ExecutionLog.js';
import { Alert } from '../models/Alert.js';


export const getExecutionLogsService = async ({ alert_id, status, limit = 10, page = 1, search } = {}) => {
    const filter = {};
    if (status) filter.status = status;
    
      if (alert_id && String(alert_id).trim()) {
        filter.alert_id = String(alert_id).trim();
      }

      if (search && String(search).trim()) {
        const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      const email = l.victim_email || alertInfo?.victim_email || '';
      return {
        ...l,
        victim_email: email,
        alert_type: alertInfo?.type,
        alert_severity: alertInfo?.severity
      };
    });

    return {
        total: totalLogs,
        page: pageNum,
        totalPages: Math.ceil(totalLogs / limitNum),
        data: logs
    };
}