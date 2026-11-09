import cron from 'node-cron';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { Playbook } from '../models/Playbook.js';
import { generateSingleMockAlert } from '../utils/mockGenerator.js';
import { formatN8nWebhook } from '../services/playbookService.js';
import { armWatchdogForAlert, executeWatchdogRecovery } from '../utils/watchdogFallback.js';
import { PLAYBOOK_DEFINITIONS } from '../constants/playbookConstant.js';
import { config } from '../config/env.js';

// Cấu hình linh hoạt cho 2 tác vụ Cron ngầm độc lập
export const cronConfig = {
  // 1. Tác vụ tạo kịch bản mô phỏng (Threat Simulator)
  simulator: {
    isActive: true,
    intervalMinutes: 5,
    lastRunAt: null,
    totalGenerated: 0
  },
  // 2. Tác vụ tự động chạy các kịch bản đang có (Auto-Triage)
  autoTriage: {
    isActive: true,
    intervalMinutes: 5,
    delayBetweenAlerts: 1500, // Độ trễ delay giữa mỗi lần chạy (thời gian trả nhận ms chống nghẽn n8n)
    scenarioDelays: {}, // Độ trễ riêng theo từng kịch bản (VD: { 'Phishing Email': 500, 'Cross-Site Scripting (XSS)': 0, 'Brute Force Attack': 100 })
    batchSize: 5, // Số lượng cảnh báo xử lý trong 1 lần chạy
    allowedSeverities: ['Low', 'Medium'], // Mức độ nghiêm trọng an toàn
    allowedAlertTypes: [], // Rỗng = chạy tất cả 10 kịch bản; Mảng = chỉ chạy kịch bản cụ thể
    lastRunAt: null,
    totalProcessed: 0,
    cutoffDate: '2026-10-05T00:00:00.000Z'
  }
};

let simulatorTask = null;
let autoTriageTask = null;
let isAutoTriageRunning = false;

// 1. TÁC VỤ 1: THREAT SIMULATOR (TỰ ĐỘNG TẠO KỊCH BẢN CẢNH BÁO MÔ PHỎNG)
export const restartSimulatorJob = () => {
  if (simulatorTask) {
    try { simulatorTask.stop(); } catch (e) {}
    simulatorTask = null;
  }

  if (!cronConfig.simulator.isActive) {
    console.log('[Cron Job - Threat Simulator] ⏸️ Đã tạm dừng sinh cảnh báo mô phỏng.');
    return;
  }

  const mins = Math.max(1, Number(cronConfig.simulator.intervalMinutes) || 5);
  const cronExpr = `*/${mins} * * * *`;

  simulatorTask = cron.schedule(cronExpr, async () => {
    if (!cronConfig.simulator.isActive) return;
    try {
      const mockData = generateSingleMockAlert();
      await Alert.create(mockData);
      cronConfig.simulator.lastRunAt = new Date();
      cronConfig.simulator.totalGenerated += 1;
      console.log(`[Cron Job - Threat Simulator] ⚡ Đã tạo 1 alert mô phỏng mới: ${mockData.alert_id} (${mockData.type})`);
    } catch (error) {
      console.error(`[Cron Job - Threat Simulator] Lỗi:`, error.message);
    }
  });

  console.log(`[Cron Job - Threat Simulator] ▶️ Đang chạy với chu kỳ mỗi ${mins} phút.`);
};

