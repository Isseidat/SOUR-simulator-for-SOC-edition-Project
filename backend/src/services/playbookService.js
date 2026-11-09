import axios from "axios";
import { Playbook } from "../models/Playbook.js";
import { convertReactFlowToN8nWorkflow } from '../utils/playbookConverters.js';
import { v4 as uuidv4} from 'uuid';
import { Alert } from "../models/Alert.js";
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from '../utils/mailer.js';
import { armWatchdogForAlert } from '../utils/watchdogFallback.js';
import { config } from "../config/env.js";


// Đọc URL của n8n từ file .env (Mặc định gọi tới n8n chạy local)
const N8N_LOCAL_URL = config.n8n.baseUrl;

// ==========================================
// CACHE CHO N8N NODE TYPES
// ==========================================
let cachedNodeTypes = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ
let activeSmtpCredId = 'iuBTRMOr7yPQSrZ6';


export const getPlaybooksService = async () => {
    const playbooks = await Playbook.find().sort({ createdAt: 1 });
    return playbooks;
}


export const formatN8nWebhook = (baseURL, webhookPath) => {
    const baseWebhook = (baseURL || 'http://localhost:5678').replace(/\/$/, '');
    let clearPath = (webhookPath || '').replace(/^\//, '').replace(/\/$/, '');
    if (!clearPath.startsWith('webhook/')) {
        clearPath = 'webhook/' + clearPath;
    }
    return `${baseWebhook}/${clearPath}`;
};


export const getN8nNodeTypesService = async () => {
    const now = Date.now();
    if (cachedNodeTypes && (now - lastCacheTime < CACHE_TTL_MS)) {
        return {
            count: cachedNodeTypes.length,
            data: cachedNodeTypes
        };
    }

    const n8nBase = config.n8n.baseUrl;
    const urlsToTry = [
      `${n8nBase}/types/nodes.json`,
      'http://localhost:5678/types/nodes.json'
    ];

    let nodesData = null;
    for (const url of urlsToTry) {
      try {
        const response = await axios.get(url, { timeout: 7000 });
        if (response.data && Array.isArray(response.data)) {
          nodesData = response.data;
          break;
        }
      } catch (err) {
        // Thử URL tiếp theo
      }
    }

    if (!nodesData) {
      throw new Error ( 'Không thể kết nối tới máy chủ n8n để lấy danh mục Node Types' );
    }

    cachedNodeTypes = nodesData;
    lastCacheTime = now;

    return {
        count: nodesData.length,
        data: nodesData
    };
}

// ==========================================
// 3. PROXY TẢI ICON SVG CHUẨN TỪ N8N (TRÁNH LỖI CORS & PHỤC VỤ TRỰC TIẾP CHO <img>)
// ==========================================
const BUILTIN_SVGS = {
  webhook: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="#F24B7B" d="M35 37c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#F24B7B" d="M35 43c-3 0-5.9-1.4-7.8-3.7l3.1-2.5c1.1 1.4 2.9 2.3 4.7 2.3 3.3 0 6-2.7 6-6s-2.7-6-6-6c-1 0-2 .3-2.9.7l-1.7 1L23.3 16l3.5-1.9 5.3 9.4c1-.3 2-.5 3-.5 5.5 0 10 4.5 10 10S40.5 43 35 43"/><path fill="#F24B7B" d="M14 43C8.5 43 4 38.5 4 33c0-4.6 3.1-8.5 7.5-9.7l1 3.9C9.9 27.9 8 30.3 8 33c0 3.3 2.7 6 6 6s6-2.7 6-6v-2h15v4H23.8c-.9 4.6-5 8-9.8 8"/><path fill="#FF6D98" d="M14 37c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#F24B7B" d="M25 19c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#FF6D98" d="m15.7 34-3.4-2 5.9-9.7c-2-1.9-3.2-4.5-3.2-7.3 0-5.5 4.5-10 10-10s10 4.5 10 10c0 .9-.1 1.7-.3 2.5l-3.9-1c.1-.5.2-1 .2-1.5 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 2.1 1.1 4 2.9 5.1l1.7 1z"/></svg>`,
  if: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="6.5" cy="12" r="3" stroke="#00C950" stroke-width="2"/><circle cx="17.5" cy="6" r="3" stroke="#00C950" stroke-width="2"/><circle cx="17.5" cy="18" r="3" stroke="#00C950" stroke-width="2"/><path stroke="#00C950" stroke-width="2" d="M9.5 12h3.5m0 0 2.5-4.5m-2.5 4.5 2.5 4.5"/></svg>`,
  wait: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#F188A2" stroke-width="2" d="M18.25 20.25H5.75v-2.629c0-.397.158-.779.44-1.06l3.706-3.707a1.207 1.207 0 0 0 0-1.708L6.19 7.44a1.5 1.5 0 0 1-.439-1.06V3.75h12.5v2.629a1.5 1.5 0 0 1-.44 1.06l-3.706 3.707a1.207 1.207 0 0 0 0 1.708l3.707 3.707a1.5 1.5 0 0 1 .439 1.06z"/></svg>`,
  switch: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="6" cy="12" r="3" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="5" r="2.5" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="12" r="2.5" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="19" r="2.5" stroke="#FFB966" stroke-width="2"/><path stroke="#FFB966" stroke-width="2" d="M9 12h4m0 0 2.5-6m-2.5 6h2.5m-2.5 0 2.5 6"/></svg>`,
  stickynote: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#eab308" stroke-width="2" d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><path stroke="#eab308" stroke-width="2" d="M15 3v5h5"/></svg>`,
  code: `<svg viewBox="0 0 512 512" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M170.283 48H196.5C203.127 48 208.5 42.6274 208.5 36V12C208.5 5.37258 203.127 0 196.5 0H170.283C126.1 0 90.283 35.8172 90.283 80V176C90.283 206.928 65.2109 232 34.283 232H23C16.3726 232 11 237.372 11 244V268C11 274.627 16.3724 280 22.9996 280L34.283 280C65.2109 280 90.283 305.072 90.283 336V440C90.283 479.764 122.518 512 162.283 512H196.5C203.127 512 208.5 506.627 208.5 500V476C208.5 469.373 203.127 464 196.5 464H162.283C149.028 464 138.283 453.255 138.283 440V336C138.283 309.022 128.011 284.443 111.164 265.961C106.109 260.416 106.109 251.584 111.164 246.039C128.011 227.557 138.283 202.978 138.283 176V80C138.283 62.3269 152.61 48 170.283 48Z" fill="#FF9922"/><path d="M305 36C305 42.6274 310.373 48 317 48H342.979C360.652 48 374.978 62.3269 374.978 80V176C374.978 202.978 385.251 227.557 402.098 246.039C407.153 251.584 407.153 260.416 402.098 265.961C385.251 284.443 374.978 309.022 374.978 336V432C374.978 449.673 360.652 464 342.979 464H317C310.373 464 305 469.373 305 476V500C305 506.627 310.373 512 317 512H342.979C387.161 512 422.978 476.183 422.978 432V336C422.978 305.072 448.051 280 478.979 280H490C496.627 280 502 274.628 502 268V244C502 237.373 496.628 232 490 232L478.979 232C448.051 232 422.978 206.928 422.978 176V80C422.978 35.8172 387.161 0 342.979 0H317C310.373 0 305 5.37258 305 12V36Z" fill="#FF9922"/></svg>`,
  httprequest: `<svg viewBox="0 0 40 40" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M40 20C40 8.95314 31.0469 0 20 0C8.95314 0 0 8.95314 0 20C0 31.0469 8.95314 40 20 40C31.0469 40 40 31.0469 40 20ZM20 36.9458C18.8852 36.9458 17.1378 35.967 15.4998 32.6985C14.7964 31.2918 14.1961 29.5431 13.7526 27.6847H26.1898C25.8045 29.5403 25.2044 31.2901 24.5002 32.6985C22.8622 35.967 21.1148 36.9458 20 36.9458ZM12.9064 20C12.9064 21.6097 13.0087 23.164 13.2003 24.6305H26.7997C26.9913 23.164 27.0936 21.6097 27.0936 20C27.0936 18.3903 26.9913 16.836 26.7997 15.3695H13.2003C13.0087 16.836 12.9064 18.3903 12.9064 20ZM20 3.05419C21.1149 3.05419 22.8622 4.03078 24.5001 7.30039C25.2066 8.71408 25.8072 10.4067 26.192 12.3153H13.7501C14.1933 10.4047 14.7942 8.71254 15.4998 7.30064C17.1377 4.03083 18.8851 3.05419 20 3.05419ZM30.1478 20C30.1478 18.4099 30.0543 16.8617 29.8227 15.3695H36.3042C36.7252 16.842 36.9458 18.3964 36.9458 20C36.9458 21.6036 36.7252 23.158 36.3042 24.6305H29.8227C30.0543 23.1383 30.1478 21.5901 30.1478 20ZM26.2767 4.25512C27.6365 6.36019 28.711 9.132 29.3774 12.3153H35.1046C33.2511 8.668 30.107 5.78346 26.2767 4.25512ZM10.6226 12.3153H4.89293C6.75147 8.66784 9.89351 5.78341 13.7232 4.25513C12.3635 6.36021 11.289 9.13201 10.6226 12.3153ZM3.05419 20C3.05419 21.603 3.27743 23.1575 3.69484 24.6305H10.1217C9.94619 23.142 9.85222 21.5943 9.85222 20C9.85222 18.4057 9.94619 16.858 10.1217 15.3695H3.69484C3.27743 16.8425 3.05419 18.397 3.05419 20ZM26.2766 35.7427C27.6365 33.6393 28.711 30.868 29.3774 27.6847H35.1046C33.251 31.3322 30.1068 34.2179 26.2766 35.7427ZM13.7234 35.7427C9.89369 34.2179 6.75155 31.3324 4.89293 27.6847H10.6226C11.289 30.868 12.3635 33.6393 13.7234 35.7427Z" fill="#3A42E9"/></svg>`,
  emailsend: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><style>path,rect{stroke:#FFFFFF;}@media(prefers-color-scheme:light){path,rect{stroke:#1e293b;}}</style><rect width="20" height="16" x="2" y="4" rx="3" stroke-width="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

// Aliases mở rộng để luôn tìm thấy dù gửi theo tên chuẩn nào
BUILTIN_SVGS['http'] = BUILTIN_SVGS.httprequest;
BUILTIN_SVGS['http-request'] = BUILTIN_SVGS.httprequest;
BUILTIN_SVGS['gmail'] = BUILTIN_SVGS.emailsend;
BUILTIN_SVGS['mail'] = BUILTIN_SVGS.emailsend;
BUILTIN_SVGS['sendemail'] = BUILTIN_SVGS.emailsend;

export const getN8nIconProxyService = async (rawName = 'webhook') => {
    const cleanName = rawName.replace('n8n-nodes-base.', '').replace('node:', '').replace('.svg', '');

    // 1. Kiểm tra built-in SVGs (If, Wait, Switch, StickyNote)
    if (BUILTIN_SVGS[cleanName]) {
      return BUILTIN_SVGS[cleanName];
    }

    // 2. Tra cứu ứng cử viên URL từ n8n
    const n8nBases = config.n8n.fallbackUrls;

    const candidates = [
      `/icons/n8n-nodes-base/dist/nodes/${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}/${cleanName}.svg`,
      `/icons/n8n-nodes-base/dist/credentials/icons/${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}.svg`
    ];

    if (cleanName === 'httprequest' || cleanName === 'http-request') {
      candidates.unshift('/icons/n8n-nodes-base/dist/nodes/HttpRequest/httprequest.svg');
    } else if (cleanName === 'webhook') {
      candidates.unshift('/icons/n8n-nodes-base/dist/nodes/Webhook/webhook.svg');
    } else if (cleanName === 'code') {
      candidates.unshift('/icons/n8n-nodes-base/dist/nodes/Code/code.svg');
    }

    for (const n8nBase of n8nBases) {
      for (const path of candidates) {
        try {
          const svgRes = await axios.get(`${n8nBase}${path}`, { timeout: 2000 });
          if (svgRes.headers['content-type']?.includes('svg')) {
            return svgRes.data;
          }
        } catch (err) {
          // Thử đường dẫn tiếp theo
        }
      }
    }

    // 3. Fallback: SVG icon mặc định
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.5" d="m9 12 2 2 4-4"/></svg>`;

    return fallbackSvg;
}

export const getN8nLiveWorkflowService = async () => {
    const n8nBase = config.n8n.baseUrl;
    const workflowId = config.n8n.masterWorkflowId;
    const n8nApiKey = config.n8n.apiKey;

    const response = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
      },
      timeout: 8000,
    });

    const wfData = response.data?.data || response.data;
    console.log('\n==================================================');
    console.log(`[n8n GET] 📥 Đã kéo dữ liệu từ n8n Web (${n8nBase}/api/v1/workflows/${workflowId}) thành công!`);
    console.log(` - Tên Workflow: "${wfData?.name}"`);
    console.log(` - Tổng số Nodes kéo được: ${wfData?.nodes?.length || 0} nodes`);
    console.log(` - Số lượng kết nối (Connections): ${Object.keys(wfData?.connections || {}).length} nodes có kết nối`);
    
    // Thống kê phân loại các node có trong kịch bản
    const nodeTypesCount = {};
    (wfData?.nodes || []).forEach(n => {
      const type = n.type || 'unknown';
      nodeTypesCount[type] = (nodeTypesCount[type] || 0) + 1;
    });
    console.log(' - Phân loại Node trong Workflow:', JSON.stringify(nodeTypesCount, null, 2));
    console.log('==================================================\n');
    
    return {
        message: 'Đã tải Workflow trực tiếp từ n8n Web!',
        data: response.data
    }
}


