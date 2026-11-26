import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { Playbook } from '../models/Playbook.js';
import { generateSingleMockAlert } from '../utils/mockGenerator.js';
import { n8nClient } from '../clients/n8nClient.js';
import { armWatchdogForAlert, executeWatchdogRecovery, markAlertSoarError } from '../utils/watchdogFallback.js';
import { logger } from '../utils/logger.js';
import {
  PLAYBOOK_DEFINITIONS,
  ALERT_STATUS,
  ALERT_SEVERITY,
  ALERT_TAGS,
  LOG_STATUS,
} from '../constants/index.js';

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
    allowedSeverities: [ALERT_SEVERITY.LOW, ALERT_SEVERITY.MEDIUM], // Mức độ nghiêm trọng an toàn
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
    logger.info({ job: 'threat-simulator' }, 'Threat Simulator cron job paused');
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
      logger.info(
        { job: 'threat-simulator', alertId: mockData.alert_id, type: mockData.type },
        'Generated mock alert'
      );
    } catch (error) {
      logger.error({ err: error, job: 'threat-simulator' }, 'Threat Simulator job failed');
    }
  });

  logger.info({ job: 'threat-simulator', intervalMinutes: mins }, 'Threat Simulator cron job started');
};

// 2. TÁC VỤ 2: AUTO-TRIAGE (TỰ ĐỘNG CHẠY CÁC KỊCH BẢN ĐANG CÓ THEO THIẾT LẬP NGƯỜI DÙNG)
export const restartAutoTriageJob = () => {
  if (autoTriageTask) {
    try { autoTriageTask.stop(); } catch (e) {}
    autoTriageTask = null;
  }

  if (!cronConfig.autoTriage.isActive) {
    logger.info({ job: 'auto-triage' }, 'Auto-Triage cron job paused');
    return;
  }

  const mins = Math.max(1, Number(cronConfig.autoTriage.intervalMinutes) || 5);
  const cronExpr = `*/${mins} * * * *`;

  autoTriageTask = cron.schedule(cronExpr, async () => {
    if (!cronConfig.autoTriage.isActive) return;

    // Mutex Lock: Ngăn chặn nhịp trước chạy đè nhịp sau nếu webhook n8n đang xử lý
    if (isAutoTriageRunning) {
      logger.warn({ job: 'auto-triage' }, 'Previous Auto-Triage tick still running, skipping');
      return;
    }

    isAutoTriageRunning = true;
    try {
      const cutoff = new Date(cronConfig.autoTriage.cutoffDate || '2026-10-05T00:00:00.000Z');
      const severities = Array.isArray(cronConfig.autoTriage.allowedSeverities) && cronConfig.autoTriage.allowedSeverities.length > 0
        ? cronConfig.autoTriage.allowedSeverities
        : [ALERT_SEVERITY.LOW, ALERT_SEVERITY.MEDIUM];
      const limit = Math.max(1, Math.min(50, Number(cronConfig.autoTriage.batchSize) || 5));

      const query = {
        status: ALERT_STATUS.NEW,
        severity: { $in: severities },
        tags: { $ne: ALERT_TAGS.PROCESS },
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

      logger.info(
        { job: 'auto-triage', count: unassignedAlerts.length },
        'Auto-Triage batch started'
      );

      for (const alertData of unassignedAlerts) {
        if (!cronConfig.autoTriage.isActive) break;

        // 1. Áp dụng Atomic Update để khóa cảnh báo, tránh race condition
        const alert = await Alert.findOneAndUpdate(
          { alert_id: alertData.alert_id, status: ALERT_STATUS.NEW, tags: { $ne: ALERT_TAGS.PROCESS } },
          { $set: { status: ALERT_STATUS.IN_PROGRESS }, $push: { tags: ALERT_TAGS.PROCESS } },
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
            { $set: { status: ALERT_STATUS.NEW }, $pull: { tags: ALERT_TAGS.PROCESS } }
          );
          continue;
        }

        await ExecutionLog.create({
          execution_id: uuidv4(),
          alert_id: alert.alert_id,
          step_name: 'Auto-Triage Playbook Trigger',
          message: `Cron Job tự động kích hoạt ${playbookName || alert.type}`,
          status: LOG_STATUS.SUCCESS,
          executed_by: 'Hệ thống SOAR (Auto)',
          victim_email: alert.victim_email || ''
        });

        const payload = alert.toObject ? alert.toObject() : alert;

        // Gọi Webhook n8n qua n8nClient với multi-host fallback
        const dispatchRes = await n8nClient.triggerWebhook(webhookPath, payload, {
          timeout: 6000,
          stopOnHttpResponse: true,
        });
        const isSuccess = dispatchRes.success || dispatchRes.hasHttpResponse;

        if (isSuccess) {
          // Kích hoạt Fallback Watchdog (60s): Tự động giải phóng nếu n8n ngắt luồng và không gọi callback
          armWatchdogForAlert(alert.alert_id, 60000);
        } else {
          logger.error(
            { err: dispatchRes.error, job: 'auto-triage', alertId: alert.alert_id, webhookPath },
            'Failed to trigger n8n webhook'
          );
          try {
            await markAlertSoarError(alert.alert_id, { pullDone: true });
          } catch (dbErr) {
            logger.error({ err: dbErr, job: 'auto-triage', alertId: alert.alert_id }, 'Auto-Triage DB error update failed');
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
          logger.debug({ job: 'auto-triage', type: alert.type, delayMs }, 'Delaying before next alert');
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          logger.debug({ job: 'auto-triage', type: alert.type, delayMs: 0 }, 'Processing next alert immediately');
        }
      }
    } catch (error) {
      logger.error({ err: error, job: 'auto-triage' }, 'Auto-Triage batch failed');
    } finally {
      isAutoTriageRunning = false;
    }
  });

  logger.info(
    {
      job: 'auto-triage',
      intervalMinutes: mins,
      delayMs: cronConfig.autoTriage.delayBetweenAlerts || 1500,
      batchSize: cronConfig.autoTriage.batchSize,
    },
    'Auto-Triage cron job started'
  );
};

// Khởi tạo các Cron Jobs khi máy chủ khởi động
export const initCronJobs = () => {
  restartSimulatorJob();
  restartAutoTriageJob();

  // // Job 3: Dọn dẹp dữ liệu cũ định kỳ lúc 00:00
  // cron.schedule('0 0 * * *', async () => {
  //   try {
  //     const thirtyDaysAgo = new Date();
  //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  //     await Alert.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
  //   } catch (error) {
  //     console.error(`[Cron Job - Cleanup] Lỗi dọn dẹp:`, error.message);
  //   }
  // });

  // Job 4: Watchdog Fallback định kỳ mỗi phút quét và giải phóng các alert bị treo quá 90s (an toàn tuyệt đối)
  cron.schedule('* * * * *', async () => {
    try {
      await executeWatchdogRecovery(null, 90000);
    } catch (error) {
      logger.error({ err: error, job: 'watchdog-fallback' }, 'Watchdog fallback scan failed');
    }
  });
};

// Trạng thái chi tiết cho Controller
export const getCronDetailedStatus = () => {
  return {
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