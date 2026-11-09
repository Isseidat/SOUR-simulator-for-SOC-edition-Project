import * as playbookService from '../services/playbookService.js';

export { formatN8nWebhook } from '../services/playbookService.js';

// ==========================================
// 1. LẤY TẤT CẢ PLAYBOOKS TỪ DATABASE
// ==========================================
export const getPlaybooks = async (req, res) => {
  try {
    const result = await playbookService.getPlaybooksService();
    
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Playbooks', error: error.message });
  }
};

// ==========================================
// 2. LẤY TOÀN BỘ 990+ NODE TYPES TỪ N8N (IN-MEMORY CACHE)
// ==========================================
export const getN8nNodeTypes = async (req, res) => {
  try {
    const result = await playbookService.getN8nNodeTypesService();

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi nạp n8n Node Types', error: error.message });
  }
};

export const getN8nIconProxy = async (req, res) => {
  try {
    const rawName = (req.query.name || req.query.icon || 'webhook').toLowerCase();
    const svgData = await playbookService.getN8nIconProxyService(rawName);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    return res.send(svgData);
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
    const result = await playbookService.getN8nLiveWorkflowService();
    
    return res.status(200).json({
      success: true,
      ...result
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

    const result = await playbookService.updatePlaybookLayoutService({ id, nodes, edges });

    return res.status(200).json({ 
      success: true, 
      ...result
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
    // Ghi nhận ExecutionLog
    const analystEmail = req.user?.email || req.user?.username || 'SOC-Analyst';
    const result = await playbookService.triggerPlaybookService({ alert_id, analystEmail });

    if (result.statusCode) {
      const { statusCode, ...data } = result;
      return res.status(statusCode).json(data);
    }

    return res.status(200).json({
      success: true,
      ...result
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
    const result = await playbookService.syncWorkflowFromN8nService({ workflowId });

    if (result.statusCode) {
      const { statusCode, ...data } = result;
      return res.status(statusCode).json(data);
    }

    return res.status(200).json({
      success: true,
      ...result
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

// ==========================================
// 8. LẤY & CẬP NHẬT CREDENTIAL SMTP N8N
// ==========================================
export const getSmtpCredentials = async (req, res) => {
  try {
    const creds = await playbookService.getSmtpCredentialService();
    return res.status(200).json({ success: true, data: creds });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình SMTP', error: error.message });
  }
};

export const updateSmtpCredentials = async (req, res) => {
  try {
    const result = await playbookService.updateSmtpCredentialService(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi cập nhật cấu hình SMTP' });
  }
};

export const deleteSmtpCredentials = async (req, res) => {
  try {
    const result = await playbookService.deleteSmtpCredentialService();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi xóa cấu hình SMTP' });
  }
};