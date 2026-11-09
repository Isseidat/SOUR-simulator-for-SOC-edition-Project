import { Alert } from "../models/Alert.js";
import { generateSingleMockAlert, generateSpecificMockAlert } from "../utils/mockGenerator.js";


// Alert custom
export const generateAlertsService = async ({ count = 5 }) => {
    
    const alertCount = parseInt(count) || 5;
    const mockData = Array.from({ length: alertCount }, () => generateSingleMockAlert());
    
    const createdAlerts = await Alert.insertMany(mockData);
    return createdAlerts; 
};


export const generateCustomAlertService = async ({ type, isTruePositive }) => {

    if (!type) {
        throw new Error ( 'Thiếu phân loại kịch bản');
    }

    const mockData = generateSpecificMockAlert(type, isTruePositive);
    const createdAlert = await Alert.create(mockData);
    return createdAlert;
}



export const getAlertsService = async ({ severity, status, page = 1, limit = 10, tag, search, last_id }) => {
    const filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { alert_id: regex },
        { type: regex },
        { source_ip: regex },
        { destination_ip: regex }
      ];
    }

    // Base filter for counting absolute total
    const baseFilter = { ...filter };

    // Cursor-based Pagination logic
    // Dựa vào _id của bản ghi cuối trang trước để truy vấn trang tiếp theo (nhanh hơn skip)
    if (last_id) {
      filter._id = { $lt: last_id };
    }

    // Đảm bảo sort ổn định để cursor hoạt động đúng.
    let query = Alert.find(filter).sort({ _id: -1 });

    // Hybrid execution:
    if (last_id) {
      // Nếu có last_id (Cursor-based) thì bỏ qua skip, chỉ limit để chống tràn RAM.
      query = query.limit(Number(limit));
    } else {
      // Nếu chưa có last_id (Offset-based) cho những trang đầu tiên / lúc người dùng nhảy cóc.
      query = query.skip((page - 1) * limit).limit(Number(limit));
    }

    const alerts = await query;
    const total = await Alert.countDocuments(baseFilter);

    return {
        total,
        page: Number(page),
        limit: Number(limit),
        last_id: alerts.length > 0 ? alerts[alerts.length - 1]._id : null,
        data: alerts
    };
}


export const getAlertByIdService = async ({ alertId }) => {
    const alert = await Alert.findOne({ alert_id: alertId });
    if (!alert) {
        throw new Error ('Alert không tồn tại');
    }
    return alert;
}


export const getRecentNewAlertsCountService = async () => {
    const latestAlert = await Alert.findOne().sort({ createdAt: -1 });
    
    if (!latestAlert) {
          return { count: 0, isWithin30Min: false, latestTimestamp: null }; 
        }
    
    const latestTime = new Date(latestAlert.createdAt).getTime();
    const now = Date.now();
    const thirtyMinutesMs = 30 * 60 * 1000;
    const isWithin30Min = (now - latestTime) <= thirtyMinutesMs;

    let count = 0;
    if (isWithin30Min) {
        const thirtyMinutesAgo = new Date(now - thirtyMinutesMs);
        count = await Alert.countDocuments({
        status: 'New',
        createdAt: { $gte: thirtyMinutesAgo }
        });
    }

    return {
        count,
        isWithin30Min,
        latestTimestamp: latestAlert.createdAt 
    };
}


export const getDashboardStatsService = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats] = await Alert.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } }
          ],
          byScenario: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          pending: [
            {
              $match: {
                status: { $in: ['New', 'In Progress'] }
              }
            },
            { $count: 'count' }
          ],
          critical: [
            {
              $match: {
                severity: 'Critical'
              }
            },
            { $count: 'count' }
          ],
          successToday: [
            {
              $match: {
                status: { $in: ['Resolved', 'Closed - False Positive'] },
                $expr: {
                  $gte: [
                    { $ifNull: ['$timestamp', '$createdAt'] },
                    today
                  ]
                }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const total = stats?.total?.[0]?.count || 0;
    const pending = stats?.pending?.[0]?.count || 0;
    const critical = stats?.critical?.[0]?.count || 0;
    const successToday = stats?.successToday?.[0]?.count || 0;

    const severityCounts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    (stats?.bySeverity || []).forEach(item => {
      if (item._id && severityCounts.hasOwnProperty(item._id)) {
        severityCounts[item._id] = item.count;
      }
    });

    const scenarioCounts = {};
    (stats?.byScenario || []).forEach(item => {
      if (item._id) {
        scenarioCounts[item._id] = item.count;
      }
    });

    return {
        total,
        pending, 
        critical, 
        successToday,
        severityCounts,
        scenarioCounts
    };
}


export const getCronJobStatusService = async () => {
    const { getCronDetailedStatus } = await import('../jobs/cronJobs.js');
    const details = getCronDetailedStatus();

    return {
        isActive: details.isOverAllActive,
        simulator: details.simulator,
        autoTriage: details.autoTriage,
    };
}


export const toggleCronJobService = async ({ active }) => {
    const { getCronStatus, setCronStatus } = await import('../jobs/cronJobs.js');
    const nextStatus = typeof active === 'boolean' ? active : !getCronStatus();
    const updatedStatus = setCronStatus(nextStatus);

    return {
      updatedStatus,
      message: `Đã ${updatedStatus ? 'bật (khôi phục)' : 'tắt (tạm dừng)'} toàn bộ Cron Jobs ngầm.`
    };
}


export const toggleSimulatorJobService = async ({ active }) => {
    const { toggleSimulator } = await import('../jobs/cronJobs.js');
    const simulator = toggleSimulator( active );

    return {
      simulator
    };
}


export const toggleAutoTriageService = async ({ active }) => {
    const { toggleAutoTriage: toggleTriage } = await import('../jobs/cronJobs.js');
    const autoTriage = toggleTriage(active);

    return {
      autoTriage
    };
}


export const updateAutoTriageSettingsService = async (body) => {
    const { updateAutoTriageConfig } = await import('../jobs/cronJobs.js');
    const autoTriage = updateAutoTriageConfig(body);

    return {
      autoTriage
    };
}