import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from './mailer.js';

/**
 * =========================================================================
 * SOAR TIMEOUT WATCHDOG & AUTO-RECOVERY FALLBACK SERVICE
 * =========================================================================
 * Mục đích:
 * Giải quyết triệt để lỗi Alert bị treo vĩnh viễn ở trạng thái "In Progress" (#soar-processing)
 * khi kịch bản n8n bị gián đoạn giữa chừng (ví dụ: node Code lỗi/trả về undefined,
 * API downstream timeout, n8n crash, hoặc không gọi webhook callback /api/v1/webhook).
 *
 * Cơ chế hoạt động:
 * 1. Chủ động (Active Watchdog): Hẹn giờ kiểm tra sau một khoảng thời gian (mặc định 60s)
 *    khi một alert được kích hoạt xử lý.
 * 2. Bị động (Periodic Scanner): Quét định kỳ mỗi phút tìm các alert bị treo quá 90s.
 * 3. Khi phát hiện alert kẹt:
 *    - Chuyển status -> 'Closed - Error' (hoặc hoàn trả an toàn).
 *    - Gỡ bỏ tag 'soar-processing', gắn tag 'soar-error'.
 *    - Ghi log audit ExecutionLog với trạng thái FAILED.
 *    - Gửi email cảnh báo khẩn cho Quản lý.
 * =========================================================================
 */

export const executeWatchdogRecovery = async (alertId = null, timeoutMs = 60000) => {
  try {
    const filter = {
      status: 'In Progress',
      tags: 'soar-processing',
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

    console.warn(
      `[SOAR Watchdog Fallback] ⚠️ Phát hiện ${stuckAlerts.length} cảnh báo bị kẹt tiến trình n8n (> ${timeoutMs / 1000}s). Đang kích hoạt Fallback giải phóng tự động...`
    );

    for (const stuck of stuckAlerts) {
      // 1. Cập nhật giải phóng Alert khỏi trạng thái kẹt
      await Alert.updateOne(
        { alert_id: stuck.alert_id, status: 'In Progress' },
        {
          $set: { status: 'Closed - Error' },
          $pull: { tags: 'soar-processing' },
          $addToSet: { tags: 'soar-error' },
        }
      );

      // 2. Ghi nhận log chi tiết vào ExecutionLog
      const logMessage = `Kịch bản n8n bị gián đoạn giữa chừng (không gửi callback về /api/v1/webhook sau ${timeoutMs / 1000}s). Hệ thống đã tự động kích hoạt Fallback giải phóng tiến trình.`;
      
      await ExecutionLog.create({
        execution_id: uuidv4(),
        alert_id: stuck.alert_id,
        step_name: 'SOAR Timeout Watchdog Fallback',
        message: logMessage,
        status: 'FAILED',
        executed_by: 'SOAR-Watchdog',
        victim_email: stuck.victim_email || 'isseidat159@gmail.com',
      });

      // 3. Gửi email thông báo cho Quản lý
      sendManagerErrorAlert({
        alert_id: stuck.alert_id,
        type: stuck.type,
        step_name: 'SOAR Timeout Watchdog Fallback',
        message: `Kịch bản tự động hóa n8n dừng đột ngột hoặc không hoàn tất chuỗi downstream trong ${timeoutMs / 1000} giây. Watchdog đã can thiệp chuyển trạng thái sự cố sang Closed - Error và gỡ khóa tiến trình.`,
        executed_by: 'SOAR-Watchdog',
      }).catch((err) => {
        console.error('[Watchdog Mailer Error]:', err.message);
      });

      console.log(`[SOAR Watchdog Fallback] ✅ Đã giải phóng thành công sự cố: ${stuck.alert_id} (${stuck.type})`);
    }

    return stuckAlerts.length;
  } catch (error) {
    console.error('[SOAR Watchdog Recovery Error]:', error.message);
    return 0;
  }
};

/**
 * Đặt lịch hẹn giờ Watchdog cho một Alert cụ thể vừa được trigger
 * @param {string} alertId
 * @param {number} delayMs
 */
export const armWatchdogForAlert = (alertId, delayMs = 60000) => {
  if (!alertId) return;
  setTimeout(async () => {
    try {
      await executeWatchdogRecovery(alertId, delayMs);
    } catch (err) {
      console.error(`[Watchdog Timer Error - ${alertId}]:`, err.message);
    }
  }, delayMs);
};
