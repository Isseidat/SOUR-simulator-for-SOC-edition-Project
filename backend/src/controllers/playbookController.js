import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { Playbook } from '../models/Playbook.js';
import fs from 'fs';
import path from 'path';
import { sendManagerErrorAlert } from '../utils/mailer.js'; 
import { convertReactFlowToN8nWorkflow } from '../utils/playbookConverters.js'; 

// Đọc URL của n8n từ file .env (Mặc định gọi tới n8n chạy local)
const N8N_LOCAL_URL = process.env.N8N_LOCAL_URL || 'http://host.docker.internal:5678';

// ==========================================
// 1. LẤY TẤT CẢ PLAYBOOKS TỪ DATABASE
// ==========================================
export const getPlaybooks = async (req, res) => {
  try {
    const playbooks = await Playbook.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: playbooks });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Playbooks', error: error.message });
  }
};

export const formatN8nWebhook = (baseURL,webhookPath) => {
  const baseWebhook = (baseURL || 'http://localhost:5678').replace(/\/$/, '');
  let clearPath = (webhookPath || '').replace(/^\//, '').replace(/\/$/, '');
  if (!clearPath.startsWith('webhook/')) {
    clearPath = 'webhook/' + clearPath;
  }
  return `${baseWebhook}/${clearPath}`
}

// ==========================================
// CACHE CHO N8N NODE TYPES
// ==========================================
let cachedNodeTypes = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

// ==========================================
// 2. LẤY TOÀN BỘ 990+ NODE TYPES TỪ N8N (IN-MEMORY CACHE)
// ==========================================
export const getN8nNodeTypes = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedNodeTypes && (now - lastCacheTime < CACHE_TTL_MS)) {
      return res.status(200).json({ success: true, count: cachedNodeTypes.length, data: cachedNodeTypes });
    }

    const n8nBase = process.env.N8N_LOCAL_URL || 'http://localhost:5678';
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
      return res.status(503).json({ success: false, message: 'Không thể kết nối tới máy chủ n8n để lấy danh mục Node Types' });
    }

    cachedNodeTypes = nodesData;
    lastCacheTime = now;

    return res.status(200).json({ success: true, count: nodesData.length, data: nodesData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi nạp n8n Node Types', error: error.message });
  }
};

// ==========================================
// 3. PROXY TẢI ICON SVG CHUẨN TỪ N8N (TRÁNH LỖI CORS & PHỤC VỤ TRỰC TIẾP CHO <img>)
// ==========================================
const BUILTIN_SVGS = {
  webhook: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="#F24B7B" d="M35 37c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#F24B7B" d="M35 43c-3 0-5.9-1.4-7.8-3.7l3.1-2.5c1.1 1.4 2.9 2.3 4.7 2.3 3.3 0 6-2.7 6-6s-2.7-6-6-6c-1 0-2 .3-2.9.7l-1.7 1L23.3 16l3.5-1.9 5.3 9.4c1-.3 2-.5 3-.5 5.5 0 10 4.5 10 10S40.5 43 35 43"/><path fill="#F24B7B" d="M14 43C8.5 43 4 38.5 4 33c0-4.6 3.1-8.5 7.5-9.7l1 3.9C9.9 27.9 8 30.3 8 33c0 3.3 2.7 6 6 6s6-2.7 6-6v-2h15v4H23.8c-.9 4.6-5 8-9.8 8"/><path fill="#FF6D98" d="M14 37c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#F24B7B" d="M25 19c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4"/><path fill="#FF6D98" d="m15.7 34-3.4-2 5.9-9.7c-2-1.9-3.2-4.5-3.2-7.3 0-5.5 4.5-10 10-10s10 4.5 10 10c0 .9-.1 1.7-.3 2.5l-3.9-1c.1-.5.2-1 .2-1.5 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 2.1 1.1 4 2.9 5.1l1.7 1z"/></svg>`,
  if: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="6.5" cy="12" r="3" stroke="#00C950" stroke-width="2"/><circle cx="17.5" cy="6" r="3" stroke="#00C950" stroke-width="2"/><circle cx="17.5" cy="18" r="3" stroke="#00C950" stroke-width="2"/><path stroke="#00C950" stroke-width="2" d="M9.5 12h3.5m0 0 2.5-4.5m-2.5 4.5 2.5 4.5"/></svg>`,
  wait: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#F188A2" stroke-width="2" d="M18.25 20.25H5.75v-2.629c0-.397.158-.779.44-1.06l3.706-3.707a1.207 1.207 0 0 0 0-1.708L6.19 7.44a1.5 1.5 0 0 1-.439-1.06V3.75h12.5v2.629a1.5 1.5 0 0 1-.44 1.06l-3.706 3.707a1.207 1.207 0 0 0 0 1.708l3.707 3.707a1.5 1.5 0 0 1 .439 1.06z"/></svg>`,
  switch: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="6" cy="12" r="3" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="5" r="2.5" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="12" r="2.5" stroke="#FFB966" stroke-width="2"/><circle cx="18" cy="19" r="2.5" stroke="#FFB966" stroke-width="2"/><path stroke="#FFB966" stroke-width="2" d="M9 12h4m0 0 2.5-6m-2.5 6h2.5m-2.5 0 2.5 6"/></svg>`,
  stickynote: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="#eab308" stroke-width="2" d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><path stroke="#eab308" stroke-width="2" d="M15 3v5h5"/></svg>`
};

