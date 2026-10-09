import cron from 'node-cron';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/Alert.js';
import { ExecutionLog } from '../models/ExecutionLog.js';
import { generateSingleMockAlert } from '../utils/mockGenerator.js';

const N8N_LOCAL_URL = process.env.N8N_LOCAL_URL || 'http://host.docker.internal:5678';

// Trạng thái bật/tắt toàn cục của Cron Jobs (mặc định bật)
let isCronJobsActive = true;

export const getCronStatus = () => isCronJobsActive;

export const setCronStatus = (active) => {
  isCronJobsActive = Boolean(active);
  return isCronJobsActive;
};

export const initCronJobs = () => {
  // Job 1: Threat Simulator (Mô phỏng tấn công)
  cron.schedule('*/5 * * * *', async () => {
    console.log('Threat Simulator is running');
    if (!isCronJobsActive) return; // Đang tạm dừng
    try {
      const mockData = generateSingleMockAlert();
      await Alert.create(mockData);
    } catch (error) {
      console.error(`[Cron Job - Simulator] Lỗi:`, error.message);
    }
  });

  // Biến cờ (Mutex Lock) để ngăn chặn Cron Job chạy đè lên nhau nếu mạng bị nghẽn
  let isAutoTriageRunning = false;

  // Job 2: Auto Triage (Tự động duyệt và kích hoạt Playbook)
  // Quét mỗi 5 phút một lần để xử lý các cảnh báo 
  cron.schedule('*/5 * * * *', async () => {
    if (!isCronJobsActive) return; // Đang tạm dừng
    // 1. NGĂN CHẶN NGHẼN CỔ CHAI (Mutex Lock)
    if (isAutoTriageRunning) {
      return;
    }

    isAutoTriageRunning = true; // Khóa cửa

    try {

      // Chỉ lấy các cảnh báo tạo từ ngày 05/10/2026 trở đi
      const cutoffDate = new Date('2026-10-05T00:00:00.000Z');

      const unassignedAlerts = await Alert.find({
        status: 'New',
        severity: { $in: ['Low', 'Medium'] }, // Chặn đứng High/Critical, để SOC xử lý bằng tay
        tags: { $ne: 'soar-processing' },
        createdAt: { $gte: cutoffDate }
      })
      .sort({ _id: 1 });

      if (unassignedAlerts.length === 0) {
        return; // Không có gì để duyệt
      }


      for (const alertData of unassignedAlerts) {
        // Áp dụng Atomic Update để khóa cảnh báo giống y hệt lúc người dùng bấm nút
        const alert = await Alert.findOneAndUpdate(
          { alert_id: alertData.alert_id, status: 'New', tags: { $ne: 'soar-processing' } },
          { $set: { status: 'In Progress' }, $push: { tags: 'soar-processing' } },
          { new: true }
        );

        if (!alert) continue; // Nếu đã bị khóa bởi luồng khác thì bỏ qua

        let webhookPath = '';
        switch (alert.type) {
          case 'Phishing Email': webhookPath = '/webhook/trigger-phishing'; break;
          case 'Brute Force Attack': webhookPath = '/webhook/trigger-bruteforce'; break;
          case 'Malware Detection': webhookPath = '/webhook/trigger-malware'; break;
          case 'Suspicious Login': webhookPath = '/webhook/trigger-suspicious-login'; break;
          case 'Port Scan Detection': webhookPath = '/webhook/trigger-portscan'; break;
          case 'NoSQL Injection Detection': webhookPath = '/webhook/trigger-nosql'; break;
          case 'Cross-Site Scripting (XSS)': webhookPath = '/webhook/trigger-xss'; break;
          case 'Insecure Direct Object Reference (IDOR)': webhookPath = '/webhook/trigger-idor'; break;
          case 'Credential Stuffing': webhookPath = '/webhook/trigger-stuffing'; break;
          case 'Server-Side Request Forgery (SSRF)': webhookPath = '/webhook/trigger-ssrf'; break;
          default:
            // Rollback nếu không có webhook
            await Alert.updateOne({ alert_id: alert.alert_id }, { $set: { status: 'New' }, $pull: { tags: 'soar-processing' } });
            continue;
        }

        const n8nUrl = `${N8N_LOCAL_URL}${webhookPath}`;

        await ExecutionLog.create({
          execution_id: uuidv4(),
          alert_id: alert.alert_id,
          step_name: 'Auto-Triage Trigger',
          message: `Cron Job tự động kích hoạt Playbook: ${alert.type}`,
          status: 'SUCCESS',
          executed_by: 'Hệ thống SOAR (Auto)',
          victim_email: alert.victim_email || 'isseidat159@gmail.com'
        });

        // 2. NGĂN CHẶN NGHẼN CỔ CHAI (Hard Timeout)
        // Chờ kết quả gọi n8n (Dùng await), và ÉP CHẾT nếu quá 5 giây (timeout: 5000)
        await axios.post(n8nUrl, alert, { timeout: 5000 }).catch(async (err) => {
          console.error(`[Cron Job - AutoTriage] ❌ Lỗi khi gọi n8n cho ${alert.alert_id}:`, err.message);
          
          // Bọc try-catch bên trong (Chống Swallowed Error)
          try {
            await Alert.updateOne(
              { alert_id: alert.alert_id }, 
              // Fix lỗi xung đột MongoDB khi gọi $pull và $addToSet trên cùng mảng 'tags'
              // Ta pull trước, sau đó addToSet ở bước update khác, hoặc chỉ dùng 1 lệnh đơn giản:
              { $set: { status: 'Closed - Error' }, $pull: { tags: 'soar-processing' } }
            );
            await Alert.updateOne(
              { alert_id: alert.alert_id },
              { $addToSet: { tags: 'soar-error' } }
            );
          } catch (dbErr) {
            console.error(`[Cron Job - AutoTriage] Lỗi khi Rollback DB cho ${alert.alert_id}:`, dbErr.message);
          }
        });

      }
    } catch (error) {
      console.error(`[Cron Job - AutoTriage] Lỗi:`, error.message);
    } finally {
      // Dù thành công hay thất bại (mạng sập) thì cuối cùng cũng phải mở khóa cho Cron chạy tiếp
      isAutoTriageRunning = false;
    }
  });

  // Job 3: Database Cleanup (Dọn dẹp lưu trữ)
  cron.schedule('0 0 * * *', async () => {
    try {

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await Alert.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
    } catch (error) {
      console.error(`[Cron Job - Cleanup] Lỗi dọn dẹp:`, error.message);
    }
  });

};
