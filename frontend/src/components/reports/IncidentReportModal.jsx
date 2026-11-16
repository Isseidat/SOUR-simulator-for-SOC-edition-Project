import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { X, FileText } from "lucide-react";
import { getSeverityBadge, getStatusBadge } from "../alerts/alertHelpers";
import { formatDateTime, formatReportNumber } from "../../utils/formatters";
import { buildAdministrativeReportHtml } from "../../utils/reportExporters";

export default function IncidentReportModal({
  isOpen,
  onClose,
  alert,
  logs = [],
  currentUser,
}) {
  const reportHtml = useMemo(
    () => (alert ? buildAdministrativeReportHtml(alert, logs, currentUser) : ""),
    [alert, logs, currentUser]
  );

  if (!isOpen || !alert) return null;

  const reportNo = formatReportNumber(alert);

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
      {/* CSS CẤU HÌNH IN ẤN CHUẨN KHỔ GIẤY A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #incident-report-printable, #incident-report-printable * {
            visibility: visible !important;
          }
          #incident-report-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm 15mm !important;
            background: white !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* CONTAINER MODAL */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up text-slate-800 dark:text-slate-200">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hồ Sơ Báo Cáo Sự Cố (Thể thức Văn bản Hành chính)
                </h3>
                {getSeverityBadge(alert.severity)}
                {getStatusBadge(alert.status)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                {reportNo} • Mã sự cố: {alert.alert_id} • Phát hiện:{" "}
                {formatDateTime(alert.timestamp, "HH:mm:ss - dd/MM/yyyy")}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY: DÙNG CHUNG 1 NGUỒN VỚI PREVIEW & PDF */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/70 dark:bg-slate-950/60 custom-scrollbar">
          <div
            id="incident-report-printable"
            className="bg-white text-black mx-auto max-w-198.5 shadow-lg border border-slate-300"
            dangerouslySetInnerHTML={{ __html: reportHtml }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
