import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from '../clients/mailClient.js';
import { ALERT_STATUS, ALERT_TAGS, LOG_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';


export const handleWebhookService = async ({ alert_id, status, step_name, message, execution_id, executed_by, tag }) => {
    // 1. Cập nhật trạng thái Alert và gắn tag định danh
    const alert = await Alert.findOne({ alert_id });
    if (alert) {
      if (status) {
        const s = status.toLowerCase();
        if (s.includes('error') || s.includes('fail')) {
          alert.status = ALERT_STATUS.CLOSED_ERROR;
        } else if (s.includes('false positive')) {
          alert.status = ALERT_STATUS.CLOSED_FALSE_POSITIVE;
        } else if (s.includes('resolved') || s.includes('success') || s.includes('done') || s.includes('closed')) {
          alert.status = ALERT_STATUS.RESOLVED;
        } else if (Object.values(ALERT_STATUS).includes(status)) {
            alert.status = status;
        }
      }
      

      if (!alert.tags) alert.tags = [];

      // Xóa tag soar-processing
      alert.tags = alert.tags.filter(t => t !== ALERT_TAGS.PROCESS);

      // Tự động gắn tag phù hợp và loại trừ triệt để tag xung đột
      if (tag === ALERT_TAGS.DONE || alert.status === ALERT_STATUS.RESOLVED || alert.status === ALERT_STATUS.CLOSED_FALSE_POSITIVE) {
      alert.tags = alert.tags.filter(t => t !== ALERT_TAGS.ERROR);
      if (!alert.tags.includes(ALERT_TAGS.DONE)) alert.tags.push(ALERT_TAGS.DONE);
    } else if (tag === ALERT_TAGS.ERROR || alert.status === ALERT_STATUS.CLOSED_ERROR) {
      alert.tags = alert.tags.filter(t => t !== ALERT_TAGS.DONE);
      if (!alert.tags.includes(ALERT_TAGS.ERROR)) alert.tags.push(ALERT_TAGS.ERROR);
    } else if (tag) {
      if (!alert.tags.includes(tag)) alert.tags.push(tag);
    }

    await alert.save();
  }

    // 2. Lưu bản ghi lịch sử thực thi (ExecutionLog) kèm rõ đối tượng thực hiện
    const isErrorStatus = Boolean(
      status && (status.toLowerCase().includes('error') || status.toLowerCase().includes('fail'))
    );
    const logRecord = await ExecutionLog.create({
      execution_id: execution_id || uuidv4(),
      alert_id,
      step_name: step_name || 'SOAR Automated Action',
      message: message || 'Đã nhận kết quả tự động hóa từ n8n',
      status: isErrorStatus ? LOG_STATUS.FAILED : LOG_STATUS.SUCCESS,
      executed_by: executed_by || 'SOAR-System',
      victim_email: alert?.victim_email || ''
    });

    // 3. Nếu quy trình SOAR gặp lỗi, tự động gửi email thông báo chi tiết cho Quản lý (MANAGER_EMAIL)
    const isError = isErrorStatus ||
                    alert?.status === ALERT_STATUS.CLOSED_ERROR ||
                    tag === ALERT_TAGS.ERROR;

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
        logger.error({ alertId: alert_id, err }, 'Failed to send manager error alert email from webhook');
      });
    };

    return {
        message: 'Xử lý Webhook thành công và đã cập nhật audit logs',
        data: logRecord
  }
}