# Hướng dẫn Triển khai Tự động (Automated Deployment)

Tài liệu này hướng dẫn chi tiết cách triển khai toàn bộ hệ thống Đặt phòng ICTU (Backend, Frontend, SQL Server, Nginx) lên môi trường Production sử dụng Script tự động `deploy-prod.sh`. Thích hợp cho môi trường cần tốc độ và không muốn cấu hình tay Nginx hay SSL.

---

## 🛠️ Bước 1: Chuẩn bị Server (Chỉ làm 1 lần trên Server mới)
Bạn cần một Server Ubuntu trắng. Đăng nhập vào Server bằng SSH và làm theo các lệnh sau để tải Git, Docker và thiết lập môi trường:

**1. Cập nhật hệ thống & Cài Git:**
```bash
sudo apt update
sudo apt install git -y
```

**2. Cài đặt Docker & Docker Compose:**
Cách nhanh nhất và chuẩn nhất trên Linux là dùng bash script chính chủ của Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**3. Phân quyền User (Rất quan trọng):**
Để lệnh khởi động mượt mà không bị vướng quyền báo lỗi, cấp quyền Docker cho user của bạn:
```bash
sudo usermod -aG docker $USER
```
> ⚠️ **Chú ý:** Gõ xong lệnh trên, bạn phải dùng lệnh `exit` để thoát SSH và đăng nhập lại mới có hiệu lực!

---

## 📥 Bước 2: Chuẩn bị Mã nguồn & SSL Cloudflare

**1. Tải Mã Nguồn:**
Sau khi đăng nhập lại, tải project của bạn về:
```bash
git clone <đường_dẫn_repo_github_của_bạn> uiauio
cd uiauio
```

**2. Lấy Cloudflare Origin Certificate:**
Hệ thống này được setup bảo mật 100% bằng SSL của Cloudflare.
- Truy cập Dashboard Cloudflare -> Vào tên miền của bạn.
- Vào menu **SSL/TLS** -> **Origin Server**.
- Bấm **Create Certificate** -> Để nguyên tùy chọn RSA -> Bấm **Create**.
- Bạn sẽ nhận được 2 đoạn text rất dài: `Origin Certificate` và `Private Key`. Giữ nguyên tab đó, chúng ta sẽ cần copy nó ở bước tiếp theo.

---

## 🚀 Bước 3: Chạy Script Tự Động Triển Khai

Script `deploy-prod.sh` sẽ gánh vác toàn bộ công đoạn khó nhằn. Bạn chỉ cần trả lời các câu hỏi.

**1. Cấp quyền thực thi cho Script:**
```bash
chmod +x ./docker/deploy-prod.sh
```

**2. Khởi động Script:**
```bash
sudo ./docker/deploy-prod.sh
```

**3. Tương tác với Script (Trả lời Menu):**
Khi Script chạy, bạn sẽ đi qua các câu hỏi sau:
- **Xóa trắng Database (Reset SQL)?**: Mặc định script sẽ giữ lại dữ liệu cũ. Nếu bạn muốn xóa trắng sạch sẽ mọi dữ liệu đặt phòng và account, gõ chữ `RESET` (hoặc `yes`) rồi Enter.
- **Tên miền**: Gõ chính xác tên miền hoặc subdomain của bạn (Ví dụ: `datphong.rankpush.xyz`). Hệ thống sẽ tự setup Nginx nhận diện tên miền này.
- **Chứng chỉ SSL (Origin Cert)**: Hệ thống yêu cầu dán nội dung Cert. Hãy copy toàn bộ khối `-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----` từ Cloudflare dán vào Terminal. **Nhấn Enter 2 lần** để kết thúc khối đó.
- **Khóa bảo mật (Private Key)**: Tương tự, copy khối `Private Key` dán vào và nhấn Enter 2 lần lặp lại.
- **Cấu hình Gemini & Email**: Nếu có Key của Gemini AI hoặc SMPT Email, bạn dán vào. Nếu không có, cứ bấm **Enter** để bỏ qua trắng, hệ thống sẽ tự động tắt tính năng AI/Gửi mail.

**4. Chờ hệ thống Build:**
Lúc này Script sẽ:
- Tự tạo file `.env` siêu bảo mật.
- Tự tạo file cấu hình Nginx Server Block 100% chuẩn xác.
- Tự động Load file ảnh Docker (Quá trình tải về/Build .NET & Nodejs này tốn khoảng **2 - 5 phút** tuỳ tốc độ mạng VPS).
- Đợi SQL Server, Backend và Frontend sẵn sàng (Cực lẹ chừng vài giây).

🎉 Cuối cùng Script sẽ hiển thị màn hình chúc mừng kết quả! Web đã lên sóng tại `https://<tên_miền_của_bạn>`.

---

## 🛑 Các Lệnh Quản Trị Hữu Ích

Sau khi hệ thống đã chạy lên, nếu bạn cần xem tình hình hoặc tắt/bật lại:

**1. Xem Log hoạt động thực tế:**
- Xem log Backend (để bắt lỗi API): `docker logs room_backend -f`
- Xem log Frontend: `docker logs room_frontend -f`

**2. Dừng toàn bộ hệ thống:**
Sử dụng docker compose tại thư mục gốc:
```bash
docker compose -f docker/docker-compose.prod.yml down
```

**3. Khởi động lại hệ thống (Restart):**
Đơn giản nhất là chặn script cũ và chạy lại script chạy (Script tự biết dọn rác):
```bash
sudo ./docker/deploy-prod.sh
```
