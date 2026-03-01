#!/bin/bash
# =============================================
# 🚀 DEPLOY PRODUCTION — Hệ thống Đặt phòng ICTU
# Script tự động cài đặt & triển khai Docker
#
# Chạy:
#   chmod +x docker/deploy-prod.sh
#   sudo ./docker/deploy-prod.sh
# =============================================

set -e

# Mau sac
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Thu muc goc
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"

# =============================================
# Cac ham tien ich
# =============================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}🏫 HỆ THỐNG ĐẶT PHÒNG ICTU — PRODUCTION DEPLOY${NC}        ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
log_err()  { echo -e "  ${RED}❌ $1${NC}"; }
log_info() { echo -e "  ${CYAN}ℹ️  $1${NC}"; }

# =============================================
# BUOC 0: Kiem tra dieu kien tien quyet
# =============================================

print_header

print_step "📋 Bước 0: Kiểm tra hệ thống"

# Kiem tra quyen root
if [[ $EUID -ne 0 ]]; then
    log_warn "Khuyến nghị chạy với sudo để cài Docker tự động."
    log_info "Nếu Docker đã cài sẵn, có thể bỏ qua."
    echo ""
fi

# =============================================
# BUOC 1: Cai Docker neu chua co
# =============================================

print_step "🐳 Bước 1: Kiểm tra & Cài đặt Docker"

install_docker() {
    log_info "Đang cài đặt Docker..."
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose-plugin > /dev/null 2>&1
    systemctl start docker
    systemctl enable docker
    log_ok "Docker đã được cài đặt thành công!"
}

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    log_ok "Docker đã cài: $DOCKER_VERSION"
else
    if [[ $EUID -eq 0 ]]; then
        install_docker
    else
        log_err "Docker chưa được cài đặt!"
        echo -e "     Chạy: ${BOLD}sudo apt install -y docker.io docker-compose-plugin${NC}"
        exit 1
    fi
fi

# Kiem tra docker compose
if docker compose version &> /dev/null; then
    log_ok "Docker Compose sẵn sàng"
elif command -v docker-compose &> /dev/null; then
    log_ok "Docker Compose (legacy) sẵn sàng"
    # Alias cho scripts phia duoi
    docker() {
        if [[ "$1" == "compose" ]]; then
            shift
            command docker-compose "$@"
        else
            command docker "$@"
        fi
    }
else
    log_err "Docker Compose chưa được cài!"
    echo -e "     Chạy: ${BOLD}sudo apt install -y docker-compose-plugin${NC}"
    exit 1
fi

echo ""

# =============================================
# Ham cau hinh .env (phai khai bao truoc khi goi)
# =============================================

configure_env() {
    echo ""

    # --- Database ---
    read -p "  🔑 Mật khẩu SQL Server SA (mặc định: YourStrong!Passw0rd): " INPUT_MSSQL
    MSSQL_SA_PASSWORD=${INPUT_MSSQL:-"YourStrong!Passw0rd"}

    read -p "  🗄️  Tên Database (mặc định: RoomScheduling): " INPUT_DB
    DB_NAME=${INPUT_DB:-"RoomScheduling"}

    read -p "  🔌 Cổng SQL Server (mặc định: 1433): " INPUT_DB_PORT
    DB_PORT=${INPUT_DB_PORT:-1433}

    echo ""

    # --- Backend ---
    read -p "  📡 Cổng Backend API (mặc định: 5114): " INPUT_API
    API_PORT=${INPUT_API:-5114}

    echo ""

    # --- Frontend ---
    read -p "  🌐 Cổng Frontend (mặc định: 3000): " INPUT_FE
    FE_PORT=${INPUT_FE:-3000}

    # JWT Secret
    DEFAULT_JWT=$(openssl rand -hex 32 2>/dev/null || echo "room_jwt_secret_$(date +%s)")
    read -p "  🔐 JWT Secret (Enter = tự sinh ngẫu nhiên): " INPUT_JWT
    JWT_SECRET=${INPUT_JWT:-$DEFAULT_JWT}

    echo ""

    # --- Tuy chon ---
    read -p "  🤖 Google Gemini API Key (Enter = bỏ qua): " GEMINI_API_KEY
    GEMINI_API_KEY=${GEMINI_API_KEY:-""}

    read -p "  📧 SMTP Host (Enter = bỏ qua): " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-""}

    SMTP_PORT=587
    SMTP_USER=""
    SMTP_PASS=""
    SMTP_FROM=""

    if [ -n "$SMTP_HOST" ]; then
        read -p "  📧 SMTP Port (mặc định: 587): " INPUT_SMTP_PORT
        SMTP_PORT=${INPUT_SMTP_PORT:-587}
        read -p "  📧 SMTP Username: " SMTP_USER
        read -s -p "  📧 SMTP Password: " SMTP_PASS
        echo ""
        read -p "  📧 Email gửi đi (From): " SMTP_FROM
    fi

    echo ""

    # --- Nginx / Domain ---
    read -p "  🌍 Tên miền (VD: datphong.ictu.edu.vn, Enter = bỏ qua): " DOMAIN_NAME
    DOMAIN_NAME=${DOMAIN_NAME:-""}

    # Ghi file .env
    cat > "$ENV_FILE" << EOF
