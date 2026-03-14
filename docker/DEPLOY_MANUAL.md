# Hướng dẫn Triển khai Thủ công (Manual Deployment)

Tài liệu này hướng dẫn chi tiết cách tự tay cấu hình và triển khai (Deploy) hệ thống Đặt phòng lên Server Production từng bước một.
Cách này giúp bạn nắm vững vòng đời (lifecycle), cơ chế ghép nối `.env`, cấu hình mạng Nginx Reverse Proxy mà không phụ thuộc vào bất kỳ script có sẵn nào.

---

## 🛠️ Bước 1: Chuẩn bị Môi trường Server
Bạn cần một Server Ubuntu sạch (VPS/Cloud).
Mở Terminal/SSH và gõ từng dòng lệnh sau để cài đặt Docker và Git (Chỉ làm 1 lần):

**1. Cài Git:**
```bash
sudo apt update && sudo apt install git -y
```

**2. Cài Docker và Docker Compose:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**3. Phân quyền User (để bỏ tiền tố sudo):**
```bash
sudo usermod -aG docker $USER
```
*(Cực kỳ quan trọng: Gõ xong lệnh này hãy gõ `exit` để thoát phiên làm việc, sau đó login lại SSH!)*

---

## 📥 Bước 2: Tải Mã Nguồn

Sử dụng Git tải toàn bộ Code từ GitHub về Server:
```bash
git clone <đường_dẫn_repo_github_của_bạn> uiauio
cd uiauio
```

---

## 📝 Bước 3: Cấu Hình Biến Môi Trường (.env)

Hệ thống Docker Compose cần một file môi trường chuẩn để kết nối SQL và cài đặt App.

**1. Copy file mẫu:**
Bạn đi vào thư mục `docker` để làm việc:
```bash
cd docker
cp .env.example .env
```

**2. Sửa file .env:**
Mở Nano lên để tự nhập tay các thông số bảo mật:
```bash
nano .env
```
Nội dung bên trong, bạn sửa ít nhất những biến quan trọng sau:
- `MSSQL_SA_PASSWORD=` (Một mật khẩu đủ khó cho Database của bạn, ví dụ `DatPhong@2026`)
- `DOMAIN_NAME=` (Tên miền thực tế của bạn, ví dụ `datphong.rankpush.xyz`)
- `JWT_SECRET=` (Tạo 1 mật khẩu dài ngẫu nhiên để ký Token)
- Bỏ qua các biến Gemini hoặc SMTP nếu bạn chưa cần dùng.

Bấm `Ctrl + O` -> `Enter` để lưu, và `Ctrl + X` để thoát Nano.

---

## 🔐 Bước 4: Tự Tạo và Gắn SSL Cloudflare

Cloudflare yêu cầu kết nối HTTPS từ họ vào Origin (Server) của bạn. Chúng ta dùng Certificate tự nhận do Cloudflare cấp miễn phí.

**1. Lấy mã vùng (Certificate) từ Web:**
- Lên Cloudflare -> Domain của bạn -> SSL/TLS -> Origin Server -> Tự tạo Certificate.
- Màn hình sẽ hiển thị 2 cục dữ liệu: `Origin Certificate` và `Private Key`.

**2. Gắn lên máy chủ (Server Ubuntu):**
Tự tạo thư mục tên là `ssl` bên trong mục Nginx và tạo 2 file gắp SSL:
```bash
mkdir -p nginx/ssl

nano nginx/ssl/origin.pem
# Dán khối Origin Certificate (từ Cloudflare) vào đây.
# Bấm Ctrl+O, Enter, Ctrl+X để thoát

nano nginx/ssl/origin-key.pem
# Dán khối Private Key (từ Cloudflare) vào đây.
# Bấm Ctrl+O, Enter, Ctrl+X để thoát
```

---

## 🌐 Bước 5: Viết / Chỉnh sửa Cấu Hình Nginx

Nginx có nhiệm vụ đứng đầu sóng ngọn gió, đón lấy port `80/443` rồi phân phối request vào Frontend.

Mở file để viết cấu hình:
```bash
nano nginx/default.conf
```

**Đảm bảo file Nginx của bạn có nội dung chuẩn (đặc biệt phần tên miền):**
Hãy chèn đoạn code này hoặc sửa các chỗ tương tự, thay chữ `datphong.rankpush.xyz` bằng tên miền chuẩn:
```nginx
# Đẩy HTTP sang HTTPS
server {
    listen 80;
    server_name datphong.rankpush.xyz;
    return 301 https://$host$request_uri;
}

# Hứng HTTPS
server {
    listen 443 ssl;
    server_name datphong.rankpush.xyz;

    ssl_certificate /etc/nginx/ssl/origin.pem;
    ssl_certificate_key /etc/nginx/ssl/origin-key.pem;

    # Nginx đón cổng gốc và giao mọi API, giao diện đẩy hết sang Node.js (BFF Frontend)
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Hangfire Monitor đẩy vào C# Backend
    location /hangfire {
        proxy_pass http://backend:8080/hangfire;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Lưu lại (`Ctrl+O` -> `Enter` -> `Ctrl+X`).

*(Lưu ý: Không set location `/api/` để Node.js tự handle luồng login).*

---

## 🚀 Bước 6: Kích Hoạt (Build & Deploy Docker)

Đứng ở thư mục gốc của Repo (thư mục lớn `uiauio`), gõ lệnh kích hoạt toàn hệ thống:
```bash
cd ..  # Trở về thư mục gốc nếu bạn đang ở thư mục docker
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build
```

Lúc này Docker Engine sẽ tự động thực hiện:
- Build ảnh `.NET 9` (Nhẹ bẫng nhờ dùng Alpine).
- Lệnh Dockerfile Build frontend dùng Vite/Node.js.
- Setup CSDL SQL Server 2022.

⚠️ **Có Thể Bạn Sẽ Gặp Lỗi Cấp Quyền Bảng Data của CSDL?**
Nếu hệ thống Database báo lỗi Volume không thể ghi, bạn phải gỡ cục data volume cũ và chạy lại:
```bash
docker compose -f docker/docker-compose.prod.yml down -v
# Lệnh -v là để xóa tan dữ liệu cũ (Tương đương thuật ngữ "Reset SQL Server")
```
Và sau đó `up -d --build` lại.

---

## ✅ Bước 7: Xác Minh Trên Production

1. **Kiểm tra tình trạng sống/chết (Health) các container:**
   ```bash
   docker ps
   ```
   Tất cả phải nằm ở trạng thái `Up` (và SQL nằm ở `healthy`).

2. **Dò bảng Lỗi nếu web trắng trang:**
   Nếu Web không lên, đọc Log để xem Backend .NET hay Node.js tèo:
   ```bash
   docker logs room_backend --tail 50
   docker logs room_frontend --tail 50
   docker logs room_nginx --tail 50
   ```

3. Gõ trên web `https://<ten_mien_cua_ban>` để chiêm ngưỡng tác phẩm. Swagger hoàn toàn đã ẩn ở Production theo luật an toàn. Hết!
