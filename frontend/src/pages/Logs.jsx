import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getLogs } from '../api/logApi';
import { 
  Clock, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Eye, 
  X, 
  Terminal, 
  Activity, 
  Layers, 
  Copy, 
  Check, 
  Zap, 
  ShieldAlert,
  Server
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  // Modal Chi tiết Log
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  // Tìm kiếm toàn cơ sở dữ liệu (tất cả các trang) kèm debounce 350ms
  const fetchLogs = async (overrideSearch = searchTerm, overridePage = page) => {
    setLoading(true);
    setReloadTrigger(prev => prev + 1);
    try {
      const params = { 
        page: overridePage, 
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
        ...(overrideSearch.trim() && { search: overrideSearch.trim() })
      };
      const [res] = await Promise.all([
        getLogs(params),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      if (res.success) {
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử log:", error);
    }
    setLoading(false);
  };

  // Debounce tìm kiếm toàn hệ thống khi gõ phím
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Chuyển trang
  useEffect(() => {
    fetchLogs(searchTerm, page);
  }, [page]);

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper gạch vàng nổi đoạn ký tự trùng khớp (Real-time highlight)
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const str = String(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = str.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Helper render Trạng thái xử lý (SUCCESS / FAILED / IN_PROGRESS / 429)
  const getStatusUI = (status, message) => {
    if (status === 'FAILED' || status === 'Error') {
      const isRateLimit = message?.toLowerCase().includes('429') || message?.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
          icon: <AlertCircle size={13} />,
          text: 'Rate Limit (429)'
        };
      }
      return {
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500',
        icon: <XCircle size={13} />,
        text: 'Failed'
      };
    }
    
    if (status === 'IN_PROGRESS') {
      return {
        bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        dot: 'bg-cyan-500 animate-pulse',
        icon: <RefreshCw size={13} className="animate-spin" />,
        text: 'In Progress'
      };
    }

    return {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
      icon: <CheckCircle2 size={13} />,
      text: 'Success'
    };
  };

  // Thống kê nhanh
  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const errorCount = logs.filter(l => l.status === 'FAILED' || l.status === 'Error').length;

  return (
    <div className="space-y-6 animate-slide-up max-w-7xl mx-auto relative h-full flex flex-col">
      
      {/* 1. HEADER BANNER - CHUẨN FORM DASHBOARD & ALERTS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Nhật Ký Tự Động Hóa (SOAR Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lịch sử thực thi từng node trong Playbook n8n, thông báo API và nhật ký kiểm toán hệ thống
          </p>
        </div>

        {/* Nút Reload */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => fetchLogs(searchTerm, page)}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu nhật ký"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-cyan-500" : ""} />
          </button>
        </div>
      </div>

      {/* 2. 3 THẺ TÓM TẮT KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-cyan-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng Bản Ghi (Total Logs)</p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white tracking-tight">
                {total}
              </h3>
              <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                <Layers size={12} />
                <span>Toàn bộ hành động tự động</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Terminal size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-emerald-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thực Thi Thành Công</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 tracking-tight">
                {successCount} <span className="text-xs text-slate-400 font-normal">/ trang này</span>
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Node chạy mượt mà</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Zap size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-rose-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sự Cố / Giới Hạn API</p>
              <h3 className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400 tracking-tight">
                {errorCount} <span className="text-xs text-slate-400 font-normal">/ trang này</span>
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                <ShieldAlert size={12} />
                <span>Lỗi 429 hoặc dừng luồng</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Activity size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
        </div>

      </div>

      {/* 3. TOOLBAR TÌM KIẾM TOÀN BỘ CSDL & BỘ LỌC */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        
        {/* Ô Tìm kiếm Realtime Toàn Bộ Hệ Thống */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm toàn hệ thống (Alert ID, node, message, user)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition" 
          />
        </div>

        {/* Filter Trạng thái */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select 
            className="py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 transition cursor-pointer"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Success (Thành công)</option>
            <option value="FAILED">Failed / Error (Thất bại)</option>
            <option value="IN_PROGRESS">In Progress (Đang chạy)</option>
          </select>
        </div>

      </div>

      {/* 4. TABLE DANH SÁCH LOGS - TỐI ƯU CỘT THÔNG BÁO VỪA TẦM & CỘT NÚT CHI TIẾT KHÔNG BỊ CHE */}
      <div 
        key={reloadTrigger}
        className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm min-h-[380px] animate-slide-up"
      >
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Alert ID</th>
                <th className="px-4 py-3.5">Thời Gian</th>
                <th className="px-4 py-3.5">Đối Tượng Thực Hiện</th>
                <th className="px-4 py-3.5">Bước Thực Thi (Node / Step)</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                {/* Cột thông báo vừa tầm mắt */}
                <th className="px-4 py-3.5 max-w-[260px]">Thông Báo Chi Tiết</th>
                {/* Cột nút chi tiết cố định (Sticky Right) đảm bảo không bao giờ bị che */}
                <th className="px-4 py-3.5 text-center shrink-0 w-20 sticky right-0 bg-slate-50/95 dark:bg-[#0c1222]/95 backdrop-blur-xs shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.1)] dark:shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.6)]">
                  Chi Tiết
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto text-cyan-500 mb-2" />
                    <span>Đang đồng bộ dữ liệu nhật ký...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    {searchTerm ? 'Không tìm thấy nhật ký phù hợp với từ khóa trên toàn hệ thống.' : 'Không có bản ghi nhật ký nào.'}
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const statusUI = getStatusUI(log.status, log.message);
                  const fullId = log.alert_id || '';
                  const isMatchingSearch = searchTerm.trim() && fullId.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  return (
                    <tr 
                      key={log._id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group cursor-default"
                    >
                      {/* Alert ID */}
                      <td className="px-4 py-3">
                        <span 
                          className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          title={fullId}
                        >
                          {isMatchingSearch 
                            ? highlightMatch(fullId, searchTerm) 
                            : `${fullId.substring(0, 8)}...`}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} className="text-slate-400" />
                        <span>{log.createdAt ? format(new Date(log.createdAt), 'HH:mm:ss - dd/MM/yyyy') : 'N/A'}</span>
                      </td>

                      {/* Executed By */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono text-[10px] font-semibold">
                          <Server size={10} />
                          {highlightMatch(log.executed_by || 'SOAR-System', searchTerm)}
                        </span>
                      </td>

                      {/* Step Name */}
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {highlightMatch(log.step_name, searchTerm)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span className={clsx("px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 w-fit whitespace-nowrap", statusUI.bg)}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", statusUI.dot)} />
                          {statusUI.icon}
                          {statusUI.text}
                        </span>
                      </td>

                      {/* Message Preview (Kéo vừa tầm mắt, max-w-[260px], không kéo giãn layout) */}
                      <td className="px-4 py-3 max-w-[260px]">
                        <div 
                          className={clsx(
                            "truncate text-xs font-mono",
                            statusUI.text === 'Rate Limit (429)' ? "text-amber-600 dark:text-amber-400 font-bold" :
                            statusUI.text === 'Failed' ? "text-rose-500 dark:text-rose-400 font-medium" : "text-slate-600 dark:text-slate-400"
                          )} 
                          title={log.message}
                        >
                          {highlightMatch(log.message, searchTerm)}
                        </div>
                      </td>

                      {/* Action View Detail - Sticky Right không bao giờ bị che */}
                      <td className="px-4 py-3 text-center shrink-0 w-20 sticky right-0 bg-white group-hover:bg-slate-50/90 dark:bg-[#0c1222] dark:group-hover:bg-[#111827] shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] dark:shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.5)] transition-colors">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer inline-flex items-center justify-center"
                          title="Xem chi tiết bản ghi"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PHÂN TRANG (PAGINATION FOOTER) */}
      <div className="flex items-center justify-between border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0c1222] px-4 py-3 rounded-2xl shadow-sm shrink-0">
        <div className="text-xs text-slate-500 font-medium">
          Đang xem trang <span className="font-bold text-slate-800 dark:text-white">{page}</span> / <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span>
          <span className="hidden sm:inline"> (Tổng cộng {total} dòng bản ghi)</span>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300"
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 6. MODAL XEM CHI TIẾT LOG (DÙNG CREATEPORTAL ĐỂ PHỦ TOÀN BỘ PHẦN MỀM) */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Terminal size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chi Tiết Nhật Ký Thực Thi</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Execution ID: {selectedLog.execution_id || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Mã Cảnh Báo (Alert ID)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedLog.alert_id}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Thời Gian Ghi Nhận</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), 'HH:mm:ss - dd/MM/yyyy') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Bước Thực Thi (Node)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.step_name}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Trạng Thái Kết Quả</span>
                  <div>
                    {(() => {
                      const ui = getStatusUI(selectedLog.status, selectedLog.message);
                      return (
                        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1", ui.bg)}>
                          {ui.icon} {ui.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Message Payload Log */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Terminal size={14} className="text-cyan-500" />
                    Nội dung thông báo (Message Details)
                  </span>
                  <button 
                    onClick={() => handleCopyMessage(selectedLog.message)}
                    className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800 shadow-inner whitespace-pre-wrap leading-relaxed">
                  {selectedLog.message}
                </pre>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/60 dark:bg-slate-900/60">
              <button 
                onClick={() => setSelectedLog(null)} 
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
