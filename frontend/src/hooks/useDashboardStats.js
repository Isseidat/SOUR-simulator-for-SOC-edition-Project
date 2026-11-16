import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAlerts,
  getDashboardStats,
  generateMockAlerts,
  generateCustomAlert,
} from "../api/alertApi";
import {
  SCENARIO_TYPES,
  SCENARIO_COLORS,
  SEVERITY_COLORS,
} from "../constants/scenarioConstants";

/**
 * Custom hook quản lý dữ liệu thống kê, biểu đồ và sinh cảnh báo cho Dashboard.
 */
export function useDashboardStats(user) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    critical: 0,
    successToday: 0,
    severityCounts: {},
    scenarioCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        getDashboardStats(),
        getAlerts({ limit: 5 }),
      ]);
      if (statsRes && statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (alertsRes && alertsRes.success) {
        setAlerts(alertsRes.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const handleGenerateMock = useCallback(
    async (count = 5) => {
      if (user?.role !== "Admin") {
        alert("Chỉ tài khoản Admin mới có quyền tạo dữ liệu!");
        return;
      }
      setGenerating(true);
      try {
        await generateMockAlerts(count);
        await fetchDashboardData();
        window.dispatchEvent(new CustomEvent("alertCountChanged"));
      } catch {
        alert("Lỗi sinh cảnh báo mẫu");
      } finally {
        setGenerating(false);
      }
    },
    [user, fetchDashboardData]
  );

  const handleGenerateCustom = useCallback(
    async (customType, customIsTrue) => {
      if (user?.role !== "Admin") return false;
      setGenerating(true);
      try {
        await generateCustomAlert(customType, customIsTrue);
        await fetchDashboardData();
        window.dispatchEvent(new CustomEvent("alertCountChanged"));
        return true;
      } catch (err) {
        console.error("Chi tiết lỗi generateCustomAlert:", err);
        alert(
          "Lỗi sinh cảnh báo tùy chỉnh. Vui lòng kiểm tra Docker backend đã rebuild code mới chưa."
        );
        return false;
      } finally {
        setGenerating(false);
      }
    },
    [user, fetchDashboardData]
  );

  const severityData = useMemo(
    () =>
      Object.keys(SEVERITY_COLORS)
        .map((sev) => ({
          name: sev,
          value: stats.severityCounts?.[sev] || 0,
          color: SEVERITY_COLORS[sev],
        }))
        .filter((d) => d.value > 0),
    [stats.severityCounts]
  );

  const scenarioData = useMemo(
    () =>
      SCENARIO_TYPES.map((type, idx) => ({
        name: type.short,
        fullName: type.full,
        count: stats.scenarioCounts?.[type.full] || 0,
        color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
      })),
    [stats.scenarioCounts]
  );

  return {
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
  };
}

