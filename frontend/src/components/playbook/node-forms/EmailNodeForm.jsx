import React from "react";
import { Key, Pencil, ChevronDown } from "lucide-react";

export default function EmailNodeForm({ formState, onChange, onOpenSmtpModal }) {
  return (
    <div className="space-y-4">
      {/* Credential to connect with */}
      <div className="space-y-1.5 pb-2 border-b border-slate-800">
        <label className="text-[11px] font-medium text-slate-300">
          Credential to connect with
        </label>
        <div className="flex items-center gap-2">
          <div
            onClick={onOpenSmtpModal}
            className="flex-1 relative flex items-center justify-between px-3 py-2 rounded-lg border border-purple-500/80 bg-[#16171d] text-xs text-white cursor-pointer hover:border-purple-400 transition"
          >
            {formState.smtpCredId ? (
              <div className="flex items-center gap-2">
                <Key size={13} className="text-slate-400" />
                <span className="font-medium text-white">
                  {formState.smtpCredName || "SMTP account"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400">
                <Key size={13} className="text-slate-500" />
                <span className="font-medium text-slate-300">+ Create new credential</span>
              </div>
            )}
            <ChevronDown size={14} className="text-slate-400" />
          </div>
          <button
            type="button"
            onClick={onOpenSmtpModal}
            title="Edit Credential"
            className="p-2 rounded-lg border border-slate-700 bg-[#252830] hover:bg-[#2f323c] text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* Thông số Email */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
            From Email
          </label>
          <input
            type="text"
            value={formState.fromEmail || ""}
            onChange={(e) => onChange("fromEmail", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
            To Email
          </label>
          <input
            type="text"
            value={formState.toEmail || ""}
            onChange={(e) => onChange("toEmail", e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
          Subject (Tiêu đề)
        </label>
        <input
          type="text"
          value={formState.subject || ""}
          onChange={(e) => onChange("subject", e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-white outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
          HTML Content
        </label>
        <textarea
          rows={6}
          value={formState.emailBody || ""}
          onChange={(e) => onChange("emailBody", e.target.value)}
          className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
        />
      </div>
    </div>
  );
}

