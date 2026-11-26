import React from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MousePointer } from "lucide-react";

import { nodeTypes } from "../components/playbook/PlaybookCustomNodes";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  PlaybookStudioHeader,
  PlaybookFloatingToolbar,
  PlaybookToast,
} from "../components/playbook/PlaybookControls";
import NodeDetailModal from "../components/playbook/NodeDetailModal";
import { usePlaybookCanvas } from "../hooks/usePlaybookCanvas";

export default function PlaybookStudio() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const {
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
  } = usePlaybookCanvas({ isAdmin, userRole: user?.role });

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col gap-3 animate-slide-up overflow-hidden relative">
      {/* 1. HEADER: THANH ĐIỀU KHIỂN MASTER WORKFLOW */}
      <PlaybookStudioHeader
        isAdmin={isAdmin}
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
            key={`reactflow-canvas-${reloadTrigger}`}
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
            style={{ backgroundColor: isDark ? "#0b0f19" : "#e9edf2" }}
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