# =============================================
# Cau hinh Production — He thong Dat phong ICTU
# Tao boi deploy-prod.sh luc $(date '+%Y-%m-%d %H:%M:%S')
# =============================================

# --- Database ---
MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=$DB_PORT

# --- Backend ---
API_PORT=$API_PORT

# --- Frontend ---
FE_PORT=$FE_PORT

# --- Bao mat ---
JWT_SECRET=$JWT_SECRET

# --- AI ---
GEMINI_API_KEY=$GEMINI_API_KEY

# --- Email SMTP ---
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM

# --- Nginx / Domain ---
DOMAIN_NAME=$DOMAIN_NAME
EOF

    chmod 600 "$ENV_FILE"
    log_ok "Đã tạo file .env (quyền 600 — chỉ owner đọc được)"
}

# =============================================
# BUOC 2: Kiem tra / Tao file .env
# =============================================

print_step "⚙️  Bước 2: Cấu hình môi trường (.env)"

if [ -f "$ENV_FILE" ]; then
    log_ok "Tìm thấy file .env hiện tại"
    echo ""

    # Hien thi cau hinh hien tai
    source "$ENV_FILE"
    echo -e "  ${BOLD}Cấu hình hiện tại:${NC}"
    echo -e "  🔑 SQL Password:  ${MSSQL_SA_PASSWORD:0:4}****"
    echo -e "  🗄️  Database:      ${DB_NAME:-RoomScheduling}"
    echo -e "  🔌 Cổng SQL:      ${DB_PORT:-1433}"
    echo -e "  📡 Cổng Backend:  ${API_PORT:-5114}"
    echo -e "  🌐 Cổng Frontend: ${FE_PORT:-3000}"
    echo -e "  🔐 JWT Secret:    ${JWT_SECRET:0:8}..."
    echo -e "  🤖 Gemini AI:     $([ -n "$GEMINI_API_KEY" ] && echo "Đã cấu hình ✅" || echo "Chưa đặt ⏭️")"
    echo -e "  📧 SMTP:          $([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST ✅" || echo "Chưa đặt ⏭️")"
    echo ""

    read -p "  🔄 Cấu hình lại? (y/N): " RECONFIG
    if [[ "$RECONFIG" =~ ^[Yy]$ ]]; then
        configure_env
    fi
else
    log_warn "Chưa có file .env — Bắt đầu cấu hình..."
    echo ""
    configure_env
fi

echo ""

# =============================================
# BUOC 3: Kiem tra cong dang dung
# =============================================

print_step "🔌 Bước 3: Kiểm tra cổng"

source "$ENV_FILE"

