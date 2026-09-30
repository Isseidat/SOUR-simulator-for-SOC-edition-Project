# PROJECT BRIEF: HỆ THỐNG MOCK SOAR & SECURE DASHBOARD (n8n & NODE.JS & REACT.JS & ELASTICSEARCH/MONGODB)

## 1. TỔNG QUAN DỰ ÁN

* **Tên dự án:** Secure Mock SOAR-Dashboard System.
* **Mục tiêu:** Xây dựng một hệ thống tích hợp khép kín mô phỏng luồng tự động hóa an toàn thông tin (SOAR) mang tính tương tác hai chiều. Hệ thống bao gồm công cụ tự động hóa **n8n**, **Backend (Node JS & Express)**, cơ sở dữ liệu **Elasticsearch hoặc MongoDB** để lưu log/alerts, và giao diện **Frontend (React)** có hệ thống đăng nhập, phân quyền, quản lý cảnh báo và theo dõi tiến trình thực thi playbook. Tất cả chạy hoàn toàn bằng **Docker Compose** trên môi trường local.

---

## 2. KIẾN TRÚC HỆ THỐNG (MOCK ARCHITECTURE)

Hệ thống gồm 4 thành phần chính chạy song song trong một Docker Network:

1. **Mock n8n Engine:** Giả lập các kịch bản tự động hóa (Playbook) xử lý sự cố an toàn thông tin. 
   * *Mô phỏng Playbook:* Các workflow trong n8n không cần tương tác thật với Firewall/SIEM bên ngoài, mà sử dụng các node như `Wait` (để tạo độ trễ 2-5s giả lập thời gian xử lý), `Set` (để tạo mock data kết quả trả về), và `HTTP Request` (để gửi webhook kết quả về lại Backend).
2. **Middleware Backend (Node.js & Express):**
   * Cung cấp **Mock Alert Generator** (tạo cảnh báo giả lập tự động định kỳ bằng Cronjob hoặc qua API).
   * Mở API Endpoint dạng Webhook để nhận kết quả log/tiến trình chạy từ n8n (có bảo mật Webhook Secret).
   * Tích hợp gọi **n8n REST API** để kích hoạt Playbook theo yêu cầu từ giao diện.
   * Xây dựng Authentication (JWT) và Phân quyền người dùng (RBAC - Admin/Viewer).
3. **Database (Elasticsearch / MongoDB):** Lưu trữ tài khoản người dùng (Users), danh sách Alert giả lập và lịch sử thực thi log/alerts (`execution_logs`).
4. **Frontend Dashboard (React.js & Vite):** Giao diện quản trị cho phép đăng nhập, xem danh sách cảnh báo, kích hoạt playbook, và theo dõi log xử lý chi tiết theo thời gian thực.

---

## 3. CHI TIẾT CÁC HẠNG MỤC CÔNG VIỆC (REQUIREMENTS)

### Giai đoạn 1: Dựng nền tảng Backend, Database & Mock Alert (Tháng 1)

* **Yêu cầu 1 (Docker Infrastructure):** Xây dựng file `docker-compose.yml` tích hợp các service: Database (`Elasticsearch` hoặc `MongoDB`), `n8n`, và `Backend Node.js`.
* **Yêu cầu 2 (Mock Alert Generator):** Viết script hoặc API trong Backend để khởi tạo các bản ghi Alert giả lập lưu vào Database.
  * **Cấu trúc một Alert cần có:**
    * `alert_id`: UUID độc nhất.
    * `timestamp`: Thời gian xảy ra (ISO 8601).
    * `type`: Phân loại (Ví dụ: *Phishing Email*, *Brute Force Attack*, *Malware Detection*).
    * `severity`: Mức độ nghiêm trọng (*Low*, *Medium*, *High*, *Critical*).
    * `source_ip` / `destination_ip`: IP sinh ngẫu nhiên.
    * `payload`: Chi tiết sự kiện dạng JSON (VD: thông tin user agent, số lần đăng nhập sai, URL độc hại).
    * `status`: Trạng thái xử lý (*New*, *In Progress*, *Resolved*).
* **Yêu cầu 3 (Webhook Ingestion):** Viết API endpoint nhận webhook (`POST /api/v1/webhook`) trong Node.js để hứng kết quả từ n8n, có cơ chế xác thực bằng Header (`X-Webhook-Secret`).

### Giai đoạn 2: Phát triển Tích hợp 2 chiều n8n API, Auth & Database (Tháng 2)

