import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { History, X, Search, RefreshCw, Filter } from "lucide-react";
import { format } from "date-fns";
import { getReportExportLogs } from "../../api/reportApi";
import { EXPORT_FORMAT, SCOPE } from "../../constants";
import { CustomDropdown, Pagination } from "../common";

const FORMAT_OPTIONS = [
  { value: "", label: "Tất cả định dạng" },
  { value: EXPORT_FORMAT.PDF, label: "PDF" },
  { value: EXPORT_FORMAT.DOCX, label: "Word (.docx)" },
  { value: EXPORT_FORMAT.EXCEL, label: "Excel (.xlsx)" },
];

const FORMAT_BADGE_STYLE = {
  [EXPORT_FORMAT.PDF]: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  [EXPORT_FORMAT.DOCX]: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  [EXPORT_FORMAT.EXCEL]:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export default function ExportAuditModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const [res] = await Promise.all([
        getReportExportLogs({
          page,
          limit: 10,
          ...(formatFilter && { format: formatFilter }),
          ...(searchTerm.trim() && { search: searchTerm.trim() }),
        }),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);

      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setLogs(list);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotal(res.pagination?.total || list.length);
      }
    } catch (err) {
      console.error("[ExportAuditModal] Lỗi tải lịch sử xuất báo cáo:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, formatFilter, searchTerm]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => {
      fetchAuditLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, fetchAuditLogs]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shrink-0">
              <History size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Lịch Sử Trích Xuất Báo Cáo
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Lưu vết tài khoản, thời điểm và tệp báo cáo đã tải xuống từ hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter toolbar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-50">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo email, tên file, mã sự cố..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
            />
          </div>

          <CustomDropdown
            value={formatFilter}
            onChange={(val) => {
              setFormatFilter(val);
              setPage(1);
            }}
            options={FORMAT_OPTIONS}
            icon={Filter}
            className="min-w-42"
            accent="cyan"
          />

          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Làm mới lịch sử"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-cyan-500" : ""} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3">Người Xuất</th>
                <th className="px-4 py-3">Định Dạng</th>
                <th className="px-4 py-3">Phạm Vi</th>
                <th className="px-4 py-3">Tên File</th>
                <th className="px-4 py-3">Địa Chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw size={22} className="animate-spin mx-auto text-cyan-500 mb-2" />
                    <span>Đang tải lịch sử trích xuất...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Chưa có lịch sử trích xuất báo cáo nào.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {item.createdAt
                        ? format(new Date(item.createdAt), "HH:mm:ss - dd/MM/yyyy")
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.exported_by_email}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.exported_by_name ? `${item.exported_by_name} • ` : ""}
                        {item.exported_by_role}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          FORMAT_BADGE_STYLE[item.format] ||
                          "bg-slate-500/10 text-slate-500 border-slate-500/20"
                        }`}
                      >
                        {item.format}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                      {item.scope === SCOPE.BATCH ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Toàn bộ
                        </span>
                      ) : (
                        <span className="font-mono" title={item.alert_id || ""}>
                          Lẻ ({item.alert_id ? `${item.alert_id.slice(0, 8)}...` : "N/A"})
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-200 max-w-60 truncate"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.ip_address || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 shrink-0">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            onPageChange={setPage}
            loading={loading}
            itemName="lượt xuất"
            className="w-full"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
