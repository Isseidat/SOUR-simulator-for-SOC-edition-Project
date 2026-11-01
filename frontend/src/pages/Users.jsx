import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getUsers, createUser, deleteUser } from "../api/userApi";
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ShieldAlert,
  Loader2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import CustomDropdown from "../components/common/CustomDropdown";

// Component đếm số hiệu ứng chạy từ 0 đến giá trị đích (Animation đồng bộ Dashboard & Logs)
const AnimatedNumber = ({ value, duration = 800, trigger }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCurrent(Math.floor(progress * value));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };
    animationFrame = window.requestAnimationFrame(step);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [value, trigger, duration]);

  return <span>{current}</span>;
};

const ROLE_OPTIONS = [
  {
    value: "Viewer",
    label: "Viewer",
    color: "#06b6d4",
  },
  {
    value: "Admin",
    label: "Admin",
    color: "#f59e0b",
  },
];

const FILTER_ROLE_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  { value: "Admin", label: "Admin", color: "#f59e0b" },
  { value: "Viewer", label: "Viewer", color: "#06b6d4" },
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Viewer");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const isFetchingRef = useRef(false);

  // Hàm tải danh sách tài khoản
  const fetchUsersList = async (isManual = false, isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManual) {
      setRefreshing(true);
    } else if (!isSilent) {
      setLoading(true);
    }

    try {
      const res = await getUsers();
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Nạp ban đầu khi vào trang
  useEffect(() => {
    if (isAdmin) {
      fetchUsersList();
    }
  }, [isAdmin]);

  // EVENT XỬ LÝ RELOAD & SYNC ĐỒNG BỘ
  useEffect(() => {
    if (!isAdmin) return;

    // 1. Lắng nghe các event từ toàn hệ thống (Đăng nhập, Đăng xuất, Thêm/Xóa User)
    const handleSyncEvent = () => {
      fetchUsersList(false, true);
    };

    // 2. Tự động cập nhật khi quay lại tab trình duyệt
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUsersList(false, true);
      }
    };

    window.addEventListener("userStatusChanged", handleSyncEvent);
    window.addEventListener("userCountChanged", handleSyncEvent);
    document.addEventListener("visibilitychange", handleVisibility);

    // 3. AUTO-POLLING REALTIME: Cứ 2.5 giây tự động cập nhật ngầm nếu có ai đăng nhập / đăng xuất
    const intervalTimer = setInterval(() => {
      if (!document.hidden && !loading) {
        fetchUsersList(false, true);
      }
    }, 2500);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener("userStatusChanged", handleSyncEvent);
      window.removeEventListener("userCountChanged", handleSyncEvent);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAdmin, loading]);

  // Nút reload thủ công phát sự kiện đồng bộ và kích hoạt lại Animation
  const handleManualReload = () => {
    setReloadTrigger((prev) => prev + 1);
    fetchUsersList(true);
    window.dispatchEvent(new CustomEvent("userStatusChanged"));
    window.dispatchEvent(new CustomEvent("userCountChanged"));
  };

  // Sinh mật khẩu mạnh ngẫu nhiên
  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  // Reset form
  const handleResetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("Viewer");
    setFormError("");
    setFormSuccess("");
  };

  // Xử lý tạo tài khoản mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!username.trim() || !email.trim() || !password.trim()) {
      setFormError("Vui lòng điền đầy đủ tất cả các trường bắt buộc.");
      return;
    }

    setCreating(true);
    try {
      const res = await createUser({
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
      });

      setCreating(false);
      if (res.success) {
        setFormSuccess(`Tạo tài khoản "${res.user.username}" (${res.user.role}) thành công!`);
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("Viewer");

        // Gọi đồng bộ và phát event cho toàn ứng dụng
        setReloadTrigger((prev) => prev + 1);
        fetchUsersList(true);
        window.dispatchEvent(new CustomEvent("userCountChanged"));
        window.dispatchEvent(new CustomEvent("userStatusChanged"));

        setTimeout(() => {
          setFormSuccess("");
        }, 4000);
      }
    } catch (err) {
      setCreating(false);
      setFormError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Không thể tạo tài khoản mới. Vui lòng kiểm tra lại thông tin."
      );
    }
  };

  // Xử lý xóa tài khoản
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setActionError("");

    try {
      const res = await deleteUser(userToDelete._id || userToDelete.id);
      setDeleting(false);
      if (res.success) {
        setUserToDelete(null);
        setReloadTrigger((prev) => prev + 1);
        fetchUsersList(true);
        window.dispatchEvent(new CustomEvent("userCountChanged"));
        window.dispatchEvent(new CustomEvent("userStatusChanged"));
      }
    } catch (err) {
      setDeleting(false);
      setActionError(
        err.response?.data?.message || "Xóa tài khoản thất bại. Vui lòng thử lại."
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Truy Cập Bị Giới Hạn
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Chỉ Quản trị viên (Admin) mới có quyền truy cập trang quản lý tài khoản và cấp phát nhân sự.
        </p>
      </div>
    );
  }

  // Thống kê nhanh
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "Admin").length;
  const viewerCount = users.filter((u) => u.role === "Viewer").length;
  const onlineCount = users.filter((u) => Boolean(u.isOnline)).length;

  // Lọc danh sách
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole ? u.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* 1. HEADER KHU VỰC VỚI REALTIME BADGE & NÚT RELOAD CHUẨN FORM DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quản Lý Tài Khoản & Phân Quyền SOC
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cấp mới tài khoản thành viên và kiểm soát tức thời trạng thái trực tuyến của nhân sự
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualReload}
            disabled={refreshing || loading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu & chạy lại animation"
          >
            <RefreshCw
              size={15}
              className={refreshing || loading ? "animate-spin text-cyan-500" : ""}
            />
          </button>
        </div>
      </div>

      {/* 2. BỘ 3 THẺ THỐNG KÊ KPI (ANIMATION ĐẾM SỐ THEO RELOAD TRIGGER) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Tổng người dùng & Trực tuyến */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-cyan-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tổng Nhân Sự
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white tracking-tight">
                <AnimatedNumber value={totalUsers} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {onlineCount > 0
                    ? `${onlineCount} tài khoản đang trực tuyến`
                    : "Chưa có tài khoản online"}
                </span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <UsersIcon size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
        </div>

        {/* KPI 2: Quản trị viên (Admin) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-amber-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Quản Trị Viên (Admin)
              </p>
              <h3 className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400 tracking-tight">
                <AnimatedNumber value={adminCount} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} />
                <span>Toàn quyền SOAR & Playbook</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
        </div>

        {/* KPI 3: Chuyên viên (Viewer) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 shadow-sm relative overflow-hidden transition hover:border-blue-500/40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Chuyên Viên (Viewer)
              </p>
              <h3 className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400 tracking-tight">
                <AnimatedNumber value={viewerCount} trigger={reloadTrigger} />
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold flex items-center gap-1">
                <UserCheck size={12} />
                <span>Giám sát Cảnh báo & Nhật ký</span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        </div>
      </div>

      {/* 3. BỐ CỤC 2 CỘT CHUYÊN NGHIỆP: FORM TẠO (TRÁI) VÀ BẢNG LIVE CONTROL (PHẢI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (4 COLS): CARD FORM CẤP MỚI TÀI KHOẢN */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-sm">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tạo tài Khoản mới
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Thêm thành viên mới
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetForm}
              title="Xóa trắng form"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Thông báo lỗi / thành công trong form */}
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-slide-up">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            {/* Họ và Tên */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                <span>Họ và Tên</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
            </div>

            {/* Email công vụ */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                <span>Email công vụ</span>
              </label>
              <input
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
            </div>

            {/* Mật khẩu khởi tạo + Toggle xem & Nút random password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock size={13} className="text-slate-400" />
                  <span>Mật khẩu ban đầu</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                >
                  <Sparkles size={11} />
                  <span>Tạo ngẫu nhiên</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Phân quyền RBAC */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-slate-400" />
                <span>Phân quyền vai trò (RBAC)</span>
              </label>
              <CustomDropdown
                value={role}
                onChange={(val) => setRole(val)}
                options={ROLE_OPTIONS}
                className="w-full"
                accent="cyan"
              />
            </div>

            {/* Nút Submit Tạo Tài Khoản */}
            <button
              type="submit"
              disabled={creating}
              className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Đang xử lý tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Tạo Tài Khoản Mới</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* CỘT PHẢI (8 COLS): VÙNG CONTROL & BẢNG QUẢN LÝ TÀI KHOẢN REALTIME */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Thanh Control: Tìm kiếm & Lọc & Reload nhanh */}
          <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap gap-3 items-center justify-between shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tài khoản (Tên hoặc Email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CustomDropdown
                value={filterRole}
                onChange={(val) => setFilterRole(val)}
                options={FILTER_ROLE_OPTIONS}
                className="min-w-[150px]"
                accent="cyan"
              />

              <button
                onClick={handleManualReload}
                disabled={refreshing || loading}
                title="Làm mới bảng & chạy lại animation"
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={refreshing || loading ? "animate-spin text-cyan-500" : ""}
                />
              </button>

              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-nowrap font-mono">
                {filteredUsers.length} / {totalUsers}
              </span>
            </div>
          </div>

          {/* Bảng Danh Sách Tài Khoản Realtime (Kèm Animation Reload) */}
          <div
            key={reloadTrigger}
            className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm animate-slide-up"
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Thành viên SOC</th>
                    <th className="px-5 py-3.5">Email công vụ</th>
                    <th className="px-5 py-3.5">Vai trò (RBAC)</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right">Vùng thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        <RefreshCw
                          size={22}
                          className="animate-spin mx-auto text-cyan-500 mb-2"
                        />
                        <span>Đang tải danh sách tài khoản...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        {searchTerm || filterRole
                          ? "Không tìm thấy tài khoản nào phù hợp với bộ lọc."
                          : "Chưa có tài khoản nào trong hệ thống."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf =
                        currentUser?.email?.toLowerCase() === u.email?.toLowerCase();
                      
                      const createdAtFormatted = u.createdAt
                        ? format(new Date(u.createdAt), "dd/MM/yyyy HH:mm")
                        : "—";

                      return (
                        <tr
                          key={u._id || u.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
                            u.isOnline ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""
                          }`}
                        >
                          {/* Cột 1: Avatar + Tên */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                  {u.username?.charAt(0).toUpperCase() || "U"}
                                </div>
                                {u.isOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1222] animate-pulse"></span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{u.username}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Email */}
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {u.email}
                          </td>

                          {/* Cột 3: Vai trò */}
                          <td className="px-5 py-3.5">
                            {u.role === "Admin" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <ShieldCheck size={12} />
                                <span>Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                <UserCheck size={12} />
                                <span>Viewer</span>
                              </span>
                            )}
                          </td>

                          {/* Cột 4: Trạng thái Online / Offline Realtime */}
                          <td className="px-5 py-3.5">
                            {u.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Trực tuyến</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                                <span>Ngoại tuyến</span>
                              </span>
                            )}
                          </td>

                          {/* Cột 5: Ngày tạo */}
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {createdAtFormatted}
                          </td>

                          {/* Cột 6: Thao tác */}
                          <td className="px-5 py-3.5 text-right">
                            {isSelf ? (
                              <span
                                className="text-[11px] text-slate-400 italic cursor-not-allowed px-2 py-1"
                                title="Bạn không thể xóa tài khoản của chính mình"
                              >
                                Đang trực tuyến
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setUserToDelete(u);
                                  setActionError("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
                                title={`Xóa tài khoản ${u.username}`}
                              >
                                <Trash2 size={13} />
                                <span>Xóa</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL XÁC NHẬN XÓA TÀI KHOẢN (CONFIRM DELETE) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Trash2 size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác Nhận Xóa Tài Khoản
                </h3>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản{" "}
              <strong className="text-slate-900 dark:text-white">
                "{userToDelete.username}"
              </strong>{" "}
              (
              <span className="font-mono text-cyan-600 dark:text-cyan-400">
                {userToDelete.email}
              </span>
              )? Thao tác này sẽ thu hồi toàn bộ quyền truy cập và không thể hoàn tác.
            </p>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xóa vĩnh viễn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