export const getN8nIconProxy = async (req, res) => {
  try {
    const rawName = (req.query.name || req.query.icon || 'webhook').toLowerCase();
    const cleanName = rawName.replace('n8n-nodes-base.', '').replace('node:', '').replace('.svg', '');

    // 1. Kiểm tra built-in SVGs (If, Wait, Switch, StickyNote)
    if (BUILTIN_SVGS[cleanName]) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(BUILTIN_SVGS[cleanName]);
    }

    // 2. Tra cứu ứng cử viên URL từ n8n
    const n8nBases = [
      process.env.N8N_LOCAL_URL,
      'http://soar_n8n:5678',
      'http://host.docker.internal:5678',
      'http://localhost:5678'
    ].filter(Boolean);

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
    } else if (cleanName === 'emailsend' || cleanName === 'mail' || cleanName === 'gmail') {
      candidates.unshift('/icons/n8n-nodes-base/dist/nodes/Google/Gmail/gmail.svg');
    }

    for (const n8nBase of n8nBases) {
      for (const path of candidates) {
        try {
          const svgRes = await axios.get(`${n8nBase}${path}`, { timeout: 2000 });
          if (svgRes.headers['content-type']?.includes('svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(svgRes.data);
          }
        } catch (err) {
          // Thử đường dẫn tiếp theo
        }
      }
    }

    // 3. Fallback: SVG icon mặc định
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.5" d="m9 12 2 2 4-4"/></svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(fallbackSvg);
  } catch (error) {
    const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="4" stroke="currentColor" stroke-width="1.5"/></svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(errorSvg);
  }
};


// ==========================================
// 3. TẢI WORKFLOW TRỰC TIẾP TỪ N8N WEB (SINGLE SOURCE OF TRUTH)
// ==========================================
export const getN8nLiveWorkflow = async (req, res) => {
  try {
    const n8nBase = process.env.N8N_LOCAL_URL || 'http://n8n:5678';
    const workflowId = process.env.N8N_MASTER_WORKFLOW_ID || 'ay2nW4EWg2uAcjJL';
    const n8nApiKey = process.env.N8N_API_KEY;

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
    return res.status(200).json({
      success: true,
      message: 'Đã tải Workflow trực tiếp từ n8n Web!',
      data: response.data,
    });
  } catch (error) {
    console.error('[getN8nLiveWorkflow Error]:', error.response?.data || error.message);
    return res.status(502).json({
      success: false,
      message: 'Không thể kết nối máy chủ n8n: ' + (error.response?.data?.message || error.message),
    });
  }
};

