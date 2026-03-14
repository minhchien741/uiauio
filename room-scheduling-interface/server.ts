import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DOTNET_API = process.env.DOTNET_API || 'https://localhost:7102';

// ==================== HELPER: GỌI .NET BACKEND ====================
async function dotnet(urlPath: string, options?: RequestInit) {
  const url = `${DOTNET_API}${urlPath}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 503, data: { message: `Không kết nối được .NET backend tại ${DOTNET_API}` } };
  }
}

function authHeaders(req: any): Record<string, string> {
  const auth = req.headers['authorization'];
  return auth ? { Authorization: auth } : {};
}

// ==================== MAPPING: Convert .NET response → Frontend format ====================

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

// ==================== HELPER: GỌI GEMINI API ====================
async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.error?.message || 'Lỗi Gemini API');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // ── AUTH ─────────────────────────────────────────────────────────────

  app.post('/api/auth/register', async (req, res) => {
    const { username, password, email, full_name, phone, department } = req.body;
    const result = await dotnet(
      `/api/Account/register?username=${encodeURIComponent(username ?? '')}&password=${encodeURIComponent(password ?? '')}&email=${encodeURIComponent(email ?? '')}&hoTen=${encodeURIComponent(full_name ?? '')}&soDienThoai=${encodeURIComponent(phone ?? '')}&khoa=${encodeURIComponent(department ?? '')}`,
      { method: 'POST' }
    );
    res.status(result.ok ? 201 : result.status).json(result.data);
  });

  // Login → .NET tạo JWT và trả { token, user }
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await dotnet(
      `/api/Phong/login?username=${encodeURIComponent(username ?? '')}&password=${encodeURIComponent(password ?? '')}`,
      { method: 'POST' }
    );
    if (!result.ok) return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
    // Đảm bảo user object có đúng field names mà frontend expect
    const d = result.data;
    res.json({
      token: d.token,
      user: {
        id: d.user?.id,
        username: d.user?.username,
        role: d.user?.role,
        full_name: d.user?.full_name ?? d.user?.hoTen ?? '',
        department: d.user?.department ?? d.user?.khoa ?? '',
      }
    });
  });

  // ── USER ──────────────────────────────────────────────────────────────

  app.get('/api/users/me', async (req: any, res) => {
    // Lấy userId từ query hoặc decode từ token header
    let userId = req.query.userId;
    if (!userId) {
      // Thử lấy từ Authorization header (JWT claim 'sub')
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id ?? payload.id;
        } catch { /* ignore */ }
      }
    }
    if (!userId) return res.status(400).json({ message: 'Cần userId' });
    const result = await dotnet(`/api/Account/profile/${userId}`, { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json(mapUser(result.data));
  });

  app.put('/api/users/me', async (req: any, res) => {
    let userId = req.query.userId ?? req.body?.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    if (!userId) return res.status(400).json({ message: 'Cần userId' });
    const { full_name, email, phone, department } = req.body;
    const result = await dotnet(`/api/Account/update-profile/${userId}`, {
      method: 'PUT',
      headers: authHeaders(req),
      body: JSON.stringify({ HoTen: full_name, Email: email, SoDienThoai: phone ?? '', Khoa: department ?? '' })
    });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.put('/api/users/me/password', async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    let userId = req.body?.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    const result = await dotnet(
      `/api/Account/change-password?userId=${userId}&oldPassword=${encodeURIComponent(oldPassword ?? '')}&newPassword=${encodeURIComponent(newPassword ?? '')}`,
      { method: 'POST', headers: authHeaders(req) }
    );
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.get('/api/users/me/quota', async (req: any, res) => {
    let userId = req.query.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    if (!userId) return res.status(400).json({ message: 'Cần userId' });
    const result = await dotnet(`/api/Phong/user/quota/${userId}`, { headers: authHeaders(req) });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  // ── ROOMS ─────────────────────────────────────────────────────────────

  app.get('/api/rooms/available', async (req, res) => {
    const { start, end, minCapacity = '1', keyword = '' } = req.query as any;
    if (!start || !end) return res.status(400).json({ message: 'Cần cung cấp start và end' });
    const result = await dotnet(
      `/api/Phong/tim-kiem-nang-cao?minCapacity=${minCapacity}&keyword=${encodeURIComponent(keyword)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { headers: authHeaders(req) }
    );
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapRoom));
  });

  app.get('/api/rooms/suggest', async (req: any, res) => {
    const { capacity = '1', start, end, keyword = '', dept = '' } = req.query as any;
    if (!start || !end) return res.status(400).json({ message: 'Cần cung cấp start và end' });
    const result = await dotnet(
      `/api/Phong/goi-y-ai?capacity=${capacity}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&keyword=${encodeURIComponent(keyword)}&userDept=${encodeURIComponent(dept)}`,
      { headers: authHeaders(req) }
    );
    if (!result.ok) return res.status(result.status).json(result.data);
    const d = result.data;
    const suggestions = (Array.isArray(d.suggestions) ? d.suggestions : []).map((s: any) => ({
      room: mapRoom(s.room ?? s.Room),
      score: s.score ?? s.Score,
      reasons: s.reasons ?? s.Reasons ?? [],
    }));
    res.json({ suggestions });
  });

  app.get('/api/rooms', async (req, res) => {
    const result = await dotnet('/api/Phong', { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapRoom));
  });

  app.post('/api/rooms', async (req: any, res) => {
    const { name, capacity, description, department } = req.body;
    const result = await dotnet(
      `/api/Phong?ten=${encodeURIComponent(name ?? '')}&sucChua=${capacity ?? 0}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`,
      { method: 'POST', headers: authHeaders(req) }
    );
    res.status(result.ok ? 201 : result.status).json(result.data);
  });

  app.put('/api/rooms/:id', async (req: any, res) => {
    const { name, capacity, description, department } = req.body;
    const result = await dotnet(
      `/api/Phong/${req.params.id}?ten=${encodeURIComponent(name ?? '')}&sucChua=${capacity ?? 0}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`,
      { method: 'PUT', headers: authHeaders(req) }
    );
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.delete('/api/rooms/:id', async (req: any, res) => {
    const result = await dotnet(`/api/Phong/${req.params.id}`, { method: 'DELETE', headers: authHeaders(req) });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.get('/api/rooms/:id/devices', async (req, res) => {
    const result = await dotnet(`/api/Phong/${req.params.id}/thiet-bi`, { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map((d: any) => ({
      id: d.id ?? d.Id,
      name: d.name ?? d.ten ?? d.Ten ?? '',
      type: d.type ?? d.loai ?? d.Loai ?? 'Khác',
      room_id: Number(req.params.id),
    })));
  });

  app.get('/api/rooms/:id/bookings', async (req, res) => {
    const { date } = req.query;
    const qs = date ? `?date=${date}` : '';
    const result = await dotnet(`/api/Phong/${req.params.id}/lich-dat${qs}`, { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapBooking));
  });

  // ── BOOKINGS ──────────────────────────────────────────────────────────

  app.post('/api/bookings', async (req: any, res) => {
    const { room_id, start_time, end_time, members } = req.body;
    let userId = req.body?.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    const result = await dotnet(
      `/api/Phong/dat-phong?phongId=${room_id}&userId=${userId}&start=${encodeURIComponent(start_time ?? '')}&end=${encodeURIComponent(end_time ?? '')}`,
      { method: 'POST', headers: authHeaders(req), body: JSON.stringify(members ?? []) }
    );
    res.status(result.ok ? 201 : result.status).json(result.data);
  });

  app.get('/api/bookings/me', async (req: any, res) => {
    let userId = req.query.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    if (!userId) return res.status(400).json({ message: 'Cần userId' });
    const result = await dotnet(`/api/Phong/user/lich-su/${userId}`, { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapBooking));
  });

  app.get('/api/bookings', async (req, res) => {
    const result = await dotnet('/api/Phong/lich-dat', { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapBooking));
  });

  app.put('/api/bookings/:id/status', async (req: any, res) => {
    const { status, reason } = req.body;
    let adminId = req.body?.adminId;
    if (!adminId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          adminId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    const result = await dotnet(
      `/api/Phong/admin/phe-duyet/${req.params.id}?dongY=${status === 'Approved'}&ghiChu=${encodeURIComponent(reason ?? '')}&adminId=${adminId}`,
      { method: 'PATCH', headers: authHeaders(req) }
    );
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.delete('/api/bookings/:id', async (req: any, res) => {
    let userId = req.query.userId ?? req.body?.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    const result = await dotnet(`/api/Phong/huy-lich/${req.params.id}/${userId}`, {
      method: 'DELETE', headers: authHeaders(req)
    });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  app.post('/api/bookings/:id/checkout', async (req: any, res) => {
    const result = await dotnet(`/api/Phong/tra-phong/${req.params.id}`, {
      method: 'POST', headers: authHeaders(req)
    });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────

  app.get('/api/notifications', async (req: any, res) => {
    let userId = req.query.userId;
    if (!userId) {
      const auth = req.headers['authorization'];
      if (auth) {
        try {
          const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
          userId = payload.sub ?? payload.dotnet_user_id;
        } catch { /* ignore */ }
      }
    }
    if (!userId) return res.status(400).json({ message: 'Cần userId' });
    const result = await dotnet(`/api/Phong/user/thong-bao/${userId}`, { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map(mapNotification));
  });

  app.put('/api/notifications/:id/read', async (req: any, res) => {
    const result = await dotnet(`/api/Phong/user/thong-bao/${req.params.id}/read`, {
      method: 'PATCH', headers: authHeaders(req)
    });
    res.status(result.ok ? 200 : result.status).json(result.data);
  });

  // ── STATS ─────────────────────────────────────────────────────────────

  app.get('/api/stats', async (req, res) => {
    const result = await dotnet('/api/Phong/thong-ke', { headers: authHeaders(req) });
    if (!result.ok) return res.status(result.status).json(result.data);
    const d = result.data;
    const chiTiet: any[] = d.chiTietTrangThai ?? d.ChiTietTrangThai ?? [];
    let pendingBookings = 0, approvedBookings = 0;
    for (const item of chiTiet) {
      const name: string = item.trangThai ?? item.TrangThai ?? '';
      const count: number = item.soLuong ?? item.SoLuong ?? 0;
      if (name === 'ChoDuyet') pendingBookings = count;
      if (name === 'DaDuyet') approvedBookings = count;
    }
    res.json({
      totalRooms: d.tongSoPhong ?? d.TongSoPhong ?? 0,
      totalBookings: d.tongSoYeuCau ?? d.TongSoYeuCau ?? 0,
      pendingBookings,
      approvedBookings,
    });
  });

  // ── HEALTH ────────────────────────────────────────────────────────────

  app.get('/api/health', async (_req, res) => {
    const r = await dotnet('/api/Phong/health');
    res.json({ frontend: 'ok', dotnet_backend: r.ok ? 'ok' : 'unreachable', dotnet_url: DOTNET_API });
  });

  // ── AI CHATBOT (Gemini — key bảo mật ở Node.js) ──────────────────────

  app.post('/api/chat', async (req: any, res) => {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY)
      return res.status(500).json({ reply: 'Lỗi hệ thống: Chưa cấu hình GEMINI_API_KEY.' });
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // Lấy song song: danh sách phòng + toàn bộ lịch đặt
      const [roomsRes, bookingsRes] = await Promise.all([
        dotnet('/api/Phong', { headers: authHeaders(req) }),
        dotnet('/api/Phong/lich-dat', { headers: authHeaders(req) }),
      ]);

      const rooms: any[] = roomsRes.ok && Array.isArray(roomsRes.data) ? roomsRes.data : [];
      const allBookings: any[] = bookingsRes.ok && Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      // Lọc chỉ lấy lịch hôm nay (đã duyệt hoặc chờ duyệt)
      const todayBookings = allBookings.filter((b: any) => {
        const st = b.startTime ?? b.StartTime ?? '';
        const status = b.trangThai ?? b.TrangThai;
        // Bỏ qua lịch bị từ chối (TuChoi = 2)
        if (status === 2 || status === 'TuChoi' || status === 'Rejected') return false;
        return st.startsWith(todayStr);
      });

      // Build context phòng kèm lịch bận hôm nay
      let roomContext = `Danh sách phòng và lịch đặt hôm nay (${todayStr}):\n`;
      rooms.forEach((r: any) => {
        const roomId = r.id ?? r.Id;
        const roomName = r.name ?? r.ten ?? r.Ten ?? '';
        const bookingsOfRoom = todayBookings.filter(
          (b: any) => (b.phongId ?? b.PhongId) === roomId
        );

        // Tính xem phòng đang bận không
        const busy = bookingsOfRoom.filter(b => {
          const st = new Date(b.startTime ?? b.StartTime);
          const en = new Date(b.endTime ?? b.EndTime);
          return st <= now && en >= now;
        });

        const statusNow = busy.length > 0 ? '🔴 Đang có người dùng' : '🟢 Hiện đang trống';

        roomContext += `\n📌 Phòng: ${roomName} | Sức chứa: ${r.capacity ?? r.sucChua ?? 0} người | Khoa: ${r.department ?? r.khoaQuanLy ?? 'Chung'} | Thiết bị: ${r.description ?? r.moTaThietBi ?? 'Không rõ'}\n`;
        roomContext += `   Trạng thái hiện tại: ${statusNow}\n`;

        if (bookingsOfRoom.length > 0) {
          roomContext += `   Lịch đặt hôm nay:\n`;
          bookingsOfRoom.forEach(b => {
            const st = new Date(b.startTime ?? b.StartTime);
            const en = new Date(b.endTime ?? b.EndTime);
            const stStr = `${st.getHours().toString().padStart(2,'0')}:${st.getMinutes().toString().padStart(2,'0')}`;
            const enStr = `${en.getHours().toString().padStart(2,'0')}:${en.getMinutes().toString().padStart(2,'0')}`;
            const statusLabel = (b.trangThai === 1 || b.trangThai === 'DaDuyet') ? 'Đã duyệt' : 'Chờ duyệt';
            roomContext += `     - ${stStr}–${enStr} (${statusLabel})\n`;
          });
        } else {
          roomContext += `   Lịch đặt hôm nay: Chưa có ai đặt\n`;
        }
      });

      const prompt = `Bạn là nhân viên lễ tân/trợ lý tư vấn của Hệ thống Đặt phòng học và phòng họp tại trường Đại học CNTT&TT.
Tên bạn là "Trợ lý Ảo". Trả lời ngắn gọn, thân thiện, chuyên nghiệp bằng tiếng Việt.
TUYỆT ĐỐI KHÔNG xưng là chatbot hay AI. Đóng vai như nhân viên thật sự đang quản lý hệ thống.

Thời gian hiện tại: ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')} ngày ${todayStr}

${roomContext}

Câu hỏi của khách: "${message}"

Hướng dẫn trả lời:
- Nếu hỏi phòng trống: chỉ đích danh các phòng 🟢 và lịch rảnh còn lại trong ngày
- Nếu hỏi phòng cụ thể: báo trạng thái hiện tại và các khung giờ bận
- Nếu hỏi theo sức chứa/thiết bị: lọc và gợi ý đúng danh sách
- Luôn nhắc khách vào mục "Tìm phòng trống" để đặt phòng chính thức`;

      const reply = await callGemini(prompt);
      res.json({ reply });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ==================== VITE DEV or PROD STATIC ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use((_req, res, next) => {
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; connect-src 'self' https://static.cloudflareinsights.com;");
      next();
    });
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Frontend:   http://localhost:${PORT}`);
    console.log(`📡 .NET proxy: ${DOTNET_API}`);
    console.log(`🤖 AI chatbot: /api/chat (Gemini)\n`);
  });
}

startServer();
