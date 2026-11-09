export const PLAYBOOK_DEFINITIONS = [
  { id: 'phishing-email', name: 'Kịch bản 1: Phishing Email', webhook: 'trigger-phishing', alertType: 'Phishing Email' },
  { id: 'suspicious-login', name: 'Kịch bản 2: Suspicious Login', webhook: 'trigger-suspicious-login', alertType: 'Suspicious Login' },
  { id: 'brute-force', name: 'Kịch bản 3: Brute Force Attack', webhook: 'trigger-bruteforce', alertType: 'Brute Force Attack' },
  { id: 'malware-detected', name: 'Kịch bản 4: Malware Detection', webhook: 'trigger-malware', alertType: 'Malware Detection' },
  { id: 'port-scan', name: 'Kịch bản 5: Port Scan Detection', webhook: 'trigger-portscan', alertType: 'Port Scan Detection' },
  { id: 'nosql-injection', name: 'Kịch bản 6: NoSQL Injection Detection', webhook: 'trigger-nosql', alertType: 'NoSQL Injection Detection' },
  { id: 'xss-attack', name: 'Kịch bản 7: Cross-Site Scripting (XSS)', webhook: 'trigger-xss', alertType: 'Cross-Site Scripting (XSS)' },
  { id: 'idor-attempt', name: 'Kịch bản 8: Insecure Direct Object Reference (IDOR)', webhook: 'trigger-idor', alertType: 'Insecure Direct Object Reference (IDOR)' },
  { id: 'credential-stuffing', name: 'Kịch bản 9: Credential Stuffing', webhook: 'trigger-stuffing', alertType: 'Credential Stuffing' },
  { id: 'ssrf-attack', name: 'Kịch bản 10: Server-Side Request Forgery (SSRF)', webhook: 'trigger-ssrf', alertType: 'Server-Side Request Forgery (SSRF)' },
];

// Map nhanh từ Alert Type sang Webhook path
export const ALERT_TYPE_TO_WEBHOOK = Object.fromEntries(
  PLAYBOOK_DEFINITIONS.map(p => [p.alertType, p.webhook])
);

