import * as alertService from '../services/alertService.js';

// POST /api/v1/alerts/generate - Sinh n bản ghi alert giả lập (Random)
export const generateAlerts = async (req, res) => {
  try {
    const { count } = req.body;
    const createdAlerts = await alertService.generateAlertsService({ count });
   
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

    const createdAlert = await alertService.generateCustomAlertService({ type, isTruePositive });
    
    res.status(201).json({
      success: true,
      message: `Đã tạo Alert mẫu cho kịch bản: ${type} (${isTruePositive ? 'True Positive' : 'False Positive'})`,
      data: createdAlert
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts - Lấy danh sách Alerts có phân trang & bộ lọc (Hybrid Offset & Cursor)
export const getAlerts = async (req, res) => {
  try {
    const { severity, status, page, limit, tag, search, last_id } = req.query;
    const result = await alertService.getAlertsService({ severity, status, page, limit, tag, search, last_id });
      
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts/:id - Lấy chi tiết 1 Alert
export const getAlertById = async (req, res) => {
  try {
    const alert = await alertService.getAlertByIdService({ alertId: req.params.id });

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts/stats/recent-new - Ghi nhận lần sinh dữ liệu ảo mới nhất trong vòng 30p reload bộ đếm
export const getRecentNewAlertsCount = async (req, res) => {
  try {
    const result = await alertService.getRecentNewAlertsCountService();
  
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/alerts/stats/dashboard - Thống kê tổng hợp toàn bộ alerts phục vụ Dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const data = await alertService.getDashboardStatsService();

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/cron/status - Xem trạng thái Cron Job hiện tại
export const getCronJobStatus = async (req, res) => {
  try {
    const result = await alertService.getCronJobStatusService();
      
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/cron/toggle - Bật / Tắt Cron Job (Legacy)
export const toggleCronJob = async (req, res) => {
  try {
    const { active } = req.body;
    const { updatedStatus, message } = await alertService.toggleCronJobService({ active });

    res.status(200).json({
      success: true,
      isActive: updatedStatus,
      message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/cron/toggle-simulator-job - Bật/tắt riêng Threat Simulator
export const toggleSimulatorJob = async (req, res) => {
  try {
    const { active } = req.body;
    const { simulator } = await alertService.toggleSimulatorJobService({ active });

    res.status(200).json({
      success: true,
      simulator,
      isActive: simulator.isActive
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/cron/toggle-auto-triage - Bật/tắt riêng Auto Triage
export const toggleAutoTriage = async (req, res) => {
  try {
    const { active } = req.body;
    const { autoTriage } = await alertService.toggleAutoTriageService({ active });

    res.status(200).json({
      success: true,
      autoTriage,
      isActive: autoTriage.isActive
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/cron/update-auto-triage-settings - Cập nhật config kịch bản, delay ms, batch size
export const updateAutoTriageSettings = async (req, res) => {
  try {
    const { autoTriage } = await alertService.updateAutoTriageSettingsService(req.body);

    res.status(200).json({
      success: true,
      autoTriage,
      config: autoTriage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
