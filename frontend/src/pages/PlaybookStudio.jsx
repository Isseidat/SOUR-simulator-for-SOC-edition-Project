import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MousePointer } from "lucide-react";

import { nodeTypes } from "../components/PlaybookCustomNodes";
import { getPlaybooks, updatePlaybookLayout, getN8nLiveWorkflow } from "../api/playbookApi";
import { useTheme } from "../context/ThemeContext";

// Modules & Components gọn gàng cho Playbook Studio
import {
  N8N_STICKY_COLORS,
  convertN8nWorkflowToReactFlow,
  convertReactFlowToN8nWorkflow,
} from "../utils/playbookConverters";
import {
  PlaybookStudioHeader,
  PlaybookFloatingToolbar,
  PlaybookToast,
} from "../components/playbook/PlaybookControls";
import NodeDetailModal from "../components/playbook/NodeDetailModal";

export default function PlaybookStudio() {
  const { isDark } = useTheme();

  // 1. Quản lý trạng thái Canvas tích hợp (Master Canvas duy nhất)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  // 2. Đồng bộ nodes/edges vào ref
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // 3. Quản Lý Undo / Redo Stack (Ctrl + Z / Ctrl + Y)
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // Lưu snapshot trạng thái trước khi thực hiện thao tác
  const takeSnapshot = useCallback(() => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    redoRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const lastSnapshot = historyRef.current.pop();
    if (lastSnapshot) {
      redoRef.current.push({
        nodes: JSON.parse(JSON.stringify(nodesRef.current)),
        edges: JSON.parse(JSON.stringify(edgesRef.current)),
      });
      setNodes(lastSnapshot.nodes);
      setEdges(lastSnapshot.edges);
      setSelectedNode(null);
      showToast("Đã hoàn tác thao tác trước đó (Undo)!", "success");
    }
  }, [setNodes, setEdges, showToast]);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const nextSnapshot = redoRef.current.pop();
    if (nextSnapshot) {
      historyRef.current.push({
        nodes: JSON.parse(JSON.stringify(nodesRef.current)),
        edges: JSON.parse(JSON.stringify(edgesRef.current)),
      });
      setNodes(nextSnapshot.nodes);
      setEdges(nextSnapshot.edges);
      setSelectedNode(null);
      showToast("Đã làm lại thao tác (Redo)!", "success");
    }
  }, [setNodes, setEdges, showToast]);

  // Lắng nghe tổ hợp phím Ctrl + Z (Undo) & Ctrl + Y / Ctrl + Shift + Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null); // Node đang mở modal NDV
  const clipboardRef = useRef({ nodes: [], edges: [] });
  const pasteCountRef = useRef(0);
  const paletteRef = useRef(null);
  const searchRef = useRef(null);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);

  // Cập nhật dữ liệu từ Modal NDV lên React Flow Canvas (Two-way live update)
  const handleUpdateNodeData = useCallback((nodeId, newTitle, newParams) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const isSticky = n.type === "n8n-nodes-base.stickyNote" || n.type === "stickyNote";
        const stickyColorObj =
          isSticky && newParams.color !== undefined
            ? N8N_STICKY_COLORS[newParams.color] || N8N_STICKY_COLORS[1]
            : null;
        return {
          ...n,
          data: {
            ...n.data,
            title: newTitle !== undefined ? newTitle : n.data.title,
            content: isSticky ? newParams.content : n.data.content,
            colorHex: stickyColorObj ? stickyColorObj.bg : n.data.colorHex,
            borderHex: stickyColorObj ? stickyColorObj.border : n.data.borderHex,
            rawParameters: newParams,
          },
        };
      })
    );
  }, [setNodes]);

  // 4. MiniMap tự động hiện khi Zoom
  const [showMiniMap, setShowMiniMap] = useState(false);
  const zoomTimerRef = useRef(null);
  const lastZoomRef = useRef(null);

  const onViewportMove = useCallback((event, viewport) => {
    if (
      lastZoomRef.current !== null &&
      Math.abs(viewport.zoom - lastZoomRef.current) > 0.005
    ) {
      setShowMiniMap(true);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => {
        setShowMiniMap(false);
      }, 1800);
    }
    lastZoomRef.current = viewport.zoom;
  }, []);

  useEffect(() => {
    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        setIsPaletteOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search: tìm node theo tên và zoom vào
  const handleSearchNode = useCallback((query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const found = nodesRef.current.filter(
      (n) =>
        (n.data?.title || "").toLowerCase().includes(q) ||
        (n.type || "").toLowerCase().includes(q) ||
        (n.data?.service || "").toLowerCase().includes(q)
    );
    setSearchResults(found);
  }, []);

  const handleJumpToNode = useCallback(
    (node) => {
      if (!reactFlowInstance || !node) return;
      const x = node.position.x + (node.style?.width ? node.style.width / 2 : 34);
      const y = node.position.y + (node.style?.height ? node.style.height / 2 : 34);
      reactFlowInstance.setCenter(x, y, { zoom: 1.4, duration: 600 });
      setSelectedNode(node);
      setIsSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      showToast(`Đã di chuyển tới node "${node.data?.title || node.id}"`, "success");
    },
    [reactFlowInstance, showToast]
  );

  // Mở search bằng Ctrl+F
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsPaletteOpen(false);
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsPaletteOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // 5. Tải Workflow Trực Tiếp Từ Máy Chủ n8n Web (Single Source of Truth)
  const fetchUnifiedMasterCanvas = useCallback(async () => {
    try {
      setIsLoading(true);
      // Ưu tiên 1: Tải trực tiếp từ máy chủ n8n Web qua API Backend
      const n8nRes = await getN8nLiveWorkflow();
      if (n8nRes?.success && n8nRes.data?.nodes) {
        const { nodes: convertedNodes, edges: convertedEdges } =
          convertN8nWorkflowToReactFlow(n8nRes.data);
        if (convertedNodes.length > 0) {
          setNodes(convertedNodes);
          setEdges(convertedEdges);
          showToast(
            `Đã đồng bộ ${convertedNodes.length} node trực tiếp từ máy chủ n8n Web!`,
            "success"
          );
          return;
        }
      }

      // Nếu không có dữ liệu từ n8n
      showToast("Không tìm thấy dữ liệu kịch bản từ máy chủ n8n Web!", "warning");
    } catch (err) {
      console.error("Lỗi tải kịch bản từ n8n Web:", err);
      showToast("Không thể kết nối máy chủ n8n để tải kịch bản!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges, showToast]);

  useEffect(() => {
    fetchUnifiedMasterCanvas();
  }, [fetchUnifiedMasterCanvas]);

  // 6. Thu phóng Toàn Cảnh (Fit View toàn bộ Master Canvas)
  const handleFitView = useCallback(() => {
    if (!reactFlowInstance) return;
    reactFlowInstance.fitView({ padding: 0.15, duration: 800, minZoom: 0.005 });
    showToast("Đã căn chỉnh toàn cảnh Master Canvas!", "success");
  }, [reactFlowInstance, showToast]);

  // 7. Nối dây giữa 2 node
  const onConnect = useCallback(
    (params) => {
      takeSnapshot();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: {
              stroke:
                params.sourceHandle === "true"
                  ? "#00C950"
                  : params.sourceHandle === "false" || params.sourceHandle === "error"
                  ? "#F24B7B"
                  : "#06b6d4",
              strokeWidth: 2,
            },
          },
          eds
        )
      );
      showToast("Đã kết nối luồng giữa 2 node!", "success");
    },
    [setEdges, takeSnapshot, showToast]
  );

  // 8. Kéo thả Node từ thư viện bên trái vào Canvas
  const onDragStart = (event, nodeItem) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeItem));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      const rawData = event.dataTransfer.getData("application/reactflow");
      if (!rawData) return;

      const item = JSON.parse(rawData);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      takeSnapshot();
      const isSticky = item.type === "n8n-nodes-base.stickyNote";
      const newNode = {
        id: `node-${Date.now()}`,
        type: item.type,
        position,
        data: {
          title: item.label,
          service: item.service,
          brandColor: item.brandColor,
          content: isSticky
            ? "## Ghi chú\nNhấp đúp vào đây để soạn thảo..."
            : undefined,
          colorHex: isSticky ? N8N_STICKY_COLORS[1].bg : undefined,
          borderHex: isSticky ? N8N_STICKY_COLORS[1].border : undefined,
          rawParameters: isSticky
            ? {
                content: "## Ghi chú\nNhấp đúp vào đây để soạn thảo...",
                color: 1,
              }
            : {},
        },
        style: isSticky ? { width: 240, height: 140 } : undefined,
      };

      setNodes((nds) => nds.concat(newNode));
      showToast(`Đã thêm node "${item.label}" vào Canvas!`, "success");
    },
    [reactFlowInstance, setNodes, takeSnapshot, showToast]
  );

  // Thêm node trực tiếp từ Popup Palette (Click để thêm ngay vào trung tâm màn hình)
  const handleAddNodeFromPalette = useCallback(
    (item) => {
      takeSnapshot();
      const center = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          })
        : { x: 300, y: 250 };

      const isSticky = item.type === "n8n-nodes-base.stickyNote";
      const newNode = {
        id: `node-${Date.now()}`,
        type: item.type,
        position: {
          x: center.x + (Math.random() * 40 - 20),
          y: center.y + (Math.random() * 40 - 20),
        },
        data: {
          title: item.label,
          service: item.service,
          brandColor: item.brandColor,
          content: isSticky
            ? "## Ghi chú\nNhấp đúp vào đây để soạn thảo..."
            : undefined,
          colorHex: isSticky ? N8N_STICKY_COLORS[1].bg : undefined,
          borderHex: isSticky ? N8N_STICKY_COLORS[1].border : undefined,
          rawParameters: isSticky
            ? {
                content: "## Ghi chú\nNhấp đúp vào đây để soạn thảo...",
                color: 1,
              }
            : {},
        },
        style: isSticky ? { width: 240, height: 140 } : undefined,
      };

      setNodes((nds) => nds.concat(newNode));
      setIsPaletteOpen(false);
      showToast(`Đã thêm node "${item.label}" vào Canvas!`, "success");
    },
    [reactFlowInstance, setNodes, takeSnapshot, showToast]
  );

  // 9. CLICK ĐÚP VÀO NODE MỞ MODAL NDV (NODE DETAIL VIEW 3 CỘT CHUẨN N8N)
  const onNodeDoubleClick = useCallback((event, node) => {
    // Sticky Note là thẻ ghi chú trên Canvas (soạn thảo trực tiếp), KHÔNG mở modal NDV
    if (
      node.type === "n8n-nodes-base.stickyNote" ||
      node.type === "stickyNote"
    ) {
      return;
    }
    setSelectedNode(node);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    // Click đơn: để React Flow chọn node (di chuyển, xóa, copy), không mở modal NDV
  }, []);

  const onPaneClick = useCallback(() => {
    // Bấm ra ngoài canvas không làm gì hoặc deselect
  }, []);

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    takeSnapshot();
    const title = selectedNode.data?.title || selectedNode.id;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    );
    setSelectedNode(null);
    showToast(`Đã xóa node "${title}" khỏi Canvas!`, "success");
  };

  // 10. LƯU CẤU HÌNH TRỰC TIẾP LÊN N8N WEB (CTRL + S)
  const handleSavePlaybook = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await updatePlaybookLayout("master_soar_playbook", {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });

      if (res?.success) {
        showToast(
          res.message || "Đã lưu kịch bản trực tiếp lên n8n Web thành công!",
          "success"
        );
      } else {
        showToast(res?.message || "Không thể lưu kịch bản lên n8n Web", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi kết nối Backend lưu kịch bản lên n8n Web!", "error");
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  // 11. SAO CHÉP & DÁN NODES (COPY / PASTE CHUẨN N8N)
  const handleCopy = useCallback(
    (notify = true) => {
      let selectedNodes = nodesRef.current.filter((n) => n.selected);

      if (selectedNodes.length === 0 && selectedNode) {
        const found = nodesRef.current.find((n) => n.id === selectedNode.id);
        if (found) selectedNodes = [found];
      }

      if (selectedNodes.length === 0) {
        if (notify) {
          showToast("Vui lòng chọn hoặc quét ít nhất 1 node để sao chép!", "error");
        }
        return false;
      }

      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      const connectedEdges = edgesRef.current.filter(
        (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
      );

      clipboardRef.current = {
        nodes: selectedNodes,
        edges: connectedEdges,
      };
      pasteCountRef.current = 1;

      try {
        const n8nJson = convertReactFlowToN8nWorkflow(
          selectedNodes,
          connectedEdges
        );
        navigator.clipboard?.writeText(JSON.stringify(n8nJson, null, 2));
      } catch (_) {}

      if (notify) {
        showToast(`Đã sao chép ${selectedNodes.length} node vào bộ nhớ tạm!`, "success");
      }
      return true;
    },
    [selectedNode, showToast]
  );

  const handlePaste = useCallback(
    async (isDuplicate = false) => {
      let nodesToPaste = [];
      let edgesToPaste = [];

      try {
        if (navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().startsWith("{") && text.includes('"nodes"')) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
              const converted = convertN8nWorkflowToReactFlow(parsed);
              if (converted.nodes.length > 0) {
                nodesToPaste = converted.nodes;
                edgesToPaste = converted.edges;
              }
            }
          }
        }
      } catch (_) {}

      if (nodesToPaste.length === 0) {
        nodesToPaste = clipboardRef.current?.nodes || [];
        edgesToPaste = clipboardRef.current?.edges || [];
      }

      if (nodesToPaste.length === 0) {
        showToast("Bộ nhớ tạm trống! Vui lòng sao chép (Ctrl+C) node trước khi dán.", "error");
        return false;
      }

      takeSnapshot();

      const offset = pasteCountRef.current * 40;
      pasteCountRef.current += 1;
      const timestamp = Date.now();
      const idMap = new Map();

      const newNodes = nodesToPaste.map((node, index) => {
        const newId = `node-${timestamp}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        idMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
          selected: true,
          position: {
            x: (node.position?.x || 0) + offset,
            y: (node.position?.y || 0) + offset,
          },
        };
      });

      const newEdges = edgesToPaste.map((edge, index) => {
        const newId = `edge-${timestamp}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        return {
          ...edge,
          id: newId,
          source: idMap.get(edge.source) || edge.source,
          target: idMap.get(edge.target) || edge.target,
          selected: true,
        };
      });

      setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(newNodes));
      setEdges((eds) => eds.map((e) => ({ ...e, selected: false })).concat(newEdges));

      if (isDuplicate) {
        showToast(`Đã nhân bản ${newNodes.length} node trên Canvas!`, "success");
      } else {
        showToast(`Đã dán thành công ${newNodes.length} node lên Canvas!`, "success");
      }
      return true;
    },
    [setNodes, setEdges, takeSnapshot, showToast]
  );

  // Lắng nghe tổ hợp phím: Ctrl + S (Lưu), Ctrl + C (Copy), Ctrl + V (Paste), Ctrl + D (Nhân bản)
  useEffect(() => {
    const handleKeyShortcuts = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      const key = e.key?.toLowerCase();
      const code = e.code;

      if (key === "s" || code === "KeyS") {
        e.preventDefault();
        handleSavePlaybook();
      } else if (key === "c" || code === "KeyC") {
        const copied = handleCopy(true);
        if (copied) e.preventDefault();
      } else if (key === "v" || code === "KeyV") {
        e.preventDefault();
        handlePaste(false);
      } else if (key === "d" || code === "KeyD") {
        e.preventDefault();
        const copied = handleCopy(false);
        if (copied) {
          handlePaste(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyShortcuts);
    return () => window.removeEventListener("keydown", handleKeyShortcuts);
  }, [handleSavePlaybook, handleCopy, handlePaste]);

  return (
    <div className="w-full h-full flex flex-col gap-3 animate-slide-up overflow-hidden relative">
      {/* 1. HEADER: THANH ĐIỀU KHIỂN MASTER WORKFLOW */}
      <PlaybookStudioHeader
        isLoading={isLoading}
        isSaving={isSaving}
        handleFitView={handleFitView}
        handleReloadCanvas={fetchUnifiedMasterCanvas}
        handleSavePlaybook={handleSavePlaybook}
      />

      {/* 2. KHUNG CANVAS CHÍNH (FULL WIDTH — Floating Action Toolbar & React Flow) */}
      <div className="flex-1 w-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-[#e9edf2] dark:bg-dark-bg shadow-sm relative overflow-hidden flex min-h-0">
        <div
          className="flex-1 h-full relative"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {/* TOAST THÔNG BÁO NỔI Ở GÓC DƯỚI BÊN PHẢI KHUNG CANVAS */}
          <PlaybookToast toast={toast} />

          {/* FLOATING ACTION TOOLBAR: CỤM NÚT ĐỔ DỌC (THÊM NODE & TÌM KIẾM CHUẨN N8N) */}
          <PlaybookFloatingToolbar
            isPaletteOpen={isPaletteOpen}
            setIsPaletteOpen={setIsPaletteOpen}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            paletteRef={paletteRef}
            searchRef={searchRef}
            onDragStart={onDragStart}
            handleAddNodeFromPalette={handleAddNodeFromPalette}
            searchInputRef={searchInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            handleSearchNode={handleSearchNode}
            handleJumpToNode={handleJumpToNode}
            nodesRef={nodesRef}
          />

          {/* REACT FLOW CANVAS VÔ CỰC */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={() => takeSnapshot()}
            onSelectionDragStart={() => takeSnapshot()}
            onNodesDelete={(deleted) => {
              takeSnapshot();
              if (deleted && deleted.length > 0) {
                showToast(`Đã xóa ${deleted.length} node khỏi Canvas!`, "success");
              }
            }}
            onEdgesDelete={(deleted) => {
              takeSnapshot();
              if (deleted && deleted.length > 0) {
                showToast(
                  `Đã xóa ${deleted.length} đường kết nối khỏi Canvas!`,
                  "success"
                );
              }
            }}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            panOnDrag={[1, 2]}
            selectionOnDrag={true}
            selectionMode="partial"
            selectionKeyCode={null}
            panActivationKeyCode={["Space", "Control"]}
            panOnScroll={true}
            panOnScrollMode="free"
            panOnScrollSpeed={0.8}
            zoomOnPinch={true}
            zoomActivationKeyCode={["Meta", "Control"]}
            onMove={onViewportMove}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.005 }}
            minZoom={0.005}
            maxZoom={2.5}
            style={{ backgroundColor: isDark ? "transparent" : "#e9edf2" }}
            className="w-full h-full"
          >
            <Background
              color={isDark ? "#334155" : "#94a3b8"}
              gap={28}
              size={1.5}
            />
            <Controls className="bg-white! dark:bg-slate-900! border-slate-200! dark:border-slate-800! rounded-xl! shadow-lg!" />

            {showMiniMap && (
              <MiniMap
                zoomable
                pannable
                nodeColor={() => (isDark ? "#06b6d4" : "#0284c7")}
                nodeStrokeWidth={3}
                maskColor={
                  isDark ? "rgba(7, 11, 20, 0.85)" : "rgba(233, 237, 242, 0.75)"
                }
                className="m-4! rounded-xl! overflow-hidden! shadow-2xl! transition-all duration-300 animate-fade-in"
              />
            )}
          </ReactFlow>

          {/* MODAL NDV 3 CỘT CHUẨN N8N (NODE DETAIL VIEW) */}
          <NodeDetailModal
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            nodes={nodes}
            edges={edges}
            onUpdateNodeData={handleUpdateNodeData}
            handleDeleteSelectedNode={handleDeleteSelectedNode}
          />
        </div>
      </div>

      {/* 3. FOOTER TRỢ GIÚP */}
      <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-1.5">
          <MousePointer size={13} className="text-cyan-500 shrink-0" />
          <span>
            <b>Click đúp node:</b> Mở NDV 3 Cột • <b>Chuột giữa:</b> Kéo Canvas • <b>Lăn chuột:</b> Phóng to/Thu nhỏ • <b>Ctrl+S:</b> Lưu DB • <b>Ctrl+Z/Y:</b> Hoàn tác/Làm lại
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span>Total Nodes: {nodes.length}</span>
          <span>•</span>
          <span>Master SOAR n8n Workflow Studio</span>
        </div>
      </div>
    </div>
  );
}
