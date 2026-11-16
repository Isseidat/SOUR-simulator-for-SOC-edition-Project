import React, { useState, useEffect, lazy, Suspense } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

// Tối ưu Code-splitting: Lazy load PlaybookStudio nặng (~800 dòng + thư viện @xyflow/react)
const PlaybookStudio = lazy(() => import("../../pages/PlaybookStudio"));

export default function Layout() {
  const location = useLocation();
  const isStudio =
    location.pathname === "/studio" || location.pathname === "/playbooks";
  const [hasVisitedStudio, setHasVisitedStudio] = useState(false);

  useEffect(() => {
    if (isStudio && !hasVisitedStudio) {
      setHasVisitedStudio(true);
    }
  }, [isStudio, hasVisitedStudio]);

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        {/* VÙNG NỘI DUNG CHÍNH CHO CÁC TRANG (Dashboard, Cảnh báo, Logs) */}
        <main
          className={`flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100 dark:bg-[#070b14] transition-colors duration-300 ${
            isStudio ? "hidden" : "block"
          }`}
        >
          <Outlet />
        </main>

        {/* KHUNG N8N WORKFLOWS CHUYÊN BIỆT: GIỮ NGUYÊN DOM ĐỂ KHÔNG BỊ RELOAD KHI CHUYỂN TAB */}
        {hasVisitedStudio && (
          <div
            className={`flex-1 p-6 pb-6 overflow-hidden flex flex-col bg-slate-100 dark:bg-[#070b14] ${
              isStudio
                ? "relative z-10 w-full h-full opacity-100 pointer-events-auto"
                : "absolute left-[-9999px] top-[-9999px] w-0 h-0 overflow-hidden pointer-events-none opacity-0 invisible"
            }`}
          >
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-cyan-500 font-mono text-sm">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang nạp Playbook Studio Canvas...</span>
                  </div>
                </div>
              }
            >
              <PlaybookStudio />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
