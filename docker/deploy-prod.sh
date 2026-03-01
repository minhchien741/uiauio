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
NGINX_CONF="$SCRIPT_DIR/nginx/default.conf"
RESET_SQL=false

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

    # --- Domain ---
    read -p "  🌍 Tên miền (VD: datphong.ictu.edu.vn, Enter = dùng localhost): " DOMAIN_NAME
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

# --- Domain ---
DOMAIN_NAME=$DOMAIN_NAME
EOF

    chmod 600 "$ENV_FILE"
    log_ok "Đã tạo file .env (quyền 600 — chỉ owner đọc được)"
}

# =============================================
# Ham tao cau hinh Nginx
# =============================================

generate_nginx_conf() {
    local domain=${1:-"localhost"}
    local fe_target="frontend:3000"
    local be_target="backend:8080"

    mkdir -p "$SCRIPT_DIR/nginx"

    cat > "$NGINX_CONF" << NGINXEOF
# =============================================
# Nginx Reverse Proxy — He thong Dat phong ICTU
# Domain: $domain
# Tao boi deploy-prod.sh luc $(date '+%Y-%m-%d %H:%M:%S')
# =============================================

server {
    listen 80;
    server_name ${domain};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Frontend (React)
    location / {
        proxy_pass http://${fe_target};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://${be_target}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    # Swagger UI
    location /swagger {
        proxy_pass http://${be_target}/swagger;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Hangfire Dashboard
    location /hangfire {
        proxy_pass http://${be_target}/hangfire;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

    log_ok "Đã tạo cấu hình Nginx cho: $domain"
}

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
# BUOC 2: Kiem tra / Tao file .env
# =============================================

print_step "⚙️  Bước 2: Cấu hình môi trường (.env)"

if [ -f "$ENV_FILE" ]; then
    log_ok "Tìm thấy file .env hiện tại"
    echo ""

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
    echo -e "  🌍 Domain:        $([ -n "$DOMAIN_NAME" ] && echo "$DOMAIN_NAME ✅" || echo "localhost")"
    echo ""

    read -p "  🔄 Cấu hình lại? (y/N): " RECONFIG
    if [[ "$RECONFIG" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "  ${RED}${BOLD}⚠️  CẢNH BÁO: Cấu hình lại sẽ RESET TOÀN BỘ SQL Server!${NC}"
        echo -e "  ${RED}   Tất cả dữ liệu trong database sẽ bị XÓA.${NC}"
        echo ""
        read -p "  ❗ Xác nhận reset? (y/N): " CONFIRM_RESET
        if [[ "$CONFIRM_RESET" =~ ^[Yy](es)?$ ]] || [[ "${CONFIRM_RESET^^}" == "RESET" ]]; then
            RESET_SQL=true
            log_warn "Sẽ reset SQL Server sau khi cấu hình xong."
            configure_env
        else
            log_info "Hủy cấu hình lại. Giữ nguyên .env cũ."
        fi
    fi
else
    log_warn "Chưa có file .env — Bắt đầu cấu hình..."
    echo ""
    configure_env
fi

echo ""

# =============================================
# BUOC 3: Tao cau hinh Nginx
# =============================================

print_step "🌐 Bước 3: Cấu hình Nginx (Docker)"

source "$ENV_FILE"

if [ -n "$DOMAIN_NAME" ]; then
    generate_nginx_conf "$DOMAIN_NAME"
else
    generate_nginx_conf "localhost"
fi

echo ""

# =============================================
# BUOC 4: Kiem tra tai nguyen
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
DISPLAY_DOMAIN=${DOMAIN_NAME:-"localhost"}
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}              ${BOLD}📋 TÓM TẮT CẤU HÌNH${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
printf "${CYAN}║${NC}  🗄️  SQL Server:     localhost:%-26s${CYAN}║${NC}\n" "${DB_PORT:-1433}"
printf "${CYAN}║${NC}  🌐 Frontend:       http://%-30s${CYAN}║${NC}\n" "${DISPLAY_DOMAIN}"
printf "${CYAN}║${NC}  📡 Swagger:        http://%-30s${CYAN}║${NC}\n" "${DISPLAY_DOMAIN}/swagger"
printf "${CYAN}║${NC}  🤖 Gemini AI:      %-37s${CYAN}║${NC}\n" "$([ -n "$GEMINI_API_KEY" ] && echo "Đã cấu hình ✅" || echo "Tắt ⏭️")"
printf "${CYAN}║${NC}  📧 Email SMTP:     %-37s${CYAN}║${NC}\n" "$([ -n "$SMTP_HOST" ] && echo "$SMTP_HOST ✅" || echo "Tắt ⏭️")"
if $RESET_SQL; then
    echo -e "${CYAN}║${NC}  ${RED}🗑️  SQL Reset:      CÓ — Xóa toàn bộ dữ liệu cũ${NC}       ${CYAN}║${NC}"
fi
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
# BUOC 6: Dung container cu & reset SQL neu can
# =============================================

echo ""
print_step "🛑 Bước 6: Dọn dẹp container cũ"

if docker ps -a --format '{{.Names}}' | grep -q "room_"; then
    log_info "Đang dừng container cũ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true
    log_ok "Đã dừng container cũ"
fi

if $RESET_SQL; then
    echo ""
    log_warn "Đang xóa volume SQL Server (reset toàn bộ dữ liệu)..."
    docker volume rm "$(basename "$SCRIPT_DIR")_sql_data" 2>/dev/null || \
    docker volume rm "docker_sql_data" 2>/dev/null || \
    docker volume ls -q | grep sql_data | xargs -r docker volume rm 2>/dev/null || true
    log_ok "Đã reset SQL Server volume"
fi

echo ""

# =============================================
# BUOC 7: Build & Deploy
# =============================================

print_step "🔨 Bước 7: Build & Deploy (có thể mất 3-10 phút lần đầu)"

echo ""
log_info "Đang build images..."
echo ""

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo ""

# =============================================
# BUOC 8: Doi container san sang
# =============================================

print_step "⏳ Bước 8: Đợi hệ thống khởi động"

# Doi SQL Server healthy
echo -n "  ⏳ SQL Server: "
for i in $(seq 1 60); do
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
BE_READY=false
for i in $(seq 1 30); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT:-5114}/swagger/index.html" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}ready ✅${NC}"
        BE_READY=true
        break
    fi
    echo -n "."
    sleep 2
done
if ! $BE_READY; then
    echo -e "${YELLOW}đang khởi động...${NC}"
fi

# Doi Frontend
echo -n "  ⏳ Frontend:    "
FE_READY=false
for i in $(seq 1 20); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${FE_PORT:-3000}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}ready ✅${NC}"
        FE_READY=true
        break
    fi
    echo -n "."
    sleep 2
done
if ! $FE_READY; then
    echo -e "${YELLOW}đang khởi động...${NC}"
fi

# Doi Nginx
echo -n "  ⏳ Nginx:       "
NG_READY=false
for i in $(seq 1 10); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ]; then
        echo -e "${GREEN}ready ✅${NC}"
        NG_READY=true
        break
    fi
    echo -n "."
    sleep 2
done
if ! $NG_READY; then
    echo -e "${YELLOW}đang khởi động...${NC}"
fi

echo ""

# =============================================
# BUOC 9: Cai SSL (neu co domain)
# =============================================

if [ -n "$DOMAIN_NAME" ]; then
    print_step "🔒 Bước 9: Cài đặt SSL (Let's Encrypt)"

    read -p "  🔒 Cài SSL cho $DOMAIN_NAME? (y/N): " INSTALL_SSL
    if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
        read -p "  📧 Email cho Let's Encrypt (bắt buộc): " LE_EMAIL

        if [ -n "$LE_EMAIL" ]; then
            log_info "Đang xin chứng chỉ SSL..."

            # Chay certbot trong Docker
            docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot \
                certonly --webroot \
                --webroot-path=/var/www/certbot \
                -d "$DOMAIN_NAME" \
                --email "$LE_EMAIL" \
                --agree-tos \
                --non-interactive

            if [ $? -eq 0 ]; then
                # Cap nhat nginx conf voi SSL
                cat > "$NGINX_CONF" << SSLEOF
# =============================================
# Nginx Reverse Proxy + SSL — He thong Dat phong ICTU
# Domain: $DOMAIN_NAME
# =============================================

# Redirect HTTP -> HTTPS
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name ${DOMAIN_NAME};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    # Swagger
    location /swagger {
        proxy_pass http://backend:8080/swagger;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Hangfire
    location /hangfire {
        proxy_pass http://backend:8080/hangfire;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
SSLEOF

                # Reload Nginx voi SSL config moi
                docker restart room_nginx

                # Bat certbot auto-renew
                docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile ssl up -d certbot

                log_ok "SSL đã cài đặt thành công! 🔒"
                log_ok "Tự động gia hạn đã được kích hoạt"
            else
                log_warn "Không thể cài SSL tự động."
                log_info "Thử thủ công sau khi DNS đã trỏ đúng."
            fi
        else
            log_warn "Bỏ qua SSL — chưa nhập email"
        fi
    else
        log_info "Bỏ qua SSL. Khi nào cần, chạy lại script này."
    fi

    echo ""
fi

# =============================================
# BUOC 10: Ket qua
# =============================================

# Kiem tra trang thai container
ALL_RUNNING=true
for CONTAINER in room_mssql room_backend room_frontend room_nginx; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
    if [ "$STATUS" != "running" ]; then
        ALL_RUNNING=false
        log_err "$CONTAINER: $STATUS"
    fi
done

echo ""

DISPLAY_DOMAIN=${DOMAIN_NAME:-"localhost"}

if $ALL_RUNNING; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}         ${BOLD}🎉 TRIỂN KHAI PRODUCTION THÀNH CÔNG!${NC}              ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
    printf  "${GREEN}║${NC}  🌐 Frontend:   http://%-35s${GREEN}║${NC}\n" "${DISPLAY_DOMAIN}"
    printf  "${GREEN}║${NC}  📡 Swagger:    http://%-35s${GREEN}║${NC}\n" "${DISPLAY_DOMAIN}/swagger"
    printf  "${GREEN}║${NC}  🗄️  SQL Server: localhost:%-31s${GREEN}║${NC}\n" "${DB_PORT:-1433}"
    echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  ${BOLD}Lệnh hữu ích:${NC}                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  📝 Xem log:     docker logs room_backend -f             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  📝 Log Nginx:   docker logs room_nginx -f               ${GREEN}║${NC}"
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
    echo -e "     ${BOLD}docker logs room_nginx${NC}"
fi

echo ""
