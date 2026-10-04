import axiosClient from "./axiosClient";

// Kích hoạt playbook trên n8n cho 1 alert
export const triggerPlaybook = async (alert_id) => {
  const response = await axiosClient.post("/playbooks/trigger", { alert_id });
  return response;
};
