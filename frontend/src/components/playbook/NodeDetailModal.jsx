import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Play,
  Zap,
  Check,
  Trash2,
  Copy,
  CheckCircle2,
  FileCode,
  Table,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  Info,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { resolveN8nNode } from "../../utils/n8nNodeRegistry";
import { N8N_STICKY_COLORS } from "../../utils/playbookConverters";
import CustomDropdown from "../common/CustomDropdown";
import { getSmtpCredentials, updateSmtpCredentials, deleteSmtpCredentials } from "../../api/playbookApi";

const RESPONSE_MODE_OPTIONS = [
  { value: "onReceived", label: "On Received (Phản hồi ngay lập tức)", color: "#06b6d4" },
  { value: "lastNode", label: "When Last Node Finishes (Đợi hoàn tất)", color: "#a855f7" },
];

const HTTP_METHOD_OPTIONS = [
  { value: "GET", label: "GET", color: "#10b981" },
  { value: "POST", label: "POST", color: "#3b82f6" },
  { value: "PUT", label: "PUT", color: "#f59e0b" },
  { value: "DELETE", label: "DELETE", color: "#ef4444" },
  { value: "PATCH", label: "PATCH", color: "#8b5cf6" },
];

const AUTH_TYPE_OPTIONS = [
  { value: "none", label: "None (Không xác thực)" },
  { value: "apiKey", label: "Header Auth / API Key (Khóa bí mật)", color: "#f59e0b" },
  { value: "bearer", label: "Bearer Token (Authorization)", color: "#3b82f6" },
];

const ON_ERROR_OPTIONS = [
  { value: "stopWorkflow", label: "Dừng Workflow khi có lỗi (Stop Workflow)" },
  { value: "continueErrorOutput", label: "Rẽ sang nhánh lỗi - Error Output (Tiếp tục xử lý)", color: "#f43f5e" },
  { value: "continueRegularOutput", label: "Bỏ qua lỗi & tiếp tục nhánh chính (Ignore Error)", color: "#10b981" },
];

const OPERATOR_OPTIONS = [
  { value: "gt", label: "Lớn hơn (>)" },
  { value: "gte", label: "Lớn hơn hoặc bằng (>=)" },
  { value: "equal", label: "Bằng (==)" },
  { value: "notEqual", label: "Khác (!=)" },
  { value: "lt", label: "Nhỏ hơn (<)" },
  { value: "contains", label: "Chứa chuỗi (contains)" },
];

const WAIT_UNIT_OPTIONS = [
  { value: "seconds", label: "Giây (Seconds)" },
  { value: "minutes", label: "Phút (Minutes)" },
  { value: "hours", label: "Giờ (Hours)" },
];

function formatRelativeTime(dateInput) {
  if (!dateInput) return "3 hours ago";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "3 hours ago";
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } catch {
    return "3 hours ago";
  }
}

/**
 * =========================================================================
 * MODAL NDV 3 CỘT CHUẨN N8N (NODE DETAIL VIEW)
 * - Cột TRÁI: INPUT (Context dữ liệu từ Previous Nodes)
 * - Cột GIỮA: PARAMETERS (Form cấu hình chuyên sâu tự động đổi theo 7 loại node)
 * - Cột PHẢI: OUTPUT & LIVE JSON (Two-way binding, Tab Schema | Table | JSON)
 * - HEADER: Nút cam Execute step / Test trigger, status, close
 * =========================================================================
 */
