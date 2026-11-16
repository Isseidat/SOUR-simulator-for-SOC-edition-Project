import React from "react";

export default function CodeNodeForm({ formState, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10.5px] font-bold uppercase font-mono text-amber-400">
          JavaScript Scripting (jsCode)
        </label>
        <span className="text-[10px] font-mono text-slate-400">
          Hỗ trợ biến n8n ($input, $json, Buffer)
        </span>
      </div>
      <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-[#121316]">
        <div className="px-3 py-1.5 bg-[#181a20] border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>main.js</span>
          <span>Run Once for All Items</span>
        </div>
        <textarea
          rows={12}
          value={formState.jsCode || ""}
          onChange={(e) => onChange("jsCode", e.target.value)}
          className="w-full p-3 bg-transparent text-emerald-400 font-mono text-[11px] leading-relaxed outline-none resize-none custom-scrollbar"
          placeholder="// Code JavaScript tại đây..."
        />
      </div>
    </div>
  );
}

