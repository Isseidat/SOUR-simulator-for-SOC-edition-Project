# Hướng Dẫn Tự Kiểm Tra Rò Rỉ Dữ Liệu Bằng F12 (DevTools) & Tài Liệu Tham Khảo

Tài liệu này tổng hợp các bước kiểm tra nhanh rò rỉ dữ liệu nhạy cảm (password, token, secret, phân quyền API) ngay trên trình duyệt bằng **Chrome/Edge DevTools (F12)** và các nguồn tài liệu chuẩn để tự học thêm về kiểm thử bảo mật web.

---

## 1. Checklist kiểm tra nhanh bằng F12 DevTools

Mở trang web của dự án, nhấn `F12` (hoặc `Ctrl + Shift + I` trên Windows) để mở DevTools.

### Bước 1: Kiểm tra Tab **Network** (Soi dữ liệu API trả về)

1. Chọn tab **Network** -> bấm bộ lọc **Fetch/XHR** (để chỉ xem các lời gọi API, bỏ qua ảnh/CSS).
2. Tick chọn **Preserve log** (giữ log khi chuyển trang hoặc reload) nếu cần theo dõi xuyên suốt luồng đăng nhập.
3. Thao tác trên giao diện (mở trang Playbook, mở modal cấu hình SMTP, tải danh sách Users, bấm các nút...).
4. Bấm vào từng API trong danh sách và kiểm tra các tab con:
   - **Preview / Response**: Tìm các trường nhạy cảm như `password`, `pass`, `secret`, `privateKey`, `token`, `smtpPass`.
     - _Dấu hiệu lỗi_: API `GET` trả về mật khẩu dạng chữ rõ (plaintext), hoặc trả về luôn danh sách hash mật khẩu của user.
     - _Cách đúng_: API `GET` chỉ trả về trạng thái cấu hình (ví dụ `hasPassword: true`, email đã che bớt hoặc user cấu hình) — tuyệt đối không trả lại mật khẩu gốc.
   - **Payload**: Kiểm tra dữ liệu gửi lên khi tạo/sửa có đi qua HTTPS/body đúng chuẩn không (không gắn mật khẩu lên URL query `?password=...`).
   - **Frequency (Tần suất gọi API)**: Quan sát xem có API nào tự động chạy lặp lại quá dày (ví dụ mỗi 1–10 giây lại sinh ra 1 request mới trong tab Network) gây tốn tài nguyên hoặc spam log không.

### Bước 2: Kiểm tra Tab **Elements** & **Console** (Soi ô nhập mật khẩu trên UI)

1. Khi thấy một ô nhập có dấu chấm tròn che mật khẩu (`••••••`), bấm chuột phải vào ô đó -> **Inspect** (Kiểm tra).
2. Trong tab **Elements**, tìm thuộc tính `type="password"`:
   - Nhấp đúp vào chữ `password` -> đổi thành `text` -> nhấn `Enter`.
   - _Nếu giá trị hiện ra là mật khẩu thật (vì Frontend lấy từ API `GET` hoặc gán sẵn mặc định)_ -> **Lỗ hổng lộ mật khẩu phía Client**.
   - _Cách đúng_: Khi mở form chỉnh sửa cấu hình đã lưu, ô mật khẩu phải **trống hoàn toàn** (hoặc chỉ hiện placeholder như `"Nhập mật khẩu mới nếu muốn thay đổi"`). Nếu có nút con mắt (Show/Hide), chỉ nên dùng cho mật khẩu người dùng _vừa tự gõ_ trong phiên nhập đó, không dùng để hiển thị lại mật khẩu cũ từ server.

### Bước 3: Kiểm tra Tab **Sources** (Tìm secret bị hardcode trong code Frontend)

Mọi file JS của Frontend (`React`/`Vite`) đều được trình duyệt tải về máy người dùng, nên ai cũng đọc được.

1. Mở tab **Sources** -> nhấn `Ctrl + Shift + F` (tìm kiếm toàn bộ mã nguồn đang tải trên trình duyệt).
2. Tìm các từ khóa: `password`, `secret`, `gmail.com`, `smtp`, `Bearer`, `api_key`, hoặc chuỗi mật khẩu mẫu bạn nghi ngờ.
3. _Dấu hiệu lỗi_: Tìm thấy mật khẩu mặc định, App Password, hoặc thông tin tài khoản thật được ghi thẳng (hardcode) trong component Frontend.
4. _Cách đúng_: Không bao giờ lưu mật khẩu/secret thật hay fallback credential thật ở Frontend; mọi credential dùng để kết nối dịch vụ ngoài chỉ nằm ở `.env` / Secret Manager phía Backend.