// 2. TÁC VỤ 2: AUTO-TRIAGE (TỰ ĐỘNG CHẠY CÁC KỊCH BẢN ĐANG CÓ THEO THIẾT LẬP NGƯỜI DÙNG)
export const restartAutoTriageJob = () => {
  if (autoTriageTask) {
    try { autoTriageTask.stop(); } catch (e) {}
    autoTriageTask = null;
  }

  if (!cronConfig.autoTriage.isActive) {
    console.log('[Cron Job - Auto Triage] ⏸️ Đã tạm dừng tự động chạy kịch bản.');
    return;
  }

  const mins = Math.max(1, Number(cronConfig.autoTriage.intervalMinutes) || 5);
  const cronExpr = `*/${mins} * * * *`;

  autoTriageTask = cron.schedule(cronExpr, async () => {
    if (!cronConfig.autoTriage.isActive) return;

    // Mutex Lock: Ngăn chặn nhịp trước chạy đè nhịp sau nếu webhook n8n đang xử lý
    if (isAutoTriageRunning) {
      console.warn('[Cron Job - Auto Triage] ⚠️ Nhịp trước chưa kết thúc, bỏ qua nhịp này để tránh nghẽn.');
      return;
    }

    isAutoTriageRunning = true;
    try {
      const cutoff = new Date(cronConfig.autoTriage.cutoffDate || '2026-10-05T00:00:00.000Z');
      const severities = Array.isArray(cronConfig.autoTriage.allowedSeverities) && cronConfig.autoTriage.allowedSeverities.length > 0
        ? cronConfig.autoTriage.allowedSeverities
        : ['Low', 'Medium'];
      const limit = Math.max(1, Math.min(50, Number(cronConfig.autoTriage.batchSize) || 5));

      const query = {
        status: 'New',
        severity: { $in: severities },
        tags: { $ne: 'soar-processing' },
        createdAt: { $gte: cutoff }
      };

      // Chỉ chạy kịch bản nào được người dùng chọn
      if (Array.isArray(cronConfig.autoTriage.allowedAlertTypes) && cronConfig.autoTriage.allowedAlertTypes.length > 0) {
        query.type = { $in: cronConfig.autoTriage.allowedAlertTypes };
      }

      const unassignedAlerts = await Alert.find(query)
        .sort({ _id: 1 })
        .limit(limit);

      if (unassignedAlerts.length === 0) {
        return;
      }

      console.log(`[Cron Job - Auto Triage] 🔍 Tìm thấy ${unassignedAlerts.length} cảnh báo cần xử lý theo kịch bản.`);

      for (const alertData of unassignedAlerts) {
        if (!cronConfig.autoTriage.isActive) break;

        // 1. Áp dụng Atomic Update để khóa cảnh báo, tránh race condition
        const alert = await Alert.findOneAndUpdate(
          { alert_id: alertData.alert_id, status: 'New', tags: { $ne: 'soar-processing' } },
          { $set: { status: 'In Progress' }, $push: { tags: 'soar-processing' } },
          { new: true }
        );

        if (!alert) continue;

        // 2. Tra cứu Webhook n8n động từ Playbook Master hoặc Fallback định sẵn
        let playbook = await Playbook.findOne({ alert_type: alert.type, is_active: true });
        let webhookPath = playbook?.webhook_path;
        let playbookName = playbook?.name;

        // Fallback sang danh sách kịch bản định sẵn tiêu chuẩn
        if (!webhookPath) {
          const matched = PLAYBOOK_DEFINITIONS.find(s => s.alertType === alert.type);
          if (matched) {
            webhookPath = matched.webhook;
            playbookName = matched.label;
          }
        }

        if (!webhookPath) {
          await Alert.updateOne(
            { alert_id: alert.alert_id },
            { $set: { status: 'New' }, $pull: { tags: 'soar-processing' } }
          );
          continue;
        }

        const n8nBases = config.n8n.fallbackUrls

        await ExecutionLog.create({
          execution_id: uuidv4(),
          alert_id: alert.alert_id,
          step_name: 'Auto-Triage Playbook Trigger',
          message: `Cron Job tự động kích hoạt ${playbookName || alert.type}`,
          status: 'SUCCESS',
          executed_by: 'Hệ thống SOAR (Auto)',
          victim_email: alert.victim_email || 'isseidat159@gmail.com'
        });

        const payload = alert.toObject ? alert.toObject() : alert;

        // Gọi Webhook n8n với multi-host fallback
        let isSuccess = false;
        for (const base of n8nBases) {
          const targetUrl = formatN8nWebhook(base, webhookPath);
          try {
            await axios.post(targetUrl, payload, { timeout: 6000 });
            isSuccess = true;
            break;
          } catch (err) {
            if (err.response) {
              isSuccess = true;
              break;
            }
          }
        }

        if (isSuccess) {
          // Kích hoạt Fallback Watchdog (60s): Tự động giải phóng nếu n8n ngắt luồng và không gọi callback
          armWatchdogForAlert(alert.alert_id, 60000);
        } else {
          try {
            await Alert.updateOne(
              { alert_id: alert.alert_id },
              { $set: { status: 'Closed - Error' }, $pull: { tags: { $in: ['soar-processing', 'soar-done'] } } }
            );
            await Alert.updateOne(
              { alert_id: alert.alert_id },
              { $addToSet: { tags: 'soar-error' } }
            );
          } catch (dbErr) {
            console.error('[Cron AutoTriage DB Error]:', dbErr.message);
          }
        }

        cronConfig.autoTriage.totalProcessed += 1;
        cronConfig.autoTriage.lastRunAt = new Date();

        // 3. ĐỘ TRỄ NGHỈ GIỮA MỖI KỊCH BẢN (Ưu tiên độ trễ riêng theo từng kịch bản, nếu không có thì lấy độ trễ chung)
        const specificDelay = cronConfig.autoTriage.scenarioDelays?.[alert.type];
        const delayMs = (specificDelay !== undefined && specificDelay !== null && specificDelay !== '')
          ? Math.max(0, Number(specificDelay) || 0)
          : (Number(cronConfig.autoTriage.delayBetweenAlerts || cronConfig.autoTriage.delayBetweenAlertsMs) || 0);

        if (delayMs > 0) {
          console.log(`[Cron Job - Auto Triage] ⏱️ Tạm dừng ${delayMs}ms cho kịch bản "${alert.type}" (chống nghẽn n8n)...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.log(`[Cron Job - Auto Triage] ⚡ Kịch bản "${alert.type}" được xử lý tức thì (0ms).`);
        }
      }
    } catch (error) {
      console.error(`[Cron Job - AutoTriage] Lỗi:`, error.message);
    } finally {
      isAutoTriageRunning = false;
    }
  });

  console.log(`[Cron Job - Auto Triage] ▶️ Đang chạy với chu kỳ mỗi ${mins} phút, delay ${cronConfig.autoTriage.delayBetweenAlerts || 1500}ms, batch size ${cronConfig.autoTriage.batchSize}.`);
};

// Khởi tạo các Cron Jobs khi máy chủ khởi động
export const initCronJobs = () => {
  restartSimulatorJob();
  restartAutoTriageJob();

  // Job 3: Dọn dẹp dữ liệu cũ định kỳ lúc 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await Alert.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
    } catch (error) {
      console.error(`[Cron Job - Cleanup] Lỗi dọn dẹp:`, error.message);
    }
  });

  // Job 4: Watchdog Fallback định kỳ mỗi phút quét và giải phóng các alert bị treo quá 90s (an toàn tuyệt đối)
  cron.schedule('* * * * *', async () => {
    try {
      await executeWatchdogRecovery(null, 90000);
    } catch (error) {
      console.error(`[Cron Job - Watchdog Fallback] Lỗi quét:`, error.message);
    }
  });
};

// Trạng thái chi tiết cho Controller
export const getCronDetailedStatus = () => {
  return {
    isOverallActive: Boolean(cronConfig.simulator.isActive || cronConfig.autoTriage.isActive),
    isOverAllActive: Boolean(cronConfig.simulator.isActive || cronConfig.autoTriage.isActive),
    simulator: { ...cronConfig.simulator },
    autoTriage: { ...cronConfig.autoTriage }
  };
};

// Bật / Tắt riêng Threat Simulator
export const toggleSimulator = (active) => {
  const next = typeof active === 'boolean' ? active : !cronConfig.simulator.isActive;
  cronConfig.simulator.isActive = next;
  restartSimulatorJob();
  return { ...cronConfig.simulator };
};

// Bật / Tắt riêng Auto Triage
export const toggleAutoTriage = (active) => {
  const next = typeof active === 'boolean' ? active : !cronConfig.autoTriage.isActive;
  cronConfig.autoTriage.isActive = next;
  restartAutoTriageJob();
  return { ...cronConfig.autoTriage };
};

// Cập nhật cấu hình độ trễ, chu kỳ thời gian, batch size, kịch bản định sẵn cho Auto Triage
export const updateAutoTriageConfig = (newSettings = {}) => {
  if (newSettings.intervalMinutes !== undefined && !Array.isArray(newSettings.intervalMinutes)) {
    cronConfig.autoTriage.intervalMinutes = Math.max(1, Number(newSettings.intervalMinutes) || 5);
  }
  if (newSettings.delayBetweenAlerts !== undefined) {
    cronConfig.autoTriage.delayBetweenAlerts = Math.max(0, Number(newSettings.delayBetweenAlerts) || 0);
  }
  if (newSettings.batchSize !== undefined && !Array.isArray(newSettings.batchSize)) {
    cronConfig.autoTriage.batchSize = Math.max(1, Math.min(50, Number(newSettings.batchSize) || 5));
  }
  if (Array.isArray(newSettings.allowedSeverities)) {
    cronConfig.autoTriage.allowedSeverities = newSettings.allowedSeverities;
  }
  if (Array.isArray(newSettings.allowedAlertTypes)) {
    cronConfig.autoTriage.allowedAlertTypes = newSettings.allowedAlertTypes;
  }
  if (newSettings.scenarioDelays !== undefined && typeof newSettings.scenarioDelays === 'object') {
    cronConfig.autoTriage.scenarioDelays = {
      ...(cronConfig.autoTriage.scenarioDelays || {}),
      ...newSettings.scenarioDelays
    };
  }
  restartAutoTriageJob();
  return { ...cronConfig.autoTriage };
};

// Alias hỗ trợ tên hàm updateAutoTriageSettings
export const updateAutoTriageSettings = updateAutoTriageConfig;

// Các hàm tương thích ngược (Legacy)
export const getCronStatus = () => Boolean(cronConfig.simulator.isActive || cronConfig.autoTriage.isActive);
export const setCronStatus = (active) => {
  const val = Boolean(active);
  cronConfig.simulator.isActive = val;
  cronConfig.autoTriage.isActive = val;
  restartSimulatorJob();
  restartAutoTriageJob();
  return val;
};