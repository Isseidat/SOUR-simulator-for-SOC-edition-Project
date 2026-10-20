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
} from "lucide-react";
import { resolveN8nNode } from "../../utils/n8nNodeRegistry";
import { N8N_STICKY_COLORS } from "../../utils/playbookConverters";

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

  // 1. Quản lý State Parameters (Two-way binding với JSON Cột Phải)
  const initialParams = useMemo(() => {
    const raw = selectedNode.data?.rawParameters || {};
    const cond = raw.conditions?.conditions?.[0] || {};
    return {
      title: selectedNode.data?.title || selectedNode.id || "",
      // Webhook
      httpMethod: raw.httpMethod || raw.requestMethod || raw.method || "POST",
      path: raw.path || raw.url || "trigger-alert",
      responseMode: raw.responseMode || "onReceived",
      // HTTP Request
      method: raw.method || raw.requestMethod || "GET",
      url: raw.url || raw.path || "",
      headers: Array.isArray(raw.headerParameters)
        ? raw.headerParameters
        : [
            { name: "Content-Type", value: "application/json" },
            { name: "Accept", value: "application/json" },
          ],
      body:
        typeof raw.jsonBody === "string"
          ? raw.jsonBody
          : raw.jsonBody
          ? JSON.stringify(raw.jsonBody, null, 2)
          : "",
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
      // Wait
      amount: raw.amount || 3,
      unit: raw.unit || "seconds",
      // Sticky Note
      stickyContent: raw.content || selectedNode.data?.content || selectedNode.data?.title || "",
      stickyColor: raw.color !== undefined ? raw.color : 1,
    };
  }, [selectedNode]);

  const [formState, setFormState] = useState(initialParams);
  const [jsonString, setJsonString] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [rightTab, setRightTab] = useState("json"); // "schema" | "table" | "json"
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);
  const [copied, setCopied] = useState(false);

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

    // Bắn cập nhật trực tiếp lên React Flow canvas
    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, formState.title, cleanParams);
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

      // Đồng bộ ngược lại formState
      setFormState((prev) => ({
        ...prev,
        ...parsed,
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
        onUpdateNodeData(selectedNode.id, formState.title, parsed);
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 font-semibold">
                  Ready
                </span>
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
          {/* CỘT 2: GIỮA - PARAMETERS (Visual Form cấu hình theo 7 loại)     */}
          {/* ------------------------------------------------------------- */}
          <div className="flex-1 bg-[#1e2026] p-5 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                <Sliders size={13} className="text-amber-400" />
                <span>PARAMETERS (Visual Form)</span>
              </div>
              <span className="text-[10.5px] text-slate-400 font-mono">
                Tự động ánh xạ chuẩn n8n
              </span>
            </div>

            {/* Nội dung Form động theo 7 loại node */}
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
                    <select
                      value={formState.responseMode}
                      onChange={(e) => handleFieldChange("responseMode", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="onReceived">On Received (Phản hồi ngay lập tức)</option>
                      <option value="lastNode">When Last Node Finishes (Đợi toàn bộ kịch bản hoàn tất)</option>
                    </select>
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
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                      Method & URL
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formState.method}
                        onChange={(e) => handleFieldChange("method", e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs font-bold text-cyan-400 outline-none"
                      >
                        {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formState.url}
                        onChange={(e) => handleFieldChange("url", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white focus:border-cyan-500 outline-none"
                        placeholder="https://www.virustotal.com/api/v3/..."
                      />
                    </div>
                  </div>

                  {/* Bảng Header Key-Value */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold uppercase font-mono text-cyan-400">
                        Headers Parameters
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
                        <select
                          value={formState.operator}
                          onChange={(e) => handleFieldChange("operator", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
                        >
                          <option value="gt">Lớn hơn (&gt;)</option>
                          <option value="gte">Lớn hơn hoặc bằng (&gt;=)</option>
                          <option value="equal">Bằng (==)</option>
                          <option value="notEqual">Khác (!=)</option>
                          <option value="lt">Nhỏ hơn (&lt;)</option>
                          <option value="contains">Chứa chuỗi (contains)</option>
                        </select>
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

                  <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-400 pt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Đúng (True) ➔ Đi ra cổng 0</span>
                    <span className="w-2 h-2 rounded-full bg-rose-400 ml-2"></span>
                    <span>Sai (False) ➔ Đi ra cổng 1</span>
                  </div>
                </div>
              )}

              {/* 5. NODE SEND EMAIL */}
              {isEmail && (
                <div className="space-y-3">
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
                      rows={5}
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
                    <select
                      value={formState.unit}
                      onChange={(e) => handleFieldChange("unit", e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-white outline-none"
                    >
                      <option value="seconds">Giây (Seconds)</option>
                      <option value="minutes">Phút (Minutes)</option>
                      <option value="hours">Giờ (Hours)</option>
                    </select>
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

            {/* Chân Cột 2: Nút Xóa Node */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleDeleteSelectedNode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa Node</span>
              </button>
              <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-mono">
                <Check size={13} />
                <span>Auto-saved to Canvas</span>
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
    p.method = formState.method;
    p.url = formState.url;
    p.headerParameters = formState.headers;
    if (formState.body && formState.method !== "GET") {
      p.sendBody = true;
      p.specifyBody = "json";
      p.jsonBody = formState.body;
    }
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
  } else if (isWait) {
    p.amount = Number(formState.amount) || 3;
    p.unit = formState.unit || "seconds";
  } else if (isSticky) {
    p.content = formState.stickyContent;
    p.color = Number(formState.stickyColor);
  }

  return p;
}
