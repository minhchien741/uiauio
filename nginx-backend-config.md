# Hướng dẫn cấu hình Nginx cho .NET Backend (Full Strict SSL Cloudflare)

Tài liệu này hướng dẫn cài đặt Nginx làm Reverse Proxy cho Backend .NET với cấu hình bảo mật **Full (Strict)** của Cloudflare. Với chế độ này, dữ liệu được mã hoá toàn trình từ Người dùng -> Cloudflare -> Server Nginx của bạn.

## 1. Tạo chứng chỉ Origin Certificate từ Cloudflare
Để chạy **Full (Strict)**, Cloudflare yêu cầu Máy chủ gốc (Nginx) phải có một chứng chỉ hợp lệ. Cách tốt nhất (và miễn phí vĩnh viễn) là tạo **Cloudflare Origin Certificate**:

1. Đăng nhập vào Cloudflare, chọn domain của bạn (`rankpush.xyz`).
2. Tới menu **SSL/TLS** > **Origin Server**.
3. Bấm **Create Certificate**. Giữ cấu hình mặc định và bấm **Create**.
4. Cloudflare sẽ tạo ra phần **Origin Certificate** và **Private Key**, hãy copy chúng và lưu vào thư mục trên máy chủ Nginx:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/datphongapi.pem
# (Dán nội dung Origin Certificate vào và lưu lại)
```
```bash
sudo nano /etc/ssl/cloudflare/datphongapi.key
# (Dán nội dung Private Key vào và lưu lại)
```

## 2. Tạo file cấu hình Nginx cho Backend
Tạo một file cấu hình mới:
```bash
sudo nano /etc/nginx/sites-available/roomscheduling-api.conf
```

## 3. Nội dung cấu hình Nginx (SSL)
Dán block sau vào file cấu hình. Nginx sẽ được thiết lập để force SSL sử dụng các file `.pem` và `.key` bạn vừa tạo.

```nginx
# Khối này dùng để tự động chuyển hướng HTTP sang HTTPS
server {
    listen 80;
    server_name datphongapi.rankpush.xyz;
    
    return 301 https://$host$request_uri;
}

# Khối này cấu hình HTTPS bằng Origin Cert để chạy Full Strict
server {
    listen 443 ssl http2;
    server_name datphongapi.rankpush.xyz;

    # Trỏ đến chứng chỉ Cloudflare
    ssl_certificate /etc/ssl/cloudflare/rankpush.pem;
    ssl_certificate_key /etc/ssl/cloudflare/rankpush.key;

    # Cấu hình TLS tương thích tốt với Cloudflare
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Cấu hình log (Tuỳ chọn)
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;

    location / {
        # Đưa request đến .NET Backend chạy ở cổng 5001
        proxy_pass http://127.0.0.1:5001;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Bắt IP thật chính xác bằng header HTTP_CF_CONNECTING_IP của Cloudflare
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. Kích hoạt và Khởi động lại

```bash
# Bật cấu hình
sudo ln -s /etc/nginx/sites-available/roomscheduling-api.conf /etc/nginx/sites-enabled/

# Kiểm tra syntax để đảm bảo bạn không làm sai
sudo nginx -t

# Áp dụng thay đổi cấu hình
sudo systemctl reload nginx
```

## 5. Bật chế độ Full (Strict) trên Cloudflare
1. Quay lại trang quản trị Cloudflare cho domain của bạn.
2. Từ menu trái, vào phần **SSL/TLS** > **Overview**.
3. Nhấp chọn chế độ **Full (strict)**.

Chúc mừng bạn đã hoàn thành việc bảo mật hoàn toàn hệ thống proxy của mình!
