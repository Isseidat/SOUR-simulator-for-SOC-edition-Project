import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  Activity,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { getAlertById } from "../../api/alertApi";
import { getLogs } from "../../api/logApi";
import {
  getSeverityBadge,
  getStatusBadge,
  getForensicDetails,
  getCleanAlertTags,
} from "./alertHelpers";

export default function AlertDetailModal({
  selectedAlert,
  onClose,
  onAlertUpdated,
  triggeringAlertId,
  onTriggerPlaybook,
}) {
  const [soarLogs, setSoarLogs] = useState([]);
  const [copiedJson, setCopiedJson] = useState(false);

  // Fetch realtime SOAR Logs & Poll Alert Status chỉ bên trong Modal (không gây re-render bảng bên ngoài)
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
              (l) => l.alert_id === selectedAlert.alert_id
            );
            setSoarLogs(exactLogs.reverse());
          }

          // 2. Poll Alert Status
          if (selectedAlert.status === "In Progress") {
            const resAlert = await getAlertById(selectedAlert.alert_id);
            if (resAlert.success && resAlert.data) {
              const latestStatus = resAlert.data.status;
              if (latestStatus !== "In Progress") {
                onAlertUpdated?.(resAlert.data);
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

  if (!selectedAlert) return null;

  const handleCopyJson = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      console.error("Lỗi sao chép JSON:", e);
    }
  };

  const forensic = getForensicDetails(selectedAlert);
  const cleanTags = getCleanAlertTags(selectedAlert);
  const rawJsonDoc = {
    _id: selectedAlert._id || "66f9104b2a81230018a12007",
    alert_id: selectedAlert.alert_id,
    type: selectedAlert.type,
    severity: selectedAlert.severity,
    source_ip: selectedAlert.source_ip || "91.240.118.82",
    destination_ip: selectedAlert.destination_ip || "10.0.0.15",
    victim_email: selectedAlert.victim_email || "isseidat159@gmail.com",
    payload: selectedAlert.payload,
    status: selectedAlert.status,
    tags:
      cleanTags.length > 0
        ? cleanTags
        : selectedAlert.status === "Closed - Error"
          ? ["soar-error"]
          : ["soar-done"],
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
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
                      "HH:mm:ss - dd/MM/yyyy"
                    )
                  : "N/A"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs custom-scrollbar">
          <div className="space-y-4">
            {/* Bằng Chứng Kỹ Thuật */}
            {forensic && (
              <div className="bg-slate-50 dark:bg-dark-card/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-3">
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
                            : "text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Payload trong Cơ sở dữ liệu */}
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
                                    : "text-cyan-400"
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
                                    : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
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
                  onClick={() => onTriggerPlaybook(selectedAlert.alert_id)}
                  disabled={
                    triggeringAlertId === selectedAlert.alert_id ||
                    selectedAlert.status === "In Progress"
                  }
                  className={clsx(
                    "flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold transition shadow-sm",
                    triggeringAlertId === selectedAlert.alert_id ||
                      selectedAlert.status === "In Progress"
                      ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                      : "bg-cyan-500 hover:bg-cyan-600 text-white cursor-pointer"
                  )}
                >
                  {triggeringAlertId === selectedAlert.alert_id ||
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
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

