import React from "react";
import clsx from "clsx";

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = "cyan",
  subtitle,
  loading = false,
}) {
  const colorMap = {
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const badgeStyle = colorMap[color] || colorMap.cyan;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
      <div className="space-y-1">
        <span className="text-xs text-slate-500 font-medium">{title}</span>
        <div className="text-2xl font-black text-slate-800 dark:text-white">
          {loading ? (
            <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
          ) : (
            value
          )}
        </div>
        {subtitle && (
          <div className="text-[11px] text-slate-400 font-medium">
            {subtitle}
          </div>
        )}
      </div>
      {Icon && (
        <div
          className={clsx(
            "w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0",
            badgeStyle
          )}
        >
          {React.isValidElement(Icon) ? Icon : <Icon size={20} />}
        </div>
      )}
    </div>
  );
}