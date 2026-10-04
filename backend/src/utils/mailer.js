import nodemailer from 'nodemailer';

export const sendOtpEmail = async (toEmail, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

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
      console.log(`[Email Service]: Đã gửi thư OTP thành công tới: ${toEmail}`);
      return { success: true };
    } catch (error) {
      console.error(`[Email Service Error]: Không thể gửi mail qua Gmail SMTP:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`\n==================================================`);
    console.log(`[EMAIL MOCK - CHƯA CẤU HÌNH GMAIL SMTP TRONG .ENV]`);
    console.log(`👉 Người nhận: ${toEmail}`);
    console.log(`👉 Mã OTP xác thực (60s): ${otp}`);
    console.log(`==================================================\n`);
    return { success: true, mock: true };
  }
};

// Gửi Email thông báo lỗi SOAR cho Quản lý (dat.tanvo6767@gmail.com)
export const sendManagerErrorAlert = async (errorData = {}) => {  
  const managerEmail = process.env.MANAGER_EMAIL || 'dat.tanvo6767@gmail.com';
  const ccEmail = process.env.CC_EMAIL || 'perosz4153@gmail.com';
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

  const alertId = errorData.alert_id || 'UNKNOWN';
  const subject = `[CẢNH BÁO SỰ CỐ SOAR] Lỗi thực thi Playbook - Mã sự cố: ${alertId}`;
  
  // Dynamic import hoặc dùng hàm tạo template từ templateController
  const { generateManagerErrorEmailHtml } = await import('../controllers/templateController.js');
  const html = generateManagerErrorEmailHtml(errorData);

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

      const mailOptions = {
        from: `"Secure Mock SOAR System" <${emailUser}>`,
        to: managerEmail,
        cc: ccEmail,
        subject,
        html
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Email Service]: Đã gửi thư báo cáo lỗi tới Quản lý (${managerEmail}) và CC (${ccEmail}) thành công.`);
      return { success: true };
    } catch (error) {
      console.error(`[Email Service Error]: Không thể gửi mail tới Quản lý qua Gmail SMTP:`, error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`\n==================================================`);
    console.log(`[EMAIL MOCK - GỬI CẢNH BÁO LỖI SOAR CHO QUẢN LÝ]`);
    console.log(`👉 Người nhận (Manager): ${managerEmail}`);
    console.log(`👉 CC: ${ccEmail}`);
    console.log(`👉 Tiêu đề: ${subject}`);
    console.log(`👉 Mã sự cố (Alert ID): ${alertId}`);
    console.log(`👉 Loại sự cố: ${errorData.type || 'N/A'}`);
    console.log(`👉 Bước gặp lỗi: ${errorData.step_name || 'N/A'}`);
    console.log(`👉 Chi tiết lỗi: ${errorData.message || 'N/A'}`);
    console.log(`👉 Đối tượng kích hoạt: ${errorData.executed_by || 'SOAR-System'}`);
    console.log(`==================================================\n`);
    return { success: true, mock: true };
  }
};
