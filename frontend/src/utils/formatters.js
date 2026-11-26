import { format } from "date-fns";

/**
 * Định dạng thời gian an toàn từ chuỗi ISO hoặc đối tượng Date.
 */
export const formatDateTime = (dateInput, pattern = "HH:mm:ss dd/MM/yyyy") => {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "N/A";
  return format(d, pattern);
};

/**
 * Định dạng dòng địa danh & ngày tháng chuẩn văn bản hành chính Việt Nam.
 * VD: "Hồ Chí Minh, ngày 13 tháng 11 năm 2026"
 */
export const formatAdminDateHeader = (dateInput = new Date(), location = "Hồ Chí Minh") => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const day = String(safeDate.getDate()).padStart(2, "0");
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const year = safeDate.getFullYear();
  return `${location}, ngày ${day} tháng ${month} năm ${year}`;
};

/**
 * Sinh số hiệu văn bản hành chính từ mã sự cố (VD: "Số: 104/BC-SOC").
 */
export const formatReportNumber = (alert) => {
  const rawId = String(alert?.alert_id || alert?._id || "").trim();
  const digits = rawId.replace(/\D+/g, "");
  const suffix = digits ? digits.slice(-4) : rawId ? rawId.slice(-4).toUpperCase() : "001";
  return `Số: ${suffix}/BC-SOC`;
};

/**
 * Chuyển đổi mức độ nghiêm trọng sang tiếng Việt hành chính.
 */
export const formatSeverityVN = (severity) => {
  const map = {
    Critical: "Đặc biệt nghiêm trọng (Critical)",
    High: "Nghiêm trọng cao (High)",
    Medium: "Trung bình (Medium)",
    Low: "Mức thấp (Low)",
  };
  return map[severity] || severity || "Không xác định";
};

/**
 * Chuyển đổi trạng thái xử lý sang tiếng Việt hành chính.
 */
export const formatStatusVN = (status) => {
  const map = {
    Resolved: "Đã xử lý và khắc phục (Resolved)",
    "In Progress": "Đang xác minh, xử lý (In Progress)",
    New: "Mới tiếp nhận (New)",
    "Closed - Error": "Đóng - Lỗi kỹ thuật (Closed - Error)",
    "Closed - False Positive": "Đóng - Cảnh báo giả (False Positive)",
  };
  return map[status] || status || "Không xác định";
};

/**
 * Chuyển đổi tên kịch bản tấn công sang thuật ngữ hành chính tiếng Việt.
 */
export const formatScenarioVN = (type) => {
  const map = {
    "Phishing Email": "Tấn công giả mạo thư điện tử (Phishing Email)",
    "Brute Force Attack": "Tấn công dò quét mật khẩu (Brute Force Attack)",
    "Malware Detection": "Phát hiện mã độc trên thiết bị (Malware Detection)",
    "Suspicious Login": "Truy cập đăng nhập bất thường (Suspicious Login)",
    "Port Scan Detection": "Dò quét cổng dịch vụ mạng (Port Scan Detection)",
    "NoSQL Injection Detection": "Tấn công chèn mã truy vấn CSDL (NoSQL Injection)",
    "Cross-Site Scripting (XSS)": "Tấn công chèn mã kịch bản thực thi chéo (XSS)",
    "Insecure Direct Object Reference (IDOR)": "Khai thác tham chiếu đối tượng trực tiếp (IDOR)",
    "Credential Stuffing": "Tấn công nhồi thông tin xác thực (Credential Stuffing)",
    "Server-Side Request Forgery (SSRF)": "Giả mạo yêu cầu từ phía máy chủ (SSRF)",
  };
  return map[type] || type || "Sự cố an toàn thông tin mạng";
};

/**
 * Tính toán thời gian phản ứng & xử lý sự cố (MTTR).
 */
