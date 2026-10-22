import React from "react";
import {
  Loader2,
  Maximize2,
  RotateCcw,
  Save,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { resolveN8nNode } from "../../utils/n8nNodeRegistry";
// Danh mục 7 loại Node cốt lõi chuẩn n8n để thêm vào Canvas
const PALETTE_NODE_ITEMS = [
  {
    type: "n8n-nodes-base.webhook",
    label: "Webhook",
    service: "Trigger",
    action: "Tiếp nhận cảnh báo sự cố từ hệ thống giám sát SIEM",
  },
  {
    type: "n8n-nodes-base.code",
    label: "Code",
    service: "Transform",
    action: "Bóc tách domain, URL, Regex,...",
  },
  {
    type: "n8n-nodes-base.httpRequest",
    label: "HTTP Request",
    service: "Network",
    action: "Truy vấn danh tính mối đe dọa (VirusTotal, AbuseIPDB, WAF)",
  },
  {
    type: "n8n-nodes-base.if",
    label: "IF (Logic)",
    service: "Flow",
    action: "Đánh giá điều kiện và rẽ 2 nhánh độc lập: TRUE và FALSE",
  },
  {
    type: "n8n-nodes-base.emailSend",
    label: "Send Email",
    service: "Action",
    action: "Gửi email cảnh báo vi phạm hoặc link đổi mật khẩu",
  },
  {
    type: "n8n-nodes-base.wait",
    label: "Wait",
    service: "Flow",
    action: "Tạm dừng luồng xử lý (giảm tải hoặc đợi hoàn tất quét EDR)",
  },
  {
    type: "n8n-nodes-base.stickyNote",
    label: "Sticky Note",
    service: "Documentation",
    action: "Ghi chú phân vùng kịch bản (Chuột phải đổi 8 màu Spectrum)",
  },
];

/**
 * 1. HEADER: Thanh điều khiển trên cùng (Tiêu đề, Toàn Cảnh, Tải lại n8n, Lưu Cấu Hình)
 */
export function PlaybookStudioHeader({
  isLoading,
  isSaving,
  handleFitView,
  handleSavePlaybook,
  handleReloadCanvas,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80 shrink-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>SOAR Playbook Studio</span>
          {isLoading && <Loader2 size={16} className="animate-spin text-cyan-500" />}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Không gian làm việc đồng bộ trực tiếp 2 chiều với máy chủ n8n Web
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={handleFitView}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0"
          title="Thu phóng hiển thị toàn bộ không gian làm việc"
        >
          <Maximize2 size={14} className="text-cyan-500" />
          <span>Toàn Cảnh</span>
        </button>

        <button
          onClick={handleReloadCanvas}
          disabled={isLoading || isSaving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-500 dark:hover:text-emerald-400 transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
          title="Tải lại toàn bộ kịch bản trực tiếp từ máy chủ n8n Web"
        >
          <RotateCcw size={14} className={isLoading ? "animate-spin text-emerald-500" : "text-emerald-500"} />
          <span>Tải lại n8n</span>
        </button>

        <button
          onClick={handleSavePlaybook}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          title="Lưu kịch bản và vị trí nodes trực tiếp lên máy chủ n8n Web (Ctrl + S)"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          <span>{isSaving ? "Đang Lưu n8n..." : "Lưu lên n8n Web"}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * 2. FLOATING ACTION TOOLBAR: Cụm nút nổi bên góc trái ('+' thêm node & '🔍' tìm kiếm)
 */
export function PlaybookFloatingToolbar({
  isPaletteOpen,
  setIsPaletteOpen,
  isSearchOpen,
  setIsSearchOpen,
  paletteRef,
  searchRef,
  onDragStart,
  handleAddNodeFromPalette,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  handleSearchNode,
  handleJumpToNode,
  nodesRef,
}) {
  return (
    <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto">
      {/* Nút '+' Mở Thư Viện Node n8n */}
      <div className="relative" ref={paletteRef}>
        <button
          type="button"
          onClick={() => {
            setIsPaletteOpen((prev) => !prev);
            setIsSearchOpen(false);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer border ${
            isPaletteOpen
              ? "bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/30 scale-105"
              : "bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-cyan-500 dark:hover:text-cyan-400 hover:border-cyan-500/50"
          }`}
          title="Thêm Node n8n vào Canvas (Nhấp để mở danh mục kéo sang phải)"
        >
          <Plus
            size={18}
            className={`stroke-[2.5] transition-transform duration-200 ${
              isPaletteOpen ? "rotate-45" : ""
            }`}
          />
        </button>

        {/* Popup thư viện Node n8n trượt qua phải */}
        {isPaletteOpen && (
          <div className="absolute top-0 left-full ml-3 w-80 max-h-130 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md p-3.5 flex flex-col gap-2.5 z-40 animate-slide-right">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Thư Viện Node n8n
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Nhấp để thêm ngay vào Canvas hoặc kéo thả vào vị trí bất kỳ:
            </p>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 max-h-100 pr-1">
              {PALETTE_NODE_ITEMS.map((item) => {
                const meta = resolveN8nNode(item.type, item.label);
                const color = item.brandColor || meta.brandColor || "#06b6d4";

                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    onClick={() => handleAddNodeFromPalette(item)}
                    className="group p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-cyan-500/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-2.5"
                    title="Click để thêm ngay vào giữa Canvas, hoặc kéo thả"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        style={{
                          backgroundColor: `${color}18`,
                          borderColor: `${color}44`,
                        }}
                        className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform"
                      >
                        <img
                          src={meta.iconUrl}
                          alt={meta.name}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-500 transition truncate">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
                            {item.service}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {item.action}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition shrink-0 font-bold">
                      + Thêm
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Nút '🔍' Mở Tìm Kiếm Node (Ctrl+F) */}
      <div className="relative" ref={searchRef}>
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen((prev) => !prev);
            setIsPaletteOpen(false);
            setTimeout(() => searchInputRef.current?.focus(), 80);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer border ${
            isSearchOpen
              ? "bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/30 scale-105"
              : "bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-cyan-500 dark:hover:text-cyan-400 hover:border-cyan-500/50"
          }`}
          title="Tìm kiếm Node trên Canvas (Phím tắt: Ctrl+F)"
        >
          <Search size={18} className="stroke-[2.5]" />
        </button>

        {/* Popup tìm kiếm trượt qua phải */}
        {isSearchOpen && (
          <div className="absolute top-0 left-full ml-3 w-84 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md p-3.5 flex flex-col gap-2.5 z-40 animate-slide-right">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-cyan-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchNode(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      handleJumpToNode(searchResults[0]);
                    } else if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const first = nodesRef.current.find(
                        (n) =>
                          (n.data?.title || "").toLowerCase().includes(q) ||
                          (n.type || "").toLowerCase().includes(q)
                      );
                      if (first) handleJumpToNode(first);
                    }
                  }
                }}
                placeholder="Tìm node theo tên hoặc loại..."
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 max-h-64 pr-1">
                {searchResults.map((node) => {
                  const meta = resolveN8nNode(node.type, node.data?.title);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleJumpToNode(node)}
                      className="w-full p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center gap-2 group cursor-pointer"
                    >
                      <img
                        src={meta.iconUrl}
                        alt={meta.name}
                        className="w-5 h-5 object-contain shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-cyan-500 truncate">
                          {node.data?.title || node.id}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          {node.type}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-500 opacity-0 group-hover:opacity-100 transition shrink-0">
                        Nhảy tới ➔
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              <div className="py-3 text-center text-xs text-slate-400">
                Không tìm thấy node phù hợp với "{searchQuery}"
              </div>
            ) : (
              <div className="py-2 text-[10.5px] text-slate-400 flex items-center justify-between px-1">
                <span>
                  Ấn <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[9px] font-mono">Enter</kbd> nhảy tới kết quả đầu
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[9px] font-mono">Esc</kbd> thoát
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 3. TOAST: Thông báo nổi ở góc dưới bên phải ô vuông Canvas
 */
export function PlaybookToast({ toast }) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      className={`absolute bottom-4 right-4 z-50 pointer-events-auto flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border animate-slide-up transition-all select-none ${
        isSuccess
          ? "bg-slate-900/95 border-emerald-500/60 text-emerald-300 shadow-emerald-950/50"
          : "bg-slate-900/95 border-rose-500/60 text-rose-300 shadow-rose-950/50"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          isSuccess
            ? "bg-emerald-400 animate-ping shadow-sm shadow-emerald-400"
            : "bg-rose-400 animate-ping shadow-sm shadow-rose-400"
        }`}
      />
      {isSuccess ? (
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle size={16} className="text-rose-400 shrink-0" />
      )}
      <span className="text-xs font-semibold whitespace-nowrap text-white tracking-wide">
        {toast.message}
      </span>
    </div>
  );
}