export const updatePlaybookLayoutService = async ({ id, nodes, edges }) => {
    const n8nBase = config.n8n.baseUrl;
    const workflowId = config.n8n.masterWorkflowId;
    const n8nApiKey = config.n8n.apiKey;

    // 0. Lấy workflow hiện tại từ n8n để giữ lại credentials, onError, conditions và trạng thái Publish (Active)
    let wasActive = false;
    const existingCredsMap = new Map();
    const existingNodeMap = new Map();
    try {
      const getRes = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': n8nApiKey },
        timeout: 15000,
      });
      const currentWf = getRes.data?.data || getRes.data;
      wasActive = Boolean(currentWf?.active || currentWf?.activeVersionId);
      (currentWf?.nodes || []).forEach(n => {
        if (n.id) existingNodeMap.set(n.id, n);
        if (n.name) existingNodeMap.set(n.name, n);
        if (n.credentials) {
          if (n.id) existingCredsMap.set(n.id, n.credentials);
          if (n.name) existingCredsMap.set(n.name, n.credentials);
        }
      });
    } catch (fetchErr) {
      console.warn('[n8n Fetch Current Workflow Warning]:', fetchErr.message);
    }

    // 1. Ánh xạ toàn bộ React Flow Canvas sang format chuẩn n8n
    const n8nWorkflow = convertReactFlowToN8nWorkflow(nodes, edges || []);

    // 1.1 Khôi phục credentials, onError, continueOnFail và parameters chi tiết từ n8n
    n8nWorkflow.nodes = (n8nWorkflow.nodes || []).map(node => {
      const existing = existingNodeMap.get(node.id) || existingNodeMap.get(node.name);
      let creds = node.credentials || existingCredsMap.get(node.id) || existingCredsMap.get(node.name);
      if ((!creds || creds?.smtp?.id === 'zfajz1KuP6tbGlLT') && node.type === 'n8n-nodes-base.emailSend') {
        creds = { smtp: { id: activeSmtpCredId || 'ekFQWSwdgJnf8cGu', name: 'SMTP account' } };
      }
      
      const merged = { ...node };
      if (creds) merged.credentials = creds;
      if (!merged.onError && existing?.onError) merged.onError = existing.onError;
      if (merged.continueOnFail === undefined && existing?.continueOnFail !== undefined) merged.continueOnFail = existing.continueOnFail;
      const origRfNode = (nodes || []).find(rn => (rn.id || rn.name) === node.id || rn.data?.title === node.name);
      const isNodeDisabled = Boolean(
        node.disabled === true ||
        (origRfNode?.data?.disabled !== undefined ? origRfNode.data.disabled : origRfNode?.disabled)
      );

      if (isNodeDisabled) {
        merged.disabled = true;
      } else {
        delete merged.disabled;
      }

      // Giữ lại conditions cho IF nodes nếu canvas bị rỗng
      if (node.type === 'n8n-nodes-base.if' && (!merged.parameters?.conditions || Object.keys(merged.parameters.conditions).length === 0) && existing?.parameters?.conditions) {
        merged.parameters = { ...merged.parameters, conditions: existing.parameters.conditions };
      }

      return merged;
    });

    console.log('\n==================================================');
    console.log(`[n8n PUT] 📤 Đang đẩy dữ liệu Canvas lên n8n Web (${n8nBase}/api/v1/workflows/${workflowId}):`);
    console.log(` - Số lượng Nodes gửi đi: ${n8nWorkflow.nodes?.length || 0} nodes`);
    console.log(` - Số lượng kết nối (Connections): ${Object.keys(n8nWorkflow.connections || {}).length}`);
    console.log(` - Trạng thái Active trước khi lưu: ${wasActive}`);

    // 2. Tạm ngưng xuất bản (Unpublish) trước khi lưu để n8n cập nhật nhanh (~150ms) không bị timeout hay blocking
    if (wasActive) {
      try {
        await axios.post(`${n8nBase}/api/v1/workflows/${workflowId}/unpublish`, {}, {
          headers: { 'X-N8N-API-KEY': n8nApiKey },
          timeout: 10000,
        });
      } catch (unpubErr) {
        // Fallback sang deactivate cho các bản n8n cũ
        try {
          await axios.post(`${n8nBase}/api/v1/workflows/${workflowId}/deactivate`, {}, {
            headers: { 'X-N8N-API-KEY': n8nApiKey },
            timeout: 10000,
          });
        } catch (deactErr) {
          console.warn('[n8n Unpublish/Deactivate Warning]:', unpubErr.response?.data?.message || unpubErr.message);
        }
      }
    }

    // 3. Gửi request PUT trực tiếp lên n8n Web Server
    const n8nResponse = await axios.put(
      `${n8nBase}/api/v1/workflows/${workflowId}`,
      {
        name: "Master SOAR Playbook",
        nodes: n8nWorkflow.nodes,
        connections: n8nWorkflow.connections,
        settings: n8nWorkflow.settings || { executionOrder: "v1", binaryMode: "separate" },
      },
      {
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const savedWf = n8nResponse.data?.data || n8nResponse.data;
    console.log(`[n8n PUT] ✅ n8n Web đã lưu thành công!`);
    console.log(` - ID Workflow: ${savedWf?.id}`);
    console.log(` - Tên Workflow: "${savedWf?.name}"`);
    console.log(` - Số Nodes đã lưu trên n8n Web: ${savedWf?.nodes?.length || 0} nodes`);

    // 4. Nếu trước đó đang Publish, xuất bản lại Workflow (Publish)
    if (wasActive) {
      try {
        await axios.post(`${n8nBase}/api/v1/workflows/${workflowId}/publish`, {}, {
          headers: { 'X-N8N-API-KEY': n8nApiKey },
          timeout: 15000,
        });
        console.log(`[n8n Publish] ✅ Đã xuất bản (Publish) lại Workflow thành công!`);
      } catch (pubErr) {
        // Fallback sang activate cho các bản n8n cũ
        try {
          await axios.post(`${n8nBase}/api/v1/workflows/${workflowId}/activate`, {}, {
            headers: { 'X-N8N-API-KEY': n8nApiKey },
            timeout: 15000,
          });
          console.log(`[n8n Activate Fallback] ✅ Đã kích hoạt lại Workflow thành công!`);
        } catch (actErr) {
          console.warn('[n8n Re-publish/Activate Warning]:', pubErr.response?.data?.message || pubErr.message);
        }
      }
    }
    console.log('==================================================\n');

    // 5. Tự động đồng bộ webhook_path cho 10 kịch bản con trong MongoDB
    const webhookNodes = nodes.filter(n => 
      (n.type?.includes('webhook') || n.type === 'webhookNode') && 
      (n.data?.rawParameters?.path || n.data?.rawParameters?.url)
    );

    for (const wn of webhookNodes) {
      const rawPath = wn.data?.rawParameters?.path || wn.data?.rawParameters?.url || '';
      const cleanPath = rawPath.replace(/^\//, '').replace(/^webhook\//, '');
      const title = (wn.data?.title || '').toLowerCase();

      let matchedAlertType = null;
      if (title.includes('phishing')) matchedAlertType = 'Phishing Email';
      else if (title.includes('login') || title.includes('suspicious')) matchedAlertType = 'Suspicious Login';
      else if (title.includes('brute')) matchedAlertType = 'Brute Force Attack';
      else if (title.includes('malware')) matchedAlertType = 'Malware Detection';
      else if (title.includes('port')) matchedAlertType = 'Port Scan Detection';
      else if (title.includes('nosql')) matchedAlertType = 'NoSQL Injection';
      else if (title.includes('xss')) matchedAlertType = 'Cross-Site Scripting (XSS)';
      else if (title.includes('idor')) matchedAlertType = 'Insecure Direct Object Reference (IDOR)';
      else if (title.includes('stuffing')) matchedAlertType = 'Credential Stuffing';
      else if (title.includes('ssrf')) matchedAlertType = 'Server-Side Request Forgery (SSRF)';

      if (matchedAlertType) {
        await Playbook.updateOne(
          { alert_type: matchedAlertType },
          { $set: { webhook_path: cleanPath } }
        );
      }
    }

    // 6. BỎ HOÀN TOÀN VIỆC LƯU VỊ TRÍ VÀ DÂY NỐI TRÊN MONGODB ($unset flow_layout)
    await Playbook.updateMany(
      {},
      { 
        $inc: { version: 1 },
        $unset: { 'flow_layout.nodes': 1, 'flow_layout.edges': 1 }
      }
    );

    return {
        message: 'Đã lưu kịch bản trực tiếp lên n8n Web thành công!',
        n8n_data: {
        id: savedWf?.id,
        name: savedWf?.name,
        updatedAt: savedWf?.updatedAt,
        nodeCount: savedWf?.nodes?.length,
      }
    };
}


export const triggerPlaybookService = async ({ alert_id, analystEmail = 'SOC - Annalyst' }) => {
    // ATOMIC UPDATE: Vừa tìm, vừa kiểm tra khóa, vừa cập nhật trong 1 nhịp
    const alert = await Alert.findOneAndUpdate(
      { 
        alert_id: alert_id,
        status: 'New',
        tags: { $ne: 'soar-processing' }
      },
      { 
        $set: { status: 'In Progress' },
        $push: { tags: 'soar-processing' }
      },
      { new: true }
    );

    if (!alert) {
      const existingAlert = await Alert.findOne({ alert_id });
      const lastLog = await ExecutionLog.findOne({ alert_id }).sort({ createdAt: -1 });
      const lockedBy = lastLog?.executed_by || 'một chuyên viên khác';
      const currentStatus = existingAlert?.status || 'In Progress';

      return {
        statusCode: 400,
        success: false, 
        already_triggered: true,
        locked_by: lockedBy,
        current_status: currentStatus,
        message: `Sự cố này đã được ${lockedBy} kích hoạt xử lý trước đó. Hệ thống đã tự động khóa để chống trùng lặp.` 
      };
    }

    // ĐỌC WEBHOOK ĐỘNG TỪ MASTER CANVAS VÀ DATABASE
    let playbook = await Playbook.findOne({ alert_type: alert.type, is_active: true });
    let webhookPath = playbook?.webhook_path;
    let playbookName = playbook?.name;

    // Danh mục Webhook chuẩn n8n cho 10 kịch bản
    if (!webhookPath) {
      const STANDARD_WEBHOOKS = {
        'Phishing Email': '/webhook/trigger-phishing',
        'Suspicious Login': '/webhook/trigger-login',
        'Brute Force Attack': '/webhook/trigger-bruteforce',
        'Malware Detection': '/webhook/trigger-malware',
        'Port Scan Detection': '/webhook/trigger-portscan',
        'NoSQL Injection Detection': '/webhook/trigger-nosql',
        'Cross-Site Scripting (XSS)': '/webhook/trigger-xss',
        'Insecure Direct Object Reference (IDOR)': '/webhook/trigger-idor',
        'Credential Stuffing': '/webhook/trigger-stuffing',
        'Server-Side Request Forgery (SSRF)': '/webhook/trigger-ssrf',
      };
      webhookPath = STANDARD_WEBHOOKS[alert.type];
      playbookName = `Playbook: ${alert.type}`;
    }

    if (!webhookPath) {
      // Rollback trạng thái nếu kịch bản chưa có trong DB
      await Alert.updateOne({ alert_id }, { $set: { status: 'New' }, $pull: { tags: 'soar-processing' } });
      return { 
        statusCode: 400,
        success: false, 
        message: `Loại sự cố "${alert.type}" chưa có Playbook hỗ trợ trong hệ thống!` 
      };
    }

    // const n8nUrl = `${N8N_LOCAL_URL}${webhookPath}`;
    const n8nUrl = formatN8nWebhook(N8N_LOCAL_URL, webhookPath);
    console.log('[n8n Webhook] URL:', n8nUrl);


    await ExecutionLog.create({
      execution_id: uuidv4(),
      alert_id,
      step_name: 'Manual Playbook Trigger',
      message: `Chuyên viên (${analystEmail}) đã kích hoạt Playbook: ${playbookName}`,
      status: 'IN_PROGRESS',
      executed_by: analystEmail,
      victim_email: alert.victim_email || 'isseidat159@gmail.com'
    });


    // 1. Chuyển alert thành Plain JSON Object sạch
    const payload = alert.toObject ? alert.toObject() : alert;

    // 2. Danh sách các URL n8n dự phòng (tự động thích ứng dù chạy bằng Local hay Docker)
    const baseCandidates = [
      N8N_LOCAL_URL,
      'http://localhost:5678',
      // 'http://n8n:567',
      'http://host.docker.internal:5678'
    ].filter(Boolean);

    // 3. Bắn request sang n8n Webhook ngầm kèm cơ chế Fallback & Rollback an toàn
    (async () => {
      let lastErr = null;
      let isSuccess = false;

      for (const base of baseCandidates) {
        const targetUrl = formatN8nWebhook(base, webhookPath);
        try {
          const res = await axios.post(targetUrl, payload, { timeout: 8000 });
          console.log(`[n8n Webhook Success] ✅ Đã kích hoạt n8n thành công: ${targetUrl}`, res.data);
          isSuccess = true;
          // Kích hoạt Fallback Watchdog (60s): nếu n8n ngắt giữa chừng và không gọi callback, tự động giải phóng
          armWatchdogForAlert(alert_id, 60000);
          break; // Thành công thì thoát vòng lặp
        } catch (err) {
          lastErr = err;
          // Nếu n8n đã phản hồi mã HTTP (ví dụ 404/500), tức là kết nối mạng đã thông tới n8n, không cần thử host khác
          if (err.response) {
            break;
          }
          console.warn(`[n8n Webhook Warning] Không kết nối được ${targetUrl}: ${err.message}. Đang thử URL dự phòng...`);
        }
      }

      // Xử lý khi tất cả các đường truyền đều thất bại
      if (!isSuccess && lastErr) {
        const errDetail = lastErr.response?.data?.message || lastErr.response?.data || lastErr.message;
        console.error(`[n8n Webhook Error] ❌ Gửi Webhook thất bại cho sự cố ${alert_id}:`, errDetail);

        // A. Ghi log thất bại
        await ExecutionLog.create({
          execution_id: uuidv4(),
          alert_id,
          step_name: 'n8n Dispatch Error',
          message: `Không thể kết nối n8n: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`,
          status: 'FAILED',
          executed_by: 'SOAR-System'
        });

        // B. Rollback giải phóng Alert khỏi trạng thái kẹt "In Progress"
        try {
          await Alert.updateOne(
            { alert_id },
            { 
              $set: { status: 'Closed - Error' }, 
              $pull: { tags: { $in: ['soar-processing', 'soar-done'] } } 
            }
          );
          await Alert.updateOne(
            { alert_id },
            { $addToSet: { tags: 'soar-error' } }
          );
        } catch (dbErr) {
          console.error('[Rollback DB Error]:', dbErr.message);
        }

        // C. Gửi Email thông báo sự cố cho Quản lý với đúng định dạng tham số
        sendManagerErrorAlert({
          alert_id,
          type: alert.type,
          step_name: 'n8n Dispatch Error',
          message: `Lỗi kết nối n8n Webhook: ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`,
          executed_by: analystEmail
        }).catch(() => {});
      }
    })();

    return {
        message: `Đã kích hoạt thành công Playbook "${playbookName}" sang n8n!`,
        data: { alert_id, playbook: playbookName, webhook: webhookPath, analystEmail }
    };
};

export const syncWorkflowFromN8nService = async ({ workflowId = 'ay2nW4EWg2uAcjJL' } = {}) => {
  const n8nBase = config.n8n.baseUrl;
  const n8nApiKey = config.n8n.apiKey;

  let workflowData = null;

  // Thử 1: Gọi qua n8n Public API với X-N8N-API-KEY (nếu đã cấu hình)
  if (n8nApiKey) {
    try {
      const publicRes = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': n8nApiKey },
        timeout: 8000
      });
      if (publicRes.data) {
        workflowData = publicRes.data.data || publicRes.data;
      }
    } catch (e) {
      console.warn(`[Sync n8n] Public API (${n8nBase}/api/v1/workflows/${workflowId}) failed: ${e.message}`);
    }
  }

  // Thử 2: Gọi qua n8n internal REST endpoint (/rest/workflows/:id)
  if (!workflowData) {
    try {
      const restRes = await axios.get(`${n8nBase}/rest/workflows/${workflowId}`, {
        timeout: 8000
      });
      if (restRes.data) {
        workflowData = restRes.data.data || restRes.data;
      }
    } catch (e) {
      console.warn(`[Sync n8n] Internal REST API (${n8nBase}/rest/workflows/${workflowId}) failed: ${e.message}`);
    }
  }

  // Thử 3: Fallback qua localhost nếu N8N_LOCAL_URL đang trỏ host.docker.internal
  if (!workflowData && n8nBase.includes('host.docker.internal')) {
    try {
      const localRes = await axios.get(`http://localhost:5678/rest/workflows/${workflowId}`, {
        timeout: 5000
      });
      if (localRes.data) {
        workflowData = localRes.data.data || localRes.data;
      }
    } catch (e) {
      console.warn(`[Sync n8n] Localhost fallback failed: ${e.message}`);
    }
  }

  if (!workflowData || !Array.isArray(workflowData.nodes)) {
    return {
      statusCode: 404,
      success: false,
      message: `Không thể kết nối hoặc không tìm thấy Workflow ID "${workflowId}" trên n8n! Vui lòng đảm bảo n8n đang chạy tại ${n8nBase} hoặc dán trực tiếp mã JSON vào ô bên dưới.`
    };
  }

  return {
    message: `Đã kéo thành công dữ liệu Workflow "${workflowData.name || workflowId}" từ n8n!`,
    data: workflowData
  };
};

