import React, { useState, useRef } from 'react';
import { 
  Workflow, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Activity,
  Layers,
  Info
} from 'lucide-react';

export default function PlaybookStudio() {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  // URL n8n đồng bộ hostname với trình duyệt (tránh xung đột giữa localhost và 127.0.0.1)
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const N8N_URL = `http://${currentHost}:5678`;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(N8N_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full flex flex-col gap-2.5 animate-slide-up overflow-hidden">
      
      {/* 1. HEADER BANNER - CHUẨN FORM DASHBOARD, ALERTS & LOGS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-slate-300 dark:border-slate-800/80 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            n8n Workflows (Canvas Studio)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Không gian làm việc trực quan: Soạn thảo Canvas, kéo thả node và kiểm thử kịch bản tự động hóa SOAR
          </p>
        </div>

        {/* Cụm Action Buttons & Trạng Thái Engine */}
        <div className="flex items-center gap-3">
          {/* Badge trạng thái n8n Engine */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono">n8n Engine: 5678</span>
          </div>

          {/* Nút Làm mới Canvas */}
          <button 
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition shadow-sm cursor-pointer"
            title="Tải lại khung làm việc n8n"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-cyan-500" : ""} />
            <span className="hidden sm:inline">Tải lại Canvas</span>
          </button>

          {/* Nút Mở Tab Riêng */}
          <button 
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition shadow-sm cursor-pointer"
            title="Mở n8n trên tab trình duyệt riêng"
          >
            <ExternalLink size={14} />
            <span>Mở Tab Riêng</span>
          </button>
        </div>
      </div>

      {/* 2. KHUNG NHÚNG IFRAME TOÀN DIỆN - TỐI ĐA DIỆN TÍCH */}
      <div className="flex-1 w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0c1222] shadow-sm relative overflow-hidden flex flex-col min-h-0">
        
        {/* Loading Indicator khi iframe đang nạp */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0c1222]/80 backdrop-blur-sm transition-all duration-300">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
              <Workflow size={20} className="absolute inset-0 m-auto text-cyan-500 animate-pulse" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Đang kết nối tới n8n Workflow Canvas...
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              http://localhost:5678
            </p>
          </div>
        )}

        {/* Thẻ iframe nhúng n8n */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={N8N_URL}
          title="n8n Workflow Studio"
          className="w-full h-full flex-1 border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {/* Thanh trợ giúp bên dưới tách biệt độc lập - Không chạm cấn vào body n8n Canvas */}
      <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-1.5">
          <Info size={13} className="text-cyan-500 shrink-0" />
          <span>Bạn có thể tạo, chỉnh sửa các node điều kiện hoặc thay đổi Webhook URL trực tiếp ngay trên khung Canvas này.</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span>Security: SameSite Relaxed</span>
          <span>•</span>
          <span>Mode: Self-Hosted</span>
        </div>
      </div>

    </div>
  );
}
