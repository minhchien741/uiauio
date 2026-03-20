// src/frontendApiProxy.ts
// Chặn window.fetch để gọi trực tiếp .NET Backend (thay thế hoàn toàn server.ts)

// NOTE: Đổi tên miền BE ở đây (nếu có biến tuỳ biến env thì dùng import.meta.env)
const DOTNET_API = 'https://datphongapi.rankpush.xyz'; 
const originalFetch = window.fetch;

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ==================== MAPPING HELPERS ====================
function mapTrangThai(val: any): string {
  if (val === 0 || val === 'ChoDuyet') return 'Pending';
  if (val === 1 || val === 'DaDuyet') return 'Approved';
  if (val === 2 || val === 'TuChoi') return 'Rejected';
  return String(val ?? '');
}

function mapRoom(r: any) {
  return {
    id: r.id ?? r.Id,
    name: r.name ?? r.ten ?? r.Ten ?? '',
    capacity: r.capacity ?? r.sucChua ?? r.SucChua ?? 0,
    description: r.description ?? r.moTaThietBi ?? r.MoTaThietBi ?? '',
    department: r.department ?? r.khoaQuanLy ?? r.KhoaQuanLy ?? '',
    is_in_use: r.isCurrentlyInUse ?? r.is_in_use ?? false,
  };
}

function mapBooking(b: any) {
  return {
    id: b.id ?? b.Id,
    room_id: b.phongId ?? b.PhongId,
    room_name: b.tenPhong ?? b.TenPhong ?? b.phong?.ten ?? b.Phong?.Ten ?? `Phòng ${b.phongId ?? b.PhongId}`,
    user_name: b.nguoiDat ?? b.NguoiDat ?? '',
    start_time: b.startTime ?? b.StartTime,
    end_time: b.endTime ?? b.EndTime,
    status: mapTrangThai(b.trangThai ?? b.TrangThai),
    reason: b.ghiChuAdmin ?? b.GhiChuAdmin ?? null,
    check_in_time: b.actualStartTime ?? b.ActualStartTime ?? null,
    check_out_time: b.actualEndTime ?? b.ActualEndTime ?? null,
    is_recurring: (b.isRecurring ?? b.IsRecurring) ? 1 : 0,
  };
}

function mapUser(d: any) {
  return {
    id: d.id ?? d.Id,
    username: d.username ?? d.Username ?? '',
    email: d.email ?? d.Email ?? '',
    full_name: d.hoTen ?? d.HoTen ?? d.full_name ?? '',
    phone: d.soDienThoai ?? d.SoDienThoai ?? d.phone ?? '',
    department: d.khoa ?? d.Khoa ?? d.department ?? '',
    role: d.role ?? d.Role ?? 'User',
  };
}

function mapNotification(n: any) {
  return {
    id: n.id ?? n.Id,
    user_id: n.userId ?? n.NguoiNhanId ?? n.nguoiNhanId,
    message: n.message ?? n.noiDung ?? n.NoiDung ?? '',
    is_read: n.isRead ?? n.daXem ?? n.DaXem ?? false,
    isRead: n.isRead ?? n.daXem ?? n.DaXem ?? false,
    created_at: n.createdAt ?? n.ngayGui ?? n.NgayGui ?? new Date().toISOString(),
  };
}

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = parseJwt(token);
  return payload ? (payload.sub ?? payload.dotnet_user_id ?? payload.id) : null;
}

