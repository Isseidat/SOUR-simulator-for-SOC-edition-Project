import React, { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export default function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  loading = false,
  itemName = "dòng",
  className = "",
}) {
  const inputId = useId();
  const [draftPage, setDraftPage] = useState(null);

  if (totalPages <= 0) return null;

  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const displayValue = draftPage !== null ? draftPage : String(page);

  const commitJump = () => {
    if (draftPage === null) return;
    const trimmed = draftPage.trim();
    setDraftPage(null);
    if (!trimmed || loading) return;

    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return;

    const clamped = Math.max(1, Math.min(safeTotalPages, parsed));
    if (clamped !== page) {
      onPageChange?.(clamped);
    }
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    commitJump();
  };

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-2 shrink-0",
        className ||
          "border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0c1222] px-4 py-3 rounded-2xl shadow-sm"
      )}
    >
      <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
        <span>
          Đang xem trang{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {page}
          </span>{" "}
          /{" "}
          <span className="font-bold text-slate-800 dark:text-white">
            {safeTotalPages}
          </span>
          {totalItems > 0 && (
            <span className="hidden sm:inline">
              {" "}
              (Tổng cộng {totalItems} {itemName})
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {safeTotalPages > 1 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <label
              htmlFor={inputId}
              className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline"
            >
              Đến trang
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              value={displayValue}
              disabled={loading}
              onFocus={(e) => {
                setDraftPage(String(page));
                requestAnimationFrame(() => e.target.select());
              }}
              onChange={(e) => setDraftPage(e.target.value.replace(/\D/g, ""))}
              onBlur={commitJump}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraftPage(null);
                  e.currentTarget.blur();
                }
              }}
              aria-label={`Nhập số trang từ 1 đến ${safeTotalPages}`}
              title={`Nhập số trang (1 - ${safeTotalPages}) rồi nhấn Enter`}
              className="w-12 h-7 px-1.5 text-center text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 disabled:opacity-40 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-7 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 transition cursor-pointer active:scale-95"
              title="Nhảy đến trang đã nhập"
            >
              Đi
            </button>
          </form>
        )}

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300 active:scale-95"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(safeTotalPages, page + 1))}
            disabled={page >= safeTotalPages || loading}
            className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer text-slate-700 dark:text-slate-300 active:scale-95"
            title="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
