import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAlerts,
  generateMockAlerts,
  generateCustomAlert,
} from "../api/alertApi";
import {
  Bell,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Sliders,
  X,
  Play,
  Check,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const AnimatedNumber = ({ value, duration = 1000, trigger }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCurrent(Math.floor(progress * value));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };
    animationFrame = window.requestAnimationFrame(step);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [value, trigger, duration]);

  return <span>{current}</span>;
};

const SCENARIO_TYPES = [
  { full: "Phishing Email", short: "Phishing" },
  { full: "Brute Force Attack", short: "Brute Force" },
  { full: "Malware Detection", short: "Malware" },
  { full: "Suspicious Login", short: "Susp Login" },
  { full: "Port Scan Detection", short: "Port Scan" },
  { full: "NoSQL Injection Detection", short: "NoSQLi" },
  { full: "Cross-Site Scripting (XSS)", short: "XSS" },
  { full: "Insecure Direct Object Reference (IDOR)", short: "IDOR" },
  { full: "Credential Stuffing", short: "Cred Stuff" },
  { full: "Server-Side Request Forgery (SSRF)", short: "SSRF" },
];

// Bảng màu 10 sắc thái riêng biệt cho từng kịch bản
const SCENARIO_COLORS = [
  "#06b6d4", // Cyan (Phishing)
  "#f43f5e", // Rose (Brute Force)
  "#a855f7", // Purple (Malware)
  "#f59e0b", // Amber (Susp Login)
  "#3b82f6", // Blue (Port Scan)
  "#ec4899", // Pink (NoSQLi)
  "#10b981", // Emerald (XSS)
  "#6366f1", // Indigo (IDOR)
  "#ea580c", // Orange (Cred Stuff)
  "#14b8a6", // Teal (SSRF)
];

const SEVERITY_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#3b82f6",
};

