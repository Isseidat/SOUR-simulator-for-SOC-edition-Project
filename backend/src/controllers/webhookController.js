import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from '../utils/mailer.js';

// POST /api/v1/webhook - n8n gọi về sau khi xử lý xong các node
export const handleWebhook = async (req, res) => {
  try {
    const { alert_id, status, step_name, message, execution_id, executed_by, tag } = req.body;

    if (!alert_id) {
      return res.status(400).json({ success: false, message: 'Thiếu alert_id trong body' });
    }

    // 1. Cập nhật trạng thái Alert và gắn tag định danh
    const alert = await Alert.findOne({ alert_id });
    if (alert) {
      if (status) {
        const s = status.toLowerCase();
        if (s.includes('error') || s.includes('fail')) {
          alert.status = 'Closed - Error';
        } else if (s.includes('false positive')) {
          alert.status = 'Closed - False Positive';
        } else if (s.includes('resolved') || s.includes('success') || s.includes('done') || s.includes('closed')) {
          alert.status = 'Resolved';
        } else {
          const validStatuses = ['New', 'In Progress', 'Resolved', 'Closed - False Positive', 'Closed - Error'];
          if (validStatuses.includes(status)) {
            alert.status = status;
          }
        }
      }

      if (!alert.tags) alert.tags = [];

      // Xóa tag soar-processing nếu có
      alert.tags = alert.tags.filter(t => t !== 'soar-processing');

      // Tự động gắn tag phù hợp
      if (tag) {
        if (!alert.tags.includes(tag)) alert.tags.push(tag);
      } else if (alert.status === 'Resolved' || alert.status === 'Closed - False Positive') {
        if (!alert.tags.includes('soar-done')) alert.tags.push('soar-done');
      } else if (alert.status === 'Closed - Error') {
        if (!alert.tags.includes('soar-error')) alert.tags.push('soar-error');
      }

      await alert.save();
    }

    // 2. Lưu bản ghi lịch sử thực thi (ExecutionLog) kèm rõ đối tượng thực hiện
    const logRecord = await ExecutionLog.create({
      execution_id: execution_id || uuidv4(),
      alert_id,
      step_name: step_name || 'SOAR Automated Action',
      message: message || 'Đã nhận kết quả tự động hóa từ n8n',
      status: (status && (status.toLowerCase().includes('error') || status.toLowerCase().includes('fail'))) ? 'FAILED' : 'SUCCESS',
      executed_by: executed_by || 'SOAR-System',
      victim_email: alert?.victim_email || 'isseidat159@gmail.com'
    });

    // 3. Nếu quy trình SOAR gặp lỗi, tự động gửi email thông báo chi tiết cho Quản lý (dat.tanvo6767@gmail.com)
    const isError = (status && (status.toLowerCase().includes('error') || status.toLowerCase().includes('fail'))) ||
                    alert?.status === 'Closed - Error' ||
                    tag === 'soar-error';

    if (isError) {
      sendManagerErrorAlert({
        alert_id,
        type: alert?.type || 'Không xác định',
        severity: alert?.severity || 'Medium',
        source_ip: alert?.source_ip || 'N/A',
        destination_ip: alert?.destination_ip || 'N/A',
        step_name: step_name || 'Xử lý Playbook n8n',
        message: message || 'Tiến trình tự động hóa n8n trả về kết quả thất bại hoặc gặp sự cố',
        executed_by: executed_by || 'SOAR-System',
        timestamp: new Date()
      }).catch(err => {
        console.error('[Webhook Error Mailer Failed]:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Xử lý Webhook thành công và đã cập nhật audit logs',
      data: logRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};