import * as webhookService from '../services/webhookService.js';

// POST /api/v1/webhook - n8n gọi về sau khi xử lý xong các node
export const handleWebhook = async (req, res) => {
  try {
    const { alert_id, status, step_name, message, execution_id, executed_by, tag } = req.body;

    if (!alert_id) {
      return res.status(400).json({ success: false, message: 'Thiếu alert_id trong body' });
    }

    const result = await webhookService.handleWebhookService(req.body);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};