### Bước 4: Kiểm tra Tab **Application** (Token & Storage)

1. Mở tab **Application** -> kiểm tra mục **Storage**:
   - **Local Storage / Session Storage**: Xem đang lưu gì (Access Token, thông tin user...). Không lưu mật khẩu hay dữ liệu nhạy cảm ở đây vì JS (và lỗ hổng XSS nếu có) đều đọc được `localStorage`.
   - **Cookies**: Kiểm tra cookie chứa Refresh Token (`refreshtoken`) có bật cờ **`HttpOnly`** hay không (`HttpOnly` giúp JavaScript không đọc trộm được cookie qua `document.cookie`), và cấu hình `SameSite`, `Secure` (khi chạy HTTPS).

### Bước 5: Kiểm tra phân quyền API (**RBAC**: `Admin` vs `Viewer`)

Không chỉ ẩn nút trên giao diện — kẻ tấn công có thể gọi API trực tiếp bằng `Postman`, `cURL`, hoặc tab `Console`/`Network -> Copy as fetch`:

1. Đăng nhập bằng tài khoản quyền thấp nhất (**`Viewer`**).
2. Mở tab **Network** -> lấy Access Token (trong header `Authorization: Bearer ...` hoặc lấy từ request bất kỳ).
3. Dùng Postman / cURL / `fetch` trong Console thử gọi các API nhạy cảm chỉ dành cho **`Admin`** (ví dụ: xem/sửa SMTP credentials, tạo/xóa User, bật/tắt Cron Job, trigger Playbook).
4. _Kết quả mong đợi_: Server phải trả về **`403 Forbidden`** (hoặc `401 Unauthorized` nếu chưa đăng nhập). Nếu vẫn trả về **`200 OK`** -> thiếu middleware `checkRole(['Admin'])` ở Backend.

---

## 2. Nguyên tắc thiết kế xử lý mật khẩu & Secret

| Loại bí mật                                                              | Lưu ở đâu?                       | Có hash 1 chiều không?                                         | API `GET` có được trả ra không?                                                                                                             |
| :----------------------------------------------------------------------- | :------------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mật khẩu đăng nhập của User**                                          | Database (MongoDB)               | **Có** (bcrypt / argon2 + salt)                                | **Không bao giờ** (kể cả bản hash)                                                                                                          |
| **Secret / App Password gọi dịch vụ ngoài** (SMTP Gmail, n8n API key...) | File `.env` hoặc Vault ở Backend | **Không** (vì Backend cần chuỗi gốc để xác thực với bên thứ 3) | **Không** — áp dụng nguyên tắc **Write-only** (chỉ nhận vào qua `PUT/POST`, `GET` chỉ trả `hasPassword: true` hoặc metadata không nhạy cảm) |

---

## 3. Tài liệu chuẩn để đọc và học thêm

Đây là các nguồn chính thống, miễn phí và phổ biến nhất trong ngành để hiểu bản chất các lỗ hổng dạng trên và cách tự kiểm tra:

1. **OWASP Top 10 (Bảo mật ứng dụng Web nói chung)**
   - Trang chủ: https://owasp.org/www-project-top-ten/
   - Nên đọc kỹ 2 mục liên quan trực tiếp nhất:
     - **A01 – Broken Access Control**: Lỗi phân quyền (ví dụ `Viewer` gọi được API của `Admin`).
     - **A02 – Cryptographic Failures**: Lỗi lộ dữ liệu nhạy cảm (trả raw password, hardcode secret trong code).
2. **OWASP API Security Top 10 (Bảo mật riêng cho REST API)**
   - Trang chủ: https://owasp.org/API-Security/
   - Đặc biệt xem **API3 – Broken Object Property Level Authorization** (API trả thừa các thuộc tính nhạy cảm như `password`, `token` trong JSON response) và **API5 – Broken Function Level Authorization** (thiếu kiểm tra role ở route).
3. **Chrome DevTools Documentation (Tài liệu chính thức của Google cho F12)**
   - Network panel: https://developer.chrome.com/docs/devtools/network/
   - Application panel (Cookies & Storage): https://developer.chrome.com/docs/devtools/storage/cookies/
4. **PortSwigger Web Security Academy (Học & thực hành lab miễn phí)**
   - Trang chủ: https://portswigger.net/web-security
   - Mục **Access control vulnerabilities** và **Authentication** có bài giải thích rất dễ hiểu kèm lab thực hành.
