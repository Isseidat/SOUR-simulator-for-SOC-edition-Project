import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Layout from "./components/layout/Layout";

// Tối ưu Code-Splitting: Lazy load các trang nặng (ReactFlow Canvas, XLSX/DOCX Report, Recharts)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Logs = lazy(() => import("./pages/Logs"));
const Users = lazy(() => import("./pages/Users"));
const Report = lazy(() => import("./pages/Report"));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Đang tải...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Report />} />
        <Route path="logs" element={<Logs />} />
        <Route path="users" element={<Users />} />
        <Route path="studio" element={null} />
        <Route path="playbooks" element={<Navigate to="/studio" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-slate-300">Đang tải phân hệ...</span>
                </div>
              </div>
            }
          >
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
