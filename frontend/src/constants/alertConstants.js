export const ALERT_STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED_ERROR: 'Closed - Error',
  CLOSED_FALSE_POSITIVE: 'Closed - False Positive',
};

export const ALERT_SEVERITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const ALERT_TAGS = {
  PROCESS: 'soar-processing',
  DONE: 'soar-done',
  ERROR: 'soar-error',
};

export const SEVERITY_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'Critical', label: 'Critical', color: '#ef4444' },
  { value: 'High', label: 'High', color: '#f97316' },
  { value: 'Medium', label: 'Medium', color: '#f59e0b' },
  { value: 'Low', label: 'Low', color: '#3b82f6' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'New', label: 'New', color: '#3b82f6' },
  { value: 'In Progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'Resolved', label: 'Resolved', color: '#10b981' },
];