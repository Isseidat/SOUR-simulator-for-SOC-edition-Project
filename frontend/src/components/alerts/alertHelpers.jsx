import React from "react";
import clsx from "clsx";
export * from "../../constants/index.js";

// 10 kịch bản định sẵn tiêu chuẩn trong hệ thống SOAR
export const PREDEFINED_SCENARIOS = [
  { type: "Phishing Email" },
  { type: "Brute Force Attack" },
  { type: "Malware Detection" },
  { type: "Suspicious Login" },
  { type: "Port Scan Detection" },
  { type: "NoSQL Injection Detection" },
  { type: "Cross-Site Scripting (XSS)" },
  { type: "Insecure Direct Object Reference (IDOR)" },
  { type: "Credential Stuffing" },
  { type: "Server-Side Request Forgery (SSRF)" },
];

export const SEVERITY_OPTIONS = [
  { value: "", label: "Tất cả mức độ" },
  { value: "Critical", label: "Critical", color: "#ef4444" },
  { value: "High", label: "High", color: "#f97316" },
  { value: "Medium", label: "Medium", color: "#f59e0b" },
  { value: "Low", label: "Low", color: "#3b82f6" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "New", label: "New", color: "#3b82f6" },
  { value: "In Progress", label: "In Progress", color: "#f59e0b" },
  { value: "Resolved", label: "Resolved", color: "#10b981" },
];

// Helper gạch vàng nổi đoạn ký tự trùng khớp (Real-time highlight)
export const highlightMatch = (text, query) => {
  if (!query || !text) return text;
  const str = String(text);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = str.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-bold px-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Helper render badge Mức độ
export const getSeverityBadge = (severity) => {
  const map = {
    Critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={clsx(
        "px-2 py-1 rounded text-[10px] font-bold border",
        map[severity] || map["Low"]
      )}
    >
      {severity}
    </span>
  );
};

// Helper render badge Trạng thái
export const getStatusBadge = (status) => {
  const map = {
    New: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700",
    "In Progress":
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 animate-pulse",
    Resolved:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "Closed - False Positive":
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    "Closed - Error":
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };
  return (
    <span
      className={clsx(
        "px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 w-fit",
        map[status] || map["New"]
      )}
    >
      {status === "In Progress" && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
      )}
      {status}
    </span>
  );
};

export {
  getCleanAlertTags,
  getForensicDetails,
  formatDateTime,
  formatSeverityVN,
  formatStatusVN,
  formatScenarioVN,
  calculateMttr,
} from "../../utils/formatters";

