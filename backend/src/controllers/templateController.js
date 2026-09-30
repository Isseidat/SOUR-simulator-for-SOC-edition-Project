import { EmailTemplate } from '../models/EmailTemplate.js';

// GET /api/v1/templates/:type
export const getTemplateByType = async (req, res) => {
  try {
    const { type } = req.params;
    let template = await EmailTemplate.findOne({ type });

    // Nếu template chưa được tạo trong CSDL, trả về sẵn Template mặc định (để Mock n8n)
    if (!template) {
      if (type === 'Phishing Email') {
        template = {
          type,
          subject: '[CẢNH BÁO BẢO MẬT] Phát hiện Email Lừa đảo (Phishing)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #d9534f; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🚨 CẢNH BÁO AN NINH MẠNG</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống SOAR vừa ngăn chặn một mối đe dọa</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Chào bạn,</p>
                <p>Hệ thống Giám sát An toàn Thông tin (SOAR) vừa phát hiện một <b>Email Lừa Đảo (Phishing)</b> được gửi đến hòm thư của bạn với nghi vấn chứa liên kết độc hại nhằm đánh cắp thông tin tài khoản.</p>
                
                <div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #b94a48;">⚠️ KHUYẾN CÁO KHẨN CẤP TỪ ĐỘI NGŨ SOC:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #b94a48;">
                    <li><b>KHÔNG</b> bấm vào bất kỳ đường link nào trong email nghi ngờ.</li>
                    <li><b>KHÔNG</b> mở hoặc tải xuống các tập tin đính kèm.</li>
                    <li><b>KHÔNG</b> cung cấp mật khẩu, OTP hay thông tin cá nhân.</li>
                  </ul>
                </div>

                <p>Nếu bạn đã trót nhấp vào liên kết hoặc cung cấp thông tin, vui lòng thông báo ngay lập tức cho <b>Bộ phận IT Security</b> để được hỗ trợ khóa tài khoản và xử lý sự cố kịp thời.</p>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.<br>Vui lòng không phản hồi trực tiếp vào email này.
                </p>
              </div>
            </div>
          `,
          recipients: ['nhan_vien_bi_tan_cong@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Suspicious Login') {
        template = {
          type,
          subject: '[BÁO ĐỘNG] Đăng nhập bất thường vào tài khoản của bạn',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #f0ad4e; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">⚠️ CẢNH BÁO ĐĂNG NHẬP BẤT THƯỜNG</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện vị trí truy cập không xác định</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Chào bạn,</p>
                <p>Hệ thống SOAR ghi nhận một lượt đăng nhập thành công vào tài khoản của bạn từ một vị trí địa lý lạ (Vị trí không thuộc danh sách tin cậy).</p>
                
                <div style="background-color: #fcf8e3; border-left: 4px solid #f0ad4e; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #8a6d3b;">HÀNH ĐỘNG CẦN THIẾT:</strong>
                  <p style="margin: 5px 0 0 0; color: #8a6d3b;">Nếu đây <b>KHÔNG PHẢI LÀ BẠN</b>, vui lòng thực hiện đổi mật khẩu ngay lập tức và chọn "Đăng xuất khỏi tất cả các thiết bị".</p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.
                </p>
              </div>
            </div>
          `,
          recipients: ['chu_tai_khoan@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Brute Force Attack') {
        template = {
          type,
          subject: '[CẢNH BÁO NGUY HIỂM] Phát hiện Tấn công Dò mật khẩu (Brute Force)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #c9302c; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🔒 CẢNH BÁO TẤN CÔNG DÒ MẬT KHẨU</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện chuỗi đăng nhập thất bại liên tục từ IP lạ</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Kính gửi Quản trị viên & Người dùng,</p>
                <p>Hệ thống SOAR ghi nhận sự cố <b>Brute Force Attack</b>. Một địa chỉ IP ngoại vi đã cố gắng dò mật khẩu tài khoản của bạn nhiều lần liên tiếp trong thời gian ngắn.</p>
                
                <div style="background-color: #fdf2f2; border-left: 4px solid #c9302c; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #a94442;">⚡ HÀNH ĐỘNG TỰ ĐỘNG CỦA HỆ THỐNG SOAR:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #a94442;">
                    <li>Hệ thống Tường lửa đã tự động <b>CHẶN (Block IP)</b> nguồn tấn công.</li>
                    <li>Tài khoản bị nhắm tới đã được chuyển sang trạng thái bảo vệ tạm thời.</li>
                    <li>Vui lòng thực hiện đặt lại mật khẩu mạnh hơn nếu cần thiết.</li>
                  </ul>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.
                </p>
              </div>
            </div>
          `,
          recipients: ['admin@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Malware Detection') {
        template = {
          type,
          subject: '[CẢNH BÁO MÃ ĐỘC] Phần mềm EDR vừa phát hiện Malware trên Máy trạm',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #a94442; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">☣️ CẢNH BÁO PHÁT HIỆN MÃ ĐỘC (MALWARE)</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phần mềm EDR đã kích hoạt quy trình cách ly khẩn cấp</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Chào bạn,</p>
                <p>Hệ thống giám sát EDR vừa phát hiện một <b>Tập tin chứa mã độc (Malware/Trojan)</b> đang cố gắng thực thi trên máy trạm làm việc của bạn.</p>
                
                <div style="background-color: #f2dede; border-left: 4px solid #a94442; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #a94442;">🛡️ BIỆN PHÁP XỬ LÝ SỰ CỐ:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #a94442;">
                    <li>Máy trạm của bạn đã được <b>Cô lập khỏi mạng nội bộ (Host Isolation)</b> để ngăn ngừa lây lan.</li>
                    <li>File mã độc đã được đưa vào vùng cách ly (Quarantine).</li>
                    <li>Vui lòng giữ nguyên hiện trạng máy tính và liên hệ IT Security ngay lập tức.</li>
                  </ul>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.
                </p>
              </div>
            </div>
          `,
          recipients: ['user@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Port Scan Detection') {
        template = {
          type,
          subject: '[CẢNH BÁO MẠNG] Phát hiện Hành vi Rà quét cổng (Port Scan)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #31708f; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🌐 CẢNH BÁO RÀ QUÉT CỔNG MẠNG (PORT SCAN)</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện hành vi thăm dò hạ tầng từ địa chỉ IP lạ</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Kính gửi Đội ngũ Quản trị Mạng,</p>
                <p>Hệ thống Tường lửa / IDS phát hiện một địa chỉ IP lạ đang thực hiện <b>Rà quét hàng loạt cổng dịch vụ (Port Scan)</b> nhằm tìm kiếm lỗ hổng trên hạ tầng máy chủ.</p>
                
                <div style="background-color: #d9edf7; border-left: 4px solid #31708f; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #31708f;">📌 TRẠNG THÁI XỬ LÝ:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #31708f;">
                    <li>IP thăm dò đã bị hệ thống tự động đưa vào danh sách đen (Blacklist).</li>
                    <li>Tất cả lưu lượng truy cập từ IP này tới máy chủ nội bộ đã bị từ chối (Drop Packet).</li>
                  </ul>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.
                </p>
              </div>
            </div>
          `,
          recipients: ['netadmin@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'NoSQL Injection Detection') {
        template = {
          type,
          subject: '[BÁO ĐỘNG ĐỎ] Phát hiện Tấn công NoSQL Injection',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #8b0000; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🔥 BÁO ĐỘNG ĐỎ: NoSQL INJECTION</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Tường lửa WAF chặn đứng nỗ lực chiếm quyền Database</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Kính gửi Đội ngũ Dev & AppSec,</p>
                <p>Hệ thống Web Application Firewall (WAF) vừa phát hiện một cuộc tấn công tiêm nhiễm cơ sở dữ liệu <b>NoSQL Injection</b> nhắm thẳng vào API đăng nhập của ứng dụng.</p>
                
                <div style="background-color: #ffe6e6; border-left: 4px solid #8b0000; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #8b0000;">⚙️ YÊU CẦU DÀNH CHO DEV TEAM:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #8b0000;">
                    <li>Kiểm tra lại toàn bộ logic <b>Input Validation</b> tại API Đăng nhập.</li>
                    <li>Đảm bảo Schema Mongoose đang hoạt động khắt khe (strict) để ép kiểu dữ liệu.</li>
                    <li>IP của kẻ tấn công (Điểm rủi ro cao trên AbuseIPDB) đã bị WAF khóa 24h.</li>
                  </ul>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                  Báo cáo tự động được khởi tạo bởi <b>Secure SOAR Engine</b>.
                </p>
              </div>
            </div>
          `,
          recipients: ['dev_team@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Cross-Site Scripting (XSS)') {
        template = {
          type,
          subject: '[CẢNH BÁO BẢO MẬT] Phát hiện Tấn công XSS vào Ứng dụng',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #8b0000; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🚨 CẢNH BÁO: CROSS-SITE SCRIPTING (XSS)</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">WAF phát hiện mã độc chèn vào Giao diện</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Kính gửi Đội ngũ Phát triển,</p>
                <p>Hệ thống vừa ngăn chặn một nỗ lực chèn thẻ <code>&lt;script&gt;</code> độc hại vào ứng dụng, với mục đích đánh cắp Session Cookie của người dùng hợp lệ.</p>
                
                <div style="background-color: #ffe6e6; border-left: 4px solid #8b0000; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #8b0000;">⚙️ YÊU CẦU DÀNH CHO DEV TEAM:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #8b0000;">
                    <li>Kiểm tra và áp dụng ngay thư viện <b>DOMPurify</b> để lọc (sanitize) dữ liệu đầu vào.</li>
                    <li>Chuyển toàn bộ Cookie sang định dạng <b>HttpOnly</b> để chống đánh cắp qua JS.</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
          recipients: ['dev_team@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Insecure Direct Object Reference (IDOR)') {
        template = {
          type,
          subject: '[VI PHẠM BẢO MẬT] Cảnh báo Truy cập Trái phép (IDOR)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #d9534f; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">⛔ VI PHẠM PHÂN QUYỀN (IDOR)</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện nỗ lực xem trộm dữ liệu người khác</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Chào bạn,</p>
                <p>Hệ thống giám sát phân quyền (RBAC) ghi nhận tài khoản của bạn đang liên tục cố gắng truy cập vào các tài nguyên/ID không thuộc quyền sở hữu.</p>
                
                <div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #b94a48;">⚠️ BIỆN PHÁP XỬ LÝ:</strong>
                  <p style="margin: 5px 0 0 0; color: #b94a48;">Token xác thực (JWT) của bạn đã bị <b>Thu hồi (Revoke)</b> lập tức. Vui lòng liên hệ Admin để giải trình về hành vi này.</p>
                </div>
              </div>
            </div>
          `,
          recipients: ['user_vi_pham@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Credential Stuffing') {
        template = {
          type,
          subject: '[BÁO ĐỘNG] Nỗ lực Nhồi nhét Mật khẩu (Credential Stuffing)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #c9302c; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">🔒 TẤN CÔNG NHỒI NHÉT MẬT KHẨU</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Tài khoản của bạn có nguy cơ lộ lọt từ bên thứ 3</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Chào bạn,</p>
                <p>Hệ thống ghi nhận nỗ lực đăng nhập vào tài khoản của bạn bằng mật khẩu đã bị rò rỉ trong một vụ lộ lọt dữ liệu toàn cầu (Kiểm tra qua <i>HaveIBeenPwned</i>).</p>
                
                <div style="background-color: #fdf2f2; border-left: 4px solid #c9302c; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #a94442;">⚡ HÀNH ĐỘNG TỰ ĐỘNG:</strong>
                  <p style="margin: 5px 0 0 0; color: #a94442;">Hệ thống SOAR đã bật cờ <b>Force Password Reset</b>. Bạn sẽ bị buộc phải đổi mật khẩu ngay trong lần đăng nhập tiếp theo.</p>
                </div>
              </div>
            </div>
          `,
          recipients: ['chu_tai_khoan@company.com'],
          cc: ['soc_team@company.com']
        };
      } else if (type === 'Server-Side Request Forgery (SSRF)') {
        template = {
          type,
          subject: '[CRITICAL] Cảnh báo Lỗ hổng giả mạo máy chủ (SSRF)',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background-color: #000000; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">☠️ BÁO ĐỘNG ĐEN: TẤN CÔNG SSRF</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Phát hiện nỗ lực gọi API siêu dữ liệu nội bộ (Metadata API)</p>
              </div>
              <div style="padding: 24px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Kính gửi Đội ngũ DevOps/SecOps,</p>
                <p>Hệ thống cảnh báo máy chủ Backend đang có dấu hiệu bị thao túng để gọi các request HTTP ra bên ngoài, nhắm vào các dải IP nội bộ/nhạy cảm (vd: <code>169.254.169.254</code>).</p>
                
                <div style="background-color: #f2f2f2; border-left: 4px solid #000000; padding: 14px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <strong style="color: #000000;">⚠️ TÌNH TRẠNG HIỆN TẠI:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #000000;">
                    <li>Máy chủ Backend bị ảnh hưởng đã bị <b>Cô lập Mạng khẩn cấp (Network Isolated)</b>.</li>
                    <li>Vui lòng kiểm tra lại cấu hình AWS Security Group và logic Validate URL của tính năng Fetch/Tải ảnh.</li>
                  </ul>
                </div>
              </div>
            </div>
          `,
          recipients: ['devops@company.com'],
          cc: ['soc_team@company.com']
        };
      } else {
        return res.status(404).json({ success: false, message: 'Không tìm thấy Template cho loại sự cố này' });
      }
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};