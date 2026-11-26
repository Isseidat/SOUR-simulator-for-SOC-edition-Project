import { EmailTemplate } from "../models/EmailTemplate.js";
import {
  DEFAULT_EMAIL_TEMPLATES,
  SOAR_ERROR_TEMPLATE_TYPES,
} from "../constants/index.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/env.js";

// Khởi tạo 10 mẫu EmailTemplate mặc định vào MongoDB nếu chưa tồn tại (không ghi đè bản đã tùy chỉnh)
export const seedDefaultEmailTemplates = async () => {
  try {
    const ops = DEFAULT_EMAIL_TEMPLATES.map((tpl) => ({
      updateOne: {
        filter: { type: tpl.type },
        update: { $setOnInsert: tpl },
        upsert: true,
      },
    }));

    const result = await EmailTemplate.bulkWrite(ops);
    if (result.upsertedCount > 0) {
      logger.info({ upsertedCount: result.upsertedCount }, 'Seeded default EmailTemplates');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to seed default EmailTemplates');
  }
};

export const getTemplateByTypeService = async ({ type, query = {} }) => {
  if (SOAR_ERROR_TEMPLATE_TYPES.includes(type)) {
    return {
      type,
      subject: "[CẢNH BÁO SỰ CỐ SOAR] Phát hiện Lỗi thực thi Playbook Điều phối",
      body: generateManagerErrorEmailHtml({
        alert_id: query?.alert_id || "sample-alert-id",
        type: query?.type || "Hệ thống Điều phối SOAR",
        severity: query?.severity || "High",
        source_ip: query?.source_ip || "N/A",
        destination_ip: query?.destination_ip || "N/A",
        step_name: query?.step_name || "Rà soát tự động n8n",
        message: query?.message || "Lỗi phát sinh trong quá trình thực thi Playbook tự động",
        executed_by: query?.executed_by || "SOAR-System",
      }),
      recipients: config.mail.managerEmail ? [config.mail.managerEmail] : [],
      cc: config.mail.ccEmail ? [config.mail.ccEmail] : [],
    };
  }

  const template = await EmailTemplate.findOne({ type }).lean();
  if (!template) {
    return {
      statusCode: 404,
      success: false,
      message: "Không tìm thấy Template cho loại sự cố này",
    };
  }

  return template;
};

// Hàm tiện ích tạo HTML Email báo cáo sự cố gửi cho Quản lý theo chuẩn giao diện templateController
export const generateManagerErrorEmailHtml = (data = {}) => {
  const {
    alert_id = "N/A",
    type = "Không xác định",
    severity = "Medium",
    source_ip = "N/A",
    destination_ip = "N/A",
    step_name = "Điều phối SOAR",
    message = "Gặp lỗi trong quá trình thực thi Playbook",
    executed_by = "SOAR-System",
    timestamp = new Date(),
  } = data;

  const formattedTime = new Date(timestamp).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color: #c9302c; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">🚨 CẢNH BÁO SỰ CỐ: ĐIỀU PHỐI SOAR GẶP LỖI</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện lỗi nghiêm trọng trong tiến trình tự động hóa Playbook</p>
      </div>
      <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
        <p style="font-size: 16px;">Kính gửi Quản lý hệ thống (<b>${config.mail.managerEmail || "Quản trị viên SOC"}</b>),</p>
        <p>Hệ thống Giám sát An toàn Thông tin & Tự động hóa Phản ứng (SOAR) vừa phát hiện một <b>Lỗi thực thi Playbook</b> trong quá trình xử lý sự cố an ninh mạng.</p>
        
        <div style="background-color: #fdf2f2; border-left: 4px solid #c9302c; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <strong style="color: #a94442;">⚠️ THÔNG TIN CHI TIẾT LỖI PHÁT SINH:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #a94442;">
            <li><b>Mã sự cố (Alert ID):</b> <code style="font-family: monospace; background: #fff; padding: 2px 5px; border: 1px solid #f5c6cb; border-radius: 3px;">${alert_id}</code></li>
            <li><b>Loại cảnh báo:</b> ${type}</li>
            <li><b>Mức độ nghiêm trọng:</b> ${severity}</li>
            <li><b>Địa chỉ IP Nguồn (Attacker):</b> ${source_ip}</li>
            <li><b>Mục tiêu bị tấn công (Target):</b> ${destination_ip}</li>
            <li><b>Bước phát sinh lỗi:</b> <b>${step_name}</b></li>
            <li><b>Đối tượng thực hiện / Kích hoạt:</b> ${executed_by}</li>
            <li><b>Thông báo lỗi chi tiết:</b> <span style="font-weight: bold; color: #b94a48;">${message}</span></li>
            <li><b>Thời gian ghi nhận:</b> ${formattedTime}</li>
          </ul>
        </div>

        <div style="background-color: #fcf8e3; border-left: 4px solid #f0ad4e; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <strong style="color: #8a6d3b;">🛡️ HÀNH ĐỘNG BẢO VỆ CỦA HỆ THỐNG:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #8a6d3b;">
            <li>Cảnh báo đã được tự động gắn nhãn <b>soar-error</b> và chuyển sang trạng thái <b>Closed - Error</b> nhằm cách ly và ngăn ngừa SOAR lặp lại tiến trình lỗi.</li>
            <li>Chi tiết lỗi đã được ghi nhận vào bảng <b>ExecutionLog</b> phục vụ công tác giám sát và điều tra.</li>
            <li>Quản trị viên vui lòng rà soát lại cấu hình n8n, kiểm tra API dịch vụ thứ 3 (VirusTotal/AbuseIPDB/...) hoặc can thiệp xử lý sự cố thủ công.</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
        <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
          Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.<br>
          Thông báo được gửi trực tiếp tới Quản trị viên: <b>${config.mail.managerEmail || "Quản trị viên SOC"}</b>
        </p>
      </div>
    </div>
  `;
};
