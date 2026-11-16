import React, { memo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import AnimatedNumber from "../common/AnimatedNumber";

const SeverityPieChart = memo(function SeverityPieChart({
  severityData = [],
  total = 0,
  reloadTrigger = 0,
}) {
  return (
    <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col">
      <div className="mb-4">
        <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
          Thống Kê Theo Mức Độ (Severity)
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tỉ lệ phân bố mức độ nghiêm trọng
        </p>
      </div>

      <div className="flex-1 min-h-55 w-full flex items-center justify-center relative [&_.recharts-surface]:outline-none **:focus:outline-none select-none">
        {severityData.length === 0 ? (
          <div className="text-xs text-slate-500">Chưa có dữ liệu</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart
              key={`piechart-${reloadTrigger}`}
              style={{ outline: "none" }}
              tabIndex={-1}
            >
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "10px",
                  fontSize: "12px",
                  outline: "none",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={1100}
                animationEasing="ease-out"
                activeShape={false}
                style={{ outline: "none" }}
              >
                {severityData.map((entry, index) => (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={entry.color}
                    stroke="none"
                    style={{ outline: "none" }}
                  />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300 ml-1 font-medium">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Center Total Count */}
        {severityData.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
              <AnimatedNumber
                value={total}
                trigger={reloadTrigger}
                duration={1100}
              />
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
              Alerts
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default SeverityPieChart;