// ==========================================
// 8. LẤY & CẬP NHẬT THÔNG TIN CREDENTIAL SMTP CHO N8N WORKFLOW
// ==========================================
export const getSmtpCredentialService = async () => {
  const n8nBase = config.n8n.baseUrl;
  const n8nApiKey = config.n8n.apiKey;
  const workflowId = config.n8n.masterWorkflowId;

  let credId = activeSmtpCredId;
  if (!credId || credId === 'iuBTRMOr7yPQSrZ6') {
    try {
      const wfRes = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': n8nApiKey },
        timeout: 5000,
      });
      const mailNode = wfRes.data?.nodes?.find((n) => n.type && n.type.includes('emailSend') && n.credentials?.smtp?.id);
      if (mailNode) {
        credId = mailNode.credentials.smtp.id;
        activeSmtpCredId = credId;
      }
    } catch (e) {
      // fallback
    }
  }

  credId = credId || 'ekFQWSwdgJnf8cGu';

  let credDetails = null;
  if (credId) {
    try {
      const res = await axios.get(`${n8nBase}/api/v1/credentials/${credId}`, {
        headers: { 'X-N8N-API-KEY': n8nApiKey },
        timeout: 5000,
      });
      credDetails = res.data;
    } catch (e) {
      // fallback nếu không tìm thấy id
    }
  }

  return {
    user: config.mail.user || 'dat.tanvo6767@gmail.com',
    password: config.mail.pass,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    credentialName: credDetails?.name || 'SMTP account',
    credentialId: credDetails?.id || credId,
    createdAt: credDetails?.createdAt || new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updatedAt: credDetails?.updatedAt || new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  };
};

