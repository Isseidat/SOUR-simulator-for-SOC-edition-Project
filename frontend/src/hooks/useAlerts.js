import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAlerts,
  generateMockAlerts,
  getCronStatus,
  toggleSimulatorJob,
  toggleAutoTriage,
} from "../api/alertApi";
import { triggerPlaybook } from "../api/playbookApi";

/**
 * Custom hook quản lý danh sách cảnh báo, phân trang cursor, polling realtime,
 * điều khiển Cron Jobs và kích hoạt Playbook cho trang Alerts.
 */
export function useAlerts() {
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

  const pageCursorsRef = useRef(pageCursors);
  const loadingRef = useRef(loading);
  useEffect(() => {
    pageCursorsRef.current = pageCursors;
    loadingRef.current = loading;
  }, [pageCursors, loading]);

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
    const timer = setTimeout(() => setTriggerNotification(null), 0);
    return () => clearTimeout(timer);
  }, [selectedAlert?.alert_id]);

  useEffect(() => {
    if (triggerNotification) {
      const timer = setTimeout(() => {
        setTriggerNotification(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [triggerNotification]);

  const handleTriggerPlaybook = useCallback(async (alert_id) => {
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
  }, []);

  const fetchAlerts = useCallback(
    async (
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

        const cursors = pageCursorsRef.current;
        if (overridePage > 1 && cursors[overridePage - 1]) {
          params.last_id = cursors[overridePage - 1];
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
    },
    [filters, searchTerm, page]
  );

  // Debounce search input & filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setPageCursors({});
      fetchAlerts(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khi chuyển trang
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts(searchTerm, page);
    }, 0);
    return () => clearTimeout(timer);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-polling cập nhật Realtime cho bảng Cảnh báo (mỗi 60 giây)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !loadingRef.current) {
        fetchAlerts(searchTerm, page, true);
      }
    }, 60000);

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
  }, [searchTerm, page, fetchAlerts]);

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

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setPageCursors({});
  }, []);

  const handleToggleSimulator = useCallback(async () => {
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
  }, [cronSimulator.isActive]);

  const handleToggleAutoTriage = useCallback(async () => {
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
  }, [cronAutoTriage.isActive]);

  const handleGenerateMock = useCallback(async () => {
    try {
      await generateMockAlerts(5);
      fetchAlerts();
      window.dispatchEvent(new CustomEvent("alertCountChanged"));
    } catch {
      alert("Lỗi khi sinh cảnh báo");
    }
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    selectedAlert,
    setSelectedAlert,
    triggerNotification,
    triggeringAlertId,
    triggerFeedback,
    page,
    setPage,
    totalPages,
    total,
    searchTerm,
    setSearchTerm,
    reloadTrigger,
    filters,
    cronSimulator,
    cronAutoTriage,
    setCronAutoTriage,
    togglingSimulator,
    togglingAutoTriage,
    fetchAlerts,
    handleFilterChange,
    handleToggleSimulator,
    handleToggleAutoTriage,
    handleGenerateMock,
    handleTriggerPlaybook,
  };
}

