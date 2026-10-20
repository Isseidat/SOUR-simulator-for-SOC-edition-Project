import React from "react";

/**
 * =========================================================================
 * BỘ TỪ ĐIỂN REGISTRY CHUẨN N8N (Official n8n Node Registry)
 * Phương án Headless API: Tự động tải SVG gốc & Metadata từ n8n qua Backend Proxy
 * =========================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const getN8nIconUrl = (nodeType = "", name = "") => {
  const cleanType = (nodeType || "")
    .replace("n8n-nodes-base.", "")
    .replace("node:", "")
    .trim();
  const queryParam = cleanType || name || "webhook";
  return `${API_BASE_URL}/playbooks/n8n-icon?name=${encodeURIComponent(queryParam)}&v=2`;
};

export const N8N_NODE_METADATA = {
  "n8n-nodes-base.webhook": {
    name: "Webhook",
    displayName: "Webhook",
    subtitle: "Trigger n8n",
    brandColor: "#F24B7B",
    category: "Trigger",
    description: "Tiếp nhận cảnh báo sự cố từ hệ thống giám sát SIEM",
  },
  "n8n-nodes-base.httpRequest": {
    name: "HTTP Request",
    displayName: "HTTP Request",
    subtitle: "Web / REST API",
    brandColor: "#898FFF",
    category: "Network",
    description: "Truy vấn danh tính mối đe dọa (VirusTotal, AbuseIPDB, WAF)",
  },
  "n8n-nodes-base.code": {
    name: "Code",
    displayName: "Code",
    subtitle: "Custom JS / Python",
    brandColor: "#FFB966",
    category: "Transform",
    description: "Bóc tách domain, URL, Regex, Base64 payload",
  },
  "n8n-nodes-base.if": {
    name: "IF",
    displayName: "IF",
    subtitle: "Conditional Branch",
    brandColor: "#00C950",
    category: "Flow",
    description: "Đánh giá điều kiện và rẽ 2 nhánh độc lập: TRUE và FALSE",
  },
  "n8n-nodes-base.emailSend": {
    name: "Send Email",
    displayName: "Send Email",
    subtitle: "SMTP / Mail",
    brandColor: "#4B89DC",
    category: "Action",
    description: "Gửi email cảnh báo vi phạm hoặc link đổi mật khẩu",
  },
  "n8n-nodes-base.wait": {
    name: "Wait",
    displayName: "Wait",
    subtitle: "Timer / Throttle",
    brandColor: "#F188A2",
    category: "Flow",
    description: "Tạm dừng luồng xử lý (giảm tải hoặc đợi hoàn tất quét EDR)",
  },
  "n8n-nodes-base.stickyNote": {
    name: "Sticky Note",
    displayName: "Sticky Note",
    subtitle: "Annotation",
    brandColor: "#fde047",
    category: "Documentation",
    description: "Ghi chú tiêu đề phân vùng kịch bản trên Canvas",
  },
};

// Aliases dự phòng cho các tên gọi cũ
export const N8N_NODE_ALIASES = {
  webhookNode: "n8n-nodes-base.webhook",
  triggerNode: "n8n-nodes-base.webhook",
  apiNode: "n8n-nodes-base.httpRequest",
  enrichNode: "n8n-nodes-base.httpRequest",
  codeNode: "n8n-nodes-base.code",
  extractNode: "n8n-nodes-base.code",
  conditionNode: "n8n-nodes-base.if",
  mailNode: "n8n-nodes-base.emailSend",
  actionNode: "n8n-nodes-base.emailSend",
  "n8n-nodes-base.gmail": "n8n-nodes-base.emailSend",
  waitNode: "n8n-nodes-base.wait",
  stickyNote: "n8n-nodes-base.stickyNote",
};

/**
 * Dynamic Node Resolver: Tự động phân giải thông tin node, màu sắc và URL vector SVG
 */
export function resolveN8nNode(type = "", name = "") {
  const normalizedType = N8N_NODE_ALIASES[type] || type;
  
  if (N8N_NODE_METADATA[normalizedType]) {
    const base = N8N_NODE_METADATA[normalizedType];
    return {
      ...base,
      iconUrl: getN8nIconUrl(normalizedType, name),
    };
  }

  // Nhận diện theo tên node (ví dụ: "1. Webhook (Phishing)" -> Webhook)
  const lowerName = name.toLowerCase();
  let matchedType = "n8n-nodes-base.httpRequest";
  if (lowerName.includes("webhook")) matchedType = "n8n-nodes-base.webhook";
  else if (lowerName.includes("email") || lowerName.includes("mail")) matchedType = "n8n-nodes-base.emailSend";
  else if (lowerName.includes("if") || lowerName.includes("độc hại")) matchedType = "n8n-nodes-base.if";
  else if (lowerName.includes("wait") || lowerName.includes("chờ")) matchedType = "n8n-nodes-base.wait";
  else if (lowerName.includes("trích xuất") || lowerName.includes("code") || lowerName.includes("mock")) matchedType = "n8n-nodes-base.code";

  const base = N8N_NODE_METADATA[matchedType] || {
    name: name || "n8n Node",
    displayName: "n8n Node",
    subtitle: "Custom Node",
    brandColor: "#06b6d4",
    category: "Action",
    description: "Node n8n",
  };

  return {
    ...base,
    iconUrl: getN8nIconUrl(matchedType, name),
  };
}

/**
 * Component hiển thị Icon SVG chuẩn n8n qua Backend Proxy
 */
export function N8nNodeIcon({ type, name, className = "w-4 h-4", ...props }) {
  const meta = resolveN8nNode(type, name);
  return (
    <img
      src={meta.iconUrl}
      alt={meta.name}
      className={`${className} object-contain`}
      onError={(e) => {
        e.currentTarget.style.opacity = "0.5";
      }}
      {...props}
    />
  );
}
