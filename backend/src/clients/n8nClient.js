import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const getApiHeaders = (extraHeaders = {}) => ({
  'X-N8N-API-KEY': config.n8n.apiKey,
  ...extraHeaders,
});

export const formatN8nWebhook = (baseURL, webhookPath) => {
  const baseWebhook = (baseURL || 'http://localhost:5678').replace(/\/$/, '');
  let clearPath = (webhookPath || '').replace(/^\//, '').replace(/\/$/, '');
  if (!clearPath.startsWith('webhook/')) {
    clearPath = 'webhook/' + clearPath;
  }
  return `${baseWebhook}/${clearPath}`;
};

export const n8nClient = {
  /**
   * Lấy chi tiết workflow từ n8n Public REST API
   */
  async getWorkflow(workflowId = config.n8n.masterWorkflowId, timeout = 8000) {
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}`,
      { headers: getApiHeaders(), timeout }
    );
    return response.data;
  },

  /**
   * Cập nhật workflow lên n8n Public REST API
   */
  async updateWorkflow(workflowId = config.n8n.masterWorkflowId, payload, timeout = 30000) {
    const response = await axios.put(
      `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}`,
      payload,
      {
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        timeout,
      }
    );
    return response.data;
  },

  /**
   * Tạm ngưng xuất bản workflow (tương thích cả bản n8n mới và cũ)
   */
  async unpublishWorkflow(workflowId = config.n8n.masterWorkflowId) {
    try {
      await axios.post(
        `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}/unpublish`,
        {},
        { headers: getApiHeaders(), timeout: 10000 }
      );
    } catch (unpubErr) {
      try {
        await axios.post(
          `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}/deactivate`,
          {},
          { headers: getApiHeaders(), timeout: 10000 }
        );
      } catch {
        logger.warn(
          { err: unpubErr, workflowId, detail: unpubErr.response?.data?.message },
          'n8n unpublish/deactivate warning'
        );
      }
    }
  },

  /**
   * Xuất bản / kích hoạt lại workflow trên n8n
   */
  async publishWorkflow(workflowId = config.n8n.masterWorkflowId) {
    try {
      await axios.post(
        `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}/publish`,
        {},
        { headers: getApiHeaders(), timeout: 15000 }
      );
      logger.info({ workflowId }, 'n8n workflow published');
    } catch (pubErr) {
      try {
        await axios.post(
          `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}/activate`,
          {},
          { headers: getApiHeaders(), timeout: 15000 }
        );
        logger.info({ workflowId }, 'n8n workflow activated (fallback)');
      } catch {
        logger.warn(
          { err: pubErr, workflowId, detail: pubErr.response?.data?.message },
          'n8n re-publish/activate warning'
        );
      }
    }
  },

  /**
   * Tạo credential mới trên n8n Public REST API
   */
  async createCredential(payload, timeout = 10000) {
    const response = await axios.post(
      `${config.n8n.baseUrl}/api/v1/credentials`,
      payload,
      {
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        timeout,
      }
    );
    return response.data;
  },

  /**
   * Lấy danh sách toàn bộ node types từ n8n (/types/nodes.json)
   */
  async getNodeTypes() {
    const urlsToTry = Array.from(
      new Set([`${config.n8n.baseUrl}/types/nodes.json`, 'http://localhost:5678/types/nodes.json'])
    );

    for (const url of urlsToTry) {
      try {
        const response = await axios.get(url, { timeout: 7000 });
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
      } catch {
        // Thử URL tiếp theo
      }
    }
    return null;
  },

  /**
   * Tải SVG icon từ các URL dự phòng của n8n
   */
  async getIconSvg(candidatePaths = []) {
    for (const n8nBase of config.n8n.fallbackUrls) {
      for (const path of candidatePaths) {
        try {
          const svgRes = await axios.get(`${n8nBase}${path}`, { timeout: 2000 });
          if (svgRes.headers['content-type']?.includes('svg')) {
            return svgRes.data;
          }
        } catch {
          // Thử đường dẫn tiếp theo
        }
      }
    }
    return null;
  },

  /**
   * Thử kéo workflow qua nhiều endpoint (Public API -> Internal REST -> Localhost)
   */
  async fetchWorkflowWithFallbacks(workflowId) {
    if (config.n8n.apiKey) {
      try {
        const publicData = await this.getWorkflow(workflowId, 8000);
        const unwrapped = publicData?.data || publicData;
        if (unwrapped) return unwrapped;
      } catch (e) {
        logger.warn(
          { err: e, workflowId, url: `${config.n8n.baseUrl}/api/v1/workflows/${workflowId}` },
          'Sync n8n Public API failed'
        );
      }
    }

    try {
      const restRes = await axios.get(`${config.n8n.baseUrl}/rest/workflows/${workflowId}`, {
        timeout: 8000,
      });
      const unwrapped = restRes.data?.data || restRes.data;
      if (unwrapped) return unwrapped;
    } catch (e) {
      logger.warn(
        { err: e, workflowId, url: `${config.n8n.baseUrl}/rest/workflows/${workflowId}` },
        'Sync n8n Internal REST API failed'
      );
    }

    if (config.n8n.baseUrl.includes('host.docker.internal')) {
      try {
        const localRes = await axios.get(`http://localhost:5678/rest/workflows/${workflowId}`, {
          timeout: 5000,
        });
        const unwrapped = localRes.data?.data || localRes.data;
        if (unwrapped) return unwrapped;
      } catch (e) {
        logger.warn({ err: e, workflowId }, 'Sync n8n Localhost fallback failed');
      }
    }

    return null;
  },

  /**
   * Bắn Webhook sang n8n với danh sách URL dự phòng (Local / Docker)
   */
  async triggerWebhook(webhookPath, payload, { timeout = 8000, stopOnHttpResponse = true } = {}) {
    const baseCandidates = config.n8n.fallbackUrls;
    let lastErr = null;

    for (const base of baseCandidates) {
      const targetUrl = formatN8nWebhook(base, webhookPath);
      try {
        const res = await axios.post(targetUrl, payload, { timeout });
        return { success: true, targetUrl, data: res.data };
      } catch (err) {
        lastErr = err;
        if (err.response && stopOnHttpResponse) {
          return { success: false, hasHttpResponse: true, targetUrl, error: err };
        }
        logger.warn(
          { err, targetUrl },
          'Failed to connect n8n webhook, trying fallback URL'
        );
      }
    }

    return { success: false, hasHttpResponse: false, error: lastErr };
  },
};

