import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { sendManagerErrorAlert } from '../utils/mailer.js';

// Đọc URL của n8n từ file .env (Mặc định gọi tới n8n chạy local)
const N8N_LOCAL_URL = process.env.N8N_LOCAL_URL || 'http://host.docker.internal:5678';

export const triggerPlaybook = async (req, res) => {
  try {
    const { alert_id } = req.body;

    // Tìm Alert trong Database
    const alert = await Alert.findOne({ alert_id });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy Alert' });
    }

    // Xác định URL Webhook của n8n tùy theo loại tấn công
    let webhookPath = '';
    switch (alert.type) {
      case 'Phishing Email': webhookPath = '/webhook/trigger-phishing'; break;
      case 'Brute Force Attack': webhookPath = '/webhook/trigger-bruteforce'; break;
      case 'Malware Detection': webhookPath = '/webhook/trigger-malware'; break;
      case 'Suspicious Login': webhookPath = '/webhook/trigger-suspicious-login'; break;
      case 'Port Scan Detection': webhookPath = '/webhook/trigger-portscan'; break;
      case 'NoSQL Injection Detection': webhookPath = '/webhook/trigger-nosql-injection'; break;
      case 'Cross-Site Scripting (XSS)': webhookPath = '/webhook/trigger-xss'; break;
      case 'Insecure Direct Object Reference (IDOR)': webhookPath = '/webhook/trigger-idor'; break;
      case 'Credential Stuffing': webhookPath = '/webhook/trigger-stuffing'; break;
      case 'Server-Side Request Forgery (SSRF)': webhookPath = '/webhook/trigger-ssrf'; break;
      default: return res.status(400).json({ success: false, message: 'Loại sự cố chưa có Playbook hỗ trợ' });
    }

    const n8nUrl = `${N8N_LOCAL_URL}${webhookPath}`;

    // Cập nhật trạng thái Alert thành 'In Progress' và gắn tag 'soar-processing' chống trùng lặp
    alert.status = 'In Progress';
    if (!alert.tags) alert.tags = [];
    if (!alert.tags.includes('soar-processing')) {
      alert.tags.push('soar-processing');
    }
    await alert.save();

    // Ghi nhận ExecutionLog: lưu rõ người đã bấm nút kích hoạt (Analyst / User email)
    const analystEmail = req.user?.email || req.user?.username || 'SOC-Analyst';
    await ExecutionLog.create({
      execution_id: uuidv4(),
      alert_id,
      step_name: 'Manual Playbook Trigger',
      message: `Chuyên viên đã kích hoạt thủ công Playbook: ${alert.type}`,
      status: 'SUCCESS',
      executed_by: analystEmail,
      victim_email: alert?.victim_email || 'isseidat159@gmail.com'
    });

    // Bắn request sang n8n (Chạy ngầm, không dùng await chờ kết quả)
    axios.post(n8nUrl, alert).catch(async (err) => {
      console.error(`[Playbook Error]: Không thể gọi sang n8n: ${err.message}`);
      try {
        const errorMsg = `Không thể gọi sang n8n (${n8nUrl}): ${err.message}`;

        // Cập nhật trạng thái Alert thành 'Closed - Error' và gán nhãn 'soar-error'
        const currentAlert = await Alert.findOne({ alert_id });
        if (currentAlert) {
          currentAlert.status = 'Closed - Error';
          if (!currentAlert.tags) currentAlert.tags = [];
          currentAlert.tags = currentAlert.tags.filter(t => t !== 'soar-processing');
          if (!currentAlert.tags.includes('soar-error')) currentAlert.tags.push('soar-error');
          await currentAlert.save();
        }

        // Lưu ExecutionLog ghi nhận thất bại
        await ExecutionLog.create({
          execution_id: uuidv4(),
          alert_id,
          step_name: 'Khởi chạy Playbook n8n',
          message: errorMsg,
          status: 'FAILED',
          executed_by: analystEmail,
          victim_email: currentAlert?.victim_email || 'isseidat159@gmail.com'
        });

        // Tự động gửi Email thông báo lỗi chi tiết cho Quản lý (dat.tanvo6767@gmail.com)
        await sendManagerErrorAlert({
          alert_id,
          type: currentAlert?.type || alert.type || 'Không xác định',
          severity: currentAlert?.severity || alert.severity || 'Medium',
          source_ip: currentAlert?.source_ip || alert.source_ip || 'N/A',
          destination_ip: currentAlert?.destination_ip || alert.destination_ip || 'N/A',
          step_name: 'Khởi chạy Playbook n8n',
          message: errorMsg,
          executed_by: analystEmail,
          timestamp: new Date()
        });
      } catch (innerErr) {
        console.error('[Playbook Error Handler Failed]:', innerErr.message);
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `Đã kích hoạt Playbook xử lý ${alert.type} thành công.`,
      n8n_url: n8nUrl
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};