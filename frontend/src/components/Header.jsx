import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, ShieldAlert, LogOut, Sparkles } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-16 border-b border-slate-300 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30 transition-colors duration-300">
      
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-cyan-600/25 transition-transform hover:scale-105 duration-200">
          <ShieldAlert size={18} />
        </div>
        <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
          Secure Mock <span className="text-cyan-600 dark:text-cyan-400 font-extrabold">SOAR</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        


        {/* VỊ TRÍ 3: NÚT CHUYỂN ĐỔI DARK / LIGHT MODE THIẾT KẾ MỚI KÈM ANIMATION */}
        <button 
          onClick={toggleTheme}
          title={isDark ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900/90 dark:hover:bg-slate-800 shadow-sm transition-all duration-300 cursor-pointer group active:scale-95"
        >
          {/* Animated Icon: Xoay 360 độ mượt mà khi đổi theme */}
          <div className="relative w-5 h-5 flex items-center justify-center">
            {isDark ? (
              <Sun 
                size={16} 
                className="text-amber-400 animate-in spin-in-180 duration-500 fill-amber-400/20" 
              />
            ) : (
              <Moon 
                size={16} 
                className="text-indigo-600 animate-in spin-in-180 duration-500 fill-indigo-500/20" 
              />
            )}
          </div>
          
          {/* Badge chữ trạng thái rõ ràng */}
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hidden sm:inline-block">
            {isDark ? "Tối" : "Sáng"}
          </span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition focus:outline-none cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.email}</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">{user?.role}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-slide-up">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.email}</div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">{user?.role} Role</div>
              </div>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut size={14} />
                Đăng Xuất (JWT)
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
