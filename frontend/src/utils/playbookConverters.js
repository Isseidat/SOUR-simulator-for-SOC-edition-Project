// Bảng ánh xạ mã màu chuẩn n8n cho Sticky Note (0-7)
export const N8N_STICKY_COLORS = {
  0: { bg: "#f1f5f9", border: "#94a3b8" }, // Gray
  1: { bg: "#fef9c3", border: "#fde047" }, // Yellow
  2: { bg: "#e0f2fe", border: "#7dd3fc" }, // Blue
  3: { bg: "#dcfce7", border: "#86efac" }, // Green
  4: { bg: "#fee2e2", border: "#fca5a5" }, // Red
  5: { bg: "#f3e8ff", border: "#d8b4fe" }, // Purple
  6: { bg: "#ffedd5", border: "#fdba74" }, // Orange
  7: { bg: "#ccfbf1", border: "#5eead4" }, // Cyan
};

/**
 * Chuyển đổi n8n Workflow JSON sang React Flow Nodes & Edges (Phương án B)
 */
export function convertN8nWorkflowToReactFlow(n8nData) {
  if (!n8nData || !Array.isArray(n8nData.nodes)) {
    throw new Error("Dữ liệu n8n workflow không hợp lệ (thiếu mảng nodes)");
  }

  const nodes = n8nData.nodes.map((n) => {
    const x = Array.isArray(n.position) ? n.position[0] : 0;
    const y = Array.isArray(n.position) ? n.position[1] : 0;

    const isSticky = n.type === "n8n-nodes-base.stickyNote";
    const stickyColor =
      isSticky && n.parameters?.color !== undefined
        ? N8N_STICKY_COLORS[n.parameters.color] || N8N_STICKY_COLORS[1]
        : undefined;

    return {
      id: n.id || n.name,
      type: n.type || "webhookNode",
      position: { x, y },
      data: {
        title: n.name,
        service: n.type?.replace("n8n-nodes-base.", "").toUpperCase() || "n8n Node",
        action: n.notes || n.parameters?.notice || "Tác vụ tự động hóa n8n",
        content: n.parameters?.content || `## ${n.name}`,
        rawParameters: n.parameters,
        colorHex: stickyColor?.bg,
        borderHex: stickyColor?.border,
        brandColor: n.type === "n8n-nodes-base.webhook" ? "#F24B7B" : undefined,
        credentials: n.credentials,
        webhookId: n.webhookId,
        typeVersion: n.typeVersion,
      },
      credentials: n.credentials,
      webhookId: n.webhookId,
      typeVersion: n.typeVersion,
      style:
        isSticky && n.parameters?.width && n.parameters?.height
          ? { width: n.parameters.width, height: n.parameters.height }
          : undefined,
    };
  });

  const nameToIdMap = {};
  n8nData.nodes.forEach((n) => {
    nameToIdMap[n.name] = n.id || n.name;
  });

  const edges = [];
  const connections = n8nData.connections || {};

  Object.entries(connections).forEach(([sourceName, outputs]) => {
    const sourceId = nameToIdMap[sourceName] || sourceName;
    const sourceNode = n8nData.nodes.find(
      (n) => (n.id || n.name) === sourceId || n.name === sourceName
    );
    const isConditionNode = sourceNode?.type === "n8n-nodes-base.if";
    const isApiNode = sourceNode?.type === "n8n-nodes-base.httpRequest";

    if (outputs && typeof outputs === "object") {
      Object.entries(outputs).forEach(([outputType, routes]) => {
        if (Array.isArray(routes)) {
          routes.forEach((branch, branchIndex) => {
            if (Array.isArray(branch)) {
              branch.forEach((targetInfo, targetIndex) => {
                const targetId = nameToIdMap[targetInfo.node] || targetInfo.node;

                let sourceHandle = undefined;
                let strokeColor = "#06b6d4";

                if (isConditionNode) {
                  sourceHandle = branchIndex === 0 ? "true" : "false";
                  strokeColor = branchIndex === 0 ? "#00C950" : "#F24B7B";
                } else if (isApiNode && routes.length > 1) {
                  sourceHandle = branchIndex === 0 ? "main" : "error";
                  strokeColor = branchIndex === 0 ? "#898FFF" : "#F24B7B";
                }

                edges.push({
                  id: `e-${sourceId}-${targetId}-${branchIndex}-${targetIndex}`,
                  source: sourceId,
                  target: targetId,
                  sourceHandle,
                  animated: true,
                  style: {
                    stroke: strokeColor,
                    strokeWidth: 2,
                  },
                });
              });
            }
          });
        }
      });
    }
  });

  return { nodes, edges };
}

