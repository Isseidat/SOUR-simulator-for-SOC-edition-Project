import { v4 as uuidv4 } from 'uuid';

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');

const ALERT_TYPES = ['Phishing Email', 'Brute Force Attack', 'Malware Detection', 'Suspicious Login',
  'Port Scan Detection', 'NoSQL Injection Detection', 'Cross-Site Scripting (XSS)', 'Insecure Direct Object Reference (IDOR)', 'Credential Stuffing', 'Server-Side Request Forgery (SSRF)'];

const REAL_GMAILS = [
  'isseidat159@gmail.com',
  'wibuuwu159@gmail.com',
  'alvaroll18cau@gmail.com',
  'dae1924mike@gmail.com',
  'dat.tanvo6767@gmail.com'
];

export const generateSingleMockAlert = () => {
  const type = getRandomItem(ALERT_TYPES);
  return generateSpecificMockAlert(type, Math.random() > 0.5);
};

export const generateSpecificMockAlert = (type, isTruePositive) => {
  let severity = 'Medium';
  const source_ip = getRandomIP();
  const destination_ip = '10.0.0.15';
  let payload = {};
  const victim_email = getRandomItem(REAL_GMAILS);

  switch (type) {
    case 'Phishing Email':
      severity = isTruePositive ? 'High' : 'Low';
      payload = {
        title: 'Cảnh báo Email lừa đảo giả mạo tài khoản',
        sender: `attacker_${Math.floor(Math.random() * 1000)}@ten-mien-doc-hai.com`,
        recipient: 'nhan_vien_kinh_doanh@company.com',
        subject: 'KHẨN CẤP: Yêu cầu xác minh tài khoản ngân hàng BIDV',
        suspicious_url: isTruePositive ? 'http://www.eicar.org/download/eicar.com' : 'https://bidv.com.vn',
        description: isTruePositive ? 'Phát hiện đường link chứa URL mã độc (True Positive).' : 'Phát hiện đường link bình thường (False Positive).'
      };
      break;
    case 'Brute Force Attack':
      severity = isTruePositive ? 'High' : 'Low';
      payload = {
        title: 'Cảnh báo Tấn công dò mật khẩu (Brute Force)',
        username: 'admin',
        failed_attempts: isTruePositive ? 11 : 5,
        protocol: 'SSH',
        port: 22,
        description: isTruePositive ? 'Đăng nhập sai quá 10 lần (True Positive).' : 'Đăng nhập sai 5 lần (False Positive).'
      };
      break;
    case 'Malware Detection':
      severity = isTruePositive ? 'Critical' : 'Low';
      payload = {
        title: 'Cảnh báo Phát hiện Mã độc trên máy trạm',
        hostname: `MAY-TRAM-KE-TOAN-${Math.floor(Math.random() * 90) + 10}`,
        file_name: 'chi_tiet_hoa_don_thanh_toan.exe',
        file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        threat_name: isTruePositive ? 'Trojan.Win32' : 'Adware.Popup',
        description: isTruePositive ? 'Phần mềm chứa Trojan độc hại (True Positive).' : 'Phần mềm quảng cáo không đe dọa (False Positive).'
      };
      break;
    case 'Suspicious Login':
      severity = isTruePositive ? 'High' : 'Low';
      payload = {
        title: 'Cảnh báo Đăng nhập bất thường (Vị trí lạ)',
        user_email: 'nguyen.van.a@company.com',
        location: isTruePositive ? 'HackerLand' : 'Hanoi',
        usual_location: 'Hanoi',
        time_difference_hours: 0.5,
        description: isTruePositive ? 'Vị trí đăng nhập rất bất thường (True Positive).' : 'Vị trí đăng nhập quen thuộc (False Positive).'
      };
      break;
    case 'Port Scan Detection':
      severity = isTruePositive ? 'Medium' : 'Low';
      payload = {
        title: 'Cảnh báo Rà quét cổng mạng nội bộ',
        scanned_ports: [21, 22, 80, 443, 3306, 8080],
        total_packets: 1500,
        tool_used: 'Nmap Port Scanner',
        source_ip: isTruePositive ? '103.11.22.33' : '8.8.8.8',
        description: isTruePositive ? 'IP độc hại rà quét cổng (True Positive).' : 'IP an toàn như DNS quét (False Positive).'
      };
      break;
    case 'NoSQL Injection Detection':
      severity = isTruePositive ? 'Critical' : 'Low';
      payload = {
        title: 'Cảnh báo Tấn công tiêm nhiễm CSDL (NoSQL Injection)',
        endpoint: '/api/v1/auth/login',
        injected_payload: { username: { "$ne": null }, password: { "$gt": "" } },
        source_ip: isTruePositive ? '103.11.22.33' : '8.8.8.8',
        description: isTruePositive ? 'Payload chứa cú pháp NoSQLi từ IP độc (True Positive).' : 'Phát hiện nhầm từ IP sạch (False Positive).'
      };
      break;
    case 'Cross-Site Scripting (XSS)':
      severity = isTruePositive ? 'Medium' : 'Low';
      payload = {
        title: 'Cảnh báo Chèn mã độc giao diện (XSS)',
        endpoint: '/api/v1/comments',
        injected_payload: isTruePositive ? '<script>alert(1)</script>' : 'hello world',
        description: isTruePositive ? 'Payload chứa Script thực thi (True Positive).' : 'Payload an toàn (False Positive).'
      };
      break;
    case 'Insecure Direct Object Reference (IDOR)':
      severity = isTruePositive ? 'High' : 'Low';
      payload = {
        title: 'Cảnh báo Truy cập trái phép tài nguyên (IDOR)',
        endpoint: '/api/v1/orders/9999',
        user_role: isTruePositive ? 'Viewer' : 'Admin',
        description: isTruePositive ? 'Người dùng quyền thấp đổi ID truy cập trái phép (True Positive).' : 'Quản trị viên truy cập hợp lệ (False Positive).'
      };
      break;
    case 'Credential Stuffing':
      severity = isTruePositive ? 'High' : 'Low';
      payload = {
        title: 'Cảnh báo Nhồi nhét Thông tin Xác thực',
        endpoint: '/api/v1/auth/login',
        failed_logins: isTruePositive ? 50 : 5,
        successful_logins: 2,
        description: isTruePositive ? 'Đăng nhập sai 50 lần liên tiếp (True Positive).' : 'Đăng nhập sai 5 lần (False Positive).'
      };
      break;
    case 'Server-Side Request Forgery (SSRF)':
      severity = isTruePositive ? 'Critical' : 'Low';
      payload = {
        title: 'Cảnh báo Lỗ hổng giả mạo yêu cầu máy chủ (SSRF)',
        endpoint: '/api/v1/fetch-image?url=http://169.254.169.254/latest/meta-data/',
        target_internal_ip: isTruePositive ? '169.254.169.254' : '8.8.8.8',
        description: isTruePositive ? 'Gọi đến AWS Metadata (True Positive).' : 'Gọi đến IP công cộng an toàn (False Positive).'
      };
      break;
  }

  return {
    alert_id: uuidv4(),
    timestamp: new Date(),
    type,
    severity,
    source_ip: payload.source_ip || source_ip,
    destination_ip,
    victim_email,
    payload,
    status: 'New'
  };
};