// ==========================================
// 4. LƯU CẤU HÌNH TRỰC TIẾP LÊN N8N WEB (BỎ LƯU VỊ TRÍ TRÊN MONGODB)
// ==========================================
export const updatePlaybookLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { nodes, edges } = req.body;

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách nodes không hợp lệ để lưu' });
    }

    const n8nBase = process.env.N8N_LOCAL_URL || 'http://n8n:5678';
    const workflowId = process.env.N8N_MASTER_WORKFLOW_ID || 'ay2nW4EWg2uAcjJL';
    const n8nApiKey = process.env.N8N_API_KEY;
    // 1. Ánh xạ toàn bộ React Flow Canvas (nodes, vị trí x/y, parameters, sticky note, connections) sang format chuẩn n8n
    const n8nWorkflow = convertReactFlowToN8nWorkflow(nodes, edges || []);

    console.log('\n==================================================');
    console.log(`[n8n PUT] 📤 Đang đẩy dữ liệu Canvas lên n8n Web (${n8nBase}/api/v1/workflows/${workflowId}):`);
    console.log(` - Số lượng Nodes gửi đi: ${n8nWorkflow.nodes?.length || 0} nodes`);
    console.log(` - Số lượng kết nối (Connections): ${Object.keys(n8nWorkflow.connections || {}).length}`);

    // 2. Gửi request PUT trực tiếp lên n8n Web Server
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
        timeout: 10000,
      }
    );

    const savedWf = n8nResponse.data?.data || n8nResponse.data;
    console.log(`[n8n PUT] ✅ n8n Web đã lưu thành công!`);
    console.log(` - ID Workflow: ${savedWf?.id}`);
    console.log(` - Tên Workflow: "${savedWf?.name}"`);
    console.log(` - Số Nodes đã lưu trên n8n Web: ${savedWf?.nodes?.length || 0} nodes`);
    console.log('==================================================\n');

    // Ghi file backup JSON vào thư mục BACKUP_JSON (thay thế hoàn toàn việc lưu MongoDB)
    try {
      const backupDirs = [
        path.resolve(process.cwd(), 'BACKUP_JSON'),
        path.resolve(process.cwd(), '..', 'BACKUP_JSON'),
      ];
      for (const dir of backupDirs) {
        try {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(
            path.join(dir, 'master_soar_playbook.json'),
            JSON.stringify(n8nResponse.data, null, 2),
            'utf-8'
          );
        } catch (_) {}
      }
    } catch (fsErr) {
      console.warn('[Backup JSON Warning]:', fsErr.message);
    }

    // 3. Tự động đồng bộ webhook_path cho 10 kịch bản con trong MongoDB (chỉ lưu webhook path để kích hoạt sự cố)
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

    // 4. BỎ HOÀN TOÀN VIỆC LƯU VỊ TRÍ VÀ DÂY NỐI TRÊN MONGODB ($unset flow_layout)
    await Playbook.updateOne(
      { playbook_id: id },
      { 
        $inc: { version: 1 },
        $unset: { 'flow_layout.nodes': 1, 'flow_layout.edges': 1 }
      }
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Đã lưu kịch bản trực tiếp lên n8n Web thành công!', 
      n8n_data: {
        id: n8nResponse.data.id,
        name: n8nResponse.data.name,
        updatedAt: n8nResponse.data.updatedAt,
        nodeCount: n8nResponse.data.nodes?.length,
      }
    });
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('[Lưu n8n Web Thất Bại]:', errorMsg);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lưu kịch bản lên n8n Web: ' + errorMsg 
    });
  }
};

