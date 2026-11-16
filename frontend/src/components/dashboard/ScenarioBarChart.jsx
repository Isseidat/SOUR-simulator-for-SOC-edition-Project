import React, { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

// Component căn chỉnh tâm nhãn XAxis thẳng hàng, tự động xuống dòng cho các tên 2 từ
const CustomXAxisTick = ({ x, y, payload }) => {
  const text = String(payload.value || "");
  const words = text.split(" ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        fontWeight={600}
      >
        {words.length > 1 ? (
          <>
            <tspan x={0} dy={12}>
              {words[0]}
            </tspan>
            <tspan x={0} dy={12}>
              {words.slice(1).join(" ")}
            </tspan>
          </>
        ) : (
          <tspan x={0} dy={16}>
            {text}
          </tspan>
        )}
      </text>
    </g>
  );
};

// Tooltip custom cho biểu đồ
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs text-white">
        <p className="font-bold text-slate-200">
          {data.fullName || data.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: data.color || "#06b6d4" }}
          ></span>
          <span className="font-mono text-cyan-400 font-bold">
            {payload[0].value}
          </span>
          <span className="text-slate-400 text-[11px]">cảnh báo</span>
        </div>
      </div>
    );
  }
  return null;
};

const ScenarioBarChart = memo(function ScenarioBarChart({
  scenarioData = [],
  reloadTrigger = 0,
}) {
  return (
    <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col">
      <div className="mb-4">
        <h4 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
          Phân Bổ Cảnh Báo (10 Kịch Bản Playbook)
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Thống kê số lượng cảnh báo dựa trên 10 kịch bản điều phối tự động
        </p>
      </div>

      <div className="flex-1 min-h-67.5 w-full [&_.recharts-surface]:outline-none **:focus:outline-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            key={`barchart-${reloadTrigger}`}
            data={scenarioData}
            margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
            style={{ outline: "none" }}
            tabIndex={-1}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#334155"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              interval={0}
              tick={<CustomXAxisTick />}
              axisLine={{ stroke: "#334155", opacity: 0.5 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#334155", opacity: 0.12, stroke: "none" }}
            />
            <Bar
              dataKey="count"
              radius={[5, 5, 0, 0]}
              isAnimationActive={true}
              animationDuration={1100}
              animationEasing="ease-out"
              activeBar={false}
              style={{ outline: "none" }}
            >
              {scenarioData.map((entry, index) => (
                <Cell
                  key={`bar-cell-${index}`}
                  fill={entry.color}
                  stroke="none"
                  style={{ outline: "none" }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default ScenarioBarChart;

