import React from "react";
import {
  RefreshCw,
  Radio,
  Zap,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import clsx from "clsx";

export default function AlertsHeader({
  loading,
  onRefresh,
  isAdmin,
  cronSimulator,
  togglingSimulator,
  onToggleSimulator,
  cronAutoTriage,
  togglingAutoTriage,
  onToggleAutoTriage,
  onOpenTriageConfig,
  onGenerateMock,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <span>Quản Lý Cảnh Báo</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Danh sách và trạng thái các sự kiện an ninh được hệ thống ghi nhận
        </p>
      </div>

      {/* Nút Reload và Nút Thao Tác Chuẩn Form Dashboard */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
          title="Làm mới dữ liệu cảnh báo"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin text-cyan-500" : ""}
          />
        </button>

        {/* Cụm 3 nút Thao Tác: Tạo kịch bản, Xử lý kịch bản (kèm cấu hình), Sinh dữ liệu ảo - Chuẩn size Dashboard */}
        {isAdmin && (
          <>
            {/* Nút 1: Tạo kịch bản (Threat Simulator) */}
            <button
              onClick={onToggleSimulator}
              disabled={togglingSimulator}
              className={clsx(
                "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-sm border disabled:opacity-50",
                cronSimulator.isActive
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20 shadow-purple-500/10"
                  : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20 shadow-slate-500/10"
              )}
              title={
                cronSimulator.isActive
                  ? "Bấm để TẠM DỪNG tự động tạo kịch bản/cảnh báo mô phỏng ngầm"
                  : "Bấm để BẬT tự động tạo kịch bản/cảnh báo mô phỏng ngầm"
              }
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {cronSimulator.isActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                )}
                <span
                  className={clsx(
                    "relative inline-flex rounded-full h-2 w-2",
                    cronSimulator.isActive ? "bg-purple-500" : "bg-slate-400"
                  )}
                ></span>
              </span>
              <Radio
                size={13}
                className={clsx(
                  "shrink-0",
                  cronSimulator.isActive ? "text-purple-500" : "text-slate-400"
                )}
              />
              <span>
                {cronSimulator.isActive
                  ? "Tạo kịch bản: Bật"
                  : "Tạo kịch bản: Tắt"}
              </span>
            </button>

            {/* Nút 2: Xử lý kịch bản (Auto-Triage) + Nút Setting cấu hình độ trễ */}
            <div className="flex items-stretch shadow-sm">
              <button
                onClick={onToggleAutoTriage}
                disabled={togglingAutoTriage}
                className={clsx(
                  "px-3.5 py-2 rounded-l-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer border border-r-0 disabled:opacity-50",
                  cronAutoTriage.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-500/10"
                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30 hover:bg-slate-500/20 shadow-slate-500/10"
                )}
                title={
                  cronAutoTriage.isActive
                    ? "Bấm để TẠM DỪNG tự động xử lý kịch bản"
                    : "Bấm để BẬT tự động quét và kích hoạt xử lý kịch bản"
                }
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {cronAutoTriage.isActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={clsx(
                      "relative inline-flex rounded-full h-2 w-2",
                      cronAutoTriage.isActive ? "bg-emerald-500" : "bg-slate-400"
                    )}
                  ></span>
                </span>
                <Zap
                  size={13}
                  className={clsx(
                    "shrink-0",
                    cronAutoTriage.isActive
                      ? "text-emerald-500"
                      : "text-slate-400"
                  )}
                />
                <span>
                  {cronAutoTriage.isActive
                    ? "Xử lý kịch bản: Bật"
                    : "Xử lý kịch bản: Tắt"}
                </span>
              </button>

              {/* Nút Setting cấu hình Auto-Triage */}
              <button
                onClick={onOpenTriageConfig}
                className={clsx(
                  "px-2.5 py-2 rounded-r-xl text-xs font-semibold flex items-center justify-center transition active:scale-95 cursor-pointer border",
                  cronAutoTriage.isActive
                    ? "bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-slate-500/10 hover:bg-slate-500/25 text-slate-600 dark:text-slate-300 border-slate-500/30"
                )}
                title="Cấu hình kịch bản, độ trễ (delay ms), số lượng chạy để chống nghẽn Cron"
              >
                <SlidersHorizontal size={13} />
              </button>
            </div>

            {/* Nút 3: Sinh Dữ Liệu Ảo */}
            <button
              onClick={onGenerateMock}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 border border-cyan-600 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Tạo ngẫu nhiên 5 sự kiện cảnh báo mới để kiểm thử hệ thống"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Sinh Dữ Liệu Ảo</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

