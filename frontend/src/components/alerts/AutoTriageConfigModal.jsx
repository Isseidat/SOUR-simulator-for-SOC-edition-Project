import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Clock,
  RefreshCw,
  Check,
  Zap,
  SlidersHorizontal,
  Timer,
  Layers,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { updateAutoTriageSettings } from "../../api/alertApi";
import { PREDEFINED_SCENARIOS, highlightMatch } from "./alertHelpers";

const DELAY_PRESETS = [
  {
    label: "Mặc định",
    value: "",
    activeClass: "bg-slate-800 dark:bg-slate-700 text-white border-slate-700 shadow-sm",
    inactiveClass: "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200",
  },
  {
    label: "0ms",
    value: 0,
    hasIcon: true,
    activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25 font-mono font-bold",
    inactiveClass: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500 font-mono font-bold",
  },
  {
    label: "100ms",
    value: 100,
    activeClass: "bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-600/25 font-mono font-bold",
    inactiveClass: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:text-cyan-500 font-mono font-bold",
  },
  {
    label: "500ms",
    value: 500,
    activeClass: "bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-600/25 font-mono font-bold",
    inactiveClass: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:text-cyan-500 font-mono font-bold",
  },
];

const SEVERITY_PILL_STYLES = {
  Critical: { pill: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", dot: "bg-red-500" },
  High: { pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  Medium: { pill: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  Low: { pill: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", dot: "bg-blue-500" },
};

export default function AutoTriageConfigModal({
  isOpen,
  onClose,
  cronAutoTriage,
  onConfigSaved,
}) {
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [savingTriageConfig, setSavingTriageConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);
  const [triageDraft, setTriageDraft] = useState({
    delayBetweenAlerts: 1500,
    batchSize: 5,
    intervalMinutes: 5,
    allowedSeverities: ["Low", "Medium"],
    allowedAlertTypes: [],
    scenarioDelays: {},
  });

  // Đồng bộ dữ liệu draft mỗi khi mở Modal
  useEffect(() => {
    if (isOpen && cronAutoTriage) {
      setTriageDraft({
        delayBetweenAlerts: cronAutoTriage.delayBetweenAlerts ?? 1500,
        batchSize: cronAutoTriage.batchSize || 5,
        intervalMinutes: cronAutoTriage.intervalMinutes || 5,
        allowedSeverities: cronAutoTriage.allowedSeverities || [
          "Low",
          "Medium",
        ],
        allowedAlertTypes: cronAutoTriage.allowedAlertTypes || [],
        scenarioDelays: { ...(cronAutoTriage.scenarioDelays || {}) },
      });
      setScenarioSearch("");
      setConfigSaveSuccess(false);
    }
  }, [isOpen, cronAutoTriage]);

  if (!isOpen) return null;

  const handleSetScenarioDelay = (scenarioType, delayVal) => {
    setTriageDraft((prev) => {
      const nextDelays = { ...(prev.scenarioDelays || {}) };
      if (delayVal === null || delayVal === undefined || delayVal === "") {
        delete nextDelays[scenarioType];
      } else {
        nextDelays[scenarioType] = Math.max(0, Number(delayVal) || 0);
      }
      return { ...prev, scenarioDelays: nextDelays };
    });
  };

  const handleToggleScenario = (scenarioType) => {
    setTriageDraft((prev) => {
      const allTypes = PREDEFINED_SCENARIOS.map((s) => s.type);
      const isNone = prev.allowedAlertTypes.includes("__NONE__");
      const currentSelected = isNone
        ? []
        : prev.allowedAlertTypes.length === 0
          ? allTypes
          : prev.allowedAlertTypes.filter((t) => t !== "__NONE__");

      let nextTypes;
      if (currentSelected.includes(scenarioType)) {
        nextTypes = currentSelected.filter((t) => t !== scenarioType);
        if (nextTypes.length === 0) {
          nextTypes = ["__NONE__"];
        }
      } else {
        nextTypes = [...currentSelected, scenarioType];
        if (nextTypes.length === allTypes.length) {
          nextTypes = []; // rỗng = chọn tất cả 10 kịch bản
        }
      }
      return { ...prev, allowedAlertTypes: nextTypes };
    });
  };

  const handleToggleAllScenarios = (enableAll) => {
    setTriageDraft((prev) => ({
      ...prev,
      allowedAlertTypes: enableAll ? [] : ["__NONE__"],
    }));
  };

  const handleSetAllScenarioDelays = (delayVal) => {
    setTriageDraft((prev) => {
      if (delayVal === "" || delayVal === null || delayVal === undefined) {
        return { ...prev, scenarioDelays: {} };
      }
      const newDelays = {};
      PREDEFINED_SCENARIOS.forEach((sc) => {
        newDelays[sc.type] = Number(delayVal) || 0;
      });
      return { ...prev, scenarioDelays: newDelays };
    });
  };

  const handleSaveTriageConfig = async () => {
    setSavingTriageConfig(true);
    try {
      const cleanDraft = {
        ...triageDraft,
        allowedAlertTypes: triageDraft.allowedAlertTypes.includes("__NONE__")
          ? ["__NONE__"]
          : triageDraft.allowedAlertTypes.filter((t) => t !== "__NONE__"),
      };
      const res = await updateAutoTriageSettings(cleanDraft);
      if (res.success && (res.autoTriage || res.config)) {
        const updated = res.autoTriage || res.config;
        onConfigSaved?.(updated);
        setConfigSaveSuccess(true);
        setTimeout(() => {
          onClose();
          setConfigSaveSuccess(false);
        }, 800);
      }
    } catch (err) {
      alert(
        "Lỗi khi lưu cấu hình Xử lý kịch bản: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setSavingTriageConfig(false);
    }
  };

  const filteredScenarios = PREDEFINED_SCENARIOS.filter((sc) => {
    if (!scenarioSearch.trim()) return true;
    const q = scenarioSearch.toLowerCase().trim();
    return sc.type.toLowerCase().includes(q);
  });

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up">
        {/* 1. MODAL HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-md shadow-emerald-500/10 shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Bảng Điều Phối & Cấu Hình Kịch Bản SOAR
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Auto-Triage Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Điều phối tự động chu kỳ quét, số lượng batch và tùy chỉnh độ trễ
                xử lý (ms) riêng cho từng kịch bản
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                Bật:{" "}
                <span className="text-emerald-500 font-bold">
                  {triageDraft.allowedAlertTypes.includes("__NONE__")
                    ? "0/10"
                    : triageDraft.allowedAlertTypes.length === 0
                      ? "10/10"
                      : `${triageDraft.allowedAlertTypes.filter((t) => t !== "__NONE__").length}/10`}
                </span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                Chu kỳ:{" "}
                <span className="text-cyan-500 font-bold">
                  {triageDraft.intervalMinutes}m
                </span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs custom-scrollbar">
          {/* A. THẺ 3 THÔNG SỐ TOÀN CỤC (GLOBAL METRIC DECK) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Chu kỳ quét */}
            <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                    <Clock size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Chu kỳ quét tự động
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Giãn cách giữa các lần
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                  {triageDraft.intervalMinutes} phút
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-3.5">
                {[1, 2, 5, 10].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      setTriageDraft((p) => ({ ...p, intervalMinutes: mins }))
                    }
                    className={clsx(
                      "py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-center",
                      triageDraft.intervalMinutes === mins
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    )}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Card 2: Batch Size */}
            <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
                    <Layers size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Batch Size / Lượt
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Số lượng alert quét tối đa
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                  {triageDraft.batchSize} cảnh báo
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-3.5">
                {[1, 3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() =>
                      setTriageDraft((p) => ({ ...p, batchSize: cnt }))
                    }
                    className={clsx(
                      "py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-center",
                      triageDraft.batchSize === cnt
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-600/30"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                    )}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Card 3: Độ trễ mặc định cơ sở */}
            <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <Timer size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Độ trễ cơ sở
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Áp dụng cho kịch bản mặc định
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                  {triageDraft.delayBetweenAlerts}ms
                </span>
              </div>
              <div className="space-y-1.5 mt-2.5">
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={triageDraft.delayBetweenAlerts}
                  onChange={(e) =>
                    setTriageDraft((p) => ({
                      ...p,
                      delayBetweenAlerts: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between gap-1 text-[9.5px]">
                  {[500, 1500, 3000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setTriageDraft((p) => ({
                          ...p,
                          delayBetweenAlerts: d,
                        }))
                      }
                      className={clsx(
                        "px-2 py-0.5 rounded-lg border transition cursor-pointer font-mono font-medium",
                        triageDraft.delayBetweenAlerts === d
                          ? "bg-emerald-500 text-white border-emerald-500 font-bold"
                          : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {d}ms
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* B. BẢNG DỮ LIỆU CẤU HÌNH KỊCH BẢN */}
          <div className="space-y-3">
            {/* Table Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Lọc kịch bản (phishing, xss, brute force)..."
                    value={scenarioSearch}
                    onChange={(e) => setScenarioSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-cyan-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleToggleAllScenarios(true)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-500 transition cursor-pointer shadow-sm"
                >
                  ✓ Bật tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllScenarios(false)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:border-rose-500 transition cursor-pointer shadow-sm"
                >
                  ✕ Tắt tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllScenarioDelays(0)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Zap size={11} /> Tất cả 0ms (Tức thì)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllScenarioDelays("")}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-sm"
                >
                  ⏱️ Reset về mặc định
                </button>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU CHÍNH */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c1222] shadow-sm">
              <div className="overflow-x-auto max-h-85 custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10.5px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="py-3 px-4 w-20 text-center">Trạng Thái</th>
                      <th className="py-3 px-4">Kịch Bản An Ninh</th>
                      <th className="py-3 px-4">Tùy Chỉnh Độ Trễ (Delay ms)</th>
                      <th className="py-3 px-4 w-32 text-center">
                        Tốc Độ Thực Thi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredScenarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-slate-400 text-xs"
                        >
                          Không tìm thấy kịch bản nào khớp với từ khóa &quot;
                          {scenarioSearch}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredScenarios.map((sc) => {
                        const isEnabled =
                          !triageDraft.allowedAlertTypes.includes("__NONE__") &&
                          (triageDraft.allowedAlertTypes.length === 0 ||
                            triageDraft.allowedAlertTypes.includes(sc.type));
                        const customDelayVal =
                          triageDraft.scenarioDelays?.[sc.type];
                        const effectiveDelay =
                          customDelayVal !== undefined
                            ? customDelayVal
                            : triageDraft.delayBetweenAlerts;

                        return (
                          <tr
                            key={sc.type}
                            className={clsx(
                              "transition-colors",
                              isEnabled
                                ? "hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                                : "bg-slate-50/40 dark:bg-slate-900/20 opacity-50"
                            )}
                          >
                            {/* Cột 1: Toggle Switch */}
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleScenario(sc.type)}
                                className={clsx(
                                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                  isEnabled
                                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                                    : "bg-slate-300 dark:bg-slate-700"
                                )}
                                title={
                                  isEnabled
                                    ? "Bấm để TẮT kịch bản này"
                                    : "Bấm để BẬT kịch bản này"
                                }
                              >
                                <span
                                  className={clsx(
                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                    isEnabled
                                      ? "translate-x-4"
                                      : "translate-x-0"
                                  )}
                                />
                              </button>
                            </td>

                            {/* Cột 2: Kịch Bản An Ninh */}
                            <td className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-900 dark:text-white">
                              <span
                                className={clsx(
                                  isEnabled
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-400 dark:text-slate-500 line-through"
                                )}
                              >
                                {highlightMatch(sc.type, scenarioSearch)}
                              </span>
                            </td>

                            {/* Cột 3: Nút chỉnh độ trễ */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {DELAY_PRESETS.map((opt) => {
                                  const isActive =
                                    opt.value === ""
                                      ? customDelayVal === undefined
                                      : customDelayVal === opt.value;
                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() =>
                                        handleSetScenarioDelay(
                                          sc.type,
                                          opt.value
                                        )
                                      }
                                      className={clsx(
                                        "px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5",
                                        isActive
                                          ? opt.activeClass
                                          : opt.inactiveClass
                                      )}
                                    >
                                      {opt.hasIcon && <Zap size={10} />}
                                      {opt.label}
                                    </button>
                                  );
                                })}

                                {/* Ô nhập số ms tùy chọn */}
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-lg focus-within:border-cyan-500 transition">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10000"
                                    step="50"
                                    placeholder={String(
                                      triageDraft.delayBetweenAlerts
                                    )}
                                    value={
                                      customDelayVal !== undefined
                                        ? customDelayVal
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      handleSetScenarioDelay(
                                        sc.type,
                                        val === "" ? "" : Number(val)
                                      );
                                    }}
                                    className="w-14 text-center text-[10.5px] font-mono font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                                    title="Nhập số ms tùy thích (VD: 50, 100, 500, 2000...)"
                                  />
                                  <span className="text-[9.5px] text-slate-400 font-mono">
                                    ms
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Cột 4: Chỉ báo tốc độ */}
                            <td className="py-3 px-4 text-center">
                              {effectiveDelay === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                                  <Zap size={10} /> Tức thì (0ms)
                                </span>
                              ) : effectiveDelay <= 500 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                                  🚀 Siêu tốc ({effectiveDelay}ms)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  ⏱️ {effectiveDelay}ms
                                </span>
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
          </div>

          {/* C. MỨC ĐỘ NGHIÊM TRỌNG CHO PHÉP */}
          <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                Mức độ nghiêm trọng xử lý tự động
              </span>
              <span className="text-[11px] text-slate-500">
                Khuyên dùng: Low & Medium (An toàn cho n8n, tránh làm nghẽn kịch
                bản phức tạp)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Low", "Medium", "High", "Critical"].map((sev) => {
                const isChecked = triageDraft.allowedSeverities?.includes(sev);
                const style = SEVERITY_PILL_STYLES[sev] || SEVERITY_PILL_STYLES.Low;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => {
                      setTriageDraft((prev) => {
                        const curr = prev.allowedSeverities || [];
                        const next = curr.includes(sev)
                          ? curr.filter((s) => s !== sev)
                          : [...curr, sev];
                        return { ...prev, allowedSeverities: next };
                      });
                    }}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5",
                      isChecked
                        ? style.pill
                        : "bg-white dark:bg-slate-900/60 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        isChecked ? style.dot : "bg-slate-400"
                      )}
                    />
                    <span>{sev}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <span>
              {cronAutoTriage?.lastRunAt ? (
                <>
                  Lần chạy gần nhất:{" "}
                  {format(new Date(cronAutoTriage.lastRunAt), "HH:mm:ss dd/MM")}
                </>
              ) : (
                <>Chưa có lượt chạy nào</>
              )}
            </span>
            {cronAutoTriage?.totalProcessed > 0 && (
              <span className="font-bold text-emerald-500">
                • Đã tự động xử lý: {cronAutoTriage.totalProcessed} cảnh báo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveTriageConfig}
              disabled={savingTriageConfig}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {savingTriageConfig ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" />
                  <span>Đang lưu...</span>
                </>
              ) : configSaveSuccess ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Đã lưu thành công!</span>
                </>
              ) : (
                <>
                  <Check size={14} className="text-white" />
                  <span>Lưu Cấu Hình</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