check_port() {
    local port=$1
    local name=$2
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
        log_warn "Cổng $port ($name) đang được sử dụng!"
        read -p "     Tiếp tục? Docker sẽ cố gắng bind lại (y/N): " CONT
        if [[ ! "$CONT" =~ ^[Yy]$ ]]; then
            log_err "Hủy bỏ. Hãy đổi cổng trong docker/.env"
            exit 1
        fi
    else
        log_ok "Cổng $port ($name) — Sẵn sàng"
    fi
}

check_port "${DB_PORT:-1433}" "SQL Server"
check_port "${API_PORT:-5114}" "Backend API"
check_port "${FE_PORT:-3000}" "Frontend"

echo ""

# =============================================
# BUOC 4: Kiem tra disk space
# =============================================

print_step "💾 Bước 4: Kiểm tra tài nguyên"

DISK_AVAIL=$(df -BG "$PROJECT_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
if (( DISK_AVAIL < 5 )); then
    log_warn "Dung lượng ổ đĩa còn ${DISK_AVAIL}GB (khuyến nghị >= 5GB)"
else
    log_ok "Dung lượng ổ đĩa: ${DISK_AVAIL}GB"
fi

RAM_TOTAL=$(free -m 2>/dev/null | awk '/Mem:/{print $2}' || echo "0")
if (( RAM_TOTAL > 0 )); then
    if (( RAM_TOTAL < 2048 )); then
        log_warn "RAM: ${RAM_TOTAL}MB (SQL Server cần tối thiểu 2GB)"
    else
        log_ok "RAM: ${RAM_TOTAL}MB"
    fi
fi

echo ""

# =============================================
# BUOC 5: Hien thi tom tat & xac nhan
# =============================================

print_step "📋 Bước 5: Xác nhận triển khai"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}              ${BOLD}📋 TÓM TẮT CẤU HÌNH${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
printf "${CYAN}║${NC}  🗄️  SQL Server:     localhost:%-26s${CYAN}║${NC}\n" "${DB_PORT:-1433}"
printf "${CYAN}║${NC}  📡 Backend API:    http://localhost:%-20s${CYAN}║${NC}\n" "${API_PORT:-5114}"
printf "${CYAN}║${NC}  🌐 Frontend:       http://localhost:%-20s${CYAN}║${NC}\n" "${FE_PORT:-3000}"
printf "${CYAN}║${NC}  📡 Swagger UI:     http://localhost:%s/swagger\n" "${API_PORT:-5114}"
printf "${CYAN}║${NC}  🤖 Gemini AI:      %-37s${CYAN}║${NC}\n" "$([ -n "$GEMINI_API_KEY" ] && echo "Đã cấu hình ✅" || echo "Tắt ⏭️")"
printf "${CYAN}║${NC}  📧 Email SMTP:     %-37s${CYAN}║${NC}\n" "$([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST ✅" || echo "Tắt ⏭️")"
printf "${CYAN}║${NC}  🌍 Tên miền:       %-37s${CYAN}║${NC}\n" "$([ -n "$DOMAIN_NAME" ] && echo "$DOMAIN_NAME ✅" || echo "Không dùng Nginx ⏭️")"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "  🚀 Bắt đầu build & deploy? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    log_info "Đã hủy. Cấu hình được lưu tại: docker/.env"
    log_info "Khi nào muốn deploy, chạy lại script này hoặc:"
    echo -e "     ${BOLD}docker compose -f docker/docker-compose.prod.yml --env-file docker/.env up -d --build${NC}"
    exit 0
fi

# =============================================
# BUOC 6: Dung container cu (neu co)
# =============================================

echo ""
print_step "🛑 Bước 6: Dọn dẹp container cũ (nếu có)"

if docker ps -a --format '{{.Names}}' | grep -q "room_"; then
    log_info "Đang dừng container cũ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true
    log_ok "Đã dọn dẹp container cũ"
else
    log_ok "Không có container cũ"
fi

echo ""

# =============================================
# BUOC 7: Build & Deploy
# =============================================

print_step "🔨 Bước 7: Build & Deploy (có thể mất 3-10 phút lần đầu)"

echo ""
log_info "Đang build images..."
echo ""