// ==========================================
// 6. KÍCH HOẠT PLAYBOOK XỬ LÝ SỰ CỐ
// ==========================================
export const triggerPlaybook = async (req, res) => {
  try {
    const { alert_id } = req.body;

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

      return res.status(400).json({ 
        success: false, 
        already_triggered: true,
        locked_by: lockedBy,
        current_status: currentStatus,
        message: `Sự cố này đã được ${lockedBy} kích hoạt xử lý trước đó. Hệ thống đã tự động khóa để chống trùng lặp.` 
      });
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
      return res.status(400).json({ 
        success: false, 
        message: `Loại sự cố "${alert.type}" chưa có Playbook hỗ trợ trong hệ thống!` 
      });
    }

    // const n8nUrl = `${N8N_LOCAL_URL}${webhookPath}`;
    const n8nUrl = formatN8nWebhook(N8N_LOCAL_URL, webhookPath);
    console.log('[n8n Webhook] URL:', n8nUrl);

    

    // Ghi nhận ExecutionLog
    const analystEmail = req.user?.email || req.user?.username || 'SOC-Analyst';
    await ExecutionLog.create({
      execution_id: uuidv4(),
      alert_id,
      step_name: 'Manual Playbook Trigger',
      message: `Chuyên viên (${analystEmail}) đã kích hoạt Playbook: ${playbookName}`,
      status: 'IN_PROGRESS',
      executed_by: analystEmail,
      victim_email: alert.victim_email || 'isseidat159@gmail.com'
    });

    // // Bắn request sang n8n Webhook ngầm
    // axios.post(n8nUrl, alert, { timeout: 15000 }).catch(async (n8nErr) => {
    //   console.error(`[n8n Webhook Error] ${n8nUrl}:`, n8nErr.message);
    //   await ExecutionLog.create({
    //     execution_id: uuidv4(),
    //     alert_id,
    //     step_name: 'n8n Dispatch Error',
    //     message: `Không thể kết nối n8n: ${n8nErr.message}`,
    //     status: 'FAILED',
    //     executed_by: 'SOAR-System'
    //   });
    //   sendManagerErrorAlert(alert, n8nErr).catch(() => {});
    // });


        // 1. Chuyển alert thành Plain JSON Object sạch
    const payload = alert.toObject ? alert.toObject() : alert;

    // 2. Danh sách các URL n8n dự phòng (tự động thích ứng dù chạy bằng Local hay Docker)
    const baseCandidates = [
      N8N_LOCAL_URL,
      'http://localhost:5678',
      'http://n8n:5678',
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
              $pull: { tags: 'soar-processing' } 
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

    return res.status(200).json({
      success: true,
      message: `Đã kích hoạt thành công Playbook "${playbookName}" sang n8n!`,
      data: { alert_id, playbook: playbookName, webhook: webhookPath }
    });

  } catch (error) {
    console.error('Trigger Playbook Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi kích hoạt kịch bản', error: error.message });
  }
};

// ==========================================
// 7. PROXY ĐỒNG BỘ TRỰC TIẾP TỪ N8N VỀ BACKEND (TRÁNH LỖI CORS TRÊN BROWSER)
// ==========================================
export const syncWorkflowFromN8n = async (req, res) => {
  try {
    const { workflowId = 'ay2nW4EWg2uAcjJL' } = req.body;
    // Đọc URL n8n từ biến môi trường
    const n8nBase = process.env.N8N_LOCAL_URL || 'http://localhost:5678';
    const n8nApiKey = process.env.N8N_API_KEY;

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
      return res.status(404).json({
        success: false,
        message: `Không thể kết nối hoặc không tìm thấy Workflow ID "${workflowId}" trên n8n! Vui lòng đảm bảo n8n đang chạy tại ${n8nBase} hoặc dán trực tiếp mã JSON vào ô bên dưới.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã kéo thành công dữ liệu Workflow "${workflowData.name || workflowId}" từ n8n!`,
      data: workflowData
    });

  } catch (error) {
    console.error('[Sync n8n Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đồng bộ dữ liệu từ n8n',
      error: error.message
    });
  }
};