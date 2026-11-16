import React from "react";
import CustomDropdown from "../../common/CustomDropdown";
import { RESPONSE_MODE_OPTIONS } from "../../../constants/playbookConstants";

export default function WebhookNodeForm({ formState, onChange }) {
  return (
    <div className="space-y-3.5">
      <div className="space-y-1">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
          HTTP Method
        </label>
        <div className="flex gap-2">
          {["POST", "GET", "PUT", "DELETE"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange("httpMethod", m)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                formState.httpMethod === m
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
          Webhook Path (Endpoint)
        </label>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-2 rounded-xl bg-slate-800 font-mono text-xs text-slate-400 border border-slate-700">
            /webhook/
          </span>
          <input
            type="text"
            value={(formState.path || "").replace(/^\/?(webhook\/)?/, "")}
            onChange={(e) => onChange("path", e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white focus:border-cyan-500 outline-none transition"
            placeholder="trigger-phishing..."
          />
        </div>
        <p className="text-[10px] font-mono text-slate-400 pt-1">
          URL Test n8n:{" "}
          <span className="text-cyan-400">
            http://localhost:5678/webhook/
            {(formState.path || "").replace(/^\/?(webhook\/)?/, "")}
          </span>
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
          Response Mode
        </label>
        <CustomDropdown
          value={formState.responseMode || "onReceived"}
          onChange={(val) => onChange("responseMode", val)}
          options={RESPONSE_MODE_OPTIONS}
          className="w-full font-mono"
          buttonClassName="border-slate-700 bg-slate-900 text-white font-mono"
          menuClassName="border-cyan-500 bg-slate-900"
          accent="cyan"
        />
      </div>
    </div>
  );
}

