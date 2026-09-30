import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAlerts, generateMockAlerts } from '../api/alertApi';
import { triggerPlaybook } from '../api/playbookApi';
import { useAuth } from '../context/AuthContext';
import { Search, Play, Eye, X, Terminal, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  const [filters, setFilters] = useState({
    status: '',
    severity: ''
  });

  // Tìm kiếm toàn cơ sở dữ liệu (tất cả các trang) kèm debounce 350ms
  const fetchAlerts = async (overrideSearch = searchTerm, overridePage = page) => {
    setLoading(true);
    setReloadTrigger(prev => prev + 1);
    try {
      const params = {
        ...filters,
        page: overridePage,
        limit: 10,
        ...(overrideSearch.trim() && { search: overrideSearch.trim() })
      };
      const [res] = await Promise.all([
        getAlerts(params),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      if (res.success) {
        setAlerts(res.data || []);
        setTotalPages(Math.ceil(res.total / 10) || 1);
        setTotal(res.total || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách cảnh báo", error);
    }
    setLoading(false);
  };

  // Debounce search input để tìm kiếm real-time toàn bộ database
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAlerts(searchTerm, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

  // Khi chuyển trang
  useEffect(() => {
    fetchAlerts(searchTerm, page);
  }, [page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleTriggerPlaybook = async (alertId) => {
    if (user?.role !== 'Admin') {
      alert("Chỉ Admin mới có quyền kích hoạt Playbook!");
      return;
    }
    setTriggerLoading(true);
    try {
      const res = await triggerPlaybook(alertId);
      if (res.success) {
        alert("Đã kích hoạt Playbook thành công trên n8n!");
        fetchAlerts();
        window.dispatchEvent(new CustomEvent('alertCountChanged'));
        setSelectedAlert(null);
      } else {
        alert("Kích hoạt thất bại: " + res.message);
      }
    } catch (error) {
      alert("Lỗi khi kích hoạt Playbook!");
    }
    setTriggerLoading(false);
  };

  const handleGenerateMock = async () => {
    try {
      await generateMockAlerts(5);
      fetchAlerts();
      window.dispatchEvent(new CustomEvent('alertCountChanged'));
    } catch (error) {
      alert("Lỗi khi sinh cảnh báo");
    }
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

  // Helper render badge Mức độ
  const getSeverityBadge = (severity) => {
    const map = {
      'Critical': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      'High': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      'Medium': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      'Low': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    };
    return <span className={clsx("px-2 py-1 rounded text-[10px] font-bold border", map[severity] || map['Low'])}>{severity}</span>;
  };

  // Helper render badge Trạng thái
  const getStatusBadge = (status) => {
    const map = {
      'New': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      'In Progress': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 animate-pulse',
      'Resolved': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    };
    return <span className={clsx("px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 w-fit", map[status] || map['New'])}>
      {status === 'In Progress' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>}
      {status}
    </span>;
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col max-w-7xl mx-auto animate-slide-up">
      
      {/* 1. HEADER BANNER - CHUẨN FORM 100% NHƯ DASHBOARD VÀ LOGS (KHÔNG DÙNG CARD) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Quản Lý Cảnh Báo (Alerts)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Danh sách và trạng thái các sự kiện an ninh được hệ thống ghi nhận
          </p>
        </div>

        {/* Nút Reload và Nút Thao Tác Chuẩn Form Dashboard */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => fetchAlerts(searchTerm, page)} 
            disabled={loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu cảnh báo"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-cyan-500" : ""} />
          </button>

          {user?.role === 'Admin' && (
            <button 
              onClick={handleGenerateMock} 
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              + Sinh Dữ Liệu Ảo
            </button>
          )}
        </div>
      </div>

      {/* 2. TOOLBAR: TÌM KIẾM TOÀN BỘ CƠ SỞ DỮ LIỆU & BỘ LỌC */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        
        {/* Ô Tìm kiếm Realtime (Toàn bộ 10+ trang dữ liệu) */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm toàn hệ thống (ID, loại sự cố, IP)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition" 
          />
        </div>

        {/* Lọc Mức Độ */}
        <select 
          className="py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 transition cursor-pointer"
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
        >
          <option value="">Tất cả mức độ</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Lọc Trạng Thái */}
        <select 
          className="py-2 pl-3 pr-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500 transition cursor-pointer"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {/* 3. TABLE DANH SÁCH CẢNH BÁO */}
      <div 
        key={reloadTrigger}
        className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-sm min-h-[400px] animate-slide-up"
      >
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Alert ID</th>
                <th className="px-4 py-3.5">Thời gian</th>
                <th className="px-4 py-3.5">Loại sự cố</th>
                <th className="px-4 py-3.5">Mức độ</th>
                <th className="px-4 py-3.5">IP Nguồn/Đích</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {loading && alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto text-cyan-500 mb-2" />
                    <span>Đang tải dữ liệu cảnh báo...</span>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400">
                    {searchTerm ? 'Không tìm thấy cảnh báo phù hợp với từ khóa trên toàn bộ hệ thống.' : 'Chưa có cảnh báo nào. Hãy bấm "Sinh Dữ Liệu Ảo".'}
                  </td>
                </tr>
              ) : (
                alerts.map(alert => {
                  const fullId = alert.alert_id || alert._id || '';
                  const isMatchingSearch = searchTerm.trim() && fullId.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  return (
                    <tr key={alert._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
                      
                      {/* Alert ID - Nổi bật đoạn trùng khớp trong ID */}
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

                      {/* Thời gian */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} className="text-slate-400" />
                        <span>{alert.timestamp ? format(new Date(alert.timestamp), 'HH:mm - dd/MM/yyyy') : 'N/A'}</span>
                      </td>

                      {/* Loại sự cố */}
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                        {highlightMatch(alert.type, searchTerm)}
                      </td>

                      {/* Mức độ */}
                      <td className="px-4 py-3">{getSeverityBadge(alert.severity)}</td>

                      {/* IP Nguồn & Đích */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[10px]">{highlightMatch(alert.source_ip, searchTerm)}</div>
                        <div className="font-mono text-[10px] text-slate-400">{highlightMatch(alert.destination_ip || 'N/A', searchTerm)}</div>
                      </td>

                      {/* Trạng thái & Tag SOAR */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert.status)}
                          {alert.tags && alert.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {alert.tags.map((tag, tIdx) => (
                                <span 
                                  key={tIdx} 
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                    tag === 'soar-done' 
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                      : tag === 'soar-error' 
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                                  }`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          onClick={() => setSelectedAlert(alert)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Xem chi tiết cảnh báo"
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

      {/* 4. PHÂN TRANG (PAGINATION FOOTER) */}
      <div className="flex items-center justify-between border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0c1222] px-4 py-3 rounded-2xl shadow-sm shrink-0">
        <div className="text-xs text-slate-500 font-medium">
          Đang xem trang <span className="font-bold text-slate-800 dark:text-white">{page}</span> / <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span>
          <span className="hidden sm:inline"> (Tổng cộng {total} dòng)</span>
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

      {/* 5. MODAL CHI TIẾT ALERT (DÙNG CREATEPORTAL ĐỂ PHỦ TOÀN BỘ PHẦN MỀM) */}
      {selectedAlert && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                  <Terminal size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedAlert.type}</h3>
                  <div className="text-[10px] text-slate-500 font-mono">ID: {selectedAlert.alert_id}</div>
                </div>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 mb-1">Thời gian ghi nhận</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedAlert.timestamp ? format(new Date(selectedAlert.timestamp), 'HH:mm:ss - dd/MM/yyyy') : 'N/A'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 mb-1">Mức độ cảnh báo</div>
                  <div>{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
              </div>

              {/* Nhãn SOAR Idempotency Tags */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Nhãn điều phối SOAR (Tags):</span>
                <div className="flex items-center gap-1.5">
                  {selectedAlert.tags && selectedAlert.tags.length > 0 ? (
                    selectedAlert.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Chưa có tag (Sẵn sàng kích hoạt)</span>
                  )}
                </div>
              </div>

              {/* Payload JSON */}
              <div>
                <div className="font-bold mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Terminal size={14} className="text-cyan-500" /> Payload JSON
                </div>
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800 shadow-inner">
                  {JSON.stringify(selectedAlert.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/60 dark:bg-slate-900/60">
              <button onClick={() => setSelectedAlert(null)} className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer">
                Đóng
              </button>
              {selectedAlert.status !== 'Resolved' && selectedAlert.status !== 'Closed - False Positive' && (
                <button 
                  onClick={() => handleTriggerPlaybook(selectedAlert.alert_id)}
                  disabled={triggerLoading || user?.role !== 'Admin'}
                  className={clsx(
                    "px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-md cursor-pointer",
                    triggerLoading || user?.role !== 'Admin' ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
                  )}
                  title={user?.role !== 'Admin' ? 'Yêu cầu quyền Admin' : ''}
                >
                  <Play size={13} />
                  {triggerLoading ? 'Đang gửi lệnh...' : 'Chạy Kịch Bản (SOAR)'}
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
