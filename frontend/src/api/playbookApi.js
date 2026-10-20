import axiosClient from "./axiosClient";

// Lấy danh sách tất cả Playbooks từ MongoDB
export const getPlaybooks = async () => {
  return await axiosClient.get("/playbooks");
};

// Lưu cấu hình bản vẽ Canvas (nodes & edges) vào Database
export const updatePlaybookLayout = async (id, flowLayout) => {
  return await axiosClient.put(`/playbooks/${id}`, flowLayout);
};

// Kích hoạt playbook trên n8n cho 1 alert
export const triggerPlaybook = async (alert_id) => {
  return await axiosClient.post("/playbooks/trigger", { alert_id });
};

// Đồng bộ cấu trúc Workflow n8n qua Backend proxy (Tránh lỗi CORS của Browser)
export const syncWorkflowFromN8n = async (workflowId = "ay2nW4EWg2uAcjJL") => {
  return await axiosClient.post("/playbooks/sync-n8n", { workflowId });
};

// Lấy danh mục 990+ Node Types từ n8n qua Backend Proxy
export const getN8nNodeTypes = async () => {
  return await axiosClient.get("/playbooks/n8n-node-types");
};

// Lấy Workflow trực tiếp từ máy chủ n8n Web (Single Source of Truth)
export const getN8nLiveWorkflow = async () => {
  return await axiosClient.get("/playbooks/n8n-workflow");
};