# Build va chay
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo ""

# =============================================
# BUOC 8: Doi container san sang
# =============================================

print_step "⏳ Bước 8: Đợi hệ thống khởi động"

# Doi SQL Server healthy
echo -n "  ⏳ SQL Server: "
for i in {1..60}; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' room_mssql 2>/dev/null || echo "waiting")
    if [ "$STATUS" = "healthy" ]; then
        echo -e "${GREEN}healthy ✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
if [ "$STATUS" != "healthy" ]; then
    echo -e "${YELLOW}chưa healthy (sẽ tự retry)${NC}"
fi

# Doi Backend
echo -n "  ⏳ Backend API: "
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT:-5114}/swagger/index.html" 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}ready ✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
if [ "$i" -eq 30 ]; then
    echo -e "${YELLOW}đang khởi động...${NC}"
fi

# Doi Frontend
echo -n "  ⏳ Frontend:    "
for i in {1..20}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${FE_PORT:-3000}" 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}ready ✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
if [ "$i" -eq 20 ]; then
    echo -e "${YELLOW}đang khởi động...${NC}"
fi

echo ""

# =============================================
# BUOC 9: Cau hinh Nginx (neu co domain)
# =============================================

if [ -n "$DOMAIN_NAME" ]; then
    print_step "🌐 Bước 9: Cấu hình Nginx Reverse Proxy"

    # Cai Nginx neu chua co
    if ! command -v nginx &> /dev/null; then
        if [[ $EUID -eq 0 ]]; then
            log_info "Đang cài đặt Nginx..."
            apt-get install -y -qq nginx > /dev/null 2>&1
            systemctl enable nginx
            log_ok "Nginx đã cài đặt"
        else
            log_err "Nginx chưa được cài. Chạy: sudo apt install -y nginx"
        fi
    else
        log_ok "Nginx đã có sẵn"
    fi

    # Tao file cau hinh Nginx
    NGINX_CONF="/etc/nginx/sites-available/roomscheduling"
    NGINX_LINK="/etc/nginx/sites-enabled/roomscheduling"
    OVERWRITE_NGINX=""

    if [ -f "$NGINX_CONF" ]; then
        log_warn "File cấu hình Nginx đã tồn tại: $NGINX_CONF"
        read -p "     Ghi đè? (y/N): " OVERWRITE_NGINX
        if [[ ! "$OVERWRITE_NGINX" =~ ^[Yy]$ ]]; then
            log_info "Giữ nguyên cấu hình Nginx cũ"
        fi
    fi

    if [ ! -f "$NGINX_CONF" ] || [[ "$OVERWRITE_NGINX" =~ ^[Yy]$ ]]; then
        cat > "$NGINX_CONF" << NGINXEOF
# =============================================
# Nginx Reverse Proxy — He thong Dat phong ICTU
# Tao boi deploy-prod.sh luc $(date '+%Y-%m-%d %H:%M:%S')
# Domain: $DOMAIN_NAME
# =============================================

