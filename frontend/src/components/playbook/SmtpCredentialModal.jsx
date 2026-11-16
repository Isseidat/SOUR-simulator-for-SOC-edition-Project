import React, { useState, useEffect } from "react";
import { Trash2, X, Eye, EyeOff } from "lucide-react";
import { updateSmtpCredentials, deleteSmtpCredentials } from "../../api/playbookApi";

function formatRelativeTime(dateInput) {
  if (!dateInput) return "Chưa có dữ liệu";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Chưa có dữ liệu";
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } catch {
    return "Chưa có dữ liệu";
  }
}

export default function SmtpCredentialModal({
  isOpen,
  onClose,
  formState,
  setFormState,
  showToast,
}) {
  const [smtpModalTab, setSmtpModalTab] = useState("connection");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isDeletingSmtp, setIsDeletingSmtp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [smtpSaveStatus, setSmtpSaveStatus] = useState(null);
  const [tempSmtpCred, setTempSmtpCred] = useState({
    user: "",
    password: "",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  });

  useEffect(() => {
    if (isOpen) {
      setTempSmtpCred({
        user: formState.smtpUser || "",
        password: "",
        host: formState.smtpHost || "smtp.gmail.com",
        port: formState.smtpPort || 465,
        secure: formState.smtpSecure !== undefined ? formState.smtpSecure : true,
      });
      setShowSmtpPass(false);
      setSmtpModalTab("connection");
      setSmtpSaveStatus(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, formState]);

  if (!isOpen) return null;

  const handleSaveSmtpPopup = async () => {
    setIsSavingSmtp(true);
    setSmtpSaveStatus(null);
    try {
      const res = await updateSmtpCredentials({
        user: tempSmtpCred.user,
        password: tempSmtpCred.password,
        host: tempSmtpCred.host,
        port: tempSmtpCred.port,
        secure: tempSmtpCred.secure,
      });
      if (res?.data?.success) {
        setFormState((prev) => ({
          ...prev,
          smtpUser: tempSmtpCred.user,
          hasSmtpPassword: true,
          smtpHost: tempSmtpCred.host,
          smtpPort: tempSmtpCred.port,
          smtpSecure: tempSmtpCred.secure,
          smtpCredId: res.data.credentialId || prev.smtpCredId,
          smtpUpdatedAt: new Date().toISOString(),
        }));
        setSmtpSaveStatus("success");
        if (showToast) showToast("success", res.data.message || "Lưu và đồng bộ App Key vào n8n thành công!");
        setTimeout(() => {
          onClose();
          setSmtpSaveStatus(null);
        }, 500);
      } else {
        const msg = res?.data?.message || "Lỗi lưu cấu hình";
        setSmtpSaveStatus(msg);
        if (showToast) showToast("error", msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Lỗi kết nối máy chủ";
      setSmtpSaveStatus(msg);
      if (showToast) showToast("error", msg);
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleDeleteSmtpCredential = async () => {
    setIsDeletingSmtp(true);
    try {
      const res = await deleteSmtpCredentials();
      if (res?.data?.success) {
        setFormState((prev) => ({
          ...prev,
          hasSmtpPassword: false,
          smtpCredId: "",
          smtpCredName: "",
        }));
        if (showToast) showToast("success", "Đã xóa kết nối Credential khỏi n8n!");
        onClose();
      } else {
        const msg = res?.data?.message || "Lỗi khi xóa Credential";
        if (showToast) showToast("error", msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Lỗi khi ngắt kết nối Credential";
      if (showToast) showToast("error", msg);
    } finally {
      setIsDeletingSmtp(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-205 max-w-[95vw] h-130 max-h-[90vh] bg-[#1e2025] rounded-xl border border-[#2e313a] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#2e313a] flex items-center justify-between bg-[#1e2025] shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="3" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">
                {formState.smtpCredName || "SMTP account"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                SMTP
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {smtpModalTab === "connection" && (
              <button
                type="button"
                onClick={handleSaveSmtpPopup}
                disabled={isSavingSmtp}
                className="px-3.5 py-1 rounded-md bg-[#2b2e36] hover:bg-[#363a44] border border-[#3c414d] text-xs font-medium text-white transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingSmtp ? "Saving..." : smtpSaveStatus === "success" ? "Saved ✓" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Xóa / Ngắt kết nối Credential"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white transition cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: 2 Columns */}
        <div className="flex flex-1 min-h-0 bg-[#1e2025] relative">
          {/* Left Sidebar */}
          <div className="w-44 border-r border-[#2e313a] p-3 space-y-1 shrink-0 bg-[#1e2025]">
            <button
              type="button"
              onClick={() => setSmtpModalTab("connection")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                smtpModalTab === "connection"
                  ? "bg-[#2c2f38] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Connection
            </button>
            <button
              type="button"
              onClick={() => setSmtpModalTab("details")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                smtpModalTab === "details"
                  ? "bg-[#2c2f38] text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Details
            </button>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar bg-[#18191f]">
            {smtpModalTab === "connection" && (
              <div className="space-y-4">
                {/* User */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    User
                  </label>
                  <input
                    type="text"
                    value={tempSmtpCred.user}
                    onChange={(e) => setTempSmtpCred((prev) => ({ ...prev, user: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md bg-[#131418] border border-[#2b2e35] text-xs text-white outline-none focus:border-slate-500 font-sans"
                    placeholder="soc-smtp@company.com"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? "text" : "password"}
                      value={tempSmtpCred.password}
                      onChange={(e) => setTempSmtpCred((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-9 rounded-md bg-[#131418] border border-[#2b2e35] text-xs text-white outline-none focus:border-slate-500 font-mono tracking-wider"
                      placeholder={
                        formState.hasSmtpPassword
                          ? "Đã lưu (để trống nếu giữ nguyên mật khẩu cũ)"
                          : "App Password (16 ký tự)"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      title={showSmtpPass ? "Hide" : "Show"}
                    >
                      {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Host */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Host
                  </label>
                  <input
                    type="text"
                    value={tempSmtpCred.host}
                    onChange={(e) => setTempSmtpCred((prev) => ({ ...prev, host: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md bg-[#131418] border border-[#2b2e35] text-xs text-white outline-none focus:border-slate-500 font-sans"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                {/* Port */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Port
                  </label>
                  <input
                    type="number"
                    value={tempSmtpCred.port}
                    onChange={(e) => setTempSmtpCred((prev) => ({ ...prev, port: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-md bg-[#131418] border border-[#2b2e35] text-xs text-white outline-none focus:border-slate-500 font-sans"
                    placeholder="465"
                  />
                </div>

                {/* SSL/TLS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    SSL/TLS
                  </label>
                  <div>
                    <button
                      type="button"
                      onClick={() => setTempSmtpCred((prev) => ({ ...prev, secure: !prev.secure }))}
                      className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${
                        tempSmtpCred.secure ? "bg-[#00c950]" : "bg-[#3e424b]"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-0.5 ${
                          tempSmtpCred.secure ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {smtpSaveStatus && smtpSaveStatus !== "success" && (
                  <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {smtpSaveStatus}
                  </div>
                )}
              </div>
            )}

            {/* Tab Details */}
            {smtpModalTab === "details" && (
              <div className="p-6 space-y-6 text-sm text-white">
                <div className="grid grid-cols-[160px_1fr] items-center">
                  <span className="text-white font-normal">Created</span>
                  <span className="text-white font-normal">{formatRelativeTime(formState.smtpCreatedAt)}</span>
                </div>
                <div className="grid grid-cols-[160px_1fr] items-center">
                  <span className="text-white font-normal">Last modified</span>
                  <span className="text-white font-normal">{formatRelativeTime(formState.smtpUpdatedAt)}</span>
                </div>
                <div className="grid grid-cols-[160px_1fr] items-center">
                  <span className="text-white font-normal">ID</span>
                  <span className="font-mono text-white select-all">{formState.smtpCredId || "Chưa gán Credential ID"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal xác nhận xóa / ngắt kết nối Credential */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-80 bg-black/75 backdrop-blur-[1px] flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#1e2025] border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Trash2 size={16} className="text-rose-400" />
                  <span>Xác nhận xóa Credential</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bạn có chắc muốn gỡ và xóa kết nối của Credential <strong>{formState.smtpCredName || "SMTP account"}</strong> khỏi Workflow n8n?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-[#252830] text-xs text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingSmtp}
                    onClick={handleDeleteSmtpCredential}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeletingSmtp ? "Đang xóa..." : "Xác nhận xóa"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

