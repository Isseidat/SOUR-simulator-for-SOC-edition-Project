import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getAlerts,
  generateMockAlerts,
  getCronStatus,
  toggleSimulatorJob,
  toggleAutoTriage,
} from "../api/alertApi";
import { triggerPlaybook } from "../api/playbookApi";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Eye,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Play,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import CustomDropdown from "../components/common/CustomDropdown";
import AlertsHeader from "../components/alerts/AlertsHeader";
import AlertDetailModal from "../components/alerts/AlertDetailModal";
import AutoTriageConfigModal from "../components/alerts/AutoTriageConfigModal";
import {
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  highlightMatch,
  getSeverityBadge,
  getStatusBadge,
  getCleanAlertTags,
} from "../components/alerts/alertHelpers";

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [triggerNotification, setTriggerNotification] = useState(null);
  const [triggeringAlertId, setTriggeringAlertId] = useState(null);
  const [triggerFeedback, setTriggerFeedback] = useState({
    type: null,
    message: "",
  });

  // Phân trang, tìm kiếm & bộ lọc
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [pageCursors, setPageCursors] = useState({});
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
  });

  // Trạng thái 2 luồng Cron độc lập & Modal Cấu hình Auto-Triage
  const [cronSimulator, setCronSimulator] = useState({
    isActive: true,
    intervalMinutes: 5,
    totalGenerated: 0,
  });
  const [cronAutoTriage, setCronAutoTriage] = useState({
    isActive: true,
    intervalMinutes: 5,
    delayBetweenAlerts: 1500,
    batchSize: 5,
    allowedSeverities: ["Low", "Medium"],
    allowedAlertTypes: [],
    scenarioDelays: {},
    totalProcessed: 0,
  });
  const [togglingSimulator, setTogglingSimulator] = useState(false);
  const [togglingAutoTriage, setTogglingAutoTriage] = useState(false);
  const [isTriageConfigOpen, setIsTriageConfigOpen] = useState(false);

  // Tự động ẩn trigger feedback sau 3s
  useEffect(() => {
    if (triggerFeedback.type) {
      const timer = setTimeout(() => {
        setTriggerFeedback({ type: null, message: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [triggerFeedback.type]);

  // Reset notification khi đổi hoặc đóng alert, và tự động tắt sau 2 giây
  useEffect(() => {
    setTriggerNotification(null);
  }, [selectedAlert?.alert_id]);

  useEffect(() => {
    if (triggerNotification) {
      const timer = setTimeout(() => {
        setTriggerNotification(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [triggerNotification]);

  // Hàm kích hoạt Playbook dùng chung cho cả nút Play ngoài bảng và nút trong Modal
  const handleTriggerPlaybook = async (alert_id) => {
    if (!alert_id) return;
    setTriggeringAlertId(alert_id);
    setTriggerNotification(null);
    setTriggerFeedback({ type: null, message: "" });

    try {
      const res = await triggerPlaybook(alert_id);
      if (res.success) {
        const markInProgress = (item) => ({
          ...item,
          status: "In Progress",
          tags: Array.from(new Set([...(item.tags || []), "soar-processing"])),
        });

        setSelectedAlert((prev) =>
          prev && prev.alert_id === alert_id ? markInProgress(prev) : prev
        );
        setAlerts((prevAlerts) =>
          prevAlerts.map((a) =>
            a.alert_id === alert_id ? markInProgress(a) : a
          )
        );
        setTriggerFeedback({
          type: "success",
          message: res.message || `Đã kích hoạt kịch bản cho ${alert_id}!`,
        });
      }
    } catch (error) {
      console.error("Lỗi khi gọi playbook", error);
      const data = error.response?.data;
      const errorMsg =
        data?.message ||
        error.message ||
        "Không thể kích hoạt kịch bản điều phối.";
      const lockedBy = data?.locked_by || null;
      const currentStatus = data?.current_status || "In Progress";

      setTriggerNotification({
        type: data?.already_triggered ? "warning" : "error",
        message: errorMsg,
        lockedBy,
      });

      if (data?.already_triggered) {
        setSelectedAlert((prev) =>
          prev && prev.alert_id === alert_id
            ? { ...prev, status: currentStatus }
            : prev
        );
        setAlerts((prevAlerts) =>
          prevAlerts.map((a) =>
            a.alert_id === alert_id ? { ...a, status: currentStatus } : a
          )
        );
      }
    } finally {
      setTriggeringAlertId(null);
    }
  };

  // Tìm kiếm toàn cơ sở dữ liệu (tất cả các trang) kèm Cursor-based Pagination
  const fetchAlerts = async (
    overrideSearch = searchTerm,
    overridePage = page,
    isSilent = false
  ) => {
    if (!isSilent) {
      setLoading(true);
      setReloadTrigger((prev) => prev + 1);
    }
    try {
      const params = {
        ...filters,
        page: overridePage,
        limit: 10,
        ...(overrideSearch.trim() && { search: overrideSearch.trim() }),
      };

      if (overridePage > 1 && pageCursors[overridePage - 1]) {
        params.last_id = pageCursors[overridePage - 1];
      }

      const promises = [getAlerts(params)];
      if (!isSilent) {
        promises.push(new Promise((resolve) => setTimeout(resolve, 350)));
      }

      const [res] = await Promise.all(promises);
      if (res.success) {
        const nextAlerts = res.data || [];

        setAlerts((prevAlerts) => {
          if (!isSilent) return nextAlerts;

          const isSame =
            prevAlerts.length === nextAlerts.length &&
            prevAlerts.every((item, idx) => {
              const next = nextAlerts[idx];
              return (
                next &&
                item._id === next._id &&
                item.status === next.status &&
                item.timestamp === next.timestamp &&
                JSON.stringify(item.tags || []) ===
                  JSON.stringify(next.tags || [])
              );
            });

          return isSame ? prevAlerts : nextAlerts;
        });

        const newTotal = res.total || 0;
        setTotal((prevTotal) => {
          if (newTotal !== prevTotal) {
            setTotalPages(Math.ceil(newTotal / 10) || 1);
            window.dispatchEvent(new CustomEvent("alertCountChanged"));
            return newTotal;
          }
          return prevTotal;
        });

        if (res.last_id) {
          setPageCursors((prev) => ({
            ...prev,
            [overridePage]: res.last_id,
          }));
        }
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách cảnh báo", error);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Debounce search input để tìm kiếm real-time toàn bộ database
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setPageCursors({});
      fetchAlerts(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

  // Khi chuyển trang
  useEffect(() => {
    fetchAlerts(searchTerm, page);
  }, [page]);

  // Auto-polling cập nhật Realtime cho bảng Cảnh báo
  useEffect(() => {
    const hasInProgress = alerts.some(
      (a) => a.status === "In Progress" || a.tags?.includes("soar-processing")
    );
    const pollInterval = hasInProgress ? 2000 : 4000;

    const timer = setInterval(() => {
      if (!document.hidden && !loading) {
        fetchAlerts(searchTerm, page, true);
      }
    }, pollInterval);

    const handleAlertEvent = () => fetchAlerts(searchTerm, page, true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAlerts(searchTerm, page, true);
      }
    };

    window.addEventListener("alertCountChanged", handleAlertEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener("alertCountChanged", handleAlertEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [searchTerm, page, filters, alerts, loading]);

  // Lấy trạng thái Cron Job khi load trang
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getCronStatus();
        if (res.success) {
          if (res.simulator) setCronSimulator(res.simulator);
          if (res.autoTriage) setCronAutoTriage(res.autoTriage);
        }
      } catch (err) {
        console.error("Lỗi lấy trạng thái Cron:", err);
      }
    };
    fetchStatus();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setPageCursors({});
  };

  const handleToggleSimulator = async () => {
    setTogglingSimulator(true);
    try {
      const next = !cronSimulator.isActive;
      const res = await toggleSimulatorJob(next);
      if (res.success && res.simulator) {
        setCronSimulator(res.simulator);
      } else if (res.success) {
        setCronSimulator((prev) => ({ ...prev, isActive: next }));
      }
    } catch (err) {
      alert(
        "Lỗi khi thay đổi trạng thái Tạo kịch bản: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setTogglingSimulator(false);
    }
  };

  const handleToggleAutoTriage = async () => {
    setTogglingAutoTriage(true);
    try {
      const next = !cronAutoTriage.isActive;
      const res = await toggleAutoTriage(next);
      if (res.success && res.autoTriage) {
        setCronAutoTriage(res.autoTriage);
      } else if (res.success) {
        setCronAutoTriage((prev) => ({ ...prev, isActive: next }));
      }
    } catch (err) {
      alert(
        "Lỗi khi thay đổi trạng thái Xử lý kịch bản: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setTogglingAutoTriage(false);
    }
  };

  const handleGenerateMock = async () => {
    try {
      await generateMockAlerts(5);
      fetchAlerts();
      window.dispatchEvent(new CustomEvent("alertCountChanged"));
    } catch {
      alert("Lỗi khi sinh cảnh báo");
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col max-w-7xl mx-auto animate-slide-up">
      {/* 1. HEADER BANNER & NÚT ĐIỀU KHIỂN */}
      <AlertsHeader
        loading={loading}
        onRefresh={() => fetchAlerts(searchTerm, page)}
        isAdmin={user?.role === "Admin"}
        cronSimulator={cronSimulator}
        togglingSimulator={togglingSimulator}
        onToggleSimulator={handleToggleSimulator}
        cronAutoTriage={cronAutoTriage}
        togglingAutoTriage={togglingAutoTriage}
        onToggleAutoTriage={handleToggleAutoTriage}
        onOpenTriageConfig={() => setIsTriageConfigOpen(true)}
        onGenerateMock={handleGenerateMock}
      />

      {/* 2. TOOLBAR: TÌM KIẾM TOÀN BỘ CƠ SỞ DỮ LIỆU & BỘ LỌC */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-55">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm toàn hệ thống (ID, loại sự cố, IP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
          />
        </div>

        <CustomDropdown
          value={filters.severity}
          onChange={(val) => handleFilterChange("severity", val)}
          options={SEVERITY_OPTIONS}
          className="min-w-38.75"
          accent="cyan"
        />

        <CustomDropdown
          value={filters.status}
          onChange={(val) => handleFilterChange("status", val)}
          options={STATUS_OPTIONS}
          className="min-w-40"
          accent="cyan"
        />
      </div>

      {/* 3. TABLE DANH SÁCH CẢNH BÁO */}
      <div
        key={reloadTrigger}
        className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm min-h-100 animate-slide-up"
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
                  const cleanTags = getCleanAlertTags(alert);

                  return (
                    <tr
                      key={alert._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Alert ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            title={fullId}
                          >
                            {isMatchingSearch
                              ? highlightMatch(fullId, searchTerm)
                              : `${fullId.substring(0, 8)}...`}
                          </span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} className="text-slate-400" />
                        <span>
                          {alert.timestamp
                            ? format(
                                new Date(alert.timestamp),
                                "HH:mm - dd/MM/yyyy"
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
                            searchTerm
                          )}
                        </div>
                      </td>

                      {/* Trạng thái & Tag SOAR */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert.status)}
                          {cleanTags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {cleanTags.map((tag, tIdx) => (
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
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Xem chi tiết cảnh báo"
                        >
                          <Eye size={14} />
                        </button>

                        {alert.status === "New" && user?.role === "Admin" && (
                          <button
                            onClick={() =>
                              handleTriggerPlaybook(alert.alert_id)
                            }
                            disabled={triggeringAlertId === alert.alert_id}
                            className={clsx(
                              "p-1.5 rounded-lg border transition cursor-pointer",
                              triggeringAlertId === alert.alert_id
                                ? "bg-cyan-500/20 text-cyan-500 border-cyan-500/30 cursor-not-allowed"
                                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                            )}
                            title="Kích hoạt Playbook tự động n8n"
                          >
                            {triggeringAlertId === alert.alert_id ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin text-cyan-500"
                              />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                        )}
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
        <div className="text-xs text-slate-500 font-medium flex items-center gap-2.5">
          <span>
            Đang xem trang{" "}
            <span className="font-bold text-slate-800 dark:text-white">
              {page}
            </span>{" "}
            /{" "}
            <span className="font-bold text-slate-800 dark:text-white">
              {totalPages}
            </span>
            <span className="hidden sm:inline"> (Tổng cộng {total} dòng)</span>
          </span>
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

      {/* 5. MODAL CHI TIẾT ALERT */}
      <AlertDetailModal
        selectedAlert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAlertUpdated={(updatedAlert) => {
          setSelectedAlert(updatedAlert);
          setAlerts((prev) =>
            prev.map((a) =>
              a.alert_id === updatedAlert.alert_id ? updatedAlert : a
            )
          );
        }}
        triggeringAlertId={triggeringAlertId}
        onTriggerPlaybook={handleTriggerPlaybook}
      />

      {/* 6. MODAL CẤU HÌNH XỬ LÝ KỊCH BẢN (AUTO-TRIAGE HUB) */}
      <AutoTriageConfigModal
        isOpen={isTriageConfigOpen}
        onClose={() => setIsTriageConfigOpen(false)}
        cronAutoTriage={cronAutoTriage}
        onConfigSaved={(updated) => setCronAutoTriage(updated)}
      />

      {/* 7. POP-UP THÔNG BÁO XUNG ĐỘT */}
      {triggerNotification &&
        createPortal(
          <div className="fixed inset-0 z-10010 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm animate-fade-in">
            <div className="w-72 rounded-2xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/40 animate-slide-up overflow-hidden">
              <div className="h-1 w-full bg-amber-400" />
              <div className="px-5 py-4 flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {triggerNotification.type === "warning"
                      ? "Đã có người kích hoạt"
                      : "Không thể kích hoạt"}
                  </p>
                  {triggerNotification.lockedBy ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Đang được xử lý bởi{" "}
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {triggerNotification.lockedBy}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {triggerNotification.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 8. TOAST FEEDBACK NỔI GÓC MÀN HÌNH */}
      {triggerFeedback.type && (
        <div
          className={clsx(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md animate-slide-up text-xs font-semibold",
            triggerFeedback.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-400 shadow-emerald-500/20"
              : triggerFeedback.type === "warning"
                ? "bg-amber-500/90 text-white border-amber-400 shadow-amber-500/20"
                : "bg-rose-500/90 text-white border-rose-400 shadow-rose-500/20"
          )}
        >
          {triggerFeedback.type === "success" ? (
            <Check size={16} className="text-white shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-white shrink-0" />
          )}
          <span>{triggerFeedback.message}</span>
        </div>
      )}
    </div>
  );
}
