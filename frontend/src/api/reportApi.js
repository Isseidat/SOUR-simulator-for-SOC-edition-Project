import axiosClient from "./axiosClient";

// Ghi nhận lịch sử trích xuất báo cáo lên MongoDB
export const logReportExport = async (payload) => {
  return await axiosClient.post("/reports/export-logs", payload);
};

// Tra cứu lịch sử người dùng đã xuất báo cáo (Admin)
export const getReportExportLogs = async (params) => {
  return await axiosClient.get("/reports/export-logs", { params });
};