* **Yêu cầu 4 (n8n API Integration - Two-way):**
  * Xây dựng API trên Backend cho phép nhận lệnh từ Frontend để gọi sang **n8n REST API** (kích hoạt webhook trigger của n8n) để bắt đầu một Playbook tương ứng với loại alert.
  * **Các Kịch bản Playbook (Ví dụ):** 
      * **Kịch bản 1: Phishing Email (Tự động rà soát qua Threat Intel)**                                         XONG
        * *Nguồn gốc Alert:* Hệ thống Email Security Gateway (vd: MS Defender, Proofpoint) quét thấy email chứa link lạ/file khả nghi chưa rõ ràng, tự động sinh Alert đẩy về SIEM/SOAR.
        * *Luồng n8n (Có gọi Backend cấu hình):*
          1. Nhận thông tin Alert từ Backend.
          2. Node xử lý: Trích xuất các URL/Domain nghi ngờ từ `payload`.
          3. Node HTTP Request: Gọi API (vd: VirusTotal) để lấy điểm rủi ro.
          4. Node IF: Nếu URL bị đánh giá là Độc hại (Malicious).
          5. Node HTTP Request (Call Backend): Gọi API của Backend để lấy Email Template: `GET /api/templates/phishing-alert`.
          6. Node IF (Kiểm tra kết quả Backend):
            - *Nhánh True (Có data):* Sử dụng các trường `to`, `cc`, `title`, `body` trả về từ Backend, truyền vào node Email (n8n) để gửi cảnh báo rủi ro đến nhân viên nhận email đó.
            - *Nhánh False (Null/404):* Gửi Webhook về Backend báo lỗi *"Email template cho playbook Phishing chưa được thiết lập."*
          7. Node HTTP Request: Gửi Webhook cập nhật trạng thái Alert thành *Resolved*.

    * **Kịch bản 2: Brute Force Attack (Tấn công dò mật khẩu)**
      * *Nguồn gốc Alert:* Hệ thống SIEM phát hiện một IP cố gắng đăng nhập sai mật khẩu quá nhiều lần (VD: > 20 lần trong 5 phút) vào hệ thống VPN hoặc Active Directory.
      * *Luồng n8n:*
        1. Nhận thông tin Alert chứa `source_ip` và `username`.
        2. Node xử lý: Lấy số lần đăng nhập thất bại từ `payload`.
        3. Node Wait: Chờ 2 giây (giả lập truy vấn lịch sử từ hệ thống SIEM).
        4. Node IF: Nếu số lần failed > 10 lần, đi nhánh xử lý.
        5. Node HTTP Request (Mock): Giả lập gửi lệnh block `source_ip` lên Firewall hoặc khóa tài khoản Active Directory.
        6. Node HTTP Request: Gửi webhook về Backend với log: *"Đã block IP tấn công trên Firewall và khóa tài khoản tạm thời."*, cập nhật trạng thái *Resolved*.

    * **Kịch bản 3: Malware Detection (Phát hiện mã độc trên máy trạm)**
      * *Nguồn gốc Alert:* Phần mềm EDR (Endpoint Detection and Response) cài trên máy trạm phát hiện một file thực thi có chữ ký của mã độc, sinh Alert và đẩy về SOAR.
      * *Luồng n8n:*
        1. Nhận thông tin Alert từ máy trạm (chứa `hostname`, `file_hash`).
        2. Node Wait: Chờ 4 giây (giả lập việc gửi file hash lên Sandbox phân tích).
        3. Node HTTP Request (Mock EDR): Giả lập lệnh gọi API tới hệ thống EDR để cô lập (Isolate) máy trạm khỏi mạng nội bộ.
        4. Node HTTP Request: Gửi webhook về Backend kèm log: *"Đã cô lập máy trạm khỏi mạng để ngăn chặn lây lan. File hash độc hại."*, cập nhật trạng thái *Resolved*.

    * **Kịch bản 4: Suspicious Login (Đăng nhập bất thường)**                                         XONG
      * *Nguồn gốc Alert:* Hệ thống IAM hoặc SIEM phát hiện một user đăng nhập thành công từ 2 IP ở 2 quốc gia khác nhau trong chưa tới 1 tiếng (Impossible Travel). Việc chặn hay không do IAM/Rule quyết định, SOAR chỉ nhận Alert để cảnh báo thêm.
      * *Luồng n8n:*
        1. Nhận thông tin Alert (`user_email`, `location`).
        2. Node HTTP Request (Call Backend): Gọi `GET /api/templates/suspicious-login` để lấy nội dung thư cảnh báo.
        3. Node IF: Kiểm tra cấu hình có tồn tại không.
        4. *Nhánh True:* Dùng Regex/Replace để điền `location` vào body mail. Dùng node Email gửi thư: *"Ghi nhận đăng nhập từ [location], nếu không phải bạn, vui lòng báo IT."*
        5. *Nhánh False:* Gửi cảnh báo lên Slack channel của Admin: *"Cảnh báo: Playbook Suspicious Login không tìm thấy Email Template cấu hình trên Backend!"*
        6. Node HTTP Request: Gửi Webhook về Backend cập nhật trạng thái Alert thành *Resolved* (hoặc *Escalated*).

    * **Kịch bản 5: Port Scan Detection (Rà quét cổng mạng)**
      * *Nguồn gốc Alert:* Tường lửa (Firewall) hoặc IPS nhận thấy một IP ngoại vi liên tục rà quét các cổng mạng, tự động sinh Alert.
      * *Luồng n8n:*
        1. Nhận thông tin Alert.
        2. Node HTTP Request: Gọi AbuseIPDB kiểm tra uy tín IP.
        3. Node IF: Nếu Malicious score > 80%.
        4. Node HTTP Request (Mock): Đẩy lệnh block IP này vào Firewall.
        5. Node HTTP Request: Gửi webhook về Backend: *"Đã tự động block IP dò quét."*, cập nhật trạng thái *Resolved*.
  * Lưu trữ chi tiết lịch sử thực thi (`execution_logs`): Để UI có thể vẽ Timeline real-time, n8n cần gọi Webhook cập nhật tiến trình về Backend **nhiều lần** (sau khi hoàn thành mỗi node quan trọng) để Backend lưu lại từng bước.

  * **Yêu cầu 5 (Authentication & Users):** Xây dựng tính năng Đăng nhập (Login API) sử dụng **JWT** và mã hóa mật khẩu bằng `bcrypt`.
  * **Yêu cầu 6 (Authorization - RBAC):** Phân quyền truy cập API:
    * *Role Admin:* Được toàn quyền quản lý hệ thống, kích hoạt playbook và xem toàn bộ log.
    * *Role Viewer:* Chỉ được xem số liệu thống kê Dashboard và danh sách cảnh báo (Không có quyền chạy Playbook).

