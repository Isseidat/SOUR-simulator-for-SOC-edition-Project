import { useState, useEffect, useCallback, useRef } from "react";
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react";
import { updatePlaybookLayout, getN8nLiveWorkflow } from "../api/playbookApi";
import {
  N8N_STICKY_COLORS,
  convertN8nWorkflowToReactFlow,
  convertReactFlowToN8nWorkflow,
} from "../utils/playbookConverters";

/**
 * Custom hook quản lý toàn bộ trạng thái React Flow Canvas, Undo/Redo,
 * đồng bộ n8n Web, Copy/Paste/Duplicate, Search node và phím tắt cho PlaybookStudio.
 */
export function usePlaybookCanvas({ isAdmin, userRole }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [toast, setToast] = useState(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Undo / Redo Stack
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || "success");
      }
    };
    window.addEventListener("playbook-toast", handleCustomToast);
    return () => window.removeEventListener("playbook-toast", handleCustomToast);
  }, [showToast]);

  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const clipboardRef = useRef({ nodes: [], edges: [] });
  const pasteCountRef = useRef(0);
  const paletteRef = useRef(null);
  const searchRef = useRef(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);

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
      showToast("Hoàn tác thao tác thành công", "success");
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
      showToast("Khôi phục thao tác thành công!", "success");
    }
  }, [setNodes, setEdges, showToast]);

  // Ctrl+Z / Ctrl+Y
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

  const handleUpdateNodeData = useCallback(
    (nodeId, newTitle, newParams, extraData = {}) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const isSticky =
            n.type === "n8n-nodes-base.stickyNote" || n.type === "stickyNote";
          const stickyColorObj =
            isSticky && newParams.color !== undefined
              ? N8N_STICKY_COLORS[newParams.color] || N8N_STICKY_COLORS[1]
              : null;
          return {
            ...n,
            credentials:
              extraData.credentials !== undefined
                ? extraData.credentials
                : n.credentials,
            onError:
              extraData.onError !== undefined ? extraData.onError : n.onError,
            continueOnFail:
              extraData.continueOnFail !== undefined
                ? extraData.continueOnFail
                : n.continueOnFail,
            data: {
              ...n.data,
              credentials:
                extraData.credentials !== undefined
                  ? extraData.credentials
                  : n.data?.credentials,
              title: newTitle !== undefined ? newTitle : n.data.title,
              content: isSticky ? newParams.content : n.data.content,
              colorHex: stickyColorObj ? stickyColorObj.bg : n.data.colorHex,
              borderHex: stickyColorObj
                ? stickyColorObj.border
                : n.data.borderHex,
              rawParameters: newParams,
              onError:
                extraData.onError !== undefined
                  ? extraData.onError
                  : n.data?.onError,
              continueOnFail:
                extraData.continueOnFail !== undefined
                  ? extraData.continueOnFail
                  : n.data?.continueOnFail,
            },
          };
        })
      );
    },
    [setNodes]
  );

  // MiniMap tự động hiện khi Zoom
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
      showToast(
        `Đã di chuyển tới node "${node.data?.title || node.id}"`,
        "success"
      );
    },
    [reactFlowInstance, showToast]
  );

  // Ctrl+F & Escape
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

  // Tải Workflow trực tiếp từ n8n Web
  const fetchUnifiedMasterCanvas = useCallback(async () => {
    try {
      setIsLoading(true);
      setSelectedNode(null);
      const n8nRes = await getN8nLiveWorkflow();
      if (n8nRes?.success && n8nRes.data?.nodes) {
        const { nodes: convertedNodes, edges: convertedEdges } =
          convertN8nWorkflowToReactFlow(n8nRes.data);
        if (convertedNodes.length > 0) {
          setNodes(convertedNodes);
          setEdges(convertedEdges);
          setReloadTrigger((prev) => prev + 1);
          showToast(
            `Đã đồng bộ ${convertedNodes.length} node trực tiếp từ máy chủ n8n Web!`,
            "success"
          );
          return;
        }
      }
      showToast(
        "Không tìm thấy dữ liệu kịch bản từ máy chủ n8n Web!",
        "warning"
      );
    } catch (err) {
      console.error("Lỗi tải kịch bản từ n8n Web:", err);
      showToast("Không thể kết nối máy chủ n8n để tải kịch bản!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnifiedMasterCanvas();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUnifiedMasterCanvas]);

  const handleFitView = useCallback(() => {
    if (!reactFlowInstance) return;
    reactFlowInstance.fitView({ padding: 0.15, duration: 800, minZoom: 0.005 });
    showToast("Đã căn chỉnh toàn cảnh Master Canvas!", "success");
  }, [reactFlowInstance, showToast]);

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
                  : params.sourceHandle === "false" ||
                      params.sourceHandle === "error"
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

  const onDragStart = useCallback((event, nodeItem) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify(nodeItem)
    );
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const buildNewNode = useCallback((item, position) => {
    const isSticky = item.type === "n8n-nodes-base.stickyNote";
    return {
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
      setNodes((nds) => nds.concat(buildNewNode(item, position)));
      showToast(`Đã thêm node "${item.label}" vào Canvas!`, "success");
    },
    [reactFlowInstance, setNodes, takeSnapshot, showToast, buildNewNode]
  );

  const handleAddNodeFromPalette = useCallback(
    (item) => {
      takeSnapshot();
      const center = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          })
        : { x: 300, y: 250 };

      const position = {
        x: center.x + (Math.random() * 40 - 20),
        y: center.y + (Math.random() * 40 - 20),
      };

      setNodes((nds) => nds.concat(buildNewNode(item, position)));
      setIsPaletteOpen(false);
      showToast(`Đã thêm node "${item.label}" vào Canvas!`, "success");
    },
    [reactFlowInstance, setNodes, takeSnapshot, showToast, buildNewNode]
  );

  const onNodeDoubleClick = useCallback((event, node) => {
    if (
      node.type === "n8n-nodes-base.stickyNote" ||
      node.type === "stickyNote"
    ) {
      return;
    }
    setSelectedNode(node);
  }, []);

  const onNodeClick = useCallback(() => {}, []);
  const onPaneClick = useCallback(() => {}, []);

  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    takeSnapshot();
    const title = selectedNode.data?.title || selectedNode.id;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      )
    );
    setSelectedNode(null);
    showToast(`Đã xóa node "${title}" khỏi Canvas!`, "success");
  }, [selectedNode, takeSnapshot, setNodes, setEdges, showToast]);

  const handleSavePlaybook = useCallback(async () => {
    if (!isAdmin) {
      showToast(
        `Quyền truy cập bị từ chối: User role "${userRole || "Viewer"}" không có quyền lưu lên n8n Web!`,
        "error"
      );
      return;
    }

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
        showToast(
          res?.message || "Không thể lưu kịch bản lên n8n Web",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      const errMsg =
        err?.response?.data?.message ||
        "Lỗi khi kết nối Backend lưu kịch bản lên n8n Web!";
      showToast(errMsg, "error");
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, userRole, showToast]);

  const handleCopy = useCallback(
    (notify = true) => {
      let selectedNodes = nodesRef.current.filter((n) => n.selected);

      if (selectedNodes.length === 0 && selectedNode) {
        const found = nodesRef.current.find((n) => n.id === selectedNode.id);
        if (found) selectedNodes = [found];
      }

      if (selectedNodes.length === 0) {
        if (notify) {
          showToast(
            "Vui lòng chọn hoặc quét ít nhất 1 node để sao chép!",
            "error"
          );
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
      } catch {
        // Ignore clipboard permission errors
      }

      if (notify) {
        showToast(
          `Đã sao chép ${selectedNodes.length} node vào bộ nhớ tạm!`,
          "success"
        );
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
      } catch {
        // Fallback to internal clipboardRef
      }

      if (nodesToPaste.length === 0) {
        nodesToPaste = clipboardRef.current?.nodes || [];
        edgesToPaste = clipboardRef.current?.edges || [];
      }

      if (nodesToPaste.length === 0) {
        showToast(
          "Bộ nhớ tạm trống! Vui lòng sao chép (Ctrl+C) node trước khi dán.",
          "error"
        );
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

      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: false })).concat(newNodes)
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, selected: false })).concat(newEdges)
      );

      if (isDuplicate) {
        showToast(
          `Đã nhân bản ${newNodes.length} node trên Canvas!`,
          "success"
        );
      } else {
        showToast(
          `Đã dán thành công ${newNodes.length} node lên Canvas!`,
          "success"
        );
      }
      return true;
    },
    [setNodes, setEdges, takeSnapshot, showToast]
  );

  // Phím tắt Ctrl+S / Ctrl+C / Ctrl+V / Ctrl+D
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

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    isLoading,
    isSaving,
    reloadTrigger,
    toast,
    showToast,
    nodesRef,
    takeSnapshot,
    setReactFlowInstance,
    isPaletteOpen,
    setIsPaletteOpen,
    selectedNode,
    setSelectedNode,
    paletteRef,
    searchRef,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchInputRef,
    showMiniMap,
    onViewportMove,
    handleSearchNode,
    handleJumpToNode,
    fetchUnifiedMasterCanvas,
    handleFitView,
    onConnect,
    onDragStart,
    onDragOver,
    onDrop,
    handleAddNodeFromPalette,
    onNodeDoubleClick,
    onNodeClick,
    onPaneClick,
    handleUpdateNodeData,
    handleDeleteSelectedNode,
    handleSavePlaybook,
  };
}

