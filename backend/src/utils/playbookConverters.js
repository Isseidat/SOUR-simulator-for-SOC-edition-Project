/**
 * Chuyển đổi dữ liệu Canvas React Flow (nodes & edges) sang định dạng Workflow JSON của n8n
 */
export function convertReactFlowToN8nWorkflow(rfNodes = [], rfEdges = []) {
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

    // 2. Tên Node an toàn: ưu tiên n.data?.title -> n.name -> n.id
    const nodeName = n.data?.title || n.name || n.id;

    // 3. Parameters an toàn: ưu tiên n.data?.rawParameters -> n.parameters -> {}
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

    const sourceName = sourceNode.data?.title || sourceNode.name || sourceNode.id;
    const targetName = targetNode.data?.title || targetNode.name || targetNode.id;

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
    nodes: n8nNodes,
    connections,
    settings: {
      executionOrder: "v1",
      binaryMode: "separate",
    },
  };
}