// Component căn chỉnh tâm nhãn XAxis thẳng hàng, tự động xuống dòng cho các tên 2 từ
const CustomXAxisTick = ({ x, y, payload }) => {
  const text = String(payload.value || "");
  const words = text.split(" ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        fontWeight={600}
      >
        {words.length > 1 ? (
          <>
            <tspan x={0} dy={12}>
              {words[0]}
            </tspan>
            <tspan x={0} dy={12}>
              {words.slice(1).join(" ")}
            </tspan>
          </>
        ) : (
          <tspan x={0} dy={16}>
            {text}
          </tspan>
        )}
      </text>
    </g>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

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

  const fetchDashboardData = async () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
    try {
      const [res] = await Promise.all([
        getAlerts({ limit: 1000 }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      if (res.success) {
        setAlerts(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Dashboard:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleGenerateMock = async (count = 5) => {
    if (user?.role !== "Admin") {
      alert("Chỉ tài khoản Admin mới có quyền tạo dữ liệu!");
      return;
    }
    setGenerating(true);
    try {
      await generateMockAlerts(count);
      await fetchDashboardData();
      window.dispatchEvent(new CustomEvent("alertCountChanged"));
    } catch (err) {
      alert("Lỗi sinh cảnh báo mẫu");
    }
    setGenerating(false);
  };

  const handleGenerateCustom = async () => {
    if (user?.role !== "Admin") return;
    setGenerating(true);
    try {
      await generateCustomAlert(customType, customIsTrue);
      setShowCustomModal(false);
      await fetchDashboardData();
      window.dispatchEvent(new CustomEvent("alertCountChanged"));
    } catch (err) {
      console.error("Chi tiết lỗi generateCustomAlert:", err);
      alert(
        "Lỗi sinh cảnh báo tùy chỉnh. Vui lòng kiểm tra Docker backend đã rebuild code mới chưa.",
      );
    }
    setGenerating(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const total = alerts.length;
  const pending = alerts.filter(
    (a) => a.status === "New" || a.status === "In Progress",
  ).length;
  const successToday = alerts.filter((a) => {
    if (a.status !== "Resolved" && a.status !== "Closed - False Positive")
      return false;
    const date = new Date(a.timestamp || a.createdAt);
    return date >= today;
  }).length;
  const critical = alerts.filter((a) => a.severity === "Critical").length;

  // Dữ liệu cho PieChart
  const severityData = Object.keys(SEVERITY_COLORS)
    .map((sev) => ({
      name: sev,
      value: alerts.filter((a) => a.severity === sev).length,
      color: SEVERITY_COLORS[sev],
    }))
    .filter((d) => d.value > 0);

  // Dữ liệu cho BarChart
  const scenarioData = SCENARIO_TYPES.map((type, idx) => ({
    name: type.short,
    fullName: type.full,
    count: alerts.filter((a) => a.type === type.full).length,
    color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
  }));

  // Tooltip custom cho biểu đồ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs text-white">
          <p className="font-bold text-slate-200">
            {data.fullName || data.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: data.color || "#06b6d4" }}
            ></span>
            <span className="font-mono text-cyan-400 font-bold">
              {payload[0].value}
            </span>
            <span className="text-slate-400 text-[11px]">cảnh báo</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto relative h-full">
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
        </div>
      </div>

      {/* CHARTS (RECHARTS) - Animation trượt từ 0 lên mỗi khi Reload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0c1222]/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 transition-all duration-300 rounded-2xl">
            <RefreshCw size={28} className="animate-spin text-cyan-500 mb-2" />
          </div>
        )}

        {/* BAR CHART: 10 SCENARIOS VỚI 10 MÀU KHÁC NHAU VÀ CĂN CHỈNH TÂM NHÃN */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
              Phân Bổ Cảnh Báo (10 Kịch Bản Playbook)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thống kê số lượng cảnh báo dựa trên 10 kịch bản điều phối tự động
            </p>
          </div>

          <div className="flex-1 min-h-[270px] w-full [&_.recharts-surface]:outline-none [&_*]:focus:outline-none select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                key={`barchart-${reloadTrigger}`}
                data={scenarioData}
                margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
                style={{ outline: "none" }}
                tabIndex={-1}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#334155"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: "#334155", opacity: 0.5 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#334155", opacity: 0.12, stroke: "none" }}
                />
                <Bar
                  dataKey="count"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  activeBar={false}
                  style={{ outline: "none" }}
                >
                  {scenarioData.map((entry, index) => (
                    <Cell
                      key={`bar-cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                      style={{ outline: "none" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: SEVERITY VỚI HIỆU ỨNG XOAY MỞ KHI RELOAD */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
              Thống Kê Theo Mức Độ (Severity)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tỉ lệ phân bố mức độ nghiêm trọng
            </p>
          </div>

          <div className="flex-1 min-h-[220px] w-full flex items-center justify-center relative [&_.recharts-surface]:outline-none [&_*]:focus:outline-none select-none">
            {severityData.length === 0 ? (
              <div className="text-xs text-slate-500">Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart
                  key={`piechart-${reloadTrigger}`}
                  style={{ outline: "none" }}
                  tabIndex={-1}
                >
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "10px",
                      fontSize: "12px",
                      outline: "none",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    activeShape={false}
                    style={{ outline: "none" }}
                  >
                    {severityData.map((entry, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                        style={{ outline: "none" }}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300 ml-1 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Center Total Count */}
            {severityData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                  <AnimatedNumber
                    value={total}
                    trigger={reloadTrigger}
                    duration={1100}
                  />
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
                  Alerts
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SỰ CỐ MỚI NHẬN - Animation mượt mà khi bấm reload */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
              Sự Cố Mới Nhận
            </h4>
            <Link
              to="/alerts"
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả bảng</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            5 cảnh báo gần đây nhất trong hệ thống
          </p>
        </div>

        <div className="mt-4 relative">
          <div
            key={`recent-alerts-${reloadTrigger}`}
            className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 animate-slide-up"
          >
            {alerts.slice(0, 5).length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-10">
                Chưa có dữ liệu.
              </div>
            ) : (
              alerts.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.type}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                      <span>IP: {item.source_ip}</span>
                      <span>•</span>
                      <span
                        className={
                          item.status === "In Progress"
                            ? "text-amber-500 font-semibold"
                            : item.status === "Resolved" ||
                                item.status === "Closed - False Positive"
                              ? "text-emerald-500 font-semibold"
                              : ""
                        }
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                      item.severity === "Critical"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : item.severity === "High"
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL TẠO KỊCH BẢN TÙY CHỈNH - SỬ DỤNG CREATEPORTAL ĐỂ PHỦ TOÀN BỘ MÀN HÌNH (GỒM CẢ VIỀN VÀ SIDEBAR) */}
      {showCustomModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
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
                  onClick={handleGenerateCustom}
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