export const updateSmtpCredentialService = async ({ user, password, host = 'smtp.gmail.com', port = 465, secure = true }) => {
  const n8nBase = config.n8n.baseUrl;
  const n8nApiKey = config.n8n.apiKey;
  const workflowId = config.n8n.masterWorkflowId;

  const cleanUser = (user || config.mail.user || 'dat.tanvo6767@gmail.com').trim();
  const cleanPass = (password || config.mail.pass || '').trim().replace(/\s+/g, '');
  const cleanHost = (host || 'smtp.gmail.com').trim();
  const cleanPort = Number(port) || 465;
  const cleanSecure = secure !== undefined ? Boolean(secure) : true;

  if (!cleanPass) {
    throw new Error('Mật khẩu ứng dụng / App Password không được để trống.');
  }

  // 1. Tạo Credential mới trên n8n thông qua Public API
  const credRes = await axios.post(
    `${n8nBase}/api/v1/credentials`,
    {
      name: 'SMTP account',
      type: 'smtp',
      data: {
        user: cleanUser,
        password: cleanPass,
        host: cleanHost,
        port: cleanPort,
        secure: cleanSecure,
      },
    },
    {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  const newCredentialId = credRes.data?.id;
  if (!newCredentialId) {
    throw new Error('n8n không trả về ID credential mới.');
  }

  activeSmtpCredId = newCredentialId;

  // 2. Cập nhật tất cả các Node email trong Master Workflow trên n8n
  const wfRes = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey },
    timeout: 10000,
  });

  const wf = wfRes.data;
  let updatedCount = 0;
  if (Array.isArray(wf.nodes)) {
    wf.nodes.forEach((n) => {
      if (n.type && n.type.includes('emailSend')) {
        n.credentials = {
          smtp: {
            id: newCredentialId,
            name: 'SMTP account',
          },
        };
        if (n.parameters && (!n.parameters.fromEmail || n.parameters.fromEmail.includes('@gmail.com'))) {
          n.parameters.fromEmail = cleanUser;
        }
        updatedCount++;
      }
    });
  }

  await axios.put(
    `${n8nBase}/api/v1/workflows/${workflowId}`,
    {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings,
    },
    {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  // 3. Đồng bộ vào runtime process.env
  process.env.EMAIL_USER = cleanUser;
  process.env.EMAIL_PASS = cleanPass;

  // 4. Cập nhật các file .env nếu có để duy trì sau khởi động lại container
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
      path.resolve('/app/.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        content = content.replace(/^EMAIL_USER=.*/m, `EMAIL_USER=${cleanUser}`);
        content = content.replace(/^EMAIL_PASS=.*/m, `EMAIL_PASS=${cleanPass}`);
        fs.writeFileSync(envPath, content, 'utf8');
      }
    }
  } catch (envErr) {
    console.warn('[Sync .env Warning]:', envErr.message);
  }

  return {
    success: true,
    credentialId: newCredentialId,
    credentialName: 'SMTP account',
    updatedNodesCount: updatedCount,
    user: cleanUser,
    message: `Đã cập nhật SMTP App Key thành công vào ${updatedCount} node trong n8n workflow!`,
  };
};

