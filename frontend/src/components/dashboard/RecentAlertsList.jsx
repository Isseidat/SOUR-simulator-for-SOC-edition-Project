import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Danh sách 5 sự cố gần đây nhất trên Dashboard.
 */
const RecentAlertsList = React.memo(function RecentAlertsList({
  alerts = [],
  reloadTrigger = 0,
}) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            Sự Cố Mới Nhận
          </h4>
          <Link
            to="/alerts"
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả bảng</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          5 cảnh báo gần đây nhất trong hệ thống
        </p>
      </div>

      <div className="mt-4 relative">
        <div
          key={`recent-alerts-${reloadTrigger}`}
          className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 animate-slide-up"
        >
          {alerts.slice(0, 5).length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-10">
              Chưa có dữ liệu.
            </div>
          ) : (
            alerts.slice(0, 5).map((item) => (
              <div
                key={item._id}
                className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.type}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                    <span>IP: {item.source_ip}</span>
                    <span>•</span>
                    <span
                      className={
                        item.status === "In Progress"
                          ? "text-amber-500 font-semibold"
                          : item.status === "Resolved" ||
                              item.status === "Closed - False Positive"
                            ? "text-emerald-500 font-semibold"
                            : ""
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                    item.severity === "Critical"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : item.severity === "High"
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {item.severity}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

export default RecentAlertsList;

