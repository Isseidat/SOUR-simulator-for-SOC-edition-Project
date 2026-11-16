import React from "react";
import CustomDropdown from "../../common/CustomDropdown";
import { OPERATOR_OPTIONS } from "../../../constants/playbookConstants";

export default function IfNodeForm({ formState, onChange }) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-[10.5px] font-bold uppercase font-mono text-emerald-400">
          Điều kiện rẽ nhánh (IF Condition)
        </label>
        <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 rounded-lg">
          {["and", "or"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange("combinator", c)}
              className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold cursor-pointer ${
                formState.combinator === c
                  ? "bg-emerald-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-400">
            Biểu thức so sánh (Left Value):
          </label>
          <input
            type="text"
            value={formState.leftValue || ""}
            onChange={(e) => onChange("leftValue", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
            placeholder="={{ $json.data.malicious }}"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400">Toán tử:</label>
            <CustomDropdown
              value={formState.operator || "gt"}
              onChange={(val) => onChange("operator", val)}
              options={OPERATOR_OPTIONS}
              className="w-full font-mono"
              buttonClassName="border-slate-700 bg-slate-900 text-white font-mono py-1.5"
              menuClassName="border-cyan-500 bg-slate-900"
              accent="cyan"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400">Ngưỡng (Right):</label>
            <input
              type="text"
              value={formState.rightValue !== undefined ? formState.rightValue : ""}
              onChange={(e) => onChange("rightValue", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