export const deleteSmtpCredentialService = async () => {
  const n8nBase = config.n8n.baseUrl;
  const n8nApiKey = config.n8n.apiKey;
  const workflowId = config.n8n.masterWorkflowId;

  const wfRes = await axios.get(`${n8nBase}/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey },
    timeout: 10000,
  });

  const wf = wfRes.data;
  let unlinkedCount = 0;
  if (Array.isArray(wf.nodes)) {
    wf.nodes.forEach((n) => {
      if (n.type && n.type.includes('emailSend')) {
        delete n.credentials;
        unlinkedCount++;
      }
    });
  }

  await axios.put(
    `${n8nBase}/api/v1/workflows/${workflowId}`,
    {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings,
    },
    {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  activeSmtpCredId = null;
  process.env.EMAIL_PASS = '';

  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
      path.resolve('/app/.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        content = content.replace(/^EMAIL_PASS=.*/m, `EMAIL_PASS=`);
        fs.writeFileSync(envPath, content, 'utf8');
      }
    }
  } catch (envErr) {
    console.warn('[Delete .env Key Warning]:', envErr.message);
  }

  return {
    success: true,
    message: `Đã xóa và ngắt kết nối Credential khỏi ${unlinkedCount} node trong Workflow thành công!`,
  };
};
