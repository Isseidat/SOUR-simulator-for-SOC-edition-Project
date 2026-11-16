export const PLAYBOOK_DEFINITIONS = [
  { alertType: 'Phishing Email', label: 'Kịch bản 1: Phishing Email', webhook: '/webhook/trigger-phishing' },
  { alertType: 'Brute Force Attack', label: 'Kịch bản 2: Brute Force Attack', webhook: '/webhook/trigger-bruteforce' },
  { alertType: 'Malware Detection', label: 'Kịch bản 3: Malware Detection', webhook: '/webhook/trigger-malware' },
  { alertType: 'Suspicious Login', label: 'Kịch bản 4: Suspicious Login', webhook: '/webhook/trigger-suspicious-login' },
  { alertType: 'Port Scan Detection', label: 'Kịch bản 5: Port Scan Detection', webhook: '/webhook/trigger-portscan' },
  { alertType: 'NoSQL Injection Detection', label: 'Kịch bản 6: NoSQL Injection', webhook: '/webhook/trigger-nosql' },
  { alertType: 'Cross-Site Scripting (XSS)', label: 'Kịch bản 7: XSS', webhook: '/webhook/trigger-xss' },
  { alertType: 'Insecure Direct Object Reference (IDOR)', label: 'Kịch bản 8: IDOR', webhook: '/webhook/trigger-idor' },
  { alertType: 'Credential Stuffing', label: 'Kịch bản 9: Credential Stuffing', webhook: '/webhook/trigger-credstuffing' },
  { alertType: 'Server-Side Request Forgery (SSRF)', label: 'Kịch bản 10: SSRF', webhook: '/webhook/trigger-ssrf' },
];

export const RESPONSE_MODE_OPTIONS = [
  { value: "onReceived", label: "On Received (Phản hồi ngay lập tức)", color: "#06b6d4" },
  { value: "lastNode", label: "When Last Node Finishes (Đợi hoàn tất)", color: "#a855f7" },
];

export const HTTP_METHOD_OPTIONS = [
  { value: "GET", label: "GET", color: "#10b981" },
  { value: "POST", label: "POST", color: "#3b82f6" },
  { value: "PUT", label: "PUT", color: "#f59e0b" },
  { value: "DELETE", label: "DELETE", color: "#ef4444" },
  { value: "PATCH", label: "PATCH", color: "#8b5cf6" },
];

export const AUTH_TYPE_OPTIONS = [
  { value: "none", label: "None (Không xác thực)" },
  { value: "apiKey", label: "Header Auth / API Key (Khóa bí mật)", color: "#f59e0b" },
  { value: "bearer", label: "Bearer Token (Authorization)", color: "#3b82f6" },
];

export const ON_ERROR_OPTIONS = [
  { value: "stopWorkflow", label: "Dừng Workflow khi có lỗi (Stop Workflow)" },
  { value: "continueErrorOutput", label: "Rẽ sang nhánh lỗi - Error Output (Tiếp tục xử lý)", color: "#f43f5e" },
  { value: "continueRegularOutput", label: "Bỏ qua lỗi & tiếp tục nhánh chính (Ignore Error)", color: "#10b981" },
];

export const OPERATOR_OPTIONS = [
  { value: "gt", label: "Lớn hơn (>)" },
  { value: "gte", label: "Lớn hơn hoặc bằng (>=)" },
  { value: "equal", label: "Bằng (==)" },
  { value: "notEqual", label: "Khác (!=)" },
  { value: "lt", label: "Nhỏ hơn (<)" },
  { value: "contains", label: "Chứa chuỗi (contains)" },
];

export const WAIT_UNIT_OPTIONS = [
  { value: "seconds", label: "Giây (Seconds)" },
  { value: "minutes", label: "Phút (Minutes)" },
  { value: "hours", label: "Giờ (Hours)" },
];
