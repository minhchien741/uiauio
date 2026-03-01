#!/bin/bash
# =============================================
# Script Cai dat He thong Dat phong ICTU (Docker)
# Chay: chmod +x docker/setup.sh && ./docker/setup.sh
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🏫 HỆ THỐNG ĐẶT PHÒNG — ICTU                ║"
echo "║   Trình cài đặt tự động (Docker Compose)        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# --- Kiem tra Docker ---
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt!"
    echo "   Hãy chạy: sudo apt install -y docker.io"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose chưa được cài đặt!"
    echo "   Hãy chạy: sudo apt install -y docker.io"
    exit 1
fi

echo "✅ Docker đã sẵn sàng."
echo ""

# ==================================================
# Kiem tra da setup truoc do chua
# ==================================================

if [ -f "$ENV_FILE" ]; then
    echo "╔══════════════════════════════════════════════════╗"
    echo "║   ⚠️  Phát hiện cấu hình cũ (docker/.env)       ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
    echo "━━━━━━━━━━━━━━ Cấu hình hiện tại ━━━━━━━━━━━━━━━━"
    echo ""

    # Doc va hien thi tung gia tri tu file .env cu
    OLD_MSSQL=$(grep "^MSSQL_SA_PASSWORD=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_DB_NAME=$(grep "^DB_NAME=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_DB_PORT=$(grep "^DB_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_API_PORT=$(grep "^API_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_FE_PORT=$(grep "^FE_PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_JWT=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_GEMINI=$(grep "^GEMINI_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    OLD_SMTP_HOST=$(grep "^SMTP_HOST=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)

    echo "  🔑 Mật khẩu SQL:    ${OLD_MSSQL:-Chưa đặt}"
    echo "  🗄️  Database:        ${OLD_DB_NAME:-RoomScheduling}"
    echo "  🔌 Cổng SQL:        ${OLD_DB_PORT:-1433}"
    echo "  📡 Cổng Backend:    ${OLD_API_PORT:-5114}"
    echo "  🌐 Cổng Frontend:   ${OLD_FE_PORT:-3000}"
    echo "  🔐 JWT Secret:      ${OLD_JWT:0:20}..."
    echo "  🤖 Gemini API:      $([ -n "$OLD_GEMINI" ] && echo "Đã cấu hình ✅" || echo "Chưa đặt ⏭️")"
    echo "  📧 SMTP:            $([ -n "$OLD_SMTP_HOST" ] && echo "$OLD_SMTP_HOST ✅" || echo "Chưa đặt ⏭️")"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    read -p "🔄 Bạn có muốn cấu hình lại từ đầu không? (y/N): " RECONFIG
    if [[ ! "$RECONFIG" =~ ^[Yy]$ ]]; then
        echo ""
        read -p "🚀 Chạy hệ thống với cấu hình cũ? (y/N): " RUN_OLD
        if [[ "$RUN_OLD" =~ ^[Yy]$ ]]; then
            echo ""
            echo "⏳ Đang build hệ thống..."
            docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
            echo ""
            echo "🎉 Hệ thống đã khởi chạy!"
            echo "   🌐 Frontend:  http://localhost:${OLD_FE_PORT:-3000}"
            echo "   📡 Swagger:   http://localhost:${OLD_API_PORT:-5114}/swagger"
        else
            echo ""
            echo "👋 Thoát. Cấu hình cũ vẫn được giữ nguyên tại docker/.env"
        fi
        exit 0
    fi

    echo ""
    echo "📝 Bắt đầu cấu hình mới..."
    echo ""
fi

# ==================================================
# Hoi thong tin cau hinh
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
# Tao file .env
# ==================================================

echo ""
echo "📄 Đang tạo file cấu hình: $ENV_FILE"

cat > "$ENV_FILE" << EOF
# Bien moi truong — Duoc sinh tu dong boi setup.sh
# Ngay tao: $(date '+%Y-%m-%d %H:%M:%S')

# Database
MSSQL_SA_PASSWORD=$MSSQL_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=$DB_PORT

# Backend
API_PORT=$API_PORT

# Frontend
FE_PORT=$FE_PORT

# Bao mat
JWT_SECRET=$JWT_SECRET

# AI (tuy chon)
GEMINI_API_KEY=$GEMINI_KEY

# Email SMTP (tuy chon)
SMTP_HOST=$SMTP_HOST
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-}
EOF

echo "✅ Đã tạo file .env thành công!"

# ==================================================
# Xac nhan va chay Docker Compose
# ==================================================

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              📋 TÓM TẮT CẤU HÌNH               ║"
echo "╠══════════════════════════════════════════════════╣"
printf "║  🗄️  SQL Server:    localhost:%-19s║\n" "$DB_PORT"
printf "║  📡 Backend API:   localhost:%-19s║\n" "$API_PORT"
printf "║  🌐 Frontend:      localhost:%-19s║\n" "$FE_PORT"
printf "║  🔐 JWT Secret:    %-28s║\n" "${JWT_SECRET:0:16}..."
printf "║  🤖 Gemini AI:     %-28s║\n" "$([ -n "$GEMINI_KEY" ] && echo "Da cau hinh" || echo "Bo qua")"
printf "║  📧 Email SMTP:    %-28s║\n" "$([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST" || echo "Bo qua")"
echo "╚══════════════════════════════════════════════════╝"
echo ""

read -p "🚀 Bắt đầu build và chạy hệ thống? (y/N): " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    echo "⏳ Đang build hệ thống... (có thể mất 3-5 phút lần đầu)"
    echo ""
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║         🎉 TRIỂN KHAI THÀNH CÔNG!               ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    printf "║  🌐 Frontend:  http://localhost:%-17s║\n" "$FE_PORT"
    printf "║  📡 Swagger:   http://localhost:%s/swagger\n" "$API_PORT"
    echo "║                                                  ║"
    echo "║  📝 Xem log:  docker compose -f docker/docker-compose.yml logs -f"
    echo "║  🛑 Dừng:     docker compose -f docker/docker-compose.yml down"
    echo "║                                                  ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo ""
    echo "⏸️  Đã lưu cấu hình vào docker/.env"
    echo "   Khi nào muốn chạy, hãy gõ:"
    echo "   docker compose -f docker/docker-compose.yml up -d --build"
fi

echo ""
