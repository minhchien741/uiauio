#!/bin/bash
# =============================================
# 🚀 Script Cài đặt Hệ thống Đặt phòng ICTU (Docker)
# Chạy: chmod +x docker/setup.sh && ./docker/setup.sh
# =============================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🏫 HỆ THỐNG ĐẶT PHÒNG — ICTU                ║"
echo "║   Trình cài đặt tự động (Docker Compose)        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# --- Kiểm tra Docker ---
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt!"
    echo "   Hãy chạy: sudo apt install -y docker.io docker-compose"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose chưa được cài đặt!"
    echo "   Hãy chạy: sudo apt install -y docker-compose"
    exit 1
fi

echo "✅ Docker đã sẵn sàng."
echo ""

# ==================================================
# 1. Hỏi thông tin cấu hình
# ==================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Bước 1: Cấu hình Cơ sở dữ liệu (SQL Server)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "🔑 Mật khẩu SQL Server SA (mặc định: YourStrong!Passw0rd): " MSSQL_PASSWORD
MSSQL_PASSWORD=${MSSQL_PASSWORD:-"YourStrong!Passw0rd"}

read -p "🗄️ Tên Database (mặc định: RoomScheduling): " DB_NAME
DB_NAME=${DB_NAME:-"RoomScheduling"}

read -p "🔌 Cổng SQL Server (mặc định: 1433): " DB_PORT
DB_PORT=${DB_PORT:-1433}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Bước 2: Cấu hình Backend .NET API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "🌐 Cổng Backend API (mặc định: 5114): " API_PORT
API_PORT=${API_PORT:-5114}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Bước 3: Cấu hình Frontend & Bảo mật"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "🌐 Cổng Frontend (mặc định: 3000): " FE_PORT
FE_PORT=${FE_PORT:-3000}

# Tự sinh JWT Secret ngẫu nhiên nếu người dùng không nhập
DEFAULT_JWT=$(openssl rand -hex 32 2>/dev/null || echo "room_scheduling_jwt_secret_$(date +%s)")
read -p "🔐 JWT Secret (Enter để tự sinh ngẫu nhiên): " JWT_SECRET
JWT_SECRET=${JWT_SECRET:-$DEFAULT_JWT}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Bước 4: Tích hợp AI (Tuỳ chọn)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "🤖 Google Gemini API Key (Enter để bỏ qua): " GEMINI_KEY
GEMINI_KEY=${GEMINI_KEY:-""}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Bước 5: Cấu hình Email SMTP (Tuỳ chọn)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "📧 SMTP Host (Enter để bỏ qua): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-""}

if [ -n "$SMTP_HOST" ]; then
    read -p "📧 SMTP Port (mặc định: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "📧 SMTP Username: " SMTP_USER
    read -p "📧 SMTP Password: " SMTP_PASS
    read -p "📧 Email gửi đi (From): " SMTP_FROM
fi

# ==================================================
# 2. Tạo file .env
# ==================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo ""
echo "📄 Đang tạo file cấu hình: $ENV_FILE"

cat > "$ENV_FILE" << EOF
# =============================================
# Biến môi trường — Được sinh tự động bởi setup.sh
# Ngày tạo: $(date '+%Y-%m-%d %H:%M:%S')
# =============================================

# Database
MSSQL_SA_PASSWORD=$MSSQL_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=$DB_PORT

# Backend
API_PORT=$API_PORT

# Frontend
FE_PORT=$FE_PORT

# Bảo mật
JWT_SECRET=$JWT_SECRET

# AI (tuỳ chọn)
GEMINI_API_KEY=$GEMINI_KEY

# Email SMTP (tuỳ chọn)
SMTP_HOST=$SMTP_HOST
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-}
EOF

echo "✅ Đã tạo file .env thành công!"

# ==================================================
# 3. Xác nhận và chạy Docker Compose
# ==================================================

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              📋 TÓM TẮT CẤU HÌNH               ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  🗄️  SQL Server:    localhost:$DB_PORT"
echo "║  📡 Backend API:   localhost:$API_PORT"
echo "║  🌐 Frontend:      localhost:$FE_PORT"
echo "║  🔐 JWT Secret:    ${JWT_SECRET:0:16}..."
echo "║  🤖 Gemini AI:     $([ -n "$GEMINI_KEY" ] && echo "Đã cấu hình ✅" || echo "Bỏ qua ⏭️")"
echo "║  📧 Email SMTP:    $([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST ✅" || echo "Bỏ qua ⏭️")"
echo "╚══════════════════════════════════════════════════╝"
echo ""

read -p "🚀 Bắt đầu build và chạy hệ thống? (y/N): " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    echo "⏳ Đang build hệ thống... (có thể mất 3-5 phút lần đầu)"
    echo ""
    docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║         🎉 TRIỂN KHAI THÀNH CÔNG!               ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    echo "║  🌐 Mở trình duyệt: http://localhost:$FE_PORT       ║"
    echo "║  📡 Swagger API:     http://localhost:$API_PORT/swagger ║"
    echo "║                                                  ║"
    echo "║  📝 Xem log:  docker-compose -f docker/docker-compose.yml logs -f"
    echo "║  🛑 Dừng:     docker-compose -f docker/docker-compose.yml down"
    echo "║                                                  ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo ""
    echo "⏸️  Đã lưu cấu hình vào docker/.env"
    echo "   Khi nào muốn chạy, hãy gõ:"
    echo "   docker-compose -f docker/docker-compose.yml up -d --build"
fi

echo ""