export default function NodeDetailModal({
  selectedNode,
  setSelectedNode,
  nodes = [],
  edges = [],
  onUpdateNodeData,
  handleDeleteSelectedNode,
}) {
  if (!selectedNode) return null;

  const nodeType = selectedNode.type || "n8n-nodes-base.webhook";
  // Sticky Note không sử dụng Modal NDV 3 cột (soạn thảo trực tiếp trên canvas)
  if (nodeType === "n8n-nodes-base.stickyNote" || nodeType === "stickyNote") {
    return null;
  }

  const selectedMeta = resolveN8nNode(nodeType, selectedNode.data?.title);
  const brandColor = selectedNode.data?.brandColor || selectedMeta.brandColor || "#06b6d4";

  // Xác định 7 loại node cốt lõi
  const isWebhook = nodeType === "n8n-nodes-base.webhook" || nodeType === "webhookNode";
  const isCode = nodeType === "n8n-nodes-base.code" || nodeType === "codeNode" || nodeType === "extractNode";
  const isHttp = nodeType === "n8n-nodes-base.httpRequest" || nodeType === "apiNode";
  const isIf = nodeType === "n8n-nodes-base.if" || nodeType === "conditionNode";
  const isEmail = nodeType === "n8n-nodes-base.emailSend" || nodeType === "mailNode" || nodeType === "n8n-nodes-base.gmail";
  const isWait = nodeType === "n8n-nodes-base.wait" || nodeType === "waitNode";
  const isSticky = nodeType === "n8n-nodes-base.stickyNote" || nodeType === "stickyNote";
  const isSwitch = nodeType === "n8n-nodes-base.switch" || nodeType === "switchNode";

  // 1. Quản lý State Parameters (Two-way binding với JSON Cột Phải)
  const initialParams = useMemo(() => {
    const raw = selectedNode.data?.rawParameters || {};
    const cond = raw.conditions?.conditions?.[0] || {};

    // Phân tích Headers từ n8n (hỗ trợ cả headerParameters.parameters, mảng headerParameters, hoặc headerParametersJson)
    let extractedHeaders = [];
    if (Array.isArray(raw.headerParameters?.parameters)) {
      extractedHeaders = raw.headerParameters.parameters;
    } else if (Array.isArray(raw.headerParameters)) {
      extractedHeaders = raw.headerParameters;
    } else if (typeof raw.headerParametersJson === "string") {
      try {
        const clean = raw.headerParametersJson.replace(/^=\s*/, "");
        const parsed = JSON.parse(clean);
        extractedHeaders = Object.entries(parsed).map(([name, value]) => ({ name, value: String(value) }));
      } catch (e) {
        // ignore
      }
    }

    // Nhận diện API Key hoặc Bearer Token trong headers
    let authType = "none";
    let apiKeyName = "x-apikey";
    let apiKey = "";
    let bearerToken = "";

    const apiKeyHeader = extractedHeaders.find(
      (h) => h.name && ["x-apikey", "api-key", "apikey", "x-api-key"].includes(h.name.toLowerCase())
    );
    const authHeader = extractedHeaders.find(
      (h) => h.name && h.name.toLowerCase() === "authorization"
    );

    if (apiKeyHeader) {
      authType = "apiKey";
      apiKeyName = apiKeyHeader.name;
      apiKey = apiKeyHeader.value || "";
    } else if (authHeader) {
      authType = "bearer";
      bearerToken = (authHeader.value || "").replace(/^Bearer\s+/i, "");
    }

    // Các headers thông thường khác (lọc bỏ apiKey/auth để hiển thị gọn ở bảng headers)
    const displayHeaders = extractedHeaders.filter(
      (h) => !h.name || !["x-apikey", "api-key", "apikey", "x-api-key", "authorization"].includes(h.name.toLowerCase())
    );
    if (displayHeaders.length === 0) {
      displayHeaders.push({ name: "Content-Type", value: "application/json" });
      displayHeaders.push({ name: "Accept", value: "application/json" });
    }

    const nodeOnError = selectedNode.onError || selectedNode.data?.onError || "stopWorkflow";

    return {
      title: selectedNode.data?.title || selectedNode.id || "",
      onError: nodeOnError,
      continueOnFail: Boolean(selectedNode.continueOnFail ?? selectedNode.data?.continueOnFail),
      rawOptions: raw.options || { allowUnauthorizedCerts: true },
      // Webhook
      httpMethod: raw.httpMethod || raw.requestMethod || raw.method || "POST",
      path: raw.path || raw.url || "trigger-alert",
      responseMode: raw.responseMode || "onReceived",
      // HTTP Request
      method: raw.method || raw.requestMethod || "GET",
      url: raw.url || raw.path || "",
      authType,
      apiKeyName,
      apiKey,
      bearerToken,
      headers: displayHeaders,
      body:
        typeof raw.jsonBody === "string"
          ? raw.jsonBody
          : raw.jsonBody
          ? JSON.stringify(raw.jsonBody, null, 2)
          : (raw.bodyParametersJson ? raw.bodyParametersJson.replace(/^=\s*/, "") : ""),
      // Code
      jsCode:
        raw.jsCode ||
        raw.code ||
        selectedNode.data?.content ||
        "// Viết mã JavaScript xử lý dữ liệu\nreturn $input.all().map(item => ({\n  json: {\n    ...item.json,\n    processed_at: new Date().toISOString()\n  }\n}));",
      mode: raw.mode || "runOnceForAllItems",
      // IF Condition
      combinator: raw.conditions?.combinator || "and",
      leftValue: cond.leftValue || "={{ $json.data.malicious }}",
      operator: cond.operator?.operation || "gt",
      rightValue: cond.rightValue !== undefined ? cond.rightValue : 0,
      // Email
      fromEmail: raw.fromEmail || "soc-alert@company.com",
      toEmail: raw.toEmail || "admin@company.com",
      subject: raw.subject || "[SOC ALERT] Cảnh báo an ninh mạng khẩn cấp",
      emailBody: raw.html || raw.message || "<p>Phát hiện cảnh báo hành vi bất thường trên hệ thống.</p>",
      // SMTP / Credential n8n
      smtpUser: selectedNode.data?.credentials?.smtp?.user || "dat.tanvo6767@gmail.com",
      smtpPass: selectedNode.data?.credentials?.smtp?.password || "ahvzrnsivreicoti",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpCredId: selectedNode.data?.credentials?.smtp?.id || "iuBTRMOr7yPQSrZ6",
      smtpCredName: selectedNode.data?.credentials?.smtp?.name || "SMTP account",
      smtpCreatedAt: selectedNode.data?.credentials?.smtp?.createdAt || new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      smtpUpdatedAt: selectedNode.data?.credentials?.smtp?.updatedAt || new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      // Wait
      amount: raw.amount || 3,
      unit: raw.unit || "seconds",
      // Sticky Note
      stickyContent: raw.content || selectedNode.data?.content || selectedNode.data?.title || "",
      stickyColor: raw.color !== undefined ? raw.color : 1,
    };
  }, [selectedNode]);

  const [formState, setFormState] = useState(initialParams);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [jsonString, setJsonString] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [rightTab, setRightTab] = useState("json"); // "schema" | "table" | "json"
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);
  const [copied, setCopied] = useState(false);

  // Quản lý Modal Popup Cấu hình SMTP Credential (Chuẩn n8n Web)
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpModalTab, setSmtpModalTab] = useState("connection"); // "connection" | "details"
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isDeletingSmtp, setIsDeletingSmtp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [smtpSaveStatus, setSmtpSaveStatus] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [tempSmtpCred, setTempSmtpCred] = useState({
    user: "dat.tanvo6767@gmail.com",
    password: "ahvzrnsivreicoti",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  });

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Tự động kéo cấu hình SMTP mới nhất từ Backend khi chọn node Email
  useEffect(() => {
    if (isEmail) {
      getSmtpCredentials()
        .then((res) => {
          if (res?.data?.data) {
            const { user, password, host, port, secure, credentialId, credentialName, createdAt, updatedAt } = res.data.data;
            setFormState((prev) => ({
              ...prev,
              smtpUser: user || prev.smtpUser,
              smtpPass: password || prev.smtpPass,
              smtpHost: host || prev.smtpHost,
              smtpPort: port || prev.smtpPort,
              smtpSecure: secure !== undefined ? secure : prev.smtpSecure,
              smtpCredId: credentialId || prev.smtpCredId,
              smtpCredName: credentialName || prev.smtpCredName,
              smtpCreatedAt: createdAt || prev.smtpCreatedAt,
              smtpUpdatedAt: updatedAt || prev.smtpUpdatedAt,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isEmail, selectedNode?.id]);

  const handleOpenSmtpModal = () => {
    setTempSmtpCred({
      user: formState.smtpUser || "dat.tanvo6767@gmail.com",
      password: formState.smtpPass || "ahvzrnsivreicoti",
      host: formState.smtpHost || "smtp.gmail.com",
      port: formState.smtpPort || 465,
      secure: formState.smtpSecure !== undefined ? formState.smtpSecure : true,
    });
    setSmtpModalTab("connection");
    setSmtpSaveStatus(null);
    setShowDeleteConfirm(false);
    setIsSmtpModalOpen(true);
  };

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
          smtpPass: tempSmtpCred.password,
          smtpHost: tempSmtpCred.host,
          smtpPort: tempSmtpCred.port,
          smtpSecure: tempSmtpCred.secure,
          smtpCredId: res.data.credentialId || prev.smtpCredId,
          smtpUpdatedAt: new Date().toISOString(),
        }));
        setSmtpSaveStatus("success");
        showToast("success", res.data.message || "Lưu và đồng bộ App Key vào n8n thành công!");
        setTimeout(() => {
          setIsSmtpModalOpen(false);
          setSmtpSaveStatus(null);
        }, 500);
      } else {
        const msg = res?.data?.message || "Lỗi lưu cấu hình";
        setSmtpSaveStatus(msg);
        showToast("error", msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Lỗi kết nối máy chủ";
      setSmtpSaveStatus(msg);
      showToast("error", msg);
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
          smtpCredId: null,
          smtpPass: "",
        }));
        showToast("success", res.data.message || "Đã xóa và ngắt kết nối Credential thành công!");
        setShowDeleteConfirm(false);
        setIsSmtpModalOpen(false);
      } else {
        showToast("error", res?.data?.message || "Lỗi khi xóa Credential");
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message || "Lỗi kết nối máy chủ");
    } finally {
      setIsDeletingSmtp(false);
    }
  };

  // Khi người dùng chuyển sang node khác trên canvas, reset formState theo node mới
  const currentNodeIdRef = useRef(selectedNode?.id);
  useEffect(() => {
    if (selectedNode && selectedNode.id !== currentNodeIdRef.current) {
      currentNodeIdRef.current = selectedNode.id;
      setFormState(initialParams);
      setIsExecuting(false);
      setExecutionOutput(null);
      setShowApiKey(false);
    }
  }, [selectedNode, initialParams]);

  // Đồng bộ từ formState sang JSON string (Two-Way Binding)
  const isUpdatingFromJsonRef = useRef(false);
  useEffect(() => {
    if (isUpdatingFromJsonRef.current) {
      isUpdatingFromJsonRef.current = false;
      return;
    }
    const cleanParams = buildCleanN8nParameters(formState, {
      isWebhook,
      isCode,
      isHttp,
      isIf,
      isEmail,
      isWait,
      isSticky,
    });
    setJsonString(JSON.stringify(cleanParams, null, 2));
    setJsonError(null);

    // Bắn cập nhật trực tiếp lên React Flow canvas kèm onError và continueOnFail
    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, formState.title, cleanParams, {
        onError: formState.onError,
        continueOnFail: formState.continueOnFail,
        ...(isEmail ? { credentials: { smtp: { id: formState.smtpCredId || 'iuBTRMOr7yPQSrZ6', name: formState.smtpCredName || 'SMTP account' } } } : {}),
      });
    }
  }, [formState, isWebhook, isCode, isHttp, isIf, isEmail, isWait, isSticky, onUpdateNodeData, selectedNode.id]);

  // Cập nhật trường form
  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Cập nhật khi người dùng gõ vào JSON editor Cột Phải
  const handleJsonEditorChange = (newJson) => {
    setJsonString(newJson);
    try {
      const parsed = JSON.parse(newJson);
      setJsonError(null);
      isUpdatingFromJsonRef.current = true;

      // Phân tích lại headerParameters nếu có gõ vào JSON
      let detectedAuthType = formState.authType;
      let detectedApiKeyName = formState.apiKeyName;
      let detectedApiKey = formState.apiKey;
      let detectedHeaders = formState.headers;

      const parsedHeaders = parsed.headerParameters?.parameters || parsed.headerParameters;
      if (Array.isArray(parsedHeaders)) {
        const apiKeyHeader = parsedHeaders.find(
          (h) => h.name && ["x-apikey", "api-key", "apikey", "x-api-key"].includes(h.name.toLowerCase())
        );
        if (apiKeyHeader) {
          detectedAuthType = "apiKey";
          detectedApiKeyName = apiKeyHeader.name;
          detectedApiKey = apiKeyHeader.value;
          detectedHeaders = parsedHeaders.filter(
            (h) => !h.name || !["x-apikey", "api-key", "apikey", "x-api-key"].includes(h.name.toLowerCase())
          );
        } else {
          detectedHeaders = parsedHeaders;
        }
      }

      // Đồng bộ ngược lại formState
      setFormState((prev) => ({
        ...prev,
        ...parsed,
        authType: detectedAuthType,
        apiKeyName: detectedApiKeyName,
        apiKey: detectedApiKey,
        headers: detectedHeaders,
        path: parsed.path || parsed.url || prev.path,
        url: parsed.url || parsed.path || prev.url,
        method: parsed.method || parsed.httpMethod || parsed.requestMethod || prev.method,
        httpMethod: parsed.httpMethod || parsed.requestMethod || parsed.method || prev.httpMethod,
        jsCode: parsed.jsCode || parsed.code || prev.jsCode,
        amount: parsed.amount || prev.amount,
        stickyContent: parsed.content || prev.stickyContent,
        stickyColor: parsed.color !== undefined ? parsed.color : prev.stickyColor,
      }));

      if (onUpdateNodeData) {
        onUpdateNodeData(selectedNode.id, formState.title, parsed, {
          onError: formState.onError,
          continueOnFail: formState.continueOnFail,
        });
      }
    } catch (err) {
      setJsonError(err.message);
    }
  };

  // 2. Tìm các Node đứng phía trước (Cột TRÁI - INPUT)
  const incomingNodes = useMemo(() => {
    const directSources = edges
      .filter((e) => e.target === selectedNode.id)
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean);
    return directSources;
  }, [edges, nodes, selectedNode.id]);

  // Giả lập Input Payload từ Node phía trước
  const simulatedInputPayload = useMemo(() => {
    if (incomingNodes.length === 0) {
      if (isWebhook) {
        return {
          headers: {
            host: "localhost:5678",
            "user-agent": "Wazuh-SIEM/4.5.2",
            "content-type": "application/json",
          },
          body: {
            alert_id: "ALT-2026-9901",
            alert_type: "Phishing Attack Detected",
            severity: "High",
            timestamp: new Date().toISOString(),
            payload: {
              sender: "attacker@spoofed-domain.com",
              recipient: "victim@corp.internal",
              suspicious_url: "http://malicious-credential-harvest.com/login",
              source_ip: "185.220.101.5",
            },
          },
        };
      }
      return { notice: "Root trigger (Không có node phía trước)" };
    }

    const firstSource = incomingNodes[0];
    return {
      source_node: firstSource.data?.title || firstSource.id,
      source_type: firstSource.type,
      output: {
        status: "success",
        records_count: 1,
        data: {
          alert_id: "ALT-2026-9901",
          ip_reputation: "Malicious (AbuseScore: 98%)",
          verdict: "Confirmed Threat",
          domain: "malicious-credential-harvest.com",
        },
      },
    };
  }, [incomingNodes, isWebhook]);

  // 3. Thực thi thử nghiệm node (Execute step / Test trigger)
  const handleExecuteStep = () => {
    setIsExecuting(true);
    setExecutionOutput(null);
    setTimeout(() => {
      setIsExecuting(false);
      setExecutionOutput({
        success: true,
        node: selectedNode.data?.title || selectedNode.id,
        type: nodeType,
        execution_time_ms: Math.floor(Math.random() * 80 + 40),
        timestamp: new Date().toISOString(),
        output_items: [
          {
            json: {
              ...(isWebhook ? { webhook_received: true, status: "Active" } : {}),
              ...(isHttp ? { http_status: 200, statusText: "OK", response_data: { score: 100, malicious: true } } : {}),
              ...(isCode ? { script_status: "Executed Successfully", returned_items: 1 } : {}),
              ...(isIf ? { condition_passed: true, branch: "TRUE" } : {}),
              ...(isEmail ? { email_sent: true, recipient: formState.toEmail, message_id: `msg-${Date.now()}` } : {}),
              ...(isWait ? { waited_seconds: formState.amount, resume_at: new Date().toISOString() } : {}),
              ...(isSticky ? { note_saved: true } : {}),
              node_id: selectedNode.id,
            },
          },
        ],
      });
    }, 600);
  };

  const handleCopyJson = () => {
    navigator.clipboard?.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full h-full max-w-7xl max-h-[92vh] rounded-2xl border border-slate-700/80 bg-[#16181e] text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* ================================================================= */}
        {/* TOP HEADER MODAL NDV                                              */}
        {/* ================================================================= */}
        <div className="h-14 px-4.5 border-b border-slate-800 bg-[#1e2026] flex items-center justify-between shrink-0">
          {/* Bên trái: Icon & Tên Node */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                backgroundColor: `${brandColor}22`,
                borderColor: `${brandColor}55`,
              }}
              className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
            >
              <img
                src={selectedMeta.iconUrl}
                alt={selectedMeta.name}
                className="w-5.5 h-5.5 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="bg-transparent font-bold text-sm text-white hover:bg-white/5 focus:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-transparent focus:border-cyan-500 transition outline-none truncate"
                  placeholder="Nhập tên node..."
                />
              </div>
              <p className="text-[10.5px] font-mono text-cyan-400/80 px-1 truncate">
                {nodeType}
              </p>
            </div>
          </div>

          {/* Bên phải: Nút Execute Step cam + Nút Đóng */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExecuteStep}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
              title="Chạy thử nghiệm Node độc lập với dữ liệu mô phỏng"
            >
              {isExecuting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : isWebhook ? (
                <Zap size={14} className="fill-white" />
              ) : (
                <Play size={14} className="fill-white" />
              )}
              <span>{isExecuting ? "Đang chạy..." : isWebhook ? "Test trigger" : "Execute step"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Đóng cửa sổ NDV (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY: BỐ CỤC 3 CỘT (INPUT - PARAMETERS - OUTPUT)                 */}
        {/* ================================================================= */}
        <div className="flex-1 flex min-h-0 divide-x divide-slate-800/80 overflow-hidden">
          {/* ------------------------------------------------------------- */}
          {/* CỘT 1: TRÁI - INPUT (Context luồng dữ liệu từ Previous Nodes)   */}
          {/* ------------------------------------------------------------- */}
          <div className="w-1/4 min-w-60 max-w-[320px] bg-[#1a1c22] p-4 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                <Database size={13} className="text-cyan-400" />
                <span>INPUT (Context)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {incomingNodes.length} source{incomingNodes.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Danh sách các Node đứng phía trước */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
              {incomingNodes.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-400">Previous Nodes:</p>
                  {incomingNodes.map((srcNode) => {
                    const srcMeta = resolveN8nNode(srcNode.type, srcNode.data?.title);
                    return (
                      <div
                        key={srcNode.id}
                        className="p-2 rounded-xl border border-slate-800 bg-[#22242a] flex items-center gap-2 hover:border-cyan-500/40 transition"
                      >
                        <img
                          src={srcMeta.iconUrl}
                          alt={srcMeta.name}
                          className="w-5 h-5 object-contain shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">
                            {srcNode.data?.title || srcNode.id}
                          </p>
                          <p className="text-[9.5px] font-mono text-cyan-400 truncate">
                            {srcNode.type}
                          </p>
                        </div>
                        <ArrowRight size={12} className="text-slate-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-center">
                  <Zap size={18} className="mx-auto text-cyan-400 mb-1" />
                  <p className="text-xs font-bold text-slate-200">Trigger Node Đầu Vào</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    Node này là điểm bắt đầu luồng sự cố, tiếp nhận Webhook từ SIEM/EDR
                  </p>
                </div>
              )}

              {/* Payload giả lập đầu vào */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Input JSON Payload ($json):</span>
                  <span className="text-emerald-400">1 item</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-[#121316] font-mono text-[10.5px] text-cyan-300 leading-relaxed overflow-x-auto custom-scrollbar max-h-72">
                  <pre>{JSON.stringify(simulatedInputPayload, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CỘT 2: GIỮA - PARAMETERS                                       */}
          {/* ------------------------------------------------------------- */}
          <div className="flex-1 bg-[#1e2026] p-5 flex flex-col gap-4 overflow-hidden">
            {/* Nội dung Form động theo các loại node */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-xs">
              {/* 1. NODE WEBHOOK */}
              {isWebhook && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                      HTTP Method
                    </label>
                    <div className="flex gap-2">
                      {["POST", "GET", "PUT", "DELETE"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleFieldChange("httpMethod", m)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                            formState.httpMethod === m
                              ? "bg-cyan-500 text-white shadow-sm"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                      Webhook Path (Endpoint)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-2 rounded-xl bg-slate-800 font-mono text-xs text-slate-400 border border-slate-700">
                        /webhook/
                      </span>
                      <input
                        type="text"
                        value={formState.path.replace(/^\/?(webhook\/)?/, "")}
                        onChange={(e) => handleFieldChange("path", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white focus:border-cyan-500 outline-none transition"
                        placeholder="trigger-phishing..."
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 pt-1">
                      URL Test n8n: <span className="text-cyan-400">http://localhost:5678/webhook/{formState.path.replace(/^\/?(webhook\/)?/, "")}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                      Response Mode
                    </label>
                    <CustomDropdown
                      value={formState.responseMode || "onReceived"}
                      onChange={(val) => handleFieldChange("responseMode", val)}
                      options={RESPONSE_MODE_OPTIONS}
                      className="w-full font-mono"
                      buttonClassName="border-slate-700 bg-slate-900 text-white font-mono"
                      menuClassName="border-cyan-500 bg-slate-900"
                      accent="cyan"
                    />
                  </div>
                </div>
              )}

              {/* 2. NODE CODE */}
              {isCode && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold uppercase font-mono text-amber-400">
                      JavaScript Scripting (jsCode)
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      Hỗ trợ biến n8n ($input, $json, Buffer)
                    </span>
                  </div>
                  <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-[#121316]">
                    <div className="px-3 py-1.5 bg-[#181a20] border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>main.js</span>
                      <span>Run Once for All Items</span>
                    </div>
                    <textarea
                      rows={12}
                      value={formState.jsCode}
                      onChange={(e) => handleFieldChange("jsCode", e.target.value)}
                      className="w-full p-3 bg-transparent text-emerald-400 font-mono text-[11px] leading-relaxed outline-none resize-none custom-scrollbar"
                      placeholder="// Code JavaScript tại đây..."
                    />
                  </div>
                </div>
              )}

              {/* 3. NODE HTTP REQUEST */}
              {isHttp && (
                <div className="space-y-4">
                  {/* Method & URL */}
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                      Method & URL
                    </label>
                    <div className="flex gap-2">
                      <CustomDropdown
                        value={formState.method || "GET"}
                        onChange={(val) => handleFieldChange("method", val)}
                        options={HTTP_METHOD_OPTIONS}
                        className="w-32 shrink-0 font-mono"
                        buttonClassName="border-slate-700 bg-slate-900 font-mono text-cyan-400 font-bold"
                        menuClassName="border-cyan-500 bg-slate-900"
                        accent="cyan"
                      />
                      <input
                        type="text"
                        value={formState.url}
                        onChange={(e) => handleFieldChange("url", e.target.value)}
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
                      onChange={(val) => handleFieldChange("authType", val)}
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
                                  onClick={() => handleFieldChange("apiKeyName", preset)}
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
                            onChange={(e) => handleFieldChange("apiKeyName", e.target.value)}
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
                              onChange={(e) => handleFieldChange("apiKey", e.target.value)}
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
                          onChange={(e) => handleFieldChange("bearerToken", e.target.value)}
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
                      onChange={(val) => handleFieldChange("onError", val)}
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
                          handleFieldChange("headers", [
                            ...formState.headers,
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
                      {formState.headers.map((h, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={h.name}
                            onChange={(e) => {
                              const updated = [...formState.headers];
                              updated[idx].name = e.target.value;
                              handleFieldChange("headers", updated);
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
                              handleFieldChange("headers", updated);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] text-white outline-none"
                            placeholder="Header Value..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formState.headers.filter((_, i) => i !== idx);
                              handleFieldChange("headers", updated);
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
                        value={formState.body}
                        onChange={(e) => handleFieldChange("body", e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 font-mono text-[11px] text-cyan-300 outline-none custom-scrollbar"
                        placeholder='={\n  "alert_id": "{{ $json.alert_id }}"\n}'
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. NODE IF */}
              {isIf && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold uppercase font-mono text-emerald-400">
                      Điều kiện rẽ nhánh (IF Condition)
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 rounded-lg">
                      {["and", "or"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleFieldChange("combinator", c)}
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold cursor-pointer ${
                            formState.combinator === c
                              ? "bg-emerald-500 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400">
                        Biểu thức so sánh (Left Value):
                      </label>
                      <input
                        type="text"
                        value={formState.leftValue}
                        onChange={(e) => handleFieldChange("leftValue", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
                        placeholder="={{ $json.data.malicious }}"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Toán tử:</label>
                        <CustomDropdown
                          value={formState.operator || "gt"}
                          onChange={(val) => handleFieldChange("operator", val)}
                          options={OPERATOR_OPTIONS}
                          className="w-full font-mono"
                          buttonClassName="border-slate-700 bg-slate-900 text-white font-mono py-1.5"
                          menuClassName="border-cyan-500 bg-slate-900"
                          accent="cyan"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Ngưỡng (Right):</label>
                        <input
                          type="text"
                          value={formState.rightValue}
                          onChange={(e) => handleFieldChange("rightValue", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. NODE SEND EMAIL (Bám sát thiết kế chuẩn n8n) */}
              {isEmail && (
                <div className="space-y-4">
                  {/* Credential to connect with */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-800">
                    <label className="text-[11px] font-medium text-slate-300">
                      Credential to connect with
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        onClick={handleOpenSmtpModal}
                        className="flex-1 relative flex items-center justify-between px-3 py-2 rounded-lg border border-purple-500/80 bg-[#16171d] text-xs text-white cursor-pointer hover:border-purple-400 transition"
                      >
                        {formState.smtpCredId ? (
                          <div className="flex items-center gap-2">
                            <Key size={13} className="text-slate-400" />
                            <span className="font-medium text-white">{formState.smtpCredName || "SMTP account"}</span>
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
                        onClick={handleOpenSmtpModal}
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
                        value={formState.fromEmail}
                        onChange={(e) => handleFieldChange("fromEmail", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
                        To Email
                      </label>
                      <input
                        type="text"
                        value={formState.toEmail}
                        onChange={(e) => handleFieldChange("toEmail", e.target.value)}
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
                      value={formState.subject}
                      onChange={(e) => handleFieldChange("subject", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold uppercase font-mono text-blue-400">
                      HTML Content
                    </label>
                    <textarea
                      rows={6}
                      value={formState.emailBody}
                      onChange={(e) => handleFieldChange("emailBody", e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 6. NODE WAIT */}
              {isWait && (
                <div className="space-y-3 p-4 rounded-xl border border-pink-500/30 bg-pink-500/5">
                  <label className="block text-[10.5px] font-bold uppercase font-mono text-pink-400">
                    Thời gian trì hoãn (Wait Duration)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={3600}
                      value={formState.amount}
                      onChange={(e) => handleFieldChange("amount", Number(e.target.value))}
                      className="w-28 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs font-bold text-white outline-none"
                    />
                    <CustomDropdown
                      value={formState.unit || "seconds"}
                      onChange={(val) => handleFieldChange("unit", val)}
                      options={WAIT_UNIT_OPTIONS}
                      className="w-44 shrink-0 font-mono"
                      buttonClassName="border-slate-700 bg-slate-900 text-white font-mono"
                      menuClassName="border-cyan-500 bg-slate-900"
                      accent="cyan"
                    />
                  </div>
                </div>
              )}

              {/* 7. NODE STICKY NOTE */}
              {isSticky && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold uppercase font-mono text-amber-400">
                      Nội dung ghi chú Markdown
                    </label>
                    <textarea
                      rows={5}
                      value={formState.stickyContent}
                      onChange={(e) => handleFieldChange("stickyContent", e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none custom-scrollbar"
                      placeholder="## Tiêu đề kịch bản..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400">
                      Chọn màu thẻ n8n (0 - 7 Spectrum):
                    </label>
                    <div className="flex items-center gap-2">
                      {Object.entries(N8N_STICKY_COLORS).map(([colorKey, colorVal]) => (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => handleFieldChange("stickyColor", Number(colorKey))}
                          style={{ backgroundColor: colorVal.bg, borderColor: colorVal.border }}
                          className={`w-7 h-7 rounded-xl border-2 transition cursor-pointer ${
                            Number(formState.stickyColor) === Number(colorKey)
                              ? "scale-125 ring-2 ring-cyan-500 shadow-md"
                              : "hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chân Cột 2: Nút Xóa Node & Trạng thái Node */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleDeleteSelectedNode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa Node</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-mono">Status:</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${
                  isExecuting
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isExecuting ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                  }`} />
                  {isExecuting ? "Executing..." : "Ready"}
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CỘT 3: PHẢI - OUTPUT & LIVE JSON (Two-Way Binding & Preview)     */}
          {/* ------------------------------------------------------------- */}
          <div className="w-1/3 min-w-75 max-w-105 bg-[#1a1c22] p-4 flex flex-col gap-3 overflow-hidden">
            {/* Tab chuyển đổi: Schema | Table | JSON */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRightTab("json")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition cursor-pointer ${
                    rightTab === "json"
                      ? "bg-cyan-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCode size={12} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("table")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition cursor-pointer ${
                    rightTab === "table"
                      ? "bg-cyan-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Table size={12} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("schema")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition cursor-pointer ${
                    rightTab === "schema"
                      ? "bg-cyan-500 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers size={12} />
                  <span>Schema</span>
                </button>
              </div>

              {/* Nút Copy JSON */}
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono transition cursor-pointer"
                title="Sao chép JSON cấu hình"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Nội dung Cột Phải theo Tab */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* TAB 1: LIVE JSON (Có thể sửa 2 chiều) */}
              {rightTab === "json" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between pb-1 text-[10px] font-mono text-slate-400">
                    <span>Live Parameters (Two-way editable):</span>
                    {jsonError ? (
                      <span className="text-rose-400 font-bold truncate max-w-45">{jsonError}</span>
                    ) : (
                      <span className="text-emerald-400">Valid JSON</span>
                    )}
                  </div>
                  <textarea
                    rows={16}
                    value={jsonString}
                    onChange={(e) => handleJsonEditorChange(e.target.value)}
                    className={`flex-1 w-full p-2.5 rounded-xl border bg-[#121316] font-mono text-[10.5px] leading-relaxed outline-none custom-scrollbar resize-none ${
                      jsonError
                        ? "border-rose-500 text-rose-300"
                        : "border-slate-800 text-cyan-300 focus:border-cyan-500"
                    }`}
                    placeholder="{\n  // Parameters JSON...\n}"
                  />
                </div>
              )}

              {/* TAB 2: TABLE VIEW */}
              {rightTab === "table" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 rounded-xl border border-slate-800 bg-[#121316]">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="text-left border-b border-slate-800 text-slate-400">
                        <th className="pb-1.5 font-bold">Key</th>
                        <th className="pb-1.5 font-bold">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {Object.entries(formState).map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-800/30">
                          <td className="py-1.5 text-cyan-400 font-semibold">{k}</td>
                          <td className="py-1.5 text-slate-300 max-w-45 truncate">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: SCHEMA VIEW */}
              {rightTab === "schema" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-xl border border-slate-800 bg-[#121316] space-y-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-[#181a20] border border-slate-800">
                    <p className="text-cyan-400 font-bold">$json Schema Output</p>
                    <p className="text-slate-400 text-[10px]">Định dạng đối tượng trả về sau khi thực thi</p>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-amber-400">node_id:</span>
                      <span className="text-slate-400">String (UUID)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-amber-400">status:</span>
                      <span className="text-slate-400">String ("success")</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-amber-400">parameters:</span>
                      <span className="text-slate-400">Object (n8n Params)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-amber-400">execution_timestamp:</span>
                      <span className="text-slate-400">ISO DateTime</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Hộp kết quả thực thi khi ấn Execute Step */}
              {executionOutput && (
                <div className="mt-2.5 p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 shrink-0 animate-slide-up">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20 text-[10.5px] font-mono font-bold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Executed (200 OK)</span>
                    </span>
                    <span>{executionOutput.execution_time_ms}ms</span>
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-200 mt-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(executionOutput.output_items[0].json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          POPUP MODAL CẤU HÌNH CREDENTIAL SMTP (CHUẨN 100% GIAO DIỆN N8N WEB)
          ========================================================================= */}
      {isSmtpModalOpen && (
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
                  onClick={() => setIsSmtpModalOpen(false)}
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
                        placeholder="dat.tanvo6767@gmail.com"
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
                          placeholder="App Password (16 ký tự)"
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

                {/* Tab Details (Bám sát 100% n8n Web) */}
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
                      <span className="font-mono text-white select-all">{formState.smtpCredId || "HfokvV6hBUxhxsLc"}</span>
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
      )}

      {/* Toast thông báo kết quả lưu / xóa */}
      {toastMessage && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-90 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3 duration-200 border ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-300"
              : "bg-rose-950/95 border-rose-500/50 text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}
          </div>
  );
}

/**
 * Hàm xây dựng object parameters chuẩn n8n để xuất ra JSON sạch
 */
function buildCleanN8nParameters(formState, types) {
  const { isWebhook, isCode, isHttp, isIf, isEmail, isWait, isSticky } = types;
  const p = {};

  if (isWebhook) {
    p.httpMethod = formState.httpMethod;
    p.path = formState.path.replace(/^\/?(webhook\/)?/, "");
    p.responseMode = formState.responseMode;
  } else if (isCode) {
    p.jsCode = formState.jsCode;
    p.mode = formState.mode;
  } else if (isHttp) {
    p.method = formState.method || "GET";
    p.url = formState.url || "";

    // Tổng hợp headers bao gồm cả Authentication (API Key hoặc Bearer Token)
    const combinedHeaders = [...(formState.headers || [])];
    if (formState.authType === "apiKey" && formState.apiKey) {
      combinedHeaders.unshift({
        name: formState.apiKeyName || "x-apikey",
        value: formState.apiKey,
      });
    } else if (formState.authType === "bearer" && formState.bearerToken) {
      combinedHeaders.unshift({
        name: "Authorization",
        value: `Bearer ${formState.bearerToken}`,
      });
    }

    const validHeaders = combinedHeaders.filter(
      (h) => h.name && h.name.trim() !== ""
    );

    if (validHeaders.length > 0) {
      p.sendHeaders = true;
      p.headerParameters = {
        parameters: validHeaders,
      };
    }

    if (formState.body && formState.method !== "GET") {
      p.sendBody = true;
      p.specifyBody = "json";
      p.jsonBody = formState.body;
    }

    p.options = {
      allowUnauthorizedCerts: true,
      ...(formState.rawOptions || {}),
    };
  } else if (isIf) {
    p.conditions = {
      combinator: formState.combinator,
      conditions: [
        {
          leftValue: formState.leftValue,
          operator: { type: "number", operation: formState.operator },
          rightValue: formState.rightValue,
        },
      ],
    };
  } else if (isEmail) {
    p.fromEmail = formState.fromEmail;
    p.toEmail = formState.toEmail;
    p.subject = formState.subject;
    p.html = formState.emailBody;
    p.options = {};
  } else if (isWait) {
    p.amount = Number(formState.amount) || 3;
    p.unit = formState.unit || "seconds";
  } else if (isSticky) {
    p.content = formState.stickyContent;
    p.color = Number(formState.stickyColor);
  }

  return p;
}
