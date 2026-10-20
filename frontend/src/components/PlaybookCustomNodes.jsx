import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";
import { Palette, CheckCircle2, Zap, Trash2 } from "lucide-react";
import { resolveN8nNode } from "../utils/n8nNodeRegistry";

/**
 * Khung Node n8n Chuẩn Gốc (N8n Native Square Node)
 * - Khối vuông bo góc chuẩn n8n (68x68px), nền than chì tối #22242a
 * - Icon SVG vector gốc của n8n ở chính giữa (32x32px)
 * - Tiêu đề & Subtitle URL/Method nằm ở DƯỚI ĐÁY khối vuông (Chuẩn 100% n8n)
 * - Cổng nối: Webhook có tia sét ⚡, IF có nhãn -true / -false, HTTP Request có -Success / -Error
 */
const BaseNode = ({
  data,
  nodeType,
  brandColor,
  isStart = false,
  isEnd = false,
  children,
}) => {
  const meta = resolveN8nNode(nodeType || data.type || data.nodeType, data.title || data.name);
  const color = brandColor || data.brandColor || meta.brandColor || "#06b6d4";

  // Chuỗi phụ đề bên dưới (URL hoặc Action hoặc Service)
  let subtitleText = "";
  if (data.rawParameters?.url) {
    const method = data.rawParameters.requestMethod || data.rawParameters.method || "GET";
    subtitleText = `${method}: ${data.rawParameters.url}`;
  } else if (data.rawParameters?.path) {
    const method = data.rawParameters.httpMethod || data.rawParameters.requestMethod || data.rawParameters.method || "POST";
    const path = data.rawParameters.path.startsWith("/") ? data.rawParameters.path : `/${data.rawParameters.path}`;
    subtitleText = `${method}: ${path}`;
  } else if (data.rawParameters?.operation) {
    subtitleText = data.rawParameters.operation;
  } else if (data.action && data.action !== "Tác vụ tự động hóa n8n") {
    subtitleText = data.action;
  } else if (data.service && data.service !== "n8n Node") {
    subtitleText = data.service;
  }

  return (
    <div className="flex flex-col items-center select-none group cursor-pointer">
      {/* 1. KHỐI VUÔNG CARD NODE CHUẨN N8N (68x68px) */}
      <div
        style={{
          borderColor: `${color}66`,
          boxShadow: `0 4px 16px -2px ${color}22`,
        }}
        className="relative w-17 h-17 rounded-2xl border-2 bg-white dark:bg-[#22242a] flex items-center justify-center transition-all duration-200 hover:scale-105 hover:border-slate-400 dark:hover:border-slate-300 shadow-md group-hover:shadow-xl"
      >
        {/* Tia sét cam bên trái nếu là Webhook / Trigger */}
        {isStart && (
          <div className="absolute -left-5.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-amber-500">
            <Zap size={14} className="fill-amber-500 text-amber-500" />
          </div>
        )}

        {/* Cổng Target Handle (bên trái) nếu không phải Trigger */}
        {!isStart && (
          <Handle
            type="target"
            position={Position.Left}
            className="h-3! w-3! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-slate-400! hover:bg-cyan-400! -left-1.5! transition"
          />
        )}

        {/* Icon SVG gốc n8n ở chính giữa (Hiển thị trực tiếp, không đệm viền thừa) */}
        <div className="flex items-center justify-center pointer-events-none">
          <img
            src={meta.iconUrl}
            alt={meta.name}
            className="w-8.5 h-8.5 object-contain"
            onError={(e) => {
              e.currentTarget.style.opacity = "0.5";
            }}
          />
        </div>

        {/* Các cổng phân nhánh đặc biệt (IF, HTTP Request...) */}
        {children}

        {/* Cổng Source Handle (bên phải) nếu không có cổng con tùy biến */}
        {!isEnd && !children && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {isStart && (
              <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono pr-1 select-none pointer-events-none">
                POST
              </span>
            )}
            <Handle
              type="source"
              position={Position.Right}
              id="main"
              className="h-3! w-3! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-slate-400! hover:bg-cyan-400! pointer-events-auto! transition -right-1.5!"
            />
          </div>
        )}
      </div>

      {/* 2. CHỮ TIÊu ĐỀ & PHỤ ĐỀ DƯỚI ĐÁY KHỐI VUÔNG (CHUẨN 100% N8N) */}
      <div className="mt-2 text-center w-36 flex flex-col items-center pointer-events-none select-none">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 px-1">
          {data.title || meta.name}
        </h4>
        {subtitleText && (
          <p
            className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-full mt-0.5 leading-none"
            title={subtitleText}
          >
            {subtitleText}
          </p>
        )}
      </div>
    </div>
  );
};


