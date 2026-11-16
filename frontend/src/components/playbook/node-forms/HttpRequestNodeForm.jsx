import React, { useState } from "react";
import { Eye, EyeOff, Check, Copy, Plus, X } from "lucide-react";
import CustomDropdown from "../../common/CustomDropdown";
import {
  HTTP_METHOD_OPTIONS,
  AUTH_TYPE_OPTIONS,
  ON_ERROR_OPTIONS,
} from "../../../constants/playbookConstants";

export default function HttpRequestNodeForm({ formState, onChange }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  return (
    <div className="space-y-4">
      {/* Method & URL */}
      <div className="space-y-1.5">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
          Method & URL
        </label>
        <div className="flex gap-2">
          <CustomDropdown
            value={formState.method || "GET"}
            onChange={(val) => onChange("method", val)}
            options={HTTP_METHOD_OPTIONS}
            className="w-32 shrink-0 font-mono"
            buttonClassName="border-slate-700 bg-slate-900 font-mono text-cyan-400 font-bold"
            menuClassName="border-cyan-500 bg-slate-900"
            accent="cyan"
          />
          <input
            type="text"
            value={formState.url || ""}
            onChange={(e) => onChange("url", e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white focus:border-cyan-500 outline-none transition"
            placeholder="https://www.virustotal.com/api/v3/urls/{{ $json.vt_id }}"
          />
        </div>
      </div>

      {/* AUTHENTICATION / API KEY */}
      <div className="space-y-2">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-amber-400">
          Authentication
        </label>
        <CustomDropdown
          value={formState.authType || "none"}
          onChange={(val) => onChange("authType", val)}
          options={AUTH_TYPE_OPTIONS}
          className="w-full font-mono"
          buttonClassName="border-slate-700 bg-slate-900 font-mono text-xs py-1.5"
          menuClassName="border-amber-500 bg-slate-900"
          accent="amber"
        />

        {formState.authType === "apiKey" && (
          <div className="pt-2 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-slate-400">Tên Header (Header Name):</label>
                <div className="flex items-center gap-1">
                  {["x-apikey", "X-API-Key", "Authorization"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChange("apiKeyName", preset)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition ${
                        formState.apiKeyName === preset
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={formState.apiKeyName || "x-apikey"}
                onChange={(e) => onChange("apiKeyName", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none focus:border-amber-500"
                placeholder="x-apikey"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400">Giá trị API Key (Secret Key):</label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={formState.apiKey || ""}
                  onChange={(e) => onChange("apiKey", e.target.value)}
                  className="w-full pl-2.5 pr-20 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-amber-300 outline-none focus:border-amber-500"
                  placeholder="Nhập mã API Key (Ví dụ: 147d5d1c85cba32bf910cc4...)"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title={showApiKey ? "Ẩn API Key" : "Hiện API Key"}
                  >
                    {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formState.apiKey) {
                        navigator.clipboard.writeText(formState.apiKey);
                        setApiKeyCopied(true);
                        setTimeout(() => setApiKeyCopied(false), 1500);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
                    title="Sao chép API Key"
                  >
                    {apiKeyCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {formState.authType === "bearer" && (
          <div className="pt-2 space-y-1">
            <label className="text-[10px] font-mono text-slate-400">Bearer Token:</label>
            <input
              type="password"
              value={formState.bearerToken || ""}
              onChange={(e) => onChange("bearerToken", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-blue-300 outline-none focus:border-blue-500"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </div>
        )}
      </div>

      {/* ERROR HANDLING (ON ERROR) */}
      <div className="space-y-1.5">
        <label className="block text-[10.5px] font-bold uppercase font-mono text-rose-400">
          On Error
        </label>
        <CustomDropdown
          value={formState.onError || "stopWorkflow"}
          onChange={(val) => onChange("onError", val)}
          options={ON_ERROR_OPTIONS}
          className="w-full font-mono"
          buttonClassName="border-slate-700 bg-slate-900 font-mono text-xs py-1.5"
          menuClassName="border-rose-500 bg-slate-900"
          accent="rose"
        />
      </div>

      {/* Bảng Header Key-Value */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10.5px] font-bold uppercase font-mono text-cyan-400">
            Headers Parameters khác
          </label>
          <button
            type="button"
            onClick={() =>
              onChange("headers", [
                ...(formState.headers || []),
                { name: "", value: "" },
              ])
            }
            className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            <Plus size={11} />
            <span>Thêm Header</span>
          </button>
        </div>
        <div className="space-y-1.5">
          {(formState.headers || []).map((h, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={h.name}
                onChange={(e) => {
                  const updated = [...formState.headers];
                  updated[idx].name = e.target.value;
                  onChange("headers", updated);
                }}
                className="w-1/3 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] text-white outline-none"
                placeholder="Header Key..."
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) => {
                  const updated = [...formState.headers];
                  updated[idx].value = e.target.value;
                  onChange("headers", updated);
                }}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] text-white outline-none"
                placeholder="Header Value..."
              />
              <button
                type="button"
                onClick={() => {
                  const updated = formState.headers.filter((_, i) => i !== idx);
                  onChange("headers", updated);
                }}
                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Request JSON Body */}
      {formState.method !== "GET" && (
        <div className="space-y-1">
          <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
            Request Body (JSON)
          </label>
          <textarea
            rows={4}
            value={formState.body || ""}
            onChange={(e) => onChange("body", e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 font-mono text-[11px] text-cyan-300 outline-none custom-scrollbar"
            placeholder='={\n  "alert_id": "{{ $json.alert_id }}"\n}'
          />
        </div>
      )}
    </div>
  );
}