/**
 * Chuyển đổi ngược từ React Flow Canvas sang chuẩn JSON n8n Workflow (Two-Way Sync)
 */
export function convertReactFlowToN8nWorkflow(rfNodes, rfEdges) {
  const n8nNodes = rfNodes.map((n) => {
    const isSticky = n.type === "n8n-nodes-base.stickyNote" || n.type === "stickyNote";
    
    // 1. Tọa độ an toàn: hỗ trợ cả [x, y] và { x, y }
    let posX = 0;
    let posY = 0;
    if (Array.isArray(n.position)) {
      posX = n.position[0] ?? 0;
      posY = n.position[1] ?? 0;
    } else if (n.position && typeof n.position === "object") {
      posX = n.position.x ?? n.position[0] ?? 0;
      posY = n.position.y ?? n.position[1] ?? 0;
    }

    // 2. Tên Node an toàn
    const nodeName = n.data?.title || n.name || n.id;

    // 3. Parameters an toàn
    let parameters = { ...(n.parameters || {}), ...(n.data?.rawParameters || {}) };
    if (isSticky) {
      parameters = {
        ...parameters,
        content: n.data?.content || n.data?.title || n.parameters?.content || parameters.content || "",
        height: Math.round(n.style?.height || n.height || parameters.height || 140),
        width: Math.round(n.style?.width || n.width || parameters.width || 240),
        color: parameters.color !== undefined ? Number(parameters.color) : 1,
      };
    }

    const n8nNode = {
      id: n.id,
      name: nodeName,
      type: isSticky ? "n8n-nodes-base.stickyNote" : n.type,
      typeVersion: n.typeVersion || n.data?.typeVersion || 1,
      position: [Math.round(posX), Math.round(posY)],
      parameters,
    };

    if (n.credentials || n.data?.credentials) {
      n8nNode.credentials = n.credentials || n.data?.credentials;
    }

    if (n.webhookId || n.data?.webhookId) {
      n8nNode.webhookId = n.webhookId || n.data?.webhookId;
    }

    return n8nNode;
  });

  const connections = {};
  rfEdges.forEach((e) => {
    const sourceNode = rfNodes.find((n) => n.id === e.source);
    const targetNode = rfNodes.find((n) => n.id === e.target);
    if (!sourceNode || !targetNode) return;

    const sourceName = sourceNode.data?.title || sourceNode.id;
    const targetName = targetNode.data?.title || targetNode.id;

    if (!connections[sourceName]) {
      connections[sourceName] = { main: [[]] };
    }

    let branchIndex = 0;
    if (e.sourceHandle === "false" || e.sourceHandle === "error") {
      branchIndex = 1;
    }

    while (connections[sourceName].main.length <= branchIndex) {
      connections[sourceName].main.push([]);
    }

    connections[sourceName].main[branchIndex].push({
      node: targetName,
      type: "main",
      index: 0,
    });
  });

  return {
    name: "Master SOAR Playbook",
    nodes: n8nNodes,
    connections,
    active: true,
    settings: {
      executionOrder: "v1",
      binaryMode: "separate",
    },
  };
}
