import React from "react";
import CustomDropdown from "../../common/CustomDropdown";
import { WAIT_UNIT_OPTIONS } from "../../../constants/playbookConstants";

export default function WaitNodeForm({ formState, onChange }) {
  return (
    <div className="space-y-3 p-4 rounded-xl border border-pink-500/30 bg-pink-500/5">
      <label className="block text-[10.5px] font-bold uppercase font-mono text-pink-400">
        Thời gian trì hoãn (Wait Duration)
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={3600}
          value={formState.amount !== undefined ? formState.amount : 3}
          onChange={(e) => onChange("amount", Number(e.target.value))}
          className="w-28 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs font-bold text-white outline-none"
        />
        <CustomDropdown
          value={formState.unit || "seconds"}
          onChange={(val) => onChange("unit", val)}
          options={WAIT_UNIT_OPTIONS}
          className="w-44 shrink-0 font-mono"
          buttonClassName="border-slate-700 bg-slate-900 text-white font-mono"
          menuClassName="border-cyan-500 bg-slate-900"
          accent="cyan"
        />
      </div>
    </div>
  );
}