// ==================== INTERCEPT window.fetch ====================
window.fetch = async (...args) => {
  let [resource, config] = args;
  let urlStr = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : String(resource));

  // Remove origin if present (just to simplify matching)
  try {
     const urlObj = new URL(urlStr, window.location.origin);
     urlStr = urlObj.pathname + urlObj.search;
  } catch {}

  // Chỉ chặn các request nội địa `/api/`
  if (!urlStr.startsWith('/api/')) {
    return originalFetch(...args);
  }

  const method = config?.method?.toUpperCase() || 'GET';
  let bodyObj: any = null;
  try { if (config?.body) bodyObj = JSON.parse(typeof config.body === 'string' ? config.body : String(config.body)); } catch {}

  const sendResponse = (data: any, status = 200) => {
     return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  };

  const doDotnetFetch = async (path: string, options?: RequestInit) => {
      const res = await originalFetch(`${DOTNET_API}${path}`, {
          ...options,
          headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options?.headers || {}) }
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { ok: res.ok, status: res.status, data };
  };

  try {
    // ── AUTH ─────────────────────────────────
    if (urlStr === '/api/auth/login' && method === 'POST') {
      const { username, password } = bodyObj || {};
      const result = await doDotnetFetch(`/api/Phong/login?username=${encodeURIComponent(username ?? '')}&password=${encodeURIComponent(password ?? '')}`, { method: 'POST' });
      if (!result.ok) return sendResponse({ message: 'Tài khoản hoặc mật khẩu không đúng' }, 400);
      const d = result.data;
      return sendResponse({
        token: d.token,
        user: {
          id: d.user?.id, username: d.user?.username, role: d.user?.role, full_name: d.user?.full_name ?? d.user?.hoTen ?? '', department: d.user?.department ?? d.user?.khoa ?? '',
        }
      });
    }

    if (urlStr === '/api/auth/register' && method === 'POST') {
      const { username, password, email, full_name, phone, department } = bodyObj || {};
      const result = await doDotnetFetch(`/api/Account/register?username=${encodeURIComponent(username ?? '')}&password=${encodeURIComponent(password ?? '')}&email=${encodeURIComponent(email ?? '')}&hoTen=${encodeURIComponent(full_name ?? '')}&soDienThoai=${encodeURIComponent(phone ?? '')}&khoa=${encodeURIComponent(department ?? '')}`, { method: 'POST' });
      return sendResponse(result.data, result.ok ? 201 : result.status);
    }

    // ── USERS ─────────────────────────────────
    if (urlStr.startsWith('/api/users/me/password') && method === 'PUT') {
      const { oldPassword, newPassword } = bodyObj || {};
      const userId = bodyObj?.userId || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Account/change-password?userId=${userId}&oldPassword=${encodeURIComponent(oldPassword ?? '')}&newPassword=${encodeURIComponent(newPassword ?? '')}`, { method: 'POST' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }
    
    if (urlStr.startsWith('/api/users/me/quota') && method === 'GET') {
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/user/quota/${userId}`);
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/users/me') && method === 'PUT') {
      let params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || bodyObj?.userId || getUserIdFromToken();
      const { full_name, email, phone, department } = bodyObj || {};
      const result = await doDotnetFetch(`/api/Account/update-profile/${userId}`, { method: 'PUT', body: JSON.stringify({ HoTen: full_name, Email: email, SoDienThoai: phone ?? '', Khoa: department ?? '' }) });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/users/me') && method === 'GET') {
      let params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Account/profile/${userId}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse(mapUser(result.data));
    }

    // ── ROOMS ─────────────────────────────────
    if (urlStr.startsWith('/api/rooms/available') && method === 'GET') {
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const start = params.get('start'); const end = params.get('end');
      const minCapacity = params.get('minCapacity') || '1'; const keyword = params.get('keyword') || '';
      const result = await doDotnetFetch(`/api/Phong/tim-kiem-nang-cao?minCapacity=${minCapacity}&keyword=${encodeURIComponent(keyword)}&start=${encodeURIComponent(start!)}&end=${encodeURIComponent(end!)}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapRoom));
    }

    if (urlStr.startsWith('/api/rooms/suggest') && method === 'GET') {
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const start = params.get('start')!; const end = params.get('end')!;
      const dept = params.get('dept') || ''; const keyword = params.get('keyword') || '';
      const result = await doDotnetFetch(`/api/Phong/goi-y-ai?capacity=${params.get('capacity')||'1'}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&keyword=${encodeURIComponent(keyword)}&userDept=${encodeURIComponent(dept)}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      const suggestions = (Array.isArray(result.data.suggestions) ? result.data.suggestions : []).map((s: any) => ({ room: mapRoom(s.room ?? s.Room), score: s.score ?? s.Score, reasons: s.reasons ?? s.Reasons ?? [] }));
      return sendResponse({ suggestions });
    }
    
    if (urlStr.match(/^\/api\/rooms\/[^\/]+\/devices/) && method === 'GET') {
      const id = urlStr.split('/')[3];
      const result = await doDotnetFetch(`/api/Phong/${id}/thiet-bi`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map((d: any) => ({ id: d.id ?? d.Id, name: d.name ?? d.ten ?? d.Ten ?? '', type: d.type ?? d.loai ?? d.Loai ?? 'Khác', room_id: Number(id) })));
    }

    if (urlStr.match(/^\/api\/rooms\/[^\/]+\/bookings/) && method === 'GET') {
      const id = urlStr.split('/')[3];
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const qs = params.get('date') ? `?date=${params.get('date')}` : '';
      const result = await doDotnetFetch(`/api/Phong/${id}/lich-dat${qs}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapBooking));
    }

    if (urlStr.match(/^\/api\/rooms\/[^\/]+/) && method === 'PUT') {
      const id = urlStr.split('/')[3];
      const { name, capacity, description, department } = bodyObj || {};
      const result = await doDotnetFetch(`/api/Phong/${id}?ten=${encodeURIComponent(name ?? '')}&sucChua=${capacity ?? 0}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`, { method: 'PUT' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }
    
    if (urlStr.match(/^\/api\/rooms\/[^\/]+/) && method === 'DELETE') {
      const id = urlStr.split('/')[3];
      const result = await doDotnetFetch(`/api/Phong/${id}`, { method: 'DELETE' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/rooms') && method === 'GET') {
      const result = await doDotnetFetch('/api/Phong');
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapRoom));
    }

    if (urlStr.startsWith('/api/rooms') && method === 'POST') {
      const { name, capacity, description, department } = bodyObj || {};
      const result = await doDotnetFetch(`/api/Phong?ten=${encodeURIComponent(name ?? '')}&sucChua=${capacity ?? 0}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`, { method: 'POST' });
      return sendResponse(result.data, result.ok ? 201 : result.status);
    }

    // ── BOOKINGS ──────────────────────────────
    if (urlStr.startsWith('/api/bookings/me') && method === 'GET') {
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/user/lich-su/${userId}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapBooking));
    }

    if (urlStr.match(/^\/api\/bookings\/[^\/]+\/status/) && method === 'PUT') {
      const id = urlStr.split('/')[3];
      const { status, reason } = bodyObj || {};
      const adminId = bodyObj?.adminId || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/admin/phe-duyet/${id}?dongY=${status === 'Approved'}&ghiChu=${encodeURIComponent(reason ?? '')}&adminId=${adminId}`, { method: 'PATCH' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.match(/^\/api\/bookings\/[^\/]+\/checkout/) && method === 'POST') {
      const id = urlStr.split('/')[3];
      const result = await doDotnetFetch(`/api/Phong/tra-phong/${id}`, { method: 'POST' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.match(/^\/api\/bookings\/[^\/]+/) && method === 'DELETE') {
      const id = urlStr.split('/')[3];
      let params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || bodyObj?.userId || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/huy-lich/${id}/${userId}`, { method: 'DELETE' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/bookings') && method === 'GET') {
      const result = await doDotnetFetch('/api/Phong/lich-dat');
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapBooking));
    }

    if (urlStr.startsWith('/api/bookings') && method === 'POST') {
      const { room_id, start_time, end_time, members } = bodyObj || {};
      const userId = bodyObj?.userId || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/dat-phong?phongId=${room_id}&userId=${userId}&start=${encodeURIComponent(start_time ?? '')}&end=${encodeURIComponent(end_time ?? '')}`, { method: 'POST', body: JSON.stringify(members ?? []) });
      return sendResponse(result.data, result.ok ? 201 : result.status);
    }

    // ── NOTIFICATIONS ──────────────────────────────
    if (urlStr.match(/^\/api\/notifications\/[^\/]+\/read/) && method === 'PUT') {
      const id = urlStr.split('/')[3];
      const result = await doDotnetFetch(`/api/Phong/user/thong-bao/${id}/read`, { method: 'PATCH' });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/notifications') && method === 'GET') {
      const params = new URLSearchParams(urlStr.split('?')[1] || '');
      const userId = params.get('userId') || getUserIdFromToken();
      const result = await doDotnetFetch(`/api/Phong/user/thong-bao/${userId}`);
      if (!result.ok) return sendResponse(result.data, result.status);
      return sendResponse((Array.isArray(result.data) ? result.data : []).map(mapNotification));
    }

    // ── STATS & CHAT & HEALTH ──────────────────────────────
    if (urlStr.startsWith('/api/stats') && method === 'GET') {
      const result = await doDotnetFetch('/api/Phong/thong-ke');
      if (!result.ok) return sendResponse(result.data, result.status);
      const d = result.data;
      const chiTiet = d.chiTietTrangThai ?? d.ChiTietTrangThai ?? [];
      let pendingBookings = 0, approvedBookings = 0;
      for (const item of chiTiet) {
        const name = item.trangThai ?? item.TrangThai ?? '';
        const count = item.soLuong ?? item.SoLuong ?? 0;
        if (name === 'ChoDuyet') pendingBookings = count;
        if (name === 'DaDuyet') approvedBookings = count;
      }
      return sendResponse({ totalRooms: d.tongSoPhong ?? d.TongSoPhong ?? 0, totalBookings: d.tongSoYeuCau ?? d.TongSoYeuCau ?? 0, pendingBookings, approvedBookings });
    }

    if (urlStr.startsWith('/api/chat') && method === 'POST') {
      const result = await doDotnetFetch('/api/Chat/ask', { method: 'POST', body: JSON.stringify(bodyObj) });
      return sendResponse(result.data, result.ok ? 200 : result.status);
    }

    if (urlStr.startsWith('/api/health') && method === 'GET') {
      const r = await doDotnetFetch('/api/Phong/health');
      return sendResponse({ frontend: 'ok', dotnet_backend: r.ok ? 'ok' : 'unreachable', dotnet_url: DOTNET_API });
    }

    return sendResponse({ message: `Đường dẫn API proxy ảo không tồn tại: ${urlStr}` }, 404);

  } catch (err: any) {
    return sendResponse({ message: `Proxy ảo lỗi: ${err.message}` }, 500);
  }
};
