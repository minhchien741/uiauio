# 🔒 Hướng dẫn cài SSL với Cloudflare (Full Strict)

## Tổng quan

Hệ thống sử dụng **Cloudflare Full (Strict)** SSL:

```
User ──HTTPS──▶ Cloudflare ──HTTPS──▶ Server (Nginx:443) ──HTTP──▶ Docker containers
```

- Cloudflare xử lý SSL cho client (cert công khai)
- Origin server dùng **Cloudflare Origin Certificate** (cert riêng giữa Cloudflare ↔ server)
- Miễn phí, hạn 15 năm, không cần gia hạn

---

## Bước 1: Tạo Origin Certificate trên Cloudflare

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Chọn domain → **SSL/TLS** → **Origin Server**
3. Click **Create Certificate**
4. Cấu hình:
   - **Private key type**: RSA (2048)
   - **Hostnames**: `*.tenmien.com` và `tenmien.com`
   - **Certificate validity**: 15 years
5. Click **Create**

## Bước 2: Lưu cert files

Cloudflare sẽ hiện 2 ô text:

### Origin Certificate → `origin.pem`
```
-----BEGIN CERTIFICATE-----
MIIEqDCCA5Cg...
-----END CERTIFICATE-----
```

### Private Key → `origin-key.pem`
```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANB...
-----END PRIVATE KEY-----
```

Copy nội dung và tạo 2 file trên **server**:

```bash
# Tạo thư mục (nếu chưa có)
mkdir -p docker/nginx/ssl

# Paste nội dung cert
nano docker/nginx/ssl/origin.pem
nano docker/nginx/ssl/origin-key.pem

# Bảo mật file
chmod 600 docker/nginx/ssl/origin-key.pem
```

> ⚠️ **Quan trọng**: Lưu Private Key ngay! Cloudflare chỉ hiện **1 lần duy nhất**.

## Bước 3: Cấu hình DNS trên Cloudflare

1. Vào **DNS** → **Records**
2. Thêm record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `IP_SERVER` | ☁️ Proxied |
| A | `www` | `IP_SERVER` | ☁️ Proxied |

3. Đảm bảo **Proxy status** là ☁️ cam (Proxied), không phải DNS only

## Bước 4: Cấu hình SSL mode

1. Vào **SSL/TLS** → **Overview**
2. Chọn: **Full (strict)**

## Bước 5: Deploy

```bash
sudo ./docker/deploy-prod.sh
```

Script sẽ tự động detect cert files trong `docker/nginx/ssl/` và cấu hình Nginx HTTPS.

---

## Cấu trúc file

```
docker/
├── nginx/
│   ├── default.conf        # Nginx config (tự sinh bởi script)
│   └── ssl/
│       ├── origin.pem       # ← Cloudflare Origin Certificate
│       └── origin-key.pem   # ← Private Key
├── docker-compose.prod.yml
├── deploy-prod.sh
└── .env
```

## Kiểm tra SSL

```bash
# Test từ server
curl -I https://tenmien.com

# Xem log Nginx
docker logs room_nginx

# Kiểm tra cert
docker exec room_nginx openssl s_client -connect localhost:443 -servername tenmien.com
```

## Xử lý lỗi

| Lỗi | Nguyên nhân | Fix |
|-----|------------|-----|
| 526 | Origin cert sai/thiếu | Kiểm tra `origin.pem` và `origin-key.pem` |
| 502 | Backend/Frontend chưa chạy | `docker logs room_backend` |
| 521 | Server chưa bật hoặc port 443 bị chặn | Mở firewall: `sudo ufw allow 443` |
| `ERR_TOO_MANY_REDIRECTS` | HTTPS redirect loop | Đảm bảo SSL mode là **Full (strict)**, không phải **Flexible** |

## Bảo mật bổ sung (khuyến nghị)

Trong Cloudflare Dashboard:

- **SSL/TLS → Edge Certificates**: Bật **Always Use HTTPS**
- **SSL/TLS → Edge Certificates**: Bật **Automatic HTTPS Rewrites**
- **Security → Settings**: **Security Level** = Medium
- **Speed → Optimization**: Bật **Auto Minify** (JS, CSS, HTML)
