import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, ScrollText, Workflow } from 'lucide-react';
import { getRecentNewAlertsCount } from '../api/alertApi';
import SidebarNotes from './SidebarNotes';

export default function Sidebar() {
  const [newCount, setNewCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await getRecentNewAlertsCount();
      if (res.success) {
        setNewCount(res.count ?? 0);
      }
    } catch {
      // Bỏ qua lỗi kết nối tạm thời
    }
  };

  useEffect(() => {
    fetchCount();
    // Tự động kiểm tra và reload bộ đếm mỗi 10 giây
    const interval = setInterval(fetchCount, 10000);

    // Lắng nghe sự kiện tức thời khi sinh cảnh báo hoặc xử lý xong
    const handleUpdate = () => fetchCount();
    window.addEventListener('alertCountChanged', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('alertCountChanged', handleUpdate);
    };
  }, []);

  return (
    <aside className="w-64 border-r border-slate-300 dark:border-slate-800/80 bg-white dark:bg-[#070b14] p-4 flex flex-col hidden md:flex shrink-0 transition-colors duration-300 h-full overflow-hidden">
      
      {/* KHỐI TRÊN: NAVIGATION & SOAR STATUS */}
      <div className="space-y-4 shrink-0">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-3">
            Phân Hệ Điều Hành
          </div>
          <nav className="space-y-1">
            <NavLink 
              to="/" 
              end
              className={({ isActive }) => `w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition duration-150 ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Tổng quan SOC</span>
            </NavLink>
            
            <NavLink 
              to="/alerts" 
              className={({ isActive }) => `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition duration-150 ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert size={15} />
                <span>Cảnh báo</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border font-mono transition-all duration-300 ${
                newCount > 0 
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
              }`}>
                {newCount} Mới
              </span>
            </NavLink>
            
            <NavLink 
              to="/logs" 
              className={({ isActive }) => `w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition duration-150 ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <ScrollText size={15} />
              <span>Nhật ký n8n Logs</span>
            </NavLink>

            <NavLink 
              to="/studio" 
              className={({ isActive }) => `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition duration-150 ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Workflow size={15} />
                <span>n8n Workflows</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                Canvas
              </span>
            </NavLink>
          </nav>
        </div>

        {/* BOX SOAR ENGINE STATUS */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl space-y-1.5 border border-slate-300 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">SOAR Engine</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              Sẵn Sàng
            </span>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            Hạ tầng n8n Docker sẵn sàng tự động hóa 10 kịch bản.
          </div>
        </div>
      </div>

      {/* VỊ TRÍ: AREA TAKE NOTE KÉO DÀI DƯỚI SOAR ENGINE TỚI TRÊN GẠCH SECURE MOCK SOAR */}
      <div className="flex-1 my-3 flex flex-col min-h-0 overflow-hidden">
        <SidebarNotes />
      </div>

      {/* FOOTER */}
      <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-300 dark:border-slate-800/80 flex items-center justify-between font-mono shrink-0">
        <span>Secure Mock SOAR</span>
        <span>Phase 3</span>
      </div>

    </aside>
  );
}
