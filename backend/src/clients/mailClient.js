import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { generateManagerErrorEmailHtml } from '../services/templateService.js';
import { logger } from '../utils/logger.js';

const createGmailTransporter = (user, pass) =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

export const sendOtpEmail = async (toEmail, otp) => {
  const emailUser = config.mail.user;
  const emailPass = config.mail.pass;

  if (emailUser && emailPass) {
    try {
      const transporter = createGmailTransporter(emailUser, emailPass);

      const mailOptions = {
        from: `"Secure Mock SOAR System" <${emailUser}>`,
        to: toEmail,
        subject: `[Secure Mock SOAR] Mã OTP xác nhận đặt lại mật khẩu: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #111827;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: #111827;">Secure Mock SOAR-Dashboard System</h2>
              <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Hệ Thống Phản Ứng & Điều Hành An Ninh Mạng</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.5; color: #374151;">Xin chào,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #374151;">
              Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email: <strong>${toEmail}</strong>.
            </p>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px;">
                Mã xác thực OTP (Có hiệu lực trong 60 giây)
              </div>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: monospace;">
                ${otp}
              </div>
            </div>

            <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin-bottom: 16px;">
              ⚠️ Cảnh báo an ninh: Mã này sẽ tự động hết hiệu lực sau đúng 60 giây. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
            </p>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
              Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua thư này hoặc thông báo ngay cho ban quản trị SOC.
            </p>
          </div>  
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info({ toEmail }, 'OTP email sent via Gmail SMTP');
      return { success: true };
    } catch (error) {
      logger.error({ err: error, toEmail }, 'Failed to send OTP email via Gmail SMTP');
      return { success: false, error: error.message };
    }
  } else {
    const isProd = config.app.env === 'production';
    logger.warn(
      isProd ? { toEmail } : { toEmail, otp },
      'SMTP not configured, OTP running in mock mode'
    );
    return { success: true, mock: !isProd };
  }
};

// Gửi Email thông báo lỗi SOAR cho Quản lý
export const sendManagerErrorAlert = async (errorData = {}) => {
  const managerEmail = config.mail.managerEmail;

  if (!managerEmail) {
    logger.error('MANAGER_EMAIL is not configured in environment');
    return { success: false, error: 'MANAGER_EMAIL chưa được thiết lập' };
  }

  const ccEmail = config.mail.ccEmail;
  const emailUser = config.mail.user;
  const emailPass = config.mail.pass;

  const alertId = errorData.alert_id || 'UNKNOWN';
  const subject = `[CẢNH BÁO SỰ CỐ SOAR] Lỗi thực thi Playbook - Mã sự cố: ${alertId}`;
  const html = errorData.html || generateManagerErrorEmailHtml(errorData);

  if (emailUser && emailPass) {
    try {
      const transporter = createGmailTransporter(emailUser, emailPass);

      const mailOptions = {
        from: `"Secure Mock SOAR System" <${emailUser}>`,
        to: managerEmail,
        cc: ccEmail,
        subject,
        html
      };

      await transporter.sendMail(mailOptions);
      logger.info({ alertId, managerEmail, ccEmail }, 'Manager error alert email sent');
      return { success: true };
    } catch (error) {
      logger.error({ err: error, alertId, managerEmail }, 'Failed to send manager error alert email');
      return { success: false, error: error.message };
    }
  } else {
    logger.warn(
      {
        alertId,
        managerEmail,
        ccEmail,
        type: errorData.type || 'N/A',
        stepName: errorData.step_name || 'N/A',
        errorMessage: errorData.message || 'N/A',
        executedBy: errorData.executed_by || 'SOAR-System',
      },
      'SMTP not configured, manager error alert logged in mock mode'
    );
    return { success: true, mock: true };
  }
};

