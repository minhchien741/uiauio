# 🐳 Docker — Hệ thống Đặt phòng ICTU

Thư mục này chứa toàn bộ file cần thiết để triển khai hệ thống bằng Docker.

## Cấu trúc

```
docker/
├── Dockerfile.backend    # Đóng gói .NET 9 Backend API
├── Dockerfile.frontend   # Đóng gói React Frontend + Node.js Proxy
├── docker-compose.yml    # Điều phối 3 service: DB, Backend, Frontend
├── .env.example          # Mẫu biến môi trường (copy thành .env)
└── README.md             # File này
```

## Hướng dẫn nhanh

```bash
# 1. Copy file .env mẫu
cp docker/.env.example docker/.env

# 2. Sửa các giá trị trong docker/.env cho phù hợp

# 3. Build và chạy toàn bộ hệ thống
docker-compose -f docker/docker-compose.yml up -d --build

# 4. Xem log
docker-compose -f docker/docker-compose.yml logs -f

# 5. Dừng hệ thống
docker-compose -f docker/docker-compose.yml down
```

## Truy cập

| Dịch vụ | URL |
|---------|-----|
| Frontend (Giao diện) | http://localhost:3000 |
| Backend API (Swagger) | http://localhost:5114/swagger |
| SQL Server | localhost:1433 |

> Xem thêm chi tiết tại file [DEPLOY_DOCKER.md](../DEPLOY_DOCKER.md) ở thư mục gốc.