// 1. Webhook Khởi Động: #F24B7B (Hồng n8n)
export const WebhookNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.webhook"
    isStart={true}
  />
));

// 2. Trích Xuất / Code { }: #FFB966 (Cam n8n)
export const ExtractNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.code"
  />
));

// 3. Gọi API (HTTP Request): #898FFF (Tím n8n) - Hỗ trợ 2 nhánh: Success & Error
export const ApiNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.httpRequest"
  >
    {/* Cổng Success */}
    <div className="absolute -right-1 top-[28%] -translate-y-1/2 flex items-center pointer-events-none">
      <span className="text-[8.5px] text-slate-400 font-mono pr-1 select-none pointer-events-none">
        Success
      </span>
      <Handle
        id="main"
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-[#898FFF]! pointer-events-auto! -right-1.5!"
      />
    </div>

    {/* Cổng Error */}
    <div className="absolute -right-1 top-[72%] -translate-y-1/2 flex items-center pointer-events-none">
      <span className="text-[8.5px] text-slate-400 font-mono pr-1 select-none pointer-events-none">
        Error
      </span>
      <Handle
        id="error"
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-[#F24B7B]! pointer-events-auto! -right-1.5!"
      />
    </div>
  </BaseNode>
));

// 4. Nhánh IF (Condition Logic): #00C950 (Xanh lá n8n) - Hỗ trợ 2 nhánh: true ✓ & false ✕
export const ConditionNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.if"
  >
    {/* Nhánh TRUE (ở trên) */}
    <div className="absolute -right-1 top-[28%] -translate-y-1/2 flex items-center pointer-events-none">
      <span className="text-[8.5px] text-emerald-400 font-mono pr-1 select-none pointer-events-none">
        true
      </span>
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-[#00C950]! pointer-events-auto! -right-1.5!"
      />
    </div>

    {/* Nhánh FALSE (ở dưới) */}
    <div className="absolute -right-1 top-[72%] -translate-y-1/2 flex items-center pointer-events-none">
      <span className="text-[8.5px] text-rose-400 font-mono pr-1 select-none pointer-events-none">
        false
      </span>
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! rounded-full! border-2! border-white! dark:border-[#1e2026]! bg-[#F24B7B]! pointer-events-auto! -right-1.5!"
      />
    </div>
  </BaseNode>
));

// 5. Gửi Mail: #4B89DC (Xanh dương n8n)
export const MailNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.emailSend"
  />
));

// 6. Wait Timer: #F188A2 (Hồng đào n8n)
export const WaitNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType="n8n-nodes-base.wait"
  />
));


// 8. Node Vạn Năng (Universal Node cho bất kỳ node n8n nào phát sinh trong tương lai)
export const UniversalN8nNode = memo(({ data }) => (
  <BaseNode
    data={data}
    nodeType={data.type || data.nodeType}
  />
));

