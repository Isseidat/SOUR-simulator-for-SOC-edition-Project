# BỘ 12 LỆNH TEST POWERSHELL (6 KỊCH BẢN x 2 RẼ NHÁNH)
Mỗi lần chạy hãy nhớ bấm "Test Workflow" trên n8n!

## Kịch bản 1: Phishing (VT)
```powershell
# Nhánh True (Link virus) -> Gửi mail
$body = @{ alert_id = "test_1_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ suspicious_url = "http://www.eicar.org/download/eicar.com" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-phishing" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Link sạch) -> Bỏ qua
$body = @{ alert_id = "test_1_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ suspicious_url = "https://google.com" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-phishing" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 2: Suspicious Login
```powershell
# Nhánh True (Vị trí lạ) -> Gửi mail
$body = @{ alert_id = "test_2_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ location = "HackerLand"; usual_location = "Hanoi" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-suspicious-login" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Vị trí quen) -> Bỏ qua
$body = @{ alert_id = "test_2_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ location = "Hanoi"; usual_location = "Hanoi" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-suspicious-login" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 3: Brute Force
```powershell
# Nhánh True (Sai 11 lần) -> Gửi mail, Block IP
$body = @{ alert_id = "test_3_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ failed_attempts = 11 } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-bruteforce" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Sai 5 lần) -> Bỏ qua
$body = @{ alert_id = "test_3_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ failed_attempts = 5 } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-bruteforce" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 4: Malware (EDR)
```powershell
# Nhánh True (Tên chứa Trojan/Ransomware) -> Gửi mail, Cô lập
$body = @{ alert_id = "test_4_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ threat_name = "Trojan.Win32" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-malware" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Tên bình thường) -> Xóa ngầm
$body = @{ alert_id = "test_4_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ threat_name = "Adware.Popup" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-malware" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 5: Port Scan (AbuseIPDB)
```powershell
# Nhánh True (IP độc hại giả lập 103...) -> Gửi mail, Block Firewall
$body = @{ alert_id = "test_5_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ source_ip = "103.11.22.33" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-portscan" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (IP sạch) -> Bỏ qua
$body = @{ alert_id = "test_5_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ source_ip = "8.8.8.8" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-portscan" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 6: NoSQL Injection (AppSec)
```powershell
# Nhánh True (IP rủi ro cao) -> Gửi mail báo Dev, Block WAF
$body = @{ alert_id = "test_6_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ source_ip = "103.11.22.33" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-nosql" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (IP sạch) -> Bỏ qua
$body = @{ alert_id = "test_6_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ source_ip = "8.8.8.8" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-nosql" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 7: Cross-Site Scripting - XSS (AppSec)
```powershell
# Nhánh True (Phát hiện mã độc Script) -> Gửi mail, Cảnh báo
$body = @{ alert_id = "test_7_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ injected_payload = "<script>alert(1)</script>" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-xss" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Payload sạch) -> Bỏ qua
$body = @{ alert_id = "test_7_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ injected_payload = "hello world" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-xss" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 8: Insecure Direct Object Reference - IDOR (AppSec)
```powershell
# Nhánh True (Quyền Viewer cố đổi ID) -> Gửi mail cảnh cáo, Revoke Token
$body = @{ alert_id = "test_8_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ user_role = "Viewer" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-idor" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Quyền Admin) -> Hợp lệ, bỏ qua
$body = @{ alert_id = "test_8_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ user_role = "Admin" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-idor" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 9: Credential Stuffing (AppSec)
```powershell
# Nhánh True (Sai trên 20 lần) -> Gửi mail, Force Password Reset
$body = @{ alert_id = "test_9_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ failed_logins = 50 } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-stuffing" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Sai dưới 20 lần) -> Bỏ qua
$body = @{ alert_id = "test_9_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ failed_logins = 5 } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-stuffing" -Method POST -ContentType "application/json" -Body $body
```

## Kịch bản 10: Server-Side Request Forgery - SSRF (AppSec)
```powershell
# Nhánh True (Cố gọi ra AWS Metadata IP) -> Gửi mail khẩn cấp, Block Firewall Outbound
$body = @{ alert_id = "test_10_true"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ target_internal_ip = "169.254.169.254" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-ssrf" -Method POST -ContentType "application/json" -Body $body

# Nhánh False (Gọi IP Public) -> Bình thường, bỏ qua
$body = @{ alert_id = "test_10_false"; victim_email = "dat.tanvo6767@gmail.com"; payload = @{ target_internal_ip = "8.8.8.8" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/trigger-ssrf" -Method POST -ContentType "application/json" -Body $body
```