### Giai đoạn 3: Phát triển Frontend React.js & Bàn giao (Nửa tháng cuối)

* **Yêu cầu 7 (React.js Frontend Dashboard):** Cần xây dựng các View cụ thể như sau:
  * **Trang Login:** Giao diện đăng nhập gọi API lấy JWT Token, bảo vệ các route (Protected Routes).
  * **Trang Tổng quan (Overview Dashboard):**
    * *Metric Cards:* Hiển thị tổng số Alerts, Số Alerts chờ xử lý (New), Số Playbook đã thực thi thành công trong ngày.
    * *Biểu đồ (Charts):* Sử dụng Recharts/Chart.js để vẽ Biểu đồ tròn (Pie Chart) thống kê Alerts theo `severity` và Biểu đồ cột (Bar Chart) thống kê số lượng Alerts theo từng ngày.
  * **Trang Quản lý Alerts (Alert List):** 
    * Hiển thị danh sách alert dạng Bảng (Table). Hỗ trợ phân trang và bộ lọc (lọc theo Mức độ nghiêm trọng, Trạng thái).
    * Có thể click vào một dòng để mở Modal/Drawer xem chi tiết `payload` (hiển thị dạng raw JSON đẹp).
    * Tại modal chi tiết, có nút **"Chạy Playbook Xử lý"** (Chỉ hiện cho Role Admin).
  * **Trang Theo dõi tiến trình (Execution Monitoring / Playbook Logs):** 
    * Hiển thị lịch sử các lần Playbook được kích hoạt.
    * View chi tiết giống dạng Timeline (Dòng thời gian):
      * *[10:05:01]* Nhận thông tin Alert #123.
      * *[10:05:04]* Hoàn tất phân tích mã độc: Kết quả là ĐỘC HẠI.
      * *[10:05:06]* Đã thực hiện cô lập IP thành công. Đóng Alert.

* **Yêu cầu 8 (Bàn giao & Tài liệu):**
  * Viết file `README.md` hướng dẫn chạy toàn bộ hệ thống bằng lệnh `docker-compose up`.
  * Cung cấp file export của các n8n Workflows (định dạng JSON) để người khác có thể import vào chạy thử ngay.
  * Bàn giao Postman Collection test các API (Auth, Webhook, Playbook Trigger, Metrics).

---

## 4. TIÊU CHÍ NGHIỆM THU (DELIVERABLES)

1. **Source Code Clean:** Cấu trúc rõ ràng gồm thư mục `backend` (Node.js), `frontend` (React.js), file `docker-compose.yml`.
2. **End-to-End Two-Way Flow:** Đăng nhập vào React.js -> Bảng điều khiển Dashboard hiển thị đúng số liệu -> Chọn Alert chưa xử lý bấm nút chạy Playbook -> Backend gọi n8n API -> n8n xử lý (có trễ) xong đẩy webhook ngược về Backend lưu log -> Giao diện tự động (hoặc tải lại) cập nhật tiến trình và trạng thái Alert thành công.
3. **Security Check:** API yêu cầu Token JWT hợp lệ, webhook phải có secret key, phân quyền rõ ràng giữa Admin và Viewer trên cả UI và API.
4. **UI/UX cơ bản:** Giao diện Dashboard gọn gàng, sử dụng các thư viện UI component như Material-UI (MUI), Ant Design, hoặc Tailwind CSS.