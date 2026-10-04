import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getAlerts, generateMockAlerts, getAlertById } from "../api/alertApi";
import { triggerPlaybook } from "../api/playbookApi";
import { getLogs } from "../api/logApi";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Eye,
  X,
  Terminal,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ShieldAlert,
  Activity,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [soarLogs, setSoarLogs] = useState([]);

  // Fetch realtime SOAR Logs for selected alert
  useEffect(() => {
    let intervalId;
    if (selectedAlert) {
      const fetchRealtimeData = async () => {
        try {
          // 1. Fetch Logs
          const resLogs = await getLogs({
            search: selectedAlert.alert_id,
            limit: 50,
          });
          if (resLogs.data && resLogs.data.data) {
            const logArray = resLogs.data.data || resLogs.data || [];
            const exactLogs = (Array.isArray(logArray) ? logArray : []).filter(
              (l) => l.alert_id === selectedAlert.alert_id,
            );
            setSoarLogs(exactLogs.reverse());
          }

          // 2. Poll Alert Status
          if (selectedAlert.status === "In Progress") {
            const resAlert = await getAlertById(selectedAlert.alert_id);
            if (resAlert.success && resAlert.data) {
              const latestStatus = resAlert.data.status;
              if (latestStatus !== "In Progress") {
                setSelectedAlert(resAlert.data);
                setAlerts((prev) =>
                  prev.map((a) =>
                    a.alert_id === selectedAlert.alert_id ? resAlert.data : a,
                  ),
                );
              }
            }
          }
        } catch (e) {
          console.error("Lỗi fetch realtime", e);
        }
      };

      fetchRealtimeData();

      if (selectedAlert.status === "In Progress") {
        intervalId = setInterval(fetchRealtimeData, 1500);
      }
    } else {
      setSoarLogs([]);
    }
    return () => clearInterval(intervalId);
  }, [selectedAlert?.alert_id, selectedAlert?.status]);

  const handleTriggerPlaybook = async (alert_id) => {
    if (!alert_id) return;
    setIsTriggering(true);
    try {
      const res = await triggerPlaybook(alert_id);
      if (res.success) {
        // Cập nhật local state tạm thời để thấy ngay hiệu ứng
        setSelectedAlert((prev) =>
          prev ? { ...prev, status: "In Progress" } : null,
        );
        setAlerts((prev) =>
          prev.map((a) =>
            a.alert_id === alert_id ? { ...a, status: "In Progress" } : a,
          ),
        );
      }
    } catch (error) {
      console.error("Lỗi khi gọi playbook", error);
    }
    setIsTriggering(false);
  };
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [filters, setFilters] = useState({
    status: "",
    severity: "",
  });

  // Tìm kiếm toàn cơ sở dữ liệu (tất cả các trang) kèm debounce 350ms
  const fetchAlerts = async (
    overrideSearch = searchTerm,
    overridePage = page,
  ) => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
    try {
      const params = {
        ...filters,
        page: overridePage,
        limit: 10,
        ...(overrideSearch.trim() && { search: overrideSearch.trim() }),
      };
      const [res] = await Promise.all([
        getAlerts(params),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      if (res.success) {
        setAlerts(res.data || []);
        setTotalPages(Math.ceil(res.total / 10) || 1);
        setTotal(res.total || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách cảnh báo", error);
    }
    setLoading(false);
  };

  // Debounce search input để tìm kiếm real-time toàn bộ database
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAlerts(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

  // Khi chuyển trang
  useEffect(() => {
    fetchAlerts(searchTerm, page);
  }, [page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleGenerateMock = async () => {
    try {
      await generateMockAlerts(5);
      fetchAlerts();
      window.dispatchEvent(new CustomEvent("alertCountChanged"));
    } catch (error) {
      alert("Lỗi khi sinh cảnh báo");
    }
  };

  // Helper gạch vàng nổi đoạn ký tự trùng khớp (Real-time highlight)
  const highlightMatch = (text, query) => {
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
      ),
    );
  };

  // Helper render badge Mức độ
  const getSeverityBadge = (severity) => {
    const map = {
      Critical:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      Medium:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
    return (
      <span
        className={clsx(
          "px-2 py-1 rounded text-[10px] font-bold border",
          map[severity] || map["Low"],
        )}
      >
        {severity}
      </span>
    );
  };

  // Helper render badge Trạng thái
  const getStatusBadge = (status) => {
    const map = {
      New: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700",
      "In Progress":
        "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 animate-pulse",
      Resolved:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
    return (
      <span
        className={clsx(
          "px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 w-fit",
          map[status] || map["New"],
        )}
      >
        {status === "In Progress" && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
        )}
        {status}
      </span>
    );
  };

  const handleCopyJson = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      console.error("Lỗi sao chép JSON:", e);
    }
  };

  // Helper trích xuất bằng chứng kỹ thuật dựa trên mockGenerator
  const getForensicDetails = (alert) => {
    if (!alert) return null;
    const p = alert.payload || {};
    const t = alert.type || "";

    if (t === "Cross-Site Scripting (XSS)") {
      return {
        title: "Bằng Chứng Chèn Thẻ Script Độc Hại (mockGenerator)",
        subtitle: `Kẻ tấn công gửi mã ${p.injected_payload || "<script>alert(1)</script>"} vào endpoint ${p.endpoint || "/api/v1/comments"}.`,
        items: [
          { label: "Endpoint", value: p.endpoint || "/api/v1/comments" },
          {
            label: "Injected Payload",
            value: p.injected_payload || "<script>alert(1)</script>",
            highlight: true,
          },
          {
            label: "Description",
            value:
              p.description || "Payload chứa Script thực thi (True Positive).",
          },
        ],
      };
    }

    if (t === "NoSQL Injection Detection") {
      return {
        title: "Bằng Chứng Tấn Công Tiêm Nhiễm CSDL (NoSQL Injection)",
        subtitle: `Cú pháp NoSQL truy vấn bỏ qua kiểm tra xác thực tại endpoint ${p.endpoint || "/api/v1/auth/login"}.`,
        items: [
          { label: "Endpoint", value: p.endpoint || "/api/v1/auth/login" },
          {
            label: "Injected Payload",
            value:
              typeof p.injected_payload === "object"
                ? JSON.stringify(p.injected_payload)
                : p.injected_payload || '{"$gt": ""}',
            highlight: true,
          },
          {
            label: "Source IP",
            value: p.source_ip || alert.source_ip || "103.11.22.33",
          },
          {
            label: "Description",
            value:
              p.description || "Payload chứa toán tử NoSQLi (True Positive).",
          },
        ],
      };
    }

    if (t === "Brute Force Attack") {
      return {
        title: "Bằng Chứng Tấn Công Dò Quét Mật Khẩu (Brute Force)",
        subtitle: `Ghi nhận ${p.failed_attempts || 11} lần xác thực thất bại liên tiếp vào tài khoản ${p.username || "admin"}.`,
        items: [
          {
            label: "Target Account",
            value: p.username || "admin",
            highlight: true,
          },
          {
            label: "Failed Attempts",
            value: `${p.failed_attempts || 11} lần liên tiếp`,
          },
          {
            label: "Protocol / Port",
            value: `${p.protocol || "SSH"} (Cổng ${p.port || 22})`,
          },
          {
            label: "Description",
            value:
              p.description ||
              "Đăng nhập sai vượt ngưỡng cảnh báo (True Positive).",
          },
        ],
      };
    }

    if (t === "Phishing Email") {
      return {
        title: "Bằng Chứng Thư Lừa Đảo Giả Mạo (Phishing Email)",
        subtitle: `Phát hiện email giả mạo chứa liên kết phishing chuyển hướng độc hại.`,
        items: [
          {
            label: "Sender",
            value: p.sender || "attacker@ten-mien-doc-hai.com",
            highlight: true,
          },
          { label: "Recipient", value: p.recipient || "nhan_vien@company.com" },
          {
            label: "Subject",
            value: p.subject || "KHẨN CẤP: Yêu cầu xác minh tài khoản",
          },
          {
            label: "Suspicious URL",
            value:
              p.suspicious_url || "http://www.eicar.org/download/eicar.com",
            highlight: true,
          },
          {
            label: "Description",
            value:
              p.description ||
              "Phát hiện đường link chứa URL mã độc (True Positive).",
          },
        ],
      };
    }

    if (t === "Malware Detection") {
      return {
        title: "Bằng Chứng Phát Hiện Mã Độc Máy Trạm (Malware Detection)",
        subtitle: `Hệ thống phòng thủ EDR phát hiện tiến trình thực thi tệp tin độc hại.`,
        items: [
          { label: "Hostname", value: p.hostname || "MAY-TRAM-KE-TOAN" },
          {
            label: "File Name",
            value: p.file_name || "chi_tiet_hoa_don_thanh_toan.exe",
            highlight: true,
          },
          {
            label: "SHA256 Hash",
            value:
              p.file_hash ||
              "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
          {
            label: "Threat Classification",
            value: p.threat_name || "Trojan.Win32",
          },
          {
            label: "Description",
            value:
              p.description || "Phần mềm chứa Trojan độc hại (True Positive).",
          },
        ],
      };
    }

    if (t === "Suspicious Login") {
      return {
        title: "Bằng Chứng Đăng Nhập Vị Trí Bất Thường (Impossible Travel)",
        subtitle: `Tài khoản ${p.user_email || "nguyen.van.a@company.com"} đăng nhập từ vị trí xa bất thường trong thời gian ngắn.`,
        items: [
          {
            label: "User Email",
            value: p.user_email || "nguyen.van.a@company.com",
            highlight: true,
          },
          { label: "Current Location", value: p.location || "HackerLand" },
          { label: "Usual Location", value: p.usual_location || "Hanoi" },
          {
            label: "Time Difference",
            value: `${p.time_difference_hours || 0.5} giờ`,
          },
          {
            label: "Description",
            value:
              p.description ||
              "Vị trí đăng nhập rất bất thường (True Positive).",
          },
        ],
      };
    }

    if (t === "Port Scan Detection") {
      return {
        title: "Bằng Chứng Rà Quét Cổng Mạng Nội Bộ (Port Scan)",
        subtitle: `Phát hiện gói tin trinh sát cổng mạng từ địa chỉ IP bên ngoài hoặc máy nội bộ bị chiếm quyền.`,
        items: [
          {
            label: "Tool Used",
            value: p.tool_used || "Nmap Port Scanner",
            highlight: true,
          },
          {
            label: "Scanned Ports",
            value: Array.isArray(p.scanned_ports)
              ? p.scanned_ports.join(", ")
              : "21, 22, 80, 443, 3306, 8080",
          },
          {
            label: "Total Packets",
            value: `${p.total_packets || 1500} gói tin`,
          },
          {
            label: "Description",
            value: p.description || "IP độc hại rà quét cổng (True Positive).",
          },
        ],
      };
    }

    if (t === "Insecure Direct Object Reference (IDOR)") {
      return {
        title: "Bằng Chứng Truy Cập Trái Phép Tài Nguyên (IDOR)",
        subtitle: `Người dùng quyền thấp can thiệp tham số định danh để xem thông tin người khác.`,
        items: [
          {
            label: "Endpoint",
            value: p.endpoint || "/api/v1/orders/9999",
            highlight: true,
          },
          { label: "User Role", value: p.user_role || "Viewer" },
          {
            label: "Description",
            value:
              p.description ||
              "Người dùng quyền thấp đổi ID truy cập trái phép (True Positive).",
          },
        ],
      };
    }

    if (t === "Credential Stuffing") {
      return {
        title: "Bằng Chứng Nhồi Nhét Thông Tin Xác Thực (Credential Stuffing)",
        subtitle: `Tấn công botnet tự động sử dụng danh sách tài khoản rò rỉ trên diện rộng.`,
        items: [
          {
            label: "Endpoint",
            value: p.endpoint || "/api/v1/auth/login",
            highlight: true,
          },
          {
            label: "Failed Logins",
            value: `${p.failed_logins || 50} lần liên tiếp`,
          },
          {
            label: "Successful Logins",
            value: `${p.successful_logins || 2} lần`,
          },
          {
            label: "Description",
            value:
              p.description ||
              "Đăng nhập sai 50 lần liên tiếp (True Positive).",
          },
        ],
      };
    }

    if (t === "Server-Side Request Forgery (SSRF)") {
      return {
        title: "Bằng Chứng Lỗ Hổng Giả Mạo Yêu Cầu Máy Chủ (SSRF)",
        subtitle: `Lợi dụng máy chủ gửi truy vấn mạng vào mạng nội bộ hoặc AWS Metadata.`,
        items: [
          {
            label: "Endpoint",
            value:
              p.endpoint ||
              "/api/v1/fetch-image?url=http://169.254.169.254/latest/meta-data/",
            highlight: true,
          },
          {
            label: "Target Internal IP",
            value: p.target_internal_ip || "169.254.169.254",
          },
          {
            label: "Description",
            value:
              p.description || "Gọi đến AWS Metadata nội bộ (True Positive).",
          },
        ],
      };
    }

    // Mặc định cho các loại cảnh báo khác
    return {
      title: `Bằng Chứng Kỹ Thuật Sự Cố (${t || "Security Incident"})`,
      subtitle:
        p.title || "Dữ liệu điều tra kỹ thuật số từ bộ cảm biến an ninh.",
      items: Object.entries(p)
        .filter(([k]) => k !== "title")
        .map(([k, v]) => ({
          label: k,
          value: typeof v === "object" ? JSON.stringify(v) : String(v),
        })),
    };
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col max-w-7xl mx-auto animate-slide-up">
      {/* 1. HEADER BANNER - CHUẨN FORM 100% NHƯ DASHBOARD VÀ LOGS (KHÔNG DÙNG CARD) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Quản Lý Cảnh Báo (Alerts)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Danh sách và trạng thái các sự kiện an ninh được hệ thống ghi nhận
          </p>
        </div>

        {/* Nút Reload và Nút Thao Tác Chuẩn Form Dashboard */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchAlerts(searchTerm, page)}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu cảnh báo"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin text-cyan-500" : ""}
            />
          </button>

          {user?.role === "Admin" && (
            <button
              onClick={handleGenerateMock}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              + Sinh Dữ Liệu Ảo
            </button>
          )}
        </div>
      </div>

      {/* 2. TOOLBAR: TÌM KIẾM TOÀN BỘ CƠ SỞ DỮ LIỆU & BỘ LỌC */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        {/* Ô Tìm kiếm Realtime (Toàn bộ 10+ trang dữ liệu) */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm toàn hệ thống (ID, loại sự cố, IP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
          />
        </div>

        {/* Lọc Mức Độ */}
        <select
          className="py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 transition cursor-pointer"
          value={filters.severity}
          onChange={(e) => handleFilterChange("severity", e.target.value)}
        >
          <option value="">Tất cả mức độ</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Lọc Trạng Thái */}
        <select
          className="py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 transition cursor-pointer"
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* 3. TABLE DANH SÁCH CẢNH BÁO */}
      <div
        key={reloadTrigger}
        className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm min-h-[400px] animate-slide-up"
      >
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Alert ID</th>
                <th className="px-4 py-3.5">Thời gian</th>
                <th className="px-4 py-3.5">Loại sự cố</th>
                <th className="px-4 py-3.5">Mức độ</th>
                <th className="px-4 py-3.5">IP Nguồn/Đích</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {loading && alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    <RefreshCw
                      size={24}
                      className="animate-spin mx-auto text-cyan-500 mb-2"
                    />
                    <span>Đang tải dữ liệu cảnh báo...</span>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    {searchTerm
                      ? "Không tìm thấy cảnh báo phù hợp với từ khóa trên toàn bộ hệ thống."
                      : 'Chưa có cảnh báo nào. Hãy bấm "Sinh Dữ Liệu Ảo".'}
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const fullId = alert.alert_id || alert._id || "";
                  const isMatchingSearch =
                    searchTerm.trim() &&
                    fullId.toLowerCase().includes(searchTerm.toLowerCase());

                  return (
                    <tr
                      key={alert._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Alert ID - Nổi bật đoạn trùng khớp trong ID */}
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          title={fullId}
                        >
                          {isMatchingSearch
                            ? highlightMatch(fullId, searchTerm)
                            : `${fullId.substring(0, 8)}...`}
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} className="text-slate-400" />
                        <span>
                          {alert.timestamp
                            ? format(
                                new Date(alert.timestamp),
                                "HH:mm - dd/MM/yyyy",
                              )
                            : "N/A"}
                        </span>
                      </td>

                      {/* Loại sự cố */}
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                        {highlightMatch(alert.type, searchTerm)}
                      </td>

                      {/* Mức độ */}
                      <td className="px-4 py-3">
                        {getSeverityBadge(alert.severity)}
                      </td>

                      {/* IP Nguồn & Đích */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[10px]">
                          {highlightMatch(alert.source_ip, searchTerm)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {highlightMatch(
                            alert.destination_ip || "N/A",
                            searchTerm,
                          )}
                        </div>
                      </td>

                      {/* Trạng thái & Tag SOAR */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert.status)}
                          {alert.tags && alert.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {alert.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                    tag === "soar-done"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : tag === "soar-error"
                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse"
                                  }`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Xem chi tiết cảnh báo"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PHÂN TRANG (PAGINATION FOOTER) */}
      <div className="flex items-center justify-between border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0c1222] px-4 py-3 rounded-2xl shadow-sm shrink-0">
        <div className="text-xs text-slate-500 font-medium">
          Đang xem trang{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {page}
          </span>{" "}
          /{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {totalPages}
          </span>
          <span className="hidden sm:inline"> (Tổng cộng {total} dòng)</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 5. MODAL CHI TIẾT ALERT (DÙNG CREATEPORTAL ĐỂ PHỦ TOÀN BỘ PHẦN MỀM) */}
      {selectedAlert &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                    <Terminal size={17} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedAlert.type}
                      </h3>
                      {getSeverityBadge(selectedAlert.severity)}
                      {getStatusBadge(selectedAlert.status)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Mã sự cố: {selectedAlert.alert_id} • Phát hiện:{" "}
                      {selectedAlert.timestamp
                        ? format(
                            new Date(selectedAlert.timestamp),
                            "HH:mm:ss - dd/MM/yyyy",
                          )
                        : "N/A"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs custom-scrollbar">
                <div className="space-y-4">
                  {/* Bằng Chứng Kỹ Thuật (mockGenerator highlight) */}
                  {(() => {
                    const forensic = getForensicDetails(selectedAlert);
                    if (!forensic) return null;
                    return (
                      <div className="bg-slate-50 dark:bg-[#111827]/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                            <ShieldAlert size={15} />
                            <span>{forensic.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {forensic.subtitle}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {forensic.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60"
                            >
                              <span className="text-slate-500 dark:text-slate-400 font-medium">
                                {item.label}:
                              </span>
                              <span
                                className={clsx(
                                  "font-mono px-2 py-0.5 rounded text-[11px] max-w-full overflow-x-auto",
                                  item.highlight
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold"
                                    : "text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
                                )}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Raw JSON Payload trong Cơ sở dữ liệu */}
                  {(() => {
                    const rawJsonDoc = {
                      _id: selectedAlert._id || "66f9104b2a81230018a12007",
                      alert_id: selectedAlert.alert_id,
                      type: selectedAlert.type,
                      severity: selectedAlert.severity,
                      source_ip: selectedAlert.source_ip || "91.240.118.82",
                      destination_ip:
                        selectedAlert.destination_ip || "10.0.0.15",
                      victim_email:
                        selectedAlert.victim_email || "isseidat159@gmail.com",
                      payload: selectedAlert.payload,
                      status: selectedAlert.status,
                      tags: selectedAlert.tags || ["soar-done"],
                    };

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-300 text-xs">
                            <Terminal size={14} className="text-cyan-500" />
                            <span>Raw JSON Payload trong Cơ sở dữ liệu</span>
                          </div>
                          <button
                            onClick={() => handleCopyJson(rawJsonDoc)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                          >
                            {copiedJson ? (
                              <>
                                <Check size={12} className="text-emerald-500" />
                                <span className="text-emerald-500 font-semibold">
                                  Đã sao chép
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="text-slate-400" />
                                <span>Sao chép JSON</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-[#030712] text-emerald-400 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800 shadow-inner max-h-60 custom-scrollbar">
                          {JSON.stringify(rawJsonDoc, null, 2)}
                        </pre>
                      </div>
                    );
                  })()}

                  {/* Real-time SOAR Execution Logs */}
                  {soarLogs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="font-bold flex items-center justify-between text-slate-800 dark:text-slate-300 text-xs">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-cyan-500" />
                          <span>Tiến trình điều phối (SOAR Real-time)</span>
                        </div>
                        {selectedAlert?.status === "In Progress" && (
                          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-mono text-[10px] animate-pulse">
                            <RefreshCw size={10} className="animate-spin" />
                            <span>Đang đồng bộ...</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#050810] rounded-xl p-3 max-h-60 overflow-y-auto custom-scrollbar border border-slate-800 space-y-2.5 font-mono text-[11px] shadow-inner">
                        {soarLogs.map((log) => {
                          const isSuccess = log.status === "SUCCESS";
                          const isFailed = log.status === "FAILED";
                          const isProg = log.status === "IN_PROGRESS";

                          return (
                            <div key={log._id} className="flex gap-2">
                              <div className="text-slate-500 shrink-0">
                                [{format(new Date(log.createdAt), "HH:mm:ss")}]
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={clsx(
                                      "font-bold",
                                      isSuccess
                                        ? "text-emerald-400"
                                        : isFailed
                                          ? "text-rose-400"
                                          : "text-cyan-400",
                                    )}
                                  >
                                    {log.step_name}
                                  </span>
                                  <span
                                    className={clsx(
                                      "text-[9px] px-1.5 rounded border",
                                      isSuccess
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        : isFailed
                                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                          : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                                    )}
                                  >
                                    {log.status}
                                  </span>
                                </div>
                                <div className="text-slate-300 text-[10px]">
                                  {log.message}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#0c1222]/90">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  {selectedAlert.status !== "Resolved" &&
                    selectedAlert.status !== "Closed - Error" &&
                    selectedAlert.status !== "Closed - False Positive" && (
                      <button
                        onClick={() =>
                          handleTriggerPlaybook(selectedAlert.alert_id)
                        }
                        disabled={
                          isTriggering || selectedAlert.status === "In Progress"
                        }
                        className={clsx(
                          "flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold transition shadow-sm",
                          isTriggering || selectedAlert.status === "In Progress"
                            ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                            : "bg-cyan-500 hover:bg-cyan-600 text-white cursor-pointer",
                        )}
                      >
                        {isTriggering ||
                        selectedAlert.status === "In Progress" ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Đang Xử Lý SOAR...
                          </>
                        ) : (
                          <>
                            <Terminal size={14} />
                            Chạy Kịch Bản (SOAR)
                          </>
                        )}
                      </button>
                    )}
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