export const calculateMttr = (alert, logs = []) => {
  if (!alert) return { diffMs: 0, mttrText: "0 ms" };

  const startRaw = alert.timestamp || alert.createdAt;
  const startTime = startRaw ? new Date(startRaw).getTime() : Date.now();
  const safeStart = Number.isNaN(startTime) ? Date.now() : startTime;

  let latestLogTime = null;
  if (Array.isArray(logs) && logs.length > 0) {
    for (const lg of logs) {
      const raw = lg?.timestamp || lg?.createdAt;
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!Number.isNaN(ts) && (latestLogTime === null || ts > latestLogTime)) {
        latestLogTime = ts;
      }
    }
  }

  let safeEnd = safeStart;
  if (latestLogTime !== null) {
    safeEnd = latestLogTime;
  } else if (alert.status !== "New") {
    const fallbackRaw = alert.updatedAt || alert.timestamp || alert.createdAt;
    const fallbackTime = fallbackRaw ? new Date(fallbackRaw).getTime() : safeStart;
    safeEnd = Number.isNaN(fallbackTime) ? safeStart : fallbackTime;
  }

  const diffMs = Math.max(0, safeEnd - safeStart);
  const mttrText =
    diffMs > 60000
      ? `${(diffMs / 60000).toFixed(1)} phút`
      : diffMs > 1000
        ? `${(diffMs / 1000).toFixed(2)} giây`
        : `${diffMs} ms`;

  return { diffMs, mttrText };
};

/**
 * Làm sạch danh sách tag: loại trừ xung đột done/error dựa theo trạng thái.
 */
export const getCleanAlertTags = (alert) => {
  if (!alert?.tags || alert.tags.length === 0) return [];
  let cleanTags = alert.tags;
  if (
    alert.status === "Resolved" ||
    alert.status === "Closed - False Positive"
  ) {
    cleanTags = cleanTags.filter((t) => t !== "soar-error");
  } else if (alert.status === "Closed - Error") {
    cleanTags = cleanTags.filter((t) => t !== "soar-done");
  }
  return Array.from(new Set(cleanTags));
};

/**
 * Trích xuất bằng chứng kỹ thuật (IOCs) trực tiếp từ alert.payload với nhãn tiếng Việt chuẩn báo cáo giám định.
 */
export const getForensicDetails = (alert) => {
  if (!alert) return null;
  const p = alert.payload || {};
  const t = alert.type || "Security Incident";

  const LABEL_MAP = {
    sender: "Địa chỉ phát tán",
    recipient: "Người nhận",
    subject: "Tiêu đề thư",
    suspicious_url: "Đường dẫn độc hại (URL)",
    username: "Tài khoản bị nhắm tới",
    failed_attempts: "Số lần thử sai",
    protocol: "Giao thức mạng",
    port: "Cổng dịch vụ",
    hostname: "Tên máy trạm",
    file_name: "Tên tệp tin",
    file_hash: "Mã băm SHA-256",
    threat_name: "Định danh mã độc",
    user_email: "Email người dùng",
    location: "Vị trí đăng nhập",
    usual_location: "Vị trí đăng nhập thường lệ",
    time_difference_hours: "Chênh lệch thời gian (giờ)",
    scanned_ports: "Các cổng bị rà quét",
    total_packets: "Tổng số gói tin ghi nhận",
    tool_used: "Công cụ tấn công",
    source_ip: "Địa chỉ IP nguồn",
    destination_ip: "Địa chỉ IP đích",
    endpoint: "Đường dẫn API đích",
    injected_payload: "Mã độc chèn vào",
    user_role: "Vai trò tài khoản",
    failed_logins: "Số lần đăng nhập thất bại",
    successful_logins: "Số lần đăng nhập thành công",
    target_internal_ip: "Địa chỉ IP nội bộ bị nhắm tới",
    description: "Mô tả chi tiết kỹ thuật",
  };

  const HIGHLIGHT_KEYS = new Set([
    "injected_payload",
    "suspicious_url",
    "sender",
    "username",
    "file_name",
    "user_email",
    "tool_used",
    "endpoint",
  ]);

  return {
    title: p.title || `Bằng Chứng Kỹ Thuật Sự Cố (${t})`,
    subtitle:
      p.description || "Dữ liệu điều tra kỹ thuật số từ bộ cảm biến an ninh.",
    items: Object.entries(p)
      .filter(([k]) => k !== "title")
      .map(([k, v]) => ({
        key: k,
        label: LABEL_MAP[k] || k,
        value: Array.isArray(v)
          ? v.join(", ")
          : typeof v === "object" && v !== null
            ? JSON.stringify(v)
            : String(v),
        highlight: HIGHLIGHT_KEYS.has(k),
      })),
  };
};

/**
 * Chuyển đổi trạng thái ExecutionLog sang tiếng Việt chuẩn báo cáo.
 */
export const formatLogStatusVN = (status) => {
  if (status === "SUCCESS") return "Thành công";
  if (status === "FAILED") return "Thất bại";
  if (status === "IN_PROGRESS") return "Đang xử lý";
  return status || "Không xác định";
};

