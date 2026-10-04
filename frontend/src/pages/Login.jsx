import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import {
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Clock,
} from "lucide-react";

export default function Login() {
  const [tab, setTab] = useState("login"); // 'login' | 'register' | 'forgot'

  // Login fields
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("password123");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("Viewer");

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [countdown, setCountdown] = useState(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  // Kiểm tra nếu bị điều hướng về do hết hạn token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      setError(
        "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.",
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Timer countdown 60s khi mã OTP đã gửi
  useEffect(() => {
    let timer;
    if (tab === "forgot" && otpSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [tab, otpSent, countdown]);

  // Quick fill demo accounts
  const setQuickAccount = (roleType) => {
    if (roleType === "admin") {
      setEmail("admin@company.com");
      setPassword("password123");
    } else {
      setEmail("viewer@company.com");
      setPassword("password123");
    }
    setError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const result = await login(email, password);
      setLoading(false);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.message || "Email hoặc mật khẩu không chính xác");
      }
    } catch {
      setLoading(false);
      setError("Không thể kết nối đến máy chủ xác thực");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await axiosClient.post("/auth/register", {
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      setLoading(false);
      if (res.success) {
        setSuccessMsg(
          "Đăng ký tài khoản thành công! Tự động chuyển sang đăng nhập...",
        );
        setEmail(regEmail);
        setPassword(regPassword);
        setTimeout(() => {
          setTab("login");
          setSuccessMsg("");
        }, 1200);
      }
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Đăng ký thất bại!",
      );
    }
  };

  // 1. Gửi OTP qua Gmail
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await axiosClient.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      setLoading(false);
      if (res.success) {
        setOtpSent(true);
        setCountdown(60);
        // Nếu có devOtp (chế độ demo/local), tự điền luôn để tiện test
        if (res.devOtp) {
          setOtp(res.devOtp);
          setSuccessMsg(`Đã gửi OTP qua Gmail! (Mã thử nghiệm: ${res.devOtp})`);
        } else {
          setSuccessMsg(
            "Mã OTP xác thực đã được gửi về Gmail của bạn! Vui lòng kiểm tra hộp thư.",
          );
        }
      }
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || "Không thể gửi mã OTP tới email này!",
      );
    }
  };

  // 2. Xác nhận OTP & Đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (countdown <= 0) {
      setError(
        'Mã OTP đã hết hạn sau 60 giây. Vui lòng bấm "Gửi lại mã mới" bên dưới.',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post("/auth/reset-password", {
        email: forgotEmail,
        otp,
        newPassword,
      });

      setLoading(false);
      if (res.success) {
        setSuccessMsg(
          "Đặt lại mật khẩu thành công! Chuyển về trang đăng nhập...",
        );
        setEmail(forgotEmail);
        setPassword(newPassword);
        setTimeout(() => {
          setTab("login");
          setOtpSent(false);
          setSuccessMsg("");
        }, 1500);
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Xác thực OTP thất bại!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-neutral-900 selection:text-white">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        {/* Header Tối Giản Thanh Lịch */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-neutral-900 mx-auto transition-transform hover:scale-105 duration-200">
            <Shield size={20} strokeWidth={1.8} className="text-neutral-800" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-light tracking-tight text-neutral-950">
              Secure Mock<span className="font-bold">SOAR</span>
            </h1>
            <p className="text-xs text-neutral-500 font-normal">
              Secure Mock SOAR-Dashboard System
            </p>
          </div>
        </div>

        {/* Khối Card Phẳng Tinh Khiết */}
        <div className="p-7 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-5 transition-all">
          {/* Tab Switcher (Chỉ hiện khi ở tab login hoặc register) */}
          {tab !== "forgot" ? (
            <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-lg text-xs font-medium relative">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`py-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  tab === "login"
                    ? "bg-white text-neutral-950 font-semibold shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`py-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                  tab === "register"
                    ? "bg-white text-neutral-950 font-semibold shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Tạo Tài Khoản
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError("");
                  setSuccessMsg("");
                  setOtpSent(false);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={13} />
                <span>Quay lại</span>
              </button>
              <span className="text-xs font-semibold text-neutral-800">
                Khôi phục mật khẩu
              </span>
            </div>
          )}

          {/* Thông báo lỗi */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50/90 border border-red-200/80 text-red-600 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={14} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Thông báo thành công */}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-emerald-700 text-xs flex items-center gap-2 animate-slide-up">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORM ĐĂNG NHẬP */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-700 text-[11px]">
                  Email công vụ
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-neutral-700">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("forgot");
                      setError("");
                      setSuccessMsg("");
                      setForgotEmail(email);
                    }}
                    className="text-neutral-400 hover:text-neutral-900 transition underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-medium text-xs transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      size={14}
                      className="animate-spin text-neutral-300"
                    />
                    <span>Đang xác thực thông tin...</span>
                  </span>
                ) : (
                  <>
                    <span>Đăng nhập tài khoản</span>
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>

              {/* Quick Fill Demo */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Tài khoản mẫu:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAccount("admin")}
                    className="text-neutral-900 font-semibold hover:underline cursor-pointer"
                  >
                    Admin
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setQuickAccount("viewer")}
                    className="text-neutral-600 hover:underline cursor-pointer"
                  >
                    Viewer
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* FORM ĐĂNG KÝ */}
          {tab === "register" && (
            <form
              onSubmit={handleRegisterSubmit}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="font-medium text-neutral-700 text-[11px]">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Chuyên viên SOC"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-neutral-700 text-[11px]">
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="user@company.com"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-neutral-700 text-[11px]">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-neutral-700 text-[11px]">
                  Phân quyền (RBAC)
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition-all duration-150 cursor-pointer"
                >
                  <option value="Viewer">
                    Viewer (Chỉ xem Dashboard & Alerts)
                  </option>
                  <option value="Admin">
                    Admin (Toàn quyền kích hoạt SOAR)
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-medium text-xs transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      size={14}
                      className="animate-spin text-neutral-300"
                    />
                    <span>Đang tạo tài khoản...</span>
                  </span>
                ) : (
                  <span>Hoàn tất đăng ký</span>
                )}
              </button>
            </form>
          )}

          {/* FORM QUÊN MẬT KHẨU (GỬI OTP GMAIL VỚI BỘ ĐẾM 60S) */}
          {tab === "forgot" && (
            <div className="space-y-4 text-xs">
              {!otpSent ? (
                // BƯỚC 1: NHẬP EMAIL ĐỂ GỬI MÃ
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Nhập địa chỉ email tài khoản của bạn. Hệ thống sẽ gửi một mã
                    xác thực OTP (6 chữ số) có hiệu lực trong{" "}
                    <strong>60 giây</strong>.
                  </p>

                  <div className="space-y-1.5">
                    <label className="font-medium text-neutral-700 text-[11px]">
                      Email nhận mã OTP
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2
                          size={14}
                          className="animate-spin text-neutral-300"
                        />
                        <span>Đang gửi mã qua Gmail...</span>
                      </span>
                    ) : (
                      <span>Gửi mã OTP (60 giây)</span>
                    )}
                  </button>
                </form>
              ) : (
                // BƯỚC 2: NHẬP MÃ OTP VÀ MẬT KHẨU MỚI
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  {/* Đồng hồ đếm ngược 60 giây */}
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between text-[11px] font-mono transition-colors ${
                      countdown > 15
                        ? "bg-neutral-50 border-neutral-200 text-neutral-700"
                        : countdown > 0
                          ? "bg-amber-50 border-amber-200 text-amber-700 font-bold animate-pulse"
                          : "bg-red-50 border-red-200 text-red-600 font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>
                        {countdown > 0 ? "Mã hết hạn sau:" : "Mã đã hết hạn:"}
                      </span>
                    </div>
                    <span className="text-sm font-bold tracking-wider">
                      {`00:${countdown < 10 ? "0" : ""}${countdown}s`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-neutral-700 text-[11px]">
                      Mã OTP (6 chữ số từ Gmail)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs font-mono tracking-widest text-center text-sm placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-neutral-700 text-[11px]">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-50/70 border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || countdown <= 0}
                    className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2
                          size={14}
                          className="animate-spin text-neutral-300"
                        />
                        <span>Đang xác nhận đổi...</span>
                      </span>
                    ) : (
                      <span>Xác nhận đổi mật khẩu</span>
                    )}
                  </button>

                  {/* Nút gửi lại mã nếu hết hạn */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || countdown > 0}
                      className={`text-[11px] font-semibold underline transition ${
                        countdown > 0
                          ? "text-neutral-300 cursor-not-allowed"
                          : "text-neutral-900 hover:text-black cursor-pointer"
                      }`}
                    >
                      Gửi lại mã OTP mới
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-neutral-400">
          Chỉ dành cho nhân sự được phân quyền an ninh mạng.
        </div>
      </div>
    </div>
  );
}
