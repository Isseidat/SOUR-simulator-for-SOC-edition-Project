import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FileDown,
  Maximize2,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { getAlerts } from "../api/alertApi";
import { getLogs } from "../api/logApi";
import { useAuth } from "../context/AuthContext";
import { CustomDropdown, Pagination } from "../components/common";
import IncidentReportModal from "../components/reports/IncidentReportModal";
import ExportAuditModal from "../components/reports/ExportAuditModal";
import {
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  highlightMatch,
  getSeverityBadge,
  getStatusBadge,
  getCleanAlertTags,
} from "../components/alerts/alertHelpers";
import {
  exportToExcel,
  exportToPdf,
  exportToDocx,
  buildAdministrativeReportHtml,
} from "../utils/reportExporters";
import { calculateMttr } from "../utils/formatters";

export default function Report() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Bộ lọc & Tìm kiếm (Đồng bộ kiểu tra cứu với trang Alerts)
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
  });

  // Quản lý Modal Xem/In Báo cáo sự cố
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [exportingAllExcel, setExportingAllExcel] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const selectedAlertRef = useRef(null);

  const handleExportAllExcel = async () => {
    if (exportingAllExcel || alerts.length === 0) return;
    setExportingAllExcel(true);
    try {
      const BATCH_LIMIT = 1000;
      const CONCURRENCY = 4;
      const alertParamsBase = {
        limit: BATCH_LIMIT,
        search: searchTerm,
        severity: filters.severity,
        status: filters.status,
      };
      const logParamsBase = {
        limit: BATCH_LIMIT,
        ...(searchTerm ? { search: searchTerm } : {}),
      };

      const fetchAllAlertsByCursor = async () => {
        const items = [];
        let lastId = null;
        while (true) {
          const res = await getAlerts(
            lastId ? { ...alertParamsBase, last_id: lastId } : { ...alertParamsBase, page: 1 }
          );
          const batch = Array.isArray(res?.data) ? res.data : [];
          items.push(...batch);
          if (batch.length < BATCH_LIMIT || !res?.last_id || res.last_id === lastId) {
            break;
          }
          lastId = res.last_id;
        }
        return items;
      };

      const fetchAllLogPages = async () => {
        const firstRes = await getLogs({ ...logParamsBase, page: 1 });
        const items = Array.isArray(firstRes?.data) ? [...firstRes.data] : [];
        const totalItems = Number(firstRes?.total ?? items.length);
        const totalPageCount =
          Number(firstRes?.totalPages ?? Math.ceil(totalItems / BATCH_LIMIT)) || 1;

        for (let start = 2; start <= totalPageCount; start += CONCURRENCY) {
          const end = Math.min(totalPageCount, start + CONCURRENCY - 1);
          const chunk = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          const results = await Promise.all(
            chunk.map((p) => getLogs({ ...logParamsBase, page: p }))
          );
          results.forEach((res) => {
            if (Array.isArray(res?.data)) items.push(...res.data);
          });
        }
        return items;
      };

      const [fetchedAlerts, fetchedLogs] = await Promise.all([
        fetchAllAlertsByCursor(),
        fetchAllLogPages(),
      ]);

      const fullAlerts = fetchedAlerts.length ? fetchedAlerts : alerts;
      const exportedAlertIds = new Set(fullAlerts.map((a) => a.alert_id).filter(Boolean));
      const fullLogs = fetchedLogs.filter((l) => exportedAlertIds.has(l.alert_id));

      exportToExcel(
        fullAlerts,
        fullLogs,
        `Bao_cao_tong_hop_${format(new Date(), "ddMMyyyy_HHmm")}`,
        true
      );
    } catch (error) {
      console.error("Lỗi khi xuất Excel toàn bộ:", error);
      exportToExcel(
        alerts,
        [],
        `Bao_cao_tong_hop_${format(new Date(), "ddMMyyyy_HHmm")}`,
        true
      );
    } finally {
      setExportingAllExcel(false);
    }
  };

  // 1. Chọn sự cố để xem trước trực tiếp (hoặc mở Modal phóng to) & Kéo ExecutionLog
  const handleSelectAlert = useCallback(async (alertItem, openModal = false) => {
    selectedAlertRef.current = alertItem;
    setSelectedAlert(alertItem);
    if (openModal) setIsModalOpen(true);
    setLoadingLogs(true);
    try {
      const LOG_PAGE_LIMIT = 200;
      const firstRes = await getLogs({
        alert_id: alertItem.alert_id,
        limit: LOG_PAGE_LIMIT,
        page: 1,
      });
      const firstBatch = Array.isArray(firstRes?.data)
        ? firstRes.data
        : Array.isArray(firstRes?.data?.data)
          ? firstRes.data.data
          : [];
      const allLogs = [...firstBatch];
      const totalPages = Number(firstRes?.totalPages) || 1;

      if (totalPages > 1) {
        const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const restResults = await Promise.all(
          restPages.map((p) =>
            getLogs({ alert_id: alertItem.alert_id, limit: LOG_PAGE_LIMIT, page: p })
          )
        );
        restResults.forEach((res) => {
          const batch = Array.isArray(res?.data) ? res.data : [];
          allLogs.push(...batch);
        });
      }

      const exactLogs = allLogs
        .filter((l) => l.alert_id === alertItem.alert_id)
        .sort((a, b) => {
          const ta = new Date(a?.timestamp || a?.createdAt || 0).getTime();
          const tb = new Date(b?.timestamp || b?.createdAt || 0).getTime();
          return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
        });

      if (selectedAlertRef.current?.alert_id === alertItem.alert_id) {
        setSelectedLogs(exactLogs);
      }
    } catch (e) {
      console.error("[Report Page] Lỗi kéo ExecutionLog:", e);
      if (selectedAlertRef.current?.alert_id === alertItem.alert_id) {
        setSelectedLogs([]);
      }
    } finally {
      if (selectedAlertRef.current?.alert_id === alertItem.alert_id) {
        setLoadingLogs(false);
      }
    }
  }, []);

  // 2. Tải danh sách sự cố từ Backend API
  const fetchAlertsData = useCallback(async () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
    try {
      const [res] = await Promise.all([
        getAlerts({
          page,
          limit: 10,
          search: searchTerm,
          severity: filters.severity,
          status: filters.status,
        }),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);

      if (res && (res.success || res.data)) {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.alerts || res.alerts || [];
        const realTotal = res.total ?? res.data?.pagination?.total ?? list.length;
        const realTotalPages =
          res.totalPages ??
          res.data?.pagination?.totalPages ??
          (Math.ceil(realTotal / 10) || 1);

        setAlerts(list);
        setTotal(realTotal);
        setTotalPages(realTotalPages);

        // Tự động chọn hồ sơ đầu tiên hoặc làm mới hồ sơ đang chọn
        if (list.length > 0) {
          const current = selectedAlertRef.current;
          const matched = current && list.find((a) => a.alert_id === current.alert_id);
          handleSelectAlert(matched || list[0], false);
        } else {
          selectedAlertRef.current = null;
          setSelectedAlert(null);
          setSelectedLogs([]);
        }
      }
    } catch (err) {
      console.error("[Report Page] Lỗi tải dữ liệu cảnh báo:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filters.severity, filters.status, handleSelectAlert]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlertsData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAlertsData]);

  const { mttrText } = useMemo(
    () => calculateMttr(selectedAlert, selectedLogs),
    [selectedAlert, selectedLogs]
  );

  const previewHtml = useMemo(
    () => (selectedAlert ? buildAdministrativeReportHtml(selectedAlert, selectedLogs, user) : ""),
    [selectedAlert, selectedLogs, user]
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto flex flex-col h-full relative animate-slide-up">
      {/* 1. HEADER BÁO CÁO (ĐỒNG BỘ CHUẨN ALERTSHEADER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Hồ Sơ & Báo Cáo Sự Cố</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trung tâm giám định, tổng hợp dòng thời gian và lập biên bản xử lý sự cố chuẩn SOC
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user?.role === "Admin" && (
            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs shadow-sm transition cursor-pointer active:scale-95"
              title="Xem lịch sử người dùng đã trích xuất báo cáo"
            >
              <History size={15} className="text-cyan-500" />
              <span>Lịch sử xuất</span>
            </button>
          )}
          <button
            onClick={handleExportAllExcel}
            disabled={loading || exportingAllExcel || alerts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
            title="Xuất toàn bộ danh sách sự cố theo bộ lọc hiện tại kèm nhật ký SOAR thành file Excel"
          >
            <FileSpreadsheet size={15} className={exportingAllExcel ? "animate-pulse" : ""} />
            <span>{exportingAllExcel ? "Đang xuất Excel..." : "Xuất Excel Toàn Bộ"}</span>
          </button>
          <button
            onClick={fetchAlertsData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu báo cáo"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin text-cyan-500" : ""}
            />
          </button>
        </div>
      </div>

      {/* 2. TOOLBAR: TÌM KIẾM TOÀN BỘ CƠ SỞ DỮ LIỆU & BỘ LỌC CHUẨN ALERTS */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-55">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sự cố (ID, loại sự cố, IP, nạn nhân)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
          />
        </div>

        <CustomDropdown
          value={filters.severity}
          onChange={(val) => {
            setFilters((prev) => ({ ...prev, severity: val }));
            setPage(1);
          }}
          options={SEVERITY_OPTIONS}
          className="min-w-38.75"
          accent="cyan"
        />

        <CustomDropdown
          value={filters.status}
          onChange={(val) => {
            setFilters((prev) => ({ ...prev, status: val }));
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          className="min-w-40"
          accent="cyan"
        />
      </div>

      {/* 3. MASTER-DETAIL SPLIT WORKSPACE (TRÁI: LIST ALERTS | PHẢI: BUTTONS & PREVIEW TRỰC TIẾP) */}
      <div
        key={reloadTrigger}
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 animate-slide-up"
      >
        {/* CỘT TRÁI (5/12): DANH SÁCH HỒ SƠ SỰ CỐ */}
        <section className="lg:col-span-5 bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col min-h-120 lg:min-h-0 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Danh Sách Hồ Sơ Sự Cố ({total || alerts.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {loading && alerts.length === 0 ? (
              <div className="text-center py-14 text-xs text-slate-400">
                <RefreshCw
                  size={24}
                  className="animate-spin mx-auto text-cyan-500 mb-2"
                />
                <span>Đang nạp danh sách hồ sơ sự cố...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-14 text-xs text-slate-400 px-4">
                {searchTerm
                  ? "Không tìm thấy hồ sơ sự cố nào phù hợp với từ khóa."
                  : "Chưa có sự cố nào trong cơ sở dữ liệu."}
              </div>
            ) : (
              alerts.map((alert) => {
                const fullId = alert.alert_id || alert._id || "";
                const isSelected =
                  selectedAlert &&
                  (selectedAlert.alert_id === alert.alert_id ||
                    selectedAlert._id === alert._id);
                const isMatchingSearch =
                  searchTerm.trim() &&
                  fullId.toLowerCase().includes(searchTerm.toLowerCase());
                const cleanTags = getCleanAlertTags(alert);

                return (
                  <button
                    key={alert._id || alert.alert_id}
                    type="button"
                    onClick={() => handleSelectAlert(alert, false)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30"
                        : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        title={fullId}
                      >
                        {isMatchingSearch
                          ? highlightMatch(fullId, searchTerm)
                          : `${fullId.substring(0, 8)}...`}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                      </div>
                    </div>

                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 mt-1.5 truncate">
                      {highlightMatch(alert.type, searchTerm)}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono text-[10px] truncate">
                        {highlightMatch(alert.source_ip, searchTerm)} →{" "}
                        {highlightMatch(alert.destination_ip || "N/A", searchTerm)}
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap shrink-0 text-[10px]">
                        <Clock size={11} className="text-slate-400" />
                        {alert.timestamp
                          ? format(new Date(alert.timestamp), "HH:mm - dd/MM/yyyy")
                          : "N/A"}
                      </span>
                    </div>

                    {(alert.victim_email || cleanTags.length > 0) && (
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 truncate">
                          {alert.victim_email || "N/A"}
                        </span>
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
                                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* CỘT PHẢI (7/12): ACTION BUTTONS BÊN PHẢI + XEM TRƯỚC BÁO CÁO TRỰC TIẾP */}
        <section className="lg:col-span-7 bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col min-h-135 lg:min-h-0 shadow-sm overflow-hidden">
          {!selectedAlert ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400">
              <FileText size={32} className="mb-2 text-slate-400/70" />
              <p className="text-xs font-medium">
                Chọn một hồ sơ sự cố ở danh sách bên trái để xem báo cáo chi tiết và xuất file.
              </p>
            </div>
          ) : (
            <>
              {/* TOP BAR: THÔNG TIN CHỌN + CÁC BUTTON BÊN PHẢI */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                      title={selectedAlert.alert_id}
                    >
                      {(selectedAlert.alert_id || "").slice(0, 13)}...
                    </span>
                    {getSeverityBadge(selectedAlert.severity)}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      MTTR: {mttrText}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                    {selectedAlert.type}
                  </h3>
                </div>

                {/* CÁC BUTTON THAO TÁC BÊN PHẢI */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportToPdf(selectedAlert, selectedLogs, user)}
                    disabled={loadingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Xuất biên bản PDF chuẩn A4"
                  >
                    <FileDown size={14} />
                    <span>Xuất PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportToDocx(selectedAlert, selectedLogs, user)}
                    disabled={loadingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Xuất văn bản Word (.docx)"
                  >
                    <FileText size={14} />
                    <span>Xuất Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportToExcel(
                        [selectedAlert],
                        selectedLogs,
                        `Bao_cao_su_co_${(selectedAlert.alert_id || "SOC").slice(0, 8)}`
                      )
                    }
                    disabled={loadingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Xuất bảng Excel chi tiết cho sự cố này"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition cursor-pointer active:scale-95"
                    title="Mở cửa sổ xem báo cáo toàn màn hình"
                  >
                    <Maximize2 size={13} />
                    <span>Phóng to</span>
                  </button>
                </div>
              </div>

              {/* SUMMARY STRIP NHANH */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 shrink-0">
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">IP Nguồn</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedAlert.source_ip || "N/A"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">IP Đích</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedAlert.destination_ip || "N/A"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Nạn Nhân</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {selectedAlert.victim_email || "N/A"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Bước Playbook</div>
                  <div className="text-xs font-bold text-cyan-500 mt-0.5">
                    {loadingLogs ? "Đang tải..." : `${selectedLogs.length} bước ghi nhận`}
                  </div>
                </div>
              </div>

              {/* VÙNG XEM TRƯỚC VĂN BẢN HÀNH CHÍNH A4 TRỰC TIẾP */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 bg-slate-200/70 dark:bg-[#070b13]">
                {loadingLogs ? (
                  <div className="h-full min-h-65 flex flex-col items-center justify-center text-xs text-slate-500">
                    <RefreshCw size={22} className="animate-spin text-cyan-500 mb-2" />
                    <span>Đang tổng hợp nhật ký thực thi và dựng biên bản A4...</span>
                  </div>
                ) : (
                  <div
                    className="max-w-185 mx-auto bg-white text-black shadow-lg rounded-sm overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* 4. PHÂN TRANG (PAGINATION FOOTER, DÙNG COMPONENT CHUNG) */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        loading={loading}
        itemName="hồ sơ"
      />

      {/* 5. POP-UP MODAL XEM TRƯỚC & IN BÁO CÁO A4 (KHI BẤM PHÓNG TO) */}
      <IncidentReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        alert={selectedAlert}
        logs={selectedLogs}
        currentUser={user}
      />

      {/* 6. POP-UP MODAL LỊCH SỬ TRÍCH XUẤT BÁO CÁO (CHỈ ADMIN) */}
      <ExportAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