// 9. Sticky Note (Ghi chú kịch bản n8n) - 8 màu Spectrum chuẩn n8n
const N8N_STICKY_PALETTE = [
  { name: "Vàng", bg: "#fef9c3", border: "#fde047" },
  { name: "Xanh dương", bg: "#e0f2fe", border: "#7dd3fc" },
  { name: "Xanh lá", bg: "#dcfce7", border: "#86efac" },
  { name: "Hồng", bg: "#fee2e2", border: "#fca5a5" },
  { name: "Tím", bg: "#f3e8ff", border: "#d8b4fe" },
  { name: "Cam", bg: "#ffedd5", border: "#fdba74" },
  { name: "Ngọc", bg: "#ccfbf1", border: "#5eead4" },
  { name: "Xám", bg: "#f1f5f9", border: "#94a3b8" },
];

const getContrastColor = (hex) => {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return "#0f172a";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#0f172a" : "#f8fafc";
};

// Chuyển đổi HSB/HSV sang Hex
function hsvToHex(h, s, v) {
  s = s / 100;
  v = v / 100;
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

// Chuyển đổi Hex sang HSB/HSV
function hexToHsv(hex) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return { h: 54, s: 23, v: 100 };
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { h: 54, s: 23, v: 100 };

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export const StickyNoteNode = memo(({ id, data, selected }) => {
  const { deleteElements, setNodes } = useReactFlow();
  const [bgHex, setBgHex] = useState(data.colorHex || "#fef9c3");
  const [borderHex, setBorderHex] = useState(data.borderHex || "#fde047");
  const [content, setContent] = useState(
    data.content || "## KỊCH BẢN\nNhấp đúp vào đây để soạn thảo ghi chú..."
  );
  const [isEditing, setIsEditing] = useState(false);

  // Đồng bộ tức thời sang React Flow Canvas & parameters để Ctrl+S lưu chuẩn xác
  const syncNodeData = useCallback(
    (updates) => {
      Object.assign(data, updates);
      if (setNodes) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    ...updates,
                    rawParameters: {
                      ...(n.data?.rawParameters || {}),
                      ...(updates.rawParameters || {}),
                    },
                  },
                }
              : n
          )
        );
      }
    },
    [id, data, setNodes]
  );

  // Trạng thái bảng kéo chọn màu tùy biến (Spectrum Picker trực tiếp trên Canvas)
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [hue, setHue] = useState(54);
  const [sat, setSat] = useState(23);
  const [bri, setBri] = useState(100);
  const [hexInput, setHexInput] = useState(data.colorHex || "#fef9c3");
  const spectrumRef = useRef(null);

  useEffect(() => {
    if (data.content !== undefined) setContent(data.content);
    if (data.colorHex) {
      setBgHex(data.colorHex);
      setHexInput(data.colorHex);
      const hsv = hexToHsv(data.colorHex);
      setHue(hsv.h);
      setSat(hsv.s);
      setBri(hsv.v);
    }
    if (data.borderHex) setBorderHex(data.borderHex);
  }, [data.content, data.colorHex, data.borderHex]);

  // Xử lý kéo chọn trên vùng 2D Gradient (Saturation & Brightness)
  const handleSpectrumChange = (e) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const newS = Math.round((x / rect.width) * 100);
    const newV = Math.round(100 - (y / rect.height) * 100);
    setSat(newS);
    setBri(newV);
    const newHex = hsvToHex(hue, newS, newV);
    setBgHex(newHex);
    setBorderHex(newHex);
    setHexInput(newHex);
    syncNodeData({
      colorHex: newHex,
      borderHex: newHex,
      rawParameters: { ...(data.rawParameters || {}), color: 1 },
    });
  };

  const onSpectrumMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSpectrumChange(e);

    const onMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      handleSpectrumChange(moveEvent);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleHueChange = (e) => {
    const newHue = Number(e.target.value);
    setHue(newHue);
    const newHex = hsvToHex(newHue, sat, bri);
    setBgHex(newHex);
    setBorderHex(newHex);
    setHexInput(newHex);
    syncNodeData({
      colorHex: newHex,
      borderHex: newHex,
      rawParameters: { ...(data.rawParameters || {}), color: 1 },
    });
  };

  const textColor = getContrastColor(bgHex);

  return (
    <div
      style={{
        backgroundColor: bgHex,
        borderColor: borderHex,
        color: textColor,
      }}
      className={`relative min-w-56 min-h-28 rounded-2xl border-2 p-3 shadow-md transition-shadow ${
        selected ? "ring-2 ring-cyan-500 shadow-xl" : ""
      }`}
    >
      {/* Khung Resize 4 phía + 4 góc */}
      <NodeResizer
        minWidth={140}
        minHeight={80}
        isVisible={selected}
        lineClassName="border-cyan-500"
        handleClassName="w-2.5 h-2.5 bg-cyan-500 border border-white rounded-sm"
      />

      {/* BẢNG PHỐI MÀU NHỎ NỔI TRÊN ĐẦU STICKY NOTE (KHI ĐƯỢC CHỌN - YÊU CẦU NGƯỜI DÙNG) */}
      {selected && (
        <div className="nodrag nopan absolute -top-11 left-0 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md animate-slide-up">
          {/* Dãy 8 nút màu n8n chuẩn (hàng ngang gọn gàng) */}
          {N8N_STICKY_PALETTE.map((c, idx) => (
            <button
              key={c.name}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBgHex(c.bg);
                setBorderHex(c.border);
                setHexInput(c.bg);
                const hsv = hexToHsv(c.bg);
                setHue(hsv.h);
                setSat(hsv.s);
                setBri(hsv.v);
                setShowCustomPicker(false);
                syncNodeData({
                  colorHex: c.bg,
                  borderHex: c.border,
                  rawParameters: { ...(data.rawParameters || {}), color: idx },
                });
              }}
              style={{ backgroundColor: c.bg, borderColor: c.border }}
              className={`w-4.5 h-4.5 rounded-full border-2 transition-transform cursor-pointer hover:scale-125 ${
                bgHex === c.bg ? "scale-125 ring-2 ring-cyan-500 shadow-xs" : ""
              }`}
              title={`Đổi màu ${c.name}`}
            />
          ))}

          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Nút màu tùy biến Spectrum (🎨): Mở vùng kéo chọn nằm ngay trên đầu các nút chọn màu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCustomPicker((prev) => !prev);
            }}
            className={`p-1 rounded-lg transition cursor-pointer ${
              showCustomPicker
                ? "bg-cyan-500 text-white shadow-xs"
                : "text-slate-500 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title="Mở vùng kéo chọn màu tùy biến (nằm ngay trên đầu nút chọn màu)"
          >
            <Palette size={13} />
          </button>

          {/* Nút Xóa Sticky Note */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (deleteElements) {
                deleteElements({ nodes: [{ id }] });
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            title="Xóa Sticky Note này"
          >
            <Trash2 size={13} />
          </button>

          {/* === VÙNG KÉO CHỌN MÀU SPECTRUM TRỰC TIẾP TRÊN CANVAS (NẰM TRÊN ĐẦU NÚT CHỌN MÀU) === */}
          {showCustomPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="nodrag nopan absolute bottom-full mb-2 left-0 z-50 p-3 rounded-2xl bg-white/98 dark:bg-slate-900/98 border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-56 animate-slide-up"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Palette size={12} className="text-cyan-500" />
                  Kéo chọn màu tùy biến
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* 1. VÙNG KÉO CHỌN GRADIENT SPECTRUM 2D (Saturation & Brightness) */}
              <div
                ref={spectrumRef}
                onMouseDown={onSpectrumMouseDown}
                style={{
                  backgroundColor: `hsl(${hue}, 100%, 50%)`,
                  backgroundImage:
                    "linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)",
                }}
                className="relative w-full h-24 rounded-xl cursor-crosshair select-none shadow-inner border border-black/10 dark:border-white/10"
                title="Nhấp hoặc kéo chuột trong vùng này để chọn độ bão hòa & độ sáng"
              >
                {/* Con trỏ tròn kéo chọn */}
                <div
                  style={{
                    left: `${sat}%`,
                    top: `${100 - bri}%`,
                    backgroundColor: bgHex,
                  }}
                  className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>

              {/* 2. THANH KÉO DẢI MÀU QUANG PHỔ (Hue Slider) */}
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={handleHueChange}
                className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
                style={{
                  background:
                    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                }}
                title="Kéo thanh trượt để đổi dải màu quang phổ"
              />

              {/* 3. Ô NHẬP MÃ HEX & XEM TRƯỚC */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    style={{ backgroundColor: bgHex }}
                    className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHexInput(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        setBgHex(val);
                        setBorderHex(val);
                        const hsv = hexToHsv(val);
                        setHue(hsv.h);
                        setSat(hsv.s);
                        setBri(hsv.v);
                        syncNodeData({
                          colorHex: val,
                          borderHex: val,
                          rawParameters: { ...(data.rawParameters || {}), color: 1 },
                        });
                      }
                    }}
                    className="w-20 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10.5px] font-mono font-bold text-center text-slate-800 dark:text-slate-100"
                    placeholder="#RRGGBB"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="px-2.5 py-0.5 rounded-md bg-cyan-500 hover:bg-cyan-600 text-white text-[10.5px] font-bold transition shadow-xs cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header Sticky Note */}
      <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10 mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-75">
          Sticky Note {isEditing && "• [Đang sửa...]"}
        </span>
        <button
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              syncNodeData({
                content: content,
                rawParameters: { ...(data.rawParameters || {}), content: content },
              });
            } else {
              setIsEditing(true);
            }
          }}
          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
          title={isEditing ? "Xong (hoặc click ra ngoài)" : "Sửa nội dung"}
        >
          {isEditing ? "Xong" : "Tùy chỉnh"}
        </button>
      </div>


      {/* Vùng hiển thị / soạn thảo nội dung */}
      {isEditing ? (
        <textarea
          autoFocus
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            data.content = e.target.value;
            if (!data.rawParameters) data.rawParameters = {};
            data.rawParameters.content = e.target.value;
          }}
          onBlur={() => {
            setIsEditing(false);
            syncNodeData({
              content: content,
              rawParameters: { ...(data.rawParameters || {}), content: content },
            });
          }}
          className="nodrag nopan w-full h-[calc(100%-28px)] bg-transparent resize-none outline-none font-bold text-xs leading-relaxed select-text"
          placeholder="Gõ ghi chú..."
        />
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className="w-full h-[calc(100%-28px)] font-bold text-xs leading-relaxed whitespace-pre-wrap overflow-hidden cursor-text select-text"
          title="Nhấp đúp chuột để chỉnh sửa văn bản trực tiếp"
        >
          {content}
        </div>
      )}
    </div>
  );
});

// Đăng ký toàn bộ nodeTypes xuất ra React Flow (Tự động resolve theo Registry)
export const nodeTypes = {
  // Webhook / Trigger
  "n8n-nodes-base.webhook": WebhookNode,
  webhookNode: WebhookNode,

  // Trích xuất / Code
  "n8n-nodes-base.code": ExtractNode,
  codeNode: ExtractNode,

  // API HTTP Request
  "n8n-nodes-base.httpRequest": ApiNode,
  apiNode: ApiNode,

  // Điều kiện IF
  "n8n-nodes-base.if": ConditionNode,
  conditionNode: ConditionNode,

  // Gửi Email / Gmail
  "n8n-nodes-base.emailSend": MailNode,
  "n8n-nodes-base.gmail": MailNode,
  mailNode: MailNode,

  // Wait
  "n8n-nodes-base.wait": WaitNode,
  waitNode: WaitNode,

  // Sticky Note
  "n8n-nodes-base.stickyNote": StickyNoteNode,
  stickyNote: StickyNoteNode,

  // Universal Node (Mọi node n8n khác chưa liệt kê)
  default: UniversalN8nNode,
};