# --- Frontend (React) ---
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:${FE_PORT:-3000};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# --- Backend API ---
server {
    listen 80;
    server_name api.${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:${API_PORT:-5114};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Cho phep upload file lon
        client_max_body_size 50M;
    }
}
NGINXEOF

        log_ok "Đã tạo cấu hình Nginx: $NGINX_CONF"

        # Tao symlink
        if [ ! -L "$NGINX_LINK" ]; then
            ln -sf "$NGINX_CONF" "$NGINX_LINK"
            log_ok "Đã kích hoạt site trong sites-enabled"
        fi

        # Xoa default site neu ton tai
        if [ -L "/etc/nginx/sites-enabled/default" ]; then
            rm -f /etc/nginx/sites-enabled/default
            log_info "Đã tắt site mặc định của Nginx"
        fi

        # Kiem tra cau hinh Nginx
        if nginx -t 2>/dev/null; then
            log_ok "Cấu hình Nginx hợp lệ"
            systemctl reload nginx 2>/dev/null || systemctl restart nginx
            log_ok "Nginx đã reload"
        else
            log_err "Cấu hình Nginx có lỗi! Kiểm tra: sudo nginx -t"
        fi
    fi

    echo ""

    # --- SSL Let's Encrypt ---
    read -p "  🔒 Cài SSL (Let's Encrypt) cho $DOMAIN_NAME? (y/N): " INSTALL_SSL
    if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
        if ! command -v certbot &> /dev/null; then
            if [[ $EUID -eq 0 ]]; then
                log_info "Đang cài Certbot..."
                apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
                log_ok "Certbot đã cài đặt"
            else
                log_err "Certbot chưa cài. Chạy: sudo apt install -y certbot python3-certbot-nginx"
            fi
        fi

        if command -v certbot &> /dev/null; then
            echo ""
            log_info "Đang xin chứng chỉ SSL cho $DOMAIN_NAME..."
            read -p "  📧 Email cho Let's Encrypt (bắt buộc): " LE_EMAIL

            if [ -n "$LE_EMAIL" ]; then
                certbot --nginx \
                    -d "$DOMAIN_NAME" \
                    -d "api.$DOMAIN_NAME" \
                    --email "$LE_EMAIL" \
                    --agree-tos \
                    --non-interactive \
                    --redirect

                if [ $? -eq 0 ]; then
                    log_ok "SSL đã cài đặt thành công! 🔒"
                    log_ok "Tự động gia hạn đã được kích hoạt (certbot renew)"
                else
                    log_warn "Không thể cài SSL tự động."
                    log_info "Thử thủ công: sudo certbot --nginx -d $DOMAIN_NAME"
                fi
            else
                log_warn "Bỏ qua SSL — chưa nhập email"
            fi
        fi
    else
        log_info "Bỏ qua SSL. Khi nào cần, chạy:"
        echo -e "     ${BOLD}sudo certbot --nginx -d $DOMAIN_NAME -d api.$DOMAIN_NAME${NC}"
    fi

    echo ""
fi

# =============================================
# BUOC 10: Ket qua
# =============================================

# Kiem tra trang thai container
ALL_RUNNING=true
for CONTAINER in room_mssql room_backend room_frontend; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
    if [ "$STATUS" != "running" ]; then
        ALL_RUNNING=false
        log_err "$CONTAINER: $STATUS"
    fi
done

echo ""

if $ALL_RUNNING; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         ${BOLD}🎉 TRIỂN KHAI PRODUCTION THÀNH CÔNG!${NC}              ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
    if [ -n "$DOMAIN_NAME" ]; then
        printf  "${GREEN}║${NC}  🌐 Frontend:   http://%-35s${GREEN}║${NC}\n" "$DOMAIN_NAME"
        printf  "${GREEN}║${NC}  📡 Swagger:    http://api.%-31s${GREEN}║${NC}\n" "$DOMAIN_NAME/swagger"
    else
        printf  "${GREEN}║${NC}  🌐 Frontend:   http://localhost:%-24s${GREEN}║${NC}\n" "${FE_PORT:-3000}"
        printf  "${GREEN}║${NC}  📡 Swagger:    http://localhost:%-24s${GREEN}║${NC}\n" "${API_PORT:-5114}/swagger"
    fi
    printf  "${GREEN}║${NC}  🗄️  SQL Server: localhost:%-31s${GREEN}║${NC}\n" "${DB_PORT:-1433}"
    echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  ${BOLD}Lệnh hữu ích:${NC}                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  📝 Xem log:     docker logs room_backend -f             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  🛑 Dừng:        docker compose -f docker/               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                  docker-compose.prod.yml down             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  🔄 Restart:     sudo ./docker/deploy-prod.sh            ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  ${BOLD}⚠️  CÓ LỖI KHI TRIỂN KHAI${NC}                                ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Kiểm tra log để xem chi tiết:"
    echo -e "     ${BOLD}docker logs room_mssql${NC}"
    echo -e "     ${BOLD}docker logs room_backend${NC}"
    echo -e "     ${BOLD}docker logs room_frontend${NC}"
fi

echo ""
