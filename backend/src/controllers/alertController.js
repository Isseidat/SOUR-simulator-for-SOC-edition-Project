import { Alert } from '../models/Alert.js';
import { generateSingleMockAlert, generateSpecificMockAlert } from '../utils/mockGenerator.js';

// POST /api/v1/alerts/generate - Sinh n bản ghi alert giả lập (Random)
export const generateAlerts = async (req, res) => {
  try {
    const count = parseInt(req.body.count) || 5;
    const mockData = Array.from({ length: count }, () => generateSingleMockAlert());
    
    const createdAlerts = await Alert.insertMany(mockData);
    res.status(201).json({
      success: true,
      message: `Đã sinh thành công ${createdAlerts.length} bản ghi Alert giả lập.`,
      data: createdAlerts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/alerts/generate-custom - Sinh 1 bản ghi alert CHÍNH XÁC theo 20 kịch bản test
export const generateCustomAlert = async (req, res) => {
  try {
    const { type, isTruePositive } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'Thiếu trường type.' });

    const mockData = generateSpecificMockAlert(type, isTruePositive);
    const createdAlert = await Alert.create(mockData);
    
    res.status(201).json({
      success: true,
      message: `Đã tạo Alert mẫu cho kịch bản: ${type} (${isTruePositive ? 'True Positive' : 'False Positive'})`,
      data: createdAlert
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts - Lấy danh sách Alerts có phân trang & bộ lọc
export const getAlerts = async (req, res) => {
  try {
    const { severity, status, page = 1, limit = 10, tag, search } = req.query;
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

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Alert.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: alerts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts/:id - Lấy chi tiết 1 Alert
export const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findOne({ alert_id: req.params.id });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert không tồn tại' });
    }
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts/stats/recent-new - Ghi nhận lần sinh dữ liệu ảo mới nhất trong vòng 30p reload bộ đếm
export const getRecentNewAlertsCount = async (req, res) => {
  try {
    const latestAlert = await Alert.findOne().sort({ createdAt: -1 });
    if (!latestAlert) {
      return res.status(200).json({ success: true, count: 0, isWithin30Min: false, latestTimestamp: null });
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

    res.status(200).json({
      success: true,
      count,
      isWithin30Min,
      latestTimestamp: latestAlert.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

