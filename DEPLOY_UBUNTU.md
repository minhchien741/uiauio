# Kế hoạch Triển khai Hệ thống Đặt phòng lên Server Ubuntu (Production)

Tài liệu này hướng dẫn chi tiết các bước để đưa toàn bộ sản phẩm (Room Scheduling System) bao gồm **Frontend (React + Vite)**, **Node.js Proxy (BFF)**, **.NET 9 Backend**, và **Database SQL Server** lên một máy chủ Ubuntu (vd: VPS DigitalOcean, AWS EC2, Azure VM).

---

## 🏗️ 1. Cài đặt môi trường cần thiết (Prerequisites)

1. Cập nhật hệ thống:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. Cài đặt **.NET 9 SDK & Runtime**:
   ```bash
   wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
   sudo dpkg -i packages-microsoft-prod.deb
   sudo apt update
   sudo apt install -y apt-transport-https dotnet-sdk-9.0 aspnetcore-runtime-9.0
   ```
3. Cài đặt **Node.js (LTS)** & **NPM**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Cài đặt **PM2** (Quản lý process Node.js chạy ngầm) và **Nginx** (Web Server):
   ```bash
   sudo npm install -g pm2
   sudo apt install -y nginx
   ```
5. Cài đặt **Docker** & **Docker Compose** (Dành cho SQL Server gốc Linux):
   ```bash
   sudo apt install -y docker.io docker-compose
   ```

---

## 🗄️ 2. Triển khai Cơ sở dữ liệu (Microsoft SQL Server)

Sử dụng Docker để cài đặt MS SQL Server for Linux siêu tiện lợi và cách ly hệ điều hành.

1. Chạy container SQL Server:
   ```bash
   sudo docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" -p 1433:1433 --name mssql-server --restart unless-stopped -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. Kiểm tra container đang chạy không: `docker ps`.

*Lưu ý: Bạn cũng có thể dùng cơ sở dữ liệu cloud (RDS, Azure SQL), lúc đó chỉ cần trỏ chuỗi kết nối vào.*

---

## ⚙️ 3. Cấu hình & Build .NET Backend (RoomScheduling.API)

1. Đưa mã nguồn lên Ubuntu (qua git clone hoặc FTP/SCP).
2. Di chuyển vào thư mục API:
   ```bash
   cd /path/to/RoomSchedulingSystem/RoomScheduling.API
   ```
3. Chỉnh sửa file `appsettings.Production.json` (hoặc `appsettings.json`) để trỏ chuỗi kết nối (`DefaultConnection`) tới SQL Server ở Bước 2.
4. Build sản phẩm (Publish):
   ```bash
   dotnet publish -c Release -o /var/www/RoomScheduling.API
   ```
5. Chạy Migration tạo/Seed Database (chỉ chạy 1 lần):
   ```bash
   dotnet ef database update --environment Production
   ```
6. Tạo một Service **Systemd** để .NET chạy ngầm liên tục:
   *Tạo file `/etc/systemd/system/roomapi.service`*
   ```ini
   [Unit]
   Description=.NET Web API App running on Ubuntu

   [Service]
   WorkingDirectory=/var/www/RoomScheduling.API
   ExecStart=/usr/bin/dotnet /var/www/RoomScheduling.API/RoomScheduling.API.dll --urls "http://localhost:5114"
   Restart=always
   RestartSec=10
   KillSignal=SIGINT
   SyslogIdentifier=dotnet-roomapi
   User=www-data
   Environment=ASPNETCORE_ENVIRONMENT=Production

   [Install]
   WantedBy=multi-user.target
   ```
7. Bật service:
   ```bash
   sudo systemctl enable roomapi.service
   sudo systemctl start roomapi.service
   ```

---

## 🌐 4. Cấu hình & Build Frontend + Node.js Proxy (BFF)

1. Di chuyển vào thư mục React/Node:
   ```bash
   cd /path/to/RoomSchedulingSystem/room-scheduling-interface
   ```
2. Thiết lập biến môi trường `.env` cho Production:
   ```env
   NODE_ENV=production
   PORT=3000
   DOTNET_API=http://localhost:5114
   GEMINI_API_KEY=YOUR_API_KEY
   ```
3. Cài đặt dependencies và Build Frontend ra thư mục `dist`:
   ```bash
   npm install
   npm run build
   ```
4. Biên dịch file `server.ts` sang `server.js`:
   *(Môi trường dev đang dùng tsx/ts-node, trên prod ta ưu tiên build ra Javascript)*
   ```bash
   npx tsc server.ts --esModuleInterop --skipLibCheck -outDir dist-server
   ```
5. Sử dụng **PM2** để chạy file `server.js` (Proxy & API) ngầm dưới nền:
   ```bash
   pm2 start dist-server/server.js --name "room-proxy"
   pm2 startup
   pm2 save
   ```

*(Lưu ý: Nếu file server.js trong quá trình Production được chỉnh để serve tĩnh thư mục `dist` thì BFF sẽ vừa hứng request React, vừa gọi API .NET; nếu không, Frontend sẽ do Nginx gánh trực tiếp).*

---

## 🛡️ 5. Cấu hình Nginx làm Reverse Proxy & Cài SSL

1. Tạo file cấu hình Nginx:
   `sudo nano /etc/nginx/sites-available/roomscheduling`
   
   *Ví dụ cấu hình cơ bản:*
   ```nginx
   server {
       listen 80;
       server_name datphong.ten-truong.edu.vn; # Domain của bạn

       # 1. Trỏ mọi request bình thường vào Frontend Proxy Node.js (cổng 3000)
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # (Tùy chọn) 2. Nếu muốn gọi thẳng .NET API bỏ qua Node.js ở 1 số route:
       # location /api/dotnet/ {
       #     proxy_pass http://localhost:5114/;
       # }
   }
   ```
2. Kích hoạt và Restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/roomscheduling /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```
3. **Cài đặt HTTPS (SSL)** miễn phí với Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d datphong.ten-truong.edu.vn
   ```

---

## ✅ 6. Triển khai hoàn tất

- Dịch vụ **.NET API** chạy ở cổng `5114` (có chứa CronJob Hangfire và RoomReminderService nền).
- **Node.js Proxy** chạy ở cổng `3000` làm nhiệm vụ proxy, gợi ý phòng.
- **Nginx** hứng ở cổng `80/443`, bọc SSL và chia tải.
- **MSSQL** chạy qua Docker trong một phân vùng riêng (Port 1433 nội bộ).

**📝 Khắc phục sự cố đơn giản:**
- Lỗi .NET: `sudo journalctl -fu roomapi.service`
- Lỗi Proxy: `pm2 logs room-proxy`
- Lỗi Web Server: `sudo tail -f /var/log/nginx/error.log`
