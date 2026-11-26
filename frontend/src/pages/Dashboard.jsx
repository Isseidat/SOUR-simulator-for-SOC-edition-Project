import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Activity,
  Sliders,
  X,
  Play,
  Check,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import { AnimatedNumber } from "../components/common";
import {
  ScenarioBarChart,
  SeverityPieChart,
  RecentAlertsList,
} from "../components/dashboard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import {
  SCENARIO_TYPES,
  SCENARIO_COLORS,
} from "../constants/scenarioConstants";

export default function Dashboard() {
  const { user } = useAuth();
  const {
    alerts,
    stats,
    loading,
    generating,
    reloadTrigger,
    severityData,
    scenarioData,
    fetchDashboardData,
    handleGenerateMock,
    handleGenerateCustom,
  } = useDashboardStats(user);

  // Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customType, setCustomType] = useState(SCENARIO_TYPES[0].full);
  const [customIsTrue, setCustomIsTrue] = useState(true);

  // Custom Select Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onGenerateCustomSubmit = async () => {
    const ok = await handleGenerateCustom(customType, customIsTrue);
    if (ok) {
      setShowCustomModal(false);
    }
  };

  const total = stats.total || 0;
  const pending = stats.pending || 0;
  const successToday = stats.successToday || 0;
  const critical = stats.critical || 0;


  return (
    <div className="space-y-6 animate-slide-up w-full max-w-7xl mx-auto relative h-full">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Trung Tâm Điều Hành Cảnh Báo</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi các mối đe dọa mạng và quy trình xử lý sự cố tự động n8n
            SOAR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới toàn bộ Dashboard"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin text-cyan-500" : ""}
            />
          </button>

          {user?.role === "Admin" && (
            <>
              {/* Nút Tùy Chỉnh Kịch Bản */}
              <button
                onClick={() => setShowCustomModal(true)}
                disabled={generating}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shadow-sm flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Sliders
                  size={14}
                  className="text-indigo-600 dark:text-indigo-400"
                />
                <span>Tùy Chỉnh Kịch Bản</span>
              </button>

              <button
                onClick={() => handleGenerateMock(5)}
                disabled={generating}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">
                  {generating ? "Đang sinh..." : "Tạo 5 Random"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-cyan-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tổng Số Cảnh Báo
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white tracking-tight">
                <AnimatedNumber value={total} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp size={12} />
                <span>Thời gian thực từ MongoDB</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Bell size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-500 to-blue-500"></div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-amber-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Chờ Xử Lý (New/In-Progress)
              </p>
              <h3 className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400 tracking-tight">
                <AnimatedNumber value={pending} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Đang đợi hoặc đang chạy SOAR</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Zap size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 to-yellow-500"></div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-emerald-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Thành Công (Hôm Nay)
              </p>
              <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 tracking-tight">
                <AnimatedNumber value={successToday} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Playbook đã xử lý xong</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 to-green-500"></div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-rose-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Nguy Hiểm (Critical)
              </p>
              <h3 className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400 tracking-tight">
                <AnimatedNumber value={critical} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>Khẩn cấp - Cần chặn IP</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Activity size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-rose-500 to-red-600"></div>
        </div>
      </div>

      {/* CHARTS (RECHARTS) - Animation trượt từ 0 lên mỗi khi Reload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0c1222]/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 transition-all duration-300 rounded-2xl">
            <RefreshCw size={28} className="animate-spin text-cyan-500 mb-2" />
          </div>
        )}

        {/* BAR CHART: 10 SCENARIOS */}
        <ScenarioBarChart
          scenarioData={scenarioData}
          reloadTrigger={reloadTrigger}
        />

        {/* PIE CHART: SEVERITY */}
        <SeverityPieChart
          severityData={severityData}
          total={total}
          reloadTrigger={reloadTrigger}
        />
      </div>

      {/* SỰ CỐ MỚI NHẬN */}
      <RecentAlertsList alerts={alerts} reloadTrigger={reloadTrigger} />

      {/* MODAL TẠO KỊCH BẢN TÙY CHỈNH - SỬ DỤNG CREATEPORTAL ĐỂ PHỦ TOÀN BỘ MÀN HÌNH (GỒM CẢ VIỀN VÀ SIDEBAR) */}
      {showCustomModal &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-visible animate-slide-up">
              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Khởi Tạo Cảnh Báo Tùy Chỉnh
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chọn chính xác kịch bản và nhánh logic kiểm thử
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCustomModal(false);
                    setIsDropdownOpen(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* 1. Custom Dropdown Liền Mạch (Không đứt khúc, giao diện hiện đại) */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    1. Chọn Playbook (10 Kịch Bản)
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={clsx(
                      "w-full py-2.5 px-3 flex items-center justify-between text-left transition-all cursor-pointer font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border",
                      isDropdownOpen
                        ? "rounded-t-xl border-indigo-500 dark:border-indigo-500 shadow-sm"
                        : "rounded-xl border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600",
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            SCENARIO_COLORS[
                              SCENARIO_TYPES.findIndex(
                                (s) => s.full === customType,
                              ) % SCENARIO_COLORS.length
                            ],
                        }}
                      />
                      <span className="truncate">{customType}</span>
                    </div>
                    <ChevronDown
                      size={15}
                      className={clsx(
                        "text-slate-400 transition-transform duration-200 shrink-0",
                        isDropdownOpen && "rotate-180 text-indigo-500",
                      )}
                    />
                  </button>

                  {/* Dropdown Menu Liền Ngay Bên Dưới Chân Trigger */}
                  {isDropdownOpen && (
                    <div className="absolute top-[calc(100%-1px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border-x border-b border-indigo-500 dark:border-indigo-500 rounded-b-xl shadow-xl max-h-52 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
                      {SCENARIO_TYPES.map((s, idx) => {
                        const isSelected = customType === s.full;
                        return (
                          <div
                            key={s.full}
                            onClick={() => {
                              setCustomType(s.full);
                              setIsDropdownOpen(false);
                            }}
                            className={clsx(
                              "px-3 py-2 flex items-center justify-between cursor-pointer transition-colors text-xs",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    SCENARIO_COLORS[
                                      idx % SCENARIO_COLORS.length
                                    ],
                                }}
                              />
                              <span className="truncate">{s.full}</span>
                            </div>
                            {isSelected && (
                              <Check
                                size={14}
                                className="text-indigo-600 dark:text-indigo-400 shrink-0"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Nhánh Rẽ Logic */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    2. Chọn Nhánh Rẽ (Logic Xử Lý)
                  </label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Option True Positive */}
                    <div
                      onClick={() => setCustomIsTrue(true)}
                      className={clsx(
                        "p-3 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between",
                        customIsTrue
                          ? "border-rose-500/80 bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/50"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          True Positive
                        </span>
                        {customIsTrue && (
                          <Check
                            size={14}
                            className="text-rose-600 dark:text-rose-400"
                          />
                        )}
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed opacity-85">
                        Cảnh báo <strong>CÓ ĐỘC</strong>. Kích hoạt SOAR tự động
                        chặn IP / cách ly.
                      </p>
                    </div>

                    {/* Option False Positive */}
                    <div
                      onClick={() => setCustomIsTrue(false)}
                      className={clsx(
                        "p-3 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between",
                        !customIsTrue
                          ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/50"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          False Positive
                        </span>
                        {!customIsTrue && (
                          <Check
                            size={14}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        )}
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed opacity-85">
                        Cảnh báo <strong>GIẢ / LÀNH TÍNH</strong>. SOAR đóng
                        cảnh báo, không chặn IP.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowCustomModal(false);
                    setIsDropdownOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={onGenerateCustomSubmit}
                  disabled={generating}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Play size={13} />
                  )}
                  <span>{generating ? "Đang tạo..." : "Kích Hoạt Ngay"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
