import axios from 'axios';
import { config } from '../config/env.js';

const MAX_CACHE_SIZE = 200;
const RATE_WINDOW_MS = 60 * 1000;

const throttleCache = new Map();
let sentTimestamps = [];
let rateSuppressedCount = 0;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const truncate = (text, maxLen = 400) => {
  const str = String(text ?? '').trim();
  return str.length > maxLen ? `${str.slice(0, maxLen - 3)}...` : str;
};

const formatVnTime = () => {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)}/${vn.getUTCFullYear()} ${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}:${pad(vn.getUTCSeconds())} (+07:00)`;
};

const extractErrorMessage = (obj = {}) => {
  if (obj.err instanceof Error) return obj.err.message;
  if (obj.err && typeof obj.err === 'object' && obj.err.message) return String(obj.err.message);
  if (typeof obj.err === 'string') return obj.err;
  if (typeof obj.errDetail === 'string') return obj.errDetail;
  if (obj.errDetail && typeof obj.errDetail === 'object') {
    try {
      return JSON.stringify(obj.errDetail);
    } catch {
      return String(obj.errDetail);
    }
  }
  if (typeof obj.detail === 'string') return obj.detail;
  return '';
};

const checkPerKeyCooldown = (key, cooldownMs) => {
  if (!cooldownMs || cooldownMs <= 0) {
    return { allowed: true, suppressed: 0 };
  }

  const now = Date.now();
  if (throttleCache.size > MAX_CACHE_SIZE) {
    for (const [k, entry] of throttleCache.entries()) {
      if (now - entry.lastSentAt >= cooldownMs) {
        throttleCache.delete(k);
      }
    }
  }

  const existing = throttleCache.get(key);
  if (existing && now - existing.lastSentAt < cooldownMs) {
    existing.suppressed += 1;
    return { allowed: false, suppressed: 0 };
  }

  const suppressed = existing?.suppressed || 0;
  throttleCache.set(key, { lastSentAt: now, suppressed: 0 });
  return { allowed: true, suppressed };
};

const checkMinuteRateLimit = (maxPerMinute) => {
  const now = Date.now();
  sentTimestamps = sentTimestamps.filter((ts) => now - ts < RATE_WINDOW_MS);

  if (sentTimestamps.length >= maxPerMinute) {
    rateSuppressedCount += 1;
    return { allowed: false, suppressed: 0, hitLimitNow: false };
  }

  const suppressed = rateSuppressedCount;
  rateSuppressedCount = 0;
  sentTimestamps.push(now);
  const hitLimitNow = sentTimestamps.length >= maxPerMinute;
  return { allowed: true, suppressed, hitLimitNow };
};

/**
 * Gửi cảnh báo lỗi nghiêm trọng (level >= 50: ERROR / FATAL) tới Telegram.
 * - cooldownMs = 0 (mặc định): báo ngay mọi lỗi lẻ tẻ không bỏ sót.
 * - Giới hạn tối đa maxPerMinute tin/phút (mặc định 5) để chống spam khi hệ thống nổ lỗi hàng loạt.
 * - Chạy ngầm (fire-and-forget) và không bao giờ gọi ngược lại logger.error.
 */
export const notifyTelegramOnError = ({ level = 50, msg = '', obj = {} } = {}) => {
  const { botToken, chatId, cooldownMs = 0, maxPerMinute = 5 } = config.telegram || {};
  if (!botToken || !chatId) return;

  const safeObj = obj && typeof obj === 'object' ? obj : {};
  const errMsg = truncate(extractErrorMessage(safeObj), 400);
  const titleMsg = truncate(msg || (errMsg ? 'Unhandled backend error' : 'Backend error occurred'), 200);
  const alertId = safeObj.alertId || safeObj.alert_id;

  // 1. Nếu có cấu hình cooldown theo từng lỗi (> 0) thì áp dụng
  const throttleKey = `${level}:${alertId || ''}:${titleMsg}:${errMsg.slice(0, 120)}`;
  const keyCheck = checkPerKeyCooldown(throttleKey, cooldownMs);
  if (!keyCheck.allowed) return;

  // 2. Chống spam tổng: tối đa maxPerMinute tin trong mỗi 60 giây
  const rateCheck = checkMinuteRateLimit(maxPerMinute);
  if (!rateCheck.allowed) return;

  const totalSuppressed = keyCheck.suppressed + rateCheck.suppressed;
  const badge = level >= 60 ? '🔥 <b>[SOAR FATAL]</b>' : '🚨 <b>[SOAR ERROR]</b>';
  const lines = [
    `${badge} <code>${escapeHtml(config.app.env)}</code>`,
    `🕒 <b>Thời gian:</b> ${escapeHtml(formatVnTime())}`,
    `📌 <b>Nội dung:</b> ${escapeHtml(titleMsg)}`,
  ];

  if (errMsg && errMsg !== titleMsg) {
    lines.push(`❌ <b>Chi tiết lỗi:</b> <code>${escapeHtml(errMsg)}</code>`);
  }

  const reqMethod = safeObj.req?.method;
  const reqUrl = safeObj.req?.url;
  const statusCode = safeObj.res?.statusCode;
  if (reqMethod || reqUrl) {
    const statusSuffix = statusCode ? ` → HTTP ${statusCode}` : '';
    lines.push(`🌐 <b>API:</b> <code>${escapeHtml(`${reqMethod || ''} ${reqUrl || ''}`.trim() + statusSuffix)}</code>`);
  }

  if (alertId) lines.push(`🆔 <b>Alert ID:</b> <code>${escapeHtml(alertId)}</code>`);
  if (safeObj.job) lines.push(`⚙️ <b>Job:</b> <code>${escapeHtml(safeObj.job)}</code>`);
  if (safeObj.workflowId) lines.push(`🔀 <b>Workflow:</b> <code>${escapeHtml(safeObj.workflowId)}</code>`);
  if (safeObj.userId) lines.push(`👤 <b>User ID:</b> <code>${escapeHtml(safeObj.userId)}</code>`);
  if (totalSuppressed > 0) {
    lines.push(`🔁 <i>Đã tạm chặn ${totalSuppressed} lỗi trước đó để chống spam.</i>`);
  }
  if (rateCheck.hitLimitNow) {
    lines.push(`⚠️ <i>Đã chạm giới hạn ${maxPerMinute} tin/phút — các lỗi kế tiếp trong phút này sẽ tạm gộp để chống spam.</i>`);
  }

  const text = truncate(lines.join('\n'), 3800);
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

  axios
    .post(
      endpoint,
      {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      { timeout: 5000 }
    )
    .catch((tgErr) => {
      const reason = tgErr?.response?.data?.description || tgErr?.message || 'Unknown error';
      process.stderr.write(`[TelegramAlert Warning] Failed to send alert: ${reason}\n`);
    });
};
