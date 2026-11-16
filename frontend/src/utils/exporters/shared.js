import { logReportExport } from "../../api/reportApi";

export const recordReportExportAudit = (payload) => {
  logReportExport(payload).catch((err) => {
    console.warn("[ReportAudit] Không thể ghi lịch sử xuất báo cáo:", err?.message || err);
  });
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildRecommendationLines = (alert, logs = [], mttrText = "0 ms") => [
  `Hệ thống điều phối và phản ứng tự động (SOAR) đã tiếp nhận cảnh báo và triển khai quy trình ứng cứu với tổng thời gian xử lý (MTTR): ${mttrText}.`,
  `Đã lập hồ sơ lưu vết kỹ thuật (Audit Log) gồm ${logs.length} bước thực thi và gửi thông báo cảnh báo an toàn thông tin tới tài khoản liên quan (${alert?.victim_email || "Không xác định"}).`,
  `Kiến nghị Bộ phận Quản trị Mạng và Bảo mật rà soát, áp dụng biện pháp ngăn chặn địa chỉ IP nguồn (${alert?.source_ip || "Chưa xác định"}) trên tường lửa và hệ thống phát hiện/ngăn chặn xâm nhập (IPS/WAF) nếu không thuộc dải địa chỉ tin cậy.`,
  `Kiến nghị rà soát lại nhật ký truy cập của tài khoản/hệ thống đích (${alert?.destination_ip || "Chưa xác định"}), thực hiện đặt lại mật khẩu và kích hoạt xác thực đa yếu tố (MFA) để phòng ngừa nguy cơ leo thang đặc quyền.`,
];
