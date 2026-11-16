import { useState, useEffect, useCallback } from "react";
import { getLogs } from "../api/logApi";

/**
 * Custom hook quản lý tra cứu nhật ký thực thi (Audit Logs),
 * bộ lọc trạng thái/đối tượng, phân trang và đồng bộ sự kiện realtime.
 */
export function useLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const fetchLogs = useCallback(
    async (overrideSearch = searchTerm, overridePage = page) => {
      setLoading(true);
      setReloadTrigger((prev) => prev + 1);
      try {
        const params = {
          page: overridePage,
          limit: 10,
          ...(statusFilter && { status: statusFilter }),
          ...(overrideSearch.trim() && { search: overrideSearch.trim() }),
        };
        const [res, resSuccess, resFailed] = await Promise.all([
          getLogs(params),
          getLogs({ status: "SUCCESS", limit: 1 }),
          getLogs({ status: "FAILED", limit: 1 }),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
        if (res.success) {
          setLogs(res.data || []);
          setTotalPages(res.totalPages || 1);
          setTotal(res.total || 0);
        }
        if (resSuccess?.success) {
          setTotalSuccess(resSuccess.total || 0);
        }
        if (resFailed?.success) {
          setTotalFailed(resFailed.total || 0);
        }
      } catch (error) {
        console.error("Lỗi lấy lịch sử log:", error);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, searchTerm, page]
  );

  // Debounce tìm kiếm toàn hệ thống khi gõ phím
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chuyển trang
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(searchTerm, page);
    }, 0);
    return () => clearTimeout(timer);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lắng nghe sự kiện toàn hệ thống
  useEffect(() => {
    const handleSync = () => {
      fetchLogs(searchTerm, page);
    };
    window.addEventListener("alertCountChanged", handleSync);
    window.addEventListener("logCountChanged", handleSync);
    return () => {
      window.removeEventListener("alertCountChanged", handleSync);
      window.removeEventListener("logCountChanged", handleSync);
    };
  }, [searchTerm, page, fetchLogs]);

  const handleReload = useCallback(() => {
    fetchLogs(searchTerm, page);
    window.dispatchEvent(new CustomEvent("logCountChanged"));
  }, [fetchLogs, searchTerm, page]);

  return {
    logs,
    loading,
    page,
    setPage,
    totalPages,
    total,
    totalSuccess,
    totalFailed,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    actorFilter,
    setActorFilter,
    reloadTrigger,
    fetchLogs,
    handleReload,
  };
}

