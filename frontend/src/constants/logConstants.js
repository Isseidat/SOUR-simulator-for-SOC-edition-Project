export const LOG_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  IN_PROGRESS: 'IN_PROGRESS',
};

export const LOG_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'SUCCESS', label: 'Success (Thành công)', color: '#10b981' },
  { value: 'FAILED', label: 'Failed / Error (Thất bại)', color: '#ef4444' },
  { value: 'IN_PROGRESS', label: 'In Progress (Đang chạy)', color: '#f59e0b' },
];

export const LOG_ACTOR_OPTIONS = [
  { value: '', label: 'Tất cả đối tượng' },
  { value: 'system', label: 'Hệ thống SOAR (Bot)', color: '#06b6d4' },
  { value: 'user', label: 'Chuyên viên SOC (User)', color: '#8b5cf6' },
];
