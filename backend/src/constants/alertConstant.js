export const ALERT_STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED_ERROR: 'Closed - Error',
  CLOSED_FALSE_POSITIVE: 'Closed - False Positive',
}

export const ALERT_SEVERITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const ALERT_TAGS = {
    PROCESS: 'soar-processing',
    DONE: 'soar-done',
    ERROR: 'soar-error'
}

export const EMAIL_TYPE = {
  PHISHING: 'Phishing Email',
  BRUTE_FORCE: 'Brute Force Attack',
  MALWARE: 'Malware Detection',
  SUSPICIOUS_LOGIN: 'Suspicious Login',
  PORT_SCAN: 'Port Scan Detection',
  NOSQL_INJECTION: 'NoSQL Injection Detection',
  XSS : 'Cross-Site Scripting (XSS)',
  IDOR: 'Insecure Direct Object Reference (IDOR)',
  CREDENTIAL_STUFFING: 'Credential Stuffing',
  SSRF: 'Server-Side Request Forgery (SSRF)',
};

