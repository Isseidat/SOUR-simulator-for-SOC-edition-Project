import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from '../clients/mailClient.js';
import { ALERT_STATUS, ALERT_TAGS, LOG_STATUS } from '../constants/index.js';
import { logger } from './logger.js';

// Đưa Alert sang Closed - Error, gỡ soar-processing (và soar-done nếu cần), gắn soar-error (tách 2 bước tránh xung đột path 'tags')
export const markAlertSoarError = async (alertId, { onlyIfInProgress = false, pullDone = false } = {}) => {
  if (!alertId) return;
  const filter = { alert_id: alertId };
  if (onlyIfInProgress) filter.status = ALERT_STATUS.IN_PROGRESS;

  const pullTagValue = pullDone ? { $in: [ALERT_TAGS.PROCESS, ALERT_TAGS.DONE] } : ALERT_TAGS.PROCESS;

  await Alert.updateOne(filter, {
    $set: { status: ALERT_STATUS.CLOSED_ERROR },
    $pull: { tags: pullTagValue },
  });
  await Alert.updateOne(
    { alert_id: alertId },
    { $addToSet: { tags: ALERT_TAGS.ERROR } }
  );
};

// Quét và tự động giải phóng Alert kẹt tiến trình n8n quá thời gian cho phép
export const executeWatchdogRecovery = async (alertId = null, timeoutMs = 60000) => {
  try {
    const filter = {
      status: ALERT_STATUS.IN_PROGRESS,
      tags: ALERT_TAGS.PROCESS,
    };

    if (alertId) {
      filter.alert_id = alertId;
    } else {
      filter.updatedAt = { $lt: new Date(Date.now() - timeoutMs) };
    }

    const stuckAlerts = await Alert.find(filter);
    if (!stuckAlerts || stuckAlerts.length === 0) {
      return 0;
    }

    logger.warn(
      { count: stuckAlerts.length, timeoutSec: timeoutMs / 1000 },
      'SOAR Watchdog detected stuck alerts, activating fallback recovery'
    );

    for (const stuck of stuckAlerts) {
      // 1. Cập nhật giải phóng Alert khỏi trạng thái kẹt
      await markAlertSoarError(stuck.alert_id, { onlyIfInProgress: true });

      // 2. Ghi nhận log chi tiết vào ExecutionLog
      const logMessage = `Kịch bản n8n bị gián đoạn giữa chừng (không gửi callback về /api/v1/webhook sau ${timeoutMs / 1000}s). Hệ thống đã tự động kích hoạt Fallback giải phóng tiến trình.`;
      
      await ExecutionLog.create({
        execution_id: uuidv4(),
        alert_id: stuck.alert_id,
        step_name: 'SOAR Timeout Watchdog Fallback',
        message: logMessage,
        status: LOG_STATUS.FAILED,
        executed_by: 'SOAR-Watchdog',
        victim_email: stuck.victim_email || '',
      });

      // 3. Gửi email thông báo cho Quản lý
      sendManagerErrorAlert({
        alert_id: stuck.alert_id,
        type: stuck.type,
        step_name: 'SOAR Timeout Watchdog Fallback',
        message: `Kịch bản tự động hóa n8n dừng đột ngột hoặc không hoàn tất chuỗi downstream trong ${timeoutMs / 1000} giây. Watchdog đã can thiệp chuyển trạng thái sự cố sang Closed - Error và gỡ khóa tiến trình.`,
        executed_by: 'SOAR-Watchdog',
      }).catch((err) => {
        logger.error({ err, alertId: stuck.alert_id }, 'Watchdog failed to send manager error email');
      });

      logger.info(
        { alertId: stuck.alert_id, type: stuck.type },
        'SOAR Watchdog recovered stuck alert'
      );
    }

    return stuckAlerts.length;
  } catch (error) {
    logger.error({ err: error }, 'SOAR Watchdog recovery scan failed');
    return 0;
  }
};

// Đặt lịch hẹn giờ Watchdog cho một Alert cụ thể vừa được trigger
export const armWatchdogForAlert = (alertId, delayMs = 60000) => {
  if (!alertId) return;
  setTimeout(async () => {
    try {
      await executeWatchdogRecovery(alertId, delayMs);
    } catch (err) {
      logger.error({ err, alertId }, 'Watchdog timer callback failed');
    }
  }, delayMs);
};
