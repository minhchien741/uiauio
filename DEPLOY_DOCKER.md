# Kế hoạch Triển khai Hệ thống Đặt phòng bằng Docker Compose

Tài liệu này hướng dẫn cách triển khai toàn bộ hệ thống lên server bằng **Docker** và **Docker Compose**. Tất cả file Docker đã được chuẩn bị sẵn trong thư mục [`docker/`](docker/).

---

## 📁 Cấu trúc thư mục Docker

```
docker/
├── Dockerfile.backend      # Đóng gói .NET 9 Backend API (multi-stage build)
├── Dockerfile.frontend     # Đóng gói React Frontend + Node.js Proxy
├── docker-compose.yml      # Điều phối 3 service: SQL Server, Backend, Frontend
├── setup.sh                # Script cài đặt tương tác (hỏi cấu hình trên terminal)
├── .env.example            # Mẫu biến môi trường
└── README.md               # Hướng dẫn nhanh
```

---

## 🛠️ Bước 1 — Cài đặt Docker trên Server Ubuntu

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

---

## ⚙️ Bước 2 — Chạy trình cài đặt tương tác (Khuyên dùng)

Dự án có sẵn script **tương tác trên terminal**, tự động hỏi bạn từng giá trị cần thiết:

```bash
chmod +x docker/setup.sh
./docker/setup.sh
```

Script sẽ lần lượt hỏi bạn:

| Bước | Nội dung | Mặc định |
|------|----------|----------|
| 1 | 🔑 Mật khẩu SQL Server SA | `YourStrong!Passw0rd` |
| 2 | 🗄️ Tên Database & Cổng | `RoomScheduling` / `1433` |
| 3 | 🌐 Cổng Backend API | `5114` |
| 4 | 🌐 Cổng Frontend | `3000` |
| 5 | 🔐 JWT Secret | Tự sinh ngẫu nhiên |
| 6 | 🤖 Google Gemini API Key | Tuỳ chọn |
| 7 | 📧 Cấu hình SMTP Email | Tuỳ chọn |

Sau khi nhập xong, script sẽ:
- Tự tạo file `docker/.env` với các giá trị bạn đã nhập.
- Hiển thị bảng tóm tắt cấu hình.
- Hỏi bạn có muốn **build và chạy ngay** hay không.

> **Cách thủ công:** Nếu không muốn dùng script, bạn có thể `cp docker/.env.example docker/.env` rồi sửa tay.

---

## 🚀 Bước 3 — Build và Chạy (nếu chưa chạy ở Bước 2)

```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

Docker sẽ tự động:
1. Tải image **SQL Server 2022** và khởi tạo database.
2. Build **.NET 9 Backend** từ `Dockerfile.backend` (multi-stage: SDK → Runtime).
3. Build **React Frontend + Node.js Proxy** từ `Dockerfile.frontend`.
4. Liên kết 3 container qua mạng nội bộ Docker.

---

## ✅ Bước 4 — Kiểm tra hệ thống

| Dịch vụ | URL | Cổng |
|---------|-----|------|
| 🌐 Giao diện Frontend | http://localhost:3000 | 3000 |
| 📡 Backend API (Swagger) | http://localhost:5114/swagger | 5114 |
| �️ SQL Server | localhost:1433 | 1433 |

Kiểm tra trạng thái container:
```bash
docker ps
```

---

## 🌐 Bước 5 — Đẩy ra Internet (Tuỳ chọn)

Để hệ thống có tên miền và HTTPS, cài Nginx + Let's Encrypt trên máy chủ:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Tạo file `/etc/nginx/sites-available/roomscheduling`:
```nginx
server {
    listen 80;
    server_name datphong.truong.edu.vn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt và cài SSL:
```bash
sudo ln -s /etc/nginx/sites-available/roomscheduling /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo certbot --nginx -d datphong.truong.edu.vn
```

---

## 📝 Các lệnh vận hành thường dùng

| Mục đích | Lệnh |
|----------|-------|
| Xem log toàn bộ | `docker-compose -f docker/docker-compose.yml logs -f` |
| Xem log Frontend | `docker logs room_frontend -f` |
| Xem log Backend | `docker logs room_backend -f` |
| Dừng hệ thống | `docker-compose -f docker/docker-compose.yml down` |
| Reset toàn bộ (xoá DB) | `docker-compose -f docker/docker-compose.yml down -v` |
| Rebuild 1 service | `docker-compose -f docker/docker-compose.yml up -d --build frontend` |
