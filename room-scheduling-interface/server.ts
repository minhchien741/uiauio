import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cho phép Node.js fetch kết nối HTTPS localhost với self-signed certificate (chỉ dùng trong dev)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
// VS chạy backend trên https://localhost:7102, dotnet run thường dùng http://localhost:5294
const DOTNET_API = process.env.DOTNET_API || 'https://localhost:7102';

// ==================== HELPER: GỌI .NET BACKEND ====================
async function dotnet(path: string, options?: RequestInit) {
  const url = `${DOTNET_API}${path}`;
  console.log(`[.NET] ${options?.method ?? 'GET'} ${url}`);
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) console.error(`[.NET] ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    console.error(`[.NET] Connection failed: ${err?.message}`);
    return { ok: false, status: 503, data: { message: `Không kết nối được .NET backend tại ${DOTNET_API}` } };
  }
}

// ==================== HELPER: GỌI GEMINI API ====================
async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.error?.message || "Lỗi Gemini API");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Map TrangThai: 0=ChoDuyet, 1=DaDuyet, 2=TuChoi
function mapStatus(val: any): string {
  if (val === 0 || val === 'ChoDuyet') return 'Pending';
  if (val === 1 || val === 'DaDuyet') return 'Approved';
  return 'Rejected';
}

function mapRoom(r: any) {
  return {
    id: r.Id ?? r.id,
    name: r.Ten ?? r.ten ?? '',
    capacity: r.SucChua ?? r.sucChua ?? 0,
    description: r.MoTaThietBi ?? r.moTaThietBi ?? '',
    department: r.KhoaQuanLy ?? r.khoaQuanLy ?? ''
  };
}

function mapBooking(b: any, userId: number, username: string) {
  return {
    id: b.Id ?? b.id,
    room_id: b.PhongId ?? b.phongId,
    room_name: b.TenPhong ?? b.tenPhong ?? b.Phong?.Ten ?? b.phong?.ten ?? `Phòng ${b.PhongId ?? b.phongId}`,
    user_id: userId,
    user_name: b.NguoiDat ?? b.nguoiDat ?? username,
    start_time: b.StartTime ?? b.startTime,
    end_time: b.EndTime ?? b.endTime,
    status: mapStatus(b.TrangThai ?? b.trangThai),
    reason: b.GhiChuAdmin ?? b.ghiChuAdmin ?? null,
    check_in_time: b.ActualStartTime ?? b.actualStartTime ?? null,
    check_out_time: b.ActualEndTime ?? b.actualEndTime ?? null,
    is_recurring: (b.IsRecurring ?? b.isRecurring) ? 1 : 0
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // ==================== AUTH MIDDLEWARE ====================
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // ==================== AUTH — dùng .NET AccountController + PhongController ====================

  // Đăng ký: POST /api/Account/register (query params)
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, email, full_name, phone, department } = req.body;
    if (!username || !password || !email || !full_name) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }
    const result = await dotnet(
      `/api/Account/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&email=${encodeURIComponent(email)}&hoTen=${encodeURIComponent(full_name)}&soDienThoai=${encodeURIComponent(phone ?? '')}&khoa=${encodeURIComponent(department ?? '')}`,
      { method: 'POST' }
    );
    if (!result.ok) {
      const msg = typeof result.data === 'string' ? result.data : (result.data?.Message ?? result.data?.message ?? 'Đăng ký thất bại');
      return res.status(result.status).json({ message: msg });
    }
    res.status(201).json({ message: 'Đăng ký thành công' });
  });

  // Đăng nhập: POST /api/Phong/login → trả JWT
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await dotnet(`/api/Phong/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, { method: 'POST' });

    if (!result.ok) {
      return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    const d = result.data;
    // .NET trả: { Id, Username, Role, HoTen, Khoa, Message }
    const token = jwt.sign(
      { id: d.Id ?? d.id, username: d.Username ?? d.username, role: d.Role ?? d.role, department: d.Khoa ?? d.khoa ?? '', dotnet_user_id: d.Id ?? d.id },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: d.Id ?? d.id, username: d.Username ?? d.username, role: d.Role ?? d.role, full_name: d.HoTen ?? d.hoTen, department: d.Khoa ?? d.khoa }
    });
  });

  // ==================== USER — dùng .NET AccountController ====================

  app.get('/api/users/me', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Account/profile/${req.user.dotnet_user_id}`);
    if (!result.ok) return res.status(result.status).json(result.data);
    const d = result.data;
    res.json({
      id: d.Id ?? d.id,
      username: d.Username ?? d.username,
      email: d.Email ?? d.email,
      full_name: d.HoTen ?? d.hoTen,
      phone: d.SoDienThoai ?? d.soDienThoai,
      department: d.Khoa ?? d.khoa,
      role: d.Role ?? d.role
    });
  });

  app.put('/api/users/me', authenticateToken, async (req: any, res) => {
    const { full_name, email, phone, department } = req.body;
    const result = await dotnet(`/api/Account/update-profile/${req.user.dotnet_user_id}`, {
      method: 'PUT',
      body: JSON.stringify({ HoTen: full_name, Email: email, SoDienThoai: phone ?? '', Khoa: department ?? '' })
    });
    if (!result.ok) return res.status(result.status).json({ message: 'Cập nhật thất bại' });
    res.json({ message: 'Cập nhật thành công' });
  });

  app.put('/api/users/me/password', authenticateToken, async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    const result = await dotnet(`/api/Account/change-password?userId=${req.user.dotnet_user_id}&oldPassword=${encodeURIComponent(oldPassword)}&newPassword=${encodeURIComponent(newPassword)}`, { method: 'POST' });
    if (!result.ok) return res.status(result.status).json({ message: 'Đổi mật khẩu thất bại — mật khẩu cũ không đúng' });
    res.json({ message: 'Đổi mật khẩu thành công' });
  });

  // ==================== ROOMS ====================

  app.get('/api/rooms', async (_req, res) => {
    // Dùng GET /api/Phong (endpoint mới thêm) để lấy toàn bộ phòng
    const result = await dotnet('/api/Phong');

    // Lấy thêm danh sách lịch để xem phòng nào đang được sử dụng ngay lúc này
    const bkRes = await dotnet('/api/Phong/lich-dat');
    const bks = bkRes.ok && Array.isArray(bkRes.data) ? bkRes.data : [];
    const now = new Date();

    if (!result.ok) {
      // Fallback sang tim-kiem-nang-cao nếu cần
      const r2 = await dotnet('/api/Phong/tim-kiem-nang-cao?minCapacity=0&start=2050-01-01T00:00:00&end=2050-01-02T00:00:00');
      if (!r2.ok) return res.status(r2.status).json(r2.data);

      const rooms = (Array.isArray(r2.data) ? r2.data : []).map((r: any) => {
        const room = mapRoom(r);
        const active = bks.some((b: any) => mapStatus(b.TrangThai ?? b.trangThai) === 'Approved' && new Date(b.StartTime ?? b.startTime) <= now && new Date(b.EndTime ?? b.endTime) >= now && (b.PhongId ?? b.phongId) == room.id);
        return { ...room, is_in_use: active };
      });
      return res.json(rooms);
    }

    const rooms = (Array.isArray(result.data) ? result.data : []).map((r: any) => {
      const room = mapRoom(r);
      const active = bks.some((b: any) => mapStatus(b.TrangThai ?? b.trangThai) === 'Approved' && new Date(b.StartTime ?? b.startTime) <= now && new Date(b.EndTime ?? b.endTime) >= now && (b.PhongId ?? b.phongId) == room.id);
      return { ...room, is_in_use: active };
    });
    res.json(rooms);
  });

  // Admin: tạo phòng mới
  app.post('/api/rooms', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Chỉ Admin mới được tạo phòng' });
    const { name, capacity, description, department } = req.body;
    const url = `/api/Phong?ten=${encodeURIComponent(name)}&sucChua=${capacity}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`;
    const result = await dotnet(url, { method: 'POST' });
    if (!result.ok) return res.status(result.status).json({ message: typeof result.data === 'string' ? result.data : 'Lỗi tạo phòng' });
    res.status(201).json({ message: 'Tạo phòng thành công', roomId: result.data?.PhongId ?? result.data?.phongId });
  });

  // Admin: cập nhật phòng
  app.put('/api/rooms/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Chỉ Admin mới được sửa phòng' });
    const { name, capacity, description, department } = req.body;
    const url = `/api/Phong/${req.params.id}?ten=${encodeURIComponent(name)}&sucChua=${capacity}&moTa=${encodeURIComponent(description ?? '')}&khoaQuanLy=${encodeURIComponent(department ?? '')}`;
    const result = await dotnet(url, { method: 'PUT' });
    if (!result.ok) return res.status(result.status).json({ message: 'Lỗi cập nhật phòng' });
    res.json({ message: 'Cập nhật phòng thành công' });
  });

  // Admin: xoá phòng
  app.delete('/api/rooms/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Chỉ Admin mới được xoá phòng' });
    const result = await dotnet(`/api/Phong/${req.params.id}`, { method: 'DELETE' });
    if (!result.ok) return res.status(result.status).json({ message: typeof result.data === 'string' ? result.data : 'Lỗi xoá phòng' });
    res.json({ message: 'Xoá phòng thành công' });
  });

  app.get('/api/rooms/:id/devices', async (req, res) => {
    const result = await dotnet(`/api/Phong/${req.params.id}/thiet-bi`);
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map((d: any) => ({
      id: d.Id ?? d.id,
      name: d.Ten ?? d.ten ?? '',
      type: d.Loai ?? d.loai ?? 'Khác',
      room_id: Number(req.params.id)
    })));
  });

  app.get('/api/rooms/:id/bookings', async (req, res) => {
    // Lấy danh sách khoảng thời gian bận của phòng trong ngày (dùng API tra lịch)
    const { date } = req.query; // YYYY-MM-DD
    const targetDate = date ? new Date(date as string) : new Date();
    const d = targetDate.toISOString().split('T')[0];
    const start = `${d}T00:00:00`;
    const end = `${d}T23:59:59`;

    // Gọi API lấy toàn bộ lịch của hệ thống, sau đó filter trên Nodejs
    const result = await dotnet('/api/Phong/lich-dat');
    if (!result.ok) return res.status(result.status).json(result.data);

    const allBookings = Array.isArray(result.data) ? result.data : [];
    const roomBookings = allBookings
      .filter((b: any) => (b.PhongId ?? b.phongId) == req.params.id)
      .filter((b: any) => {
        const status = mapStatus(b.TrangThai ?? b.trangThai);
        // Chỉ hiện lịch đã duyệt hoặc đang dùng
        if (status === 'Rejected') return false;

        const bStart = b.StartTime ?? b.startTime;
        const bEnd = b.EndTime ?? b.endTime;
        return (bStart >= start && bStart <= end) || (bEnd >= start && bEnd <= end) || (bStart <= start && bEnd >= end);
      })
      .map((b: any) => mapBooking(b, 0, b.NguoiDat ?? b.nguoiDat ?? ''));

    res.json(roomBookings);
  });

  // ==================== BOOKINGS ====================

  app.post('/api/bookings', authenticateToken, async (req: any, res) => {
    const { room_id, start_time, end_time, members } = req.body;
    const userId = req.user.dotnet_user_id;
    const url = `/api/Phong/dat-phong?phongId=${room_id}&userId=${userId}&start=${encodeURIComponent(start_time)}&end=${encodeURIComponent(end_time)}`;
    const result = await dotnet(url, { method: 'POST', body: JSON.stringify(members ?? []) });

    if (!result.ok) {
      const d = result.data;
      if (d?.GoiY || d?.goiY) {
        return res.status(409).json({ message: d.Message ?? d.message ?? 'Phòng đã bị trùng lịch', alternatives: [] });
      }
      const msg = typeof d === 'string' ? d : (d?.message ?? d?.Message ?? 'Lỗi đặt phòng');
      return res.status(result.status).json({ message: msg });
    }
    const d = result.data;
    res.status(201).json({ message: 'Đặt phòng thành công, chờ duyệt', bookingId: d?.BookingId ?? d?.bookingId });
  });

  app.get('/api/bookings', async (_req, res) => {
    const result = await dotnet('/api/Phong/lich-dat');
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map((b: any) =>
      mapBooking(b, 0, b.NguoiDat ?? b.nguoiDat ?? '')
    ));
  });

  app.get('/api/bookings/me', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Phong/user/lich-su/${req.user.dotnet_user_id}`);
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map((b: any) =>
      mapBooking(b, req.user.id, req.user.username)
    ));
  });

  app.put('/api/bookings/:id/status', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'Admin')
      return res.status(403).json({ message: 'Chỉ Admin mới có quyền duyệt' });
    const { status, reason } = req.body;
    const url = `/api/Phong/admin/phe-duyet/${req.params.id}?dongY=${status === 'Approved'}&ghiChu=${encodeURIComponent(reason ?? '')}&adminId=${req.user.dotnet_user_id}`;
    const result = await dotnet(url, { method: 'PATCH' });
    if (!result.ok) return res.status(result.status).json({ message: typeof result.data === 'string' ? result.data : 'Lỗi xử lý' });
    res.json({ message: 'Cập nhật trạng thái thành công' });
  });

  app.delete('/api/bookings/:id', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Phong/huy-lich/${req.params.id}/${req.user.dotnet_user_id}`, { method: 'DELETE' });
    if (!result.ok) return res.status(result.status).json({ message: typeof result.data === 'string' ? result.data : 'Lỗi hủy lịch' });
    res.json({ message: 'Hủy thành công' });
  });

  app.post('/api/bookings/:id/checkout', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Phong/tra-phong/${req.params.id}`, { method: 'POST' });
    if (!result.ok) return res.status(result.status).json({ message: 'Lỗi trả phòng' });
    res.json({ message: 'Trả phòng sớm thành công' });
  });

  // ==================== NOTIFICATIONS ====================

  app.get('/api/notifications', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Phong/user/thong-bao/${req.user.dotnet_user_id}`);
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json((Array.isArray(result.data) ? result.data : []).map((n: any) => ({
      id: n.Id ?? n.id,
      user_id: n.NguoiNhanId ?? n.nguoiNhanId,
      message: n.NoiDung ?? n.noiDung ?? '',
      is_read: (n.DaXem ?? n.daXem) ? 1 : 0,
      created_at: n.NgayGui ?? n.ngayGui ?? new Date().toISOString()
    })));
  });

  // .NET không có mark-read endpoint — frontend dùng localStorage
  app.put('/api/notifications/:id/read', authenticateToken, (_req, res) => {
    res.json({ message: 'Đã đánh dấu đọc' });
  });

  // ==================== STATS ====================

  app.get('/api/stats', authenticateToken, async (_req, res) => {
    const result = await dotnet('/api/Phong/thong-ke');
    if (!result.ok) return res.status(result.status).json(result.data);
    const d = result.data;
    const chiTiet: any[] = d.ChiTietTrangThai ?? d.chiTietTrangThai ?? [];
    let pendingBookings = 0, approvedBookings = 0;
    for (const item of chiTiet) {
      const name: string = item.TrangThai ?? item.trangThai ?? '';
      const count: number = item.SoLuong ?? item.soLuong ?? 0;
      if (name === 'ChoDuyet') pendingBookings = count;
      if (name === 'DaDuyet') approvedBookings = count;
    }
    res.json({
      totalRooms: d.TongSoPhong ?? d.tongSoPhong ?? 0,
      totalBookings: d.TongSoYeuCau ?? d.tongSoYeuCau ?? 0,
      pendingBookings,
      approvedBookings
    });
  });

  // ==================== AI CHATBOT (TRỢ LÝ ẢO) ====================
  app.post('/api/chat', authenticateToken, async (req: any, res) => {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ reply: "Lỗi hệ thống: Chưa cấu hình API hỗ trợ Trợ lý ảo." });
    }
    try {
      // Gọi .NET Backend để lấy danh sách toàn bộ phòng và lịch đặt phòng hôm nay
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const [roomsRes, bookingsRes] = await Promise.all([
        dotnet('/api/Phong'),
        dotnet('/api/Phong/lich-dat')
      ]);

      const rooms = roomsRes.ok ? roomsRes.data : [];
      let roomContext = `Danh sách phòng trong hệ thống:\n`;
      rooms.forEach((r: any) => {
        roomContext += `- Phòng ${r.Ten || r.ten}, Sức chứa: ${r.SucChua || r.sucChua}, Khoa: ${r.KhoaQuanLy || r.khoaQuanLy}, Thiết bị: ${r.MoTaThietBi || r.moTaThietBi}\n`;
      });

      const prompt = `Bạn là nhân viên lễ tân/trợ lý tư vấn của Hệ thống Đặt phòng học và phòng họp. 
Tên bạn là "Trợ lý Ảo". Trả lời ngắn gọn, thân thiện, chuyên nghiệp bằng tiếng Việt.
TUYỆT ĐỐI KHÔNG xưng là chatbot hay AI, KHÔNG nhắc đến Google Gemini hay ICTU. Hãy đóng vai như một nhân viên thật sự đang quản lý hệ thống này.

Dữ liệu hệ thống hiện tại bạn đang nắm giữ:
${roomContext}

Câu hỏi của khách: "${message}"

Hãy trả lời khách dựa trên dữ liệu hệ thống trên. Nếu hỏi tìm phòng thỏa mãn yêu cầu (như sức chứa, máy chiếu), hãy chỉ đích danh những phòng phù hợp từ danh sách trên.`;

      const reply = await callGemini(prompt);
      res.json({ reply });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ==================== AI ROOM SUGGESTION ====================
  // Gợi ý phòng thông minh: sử dụng logic Heuristic chấm điểm từ .NET Backend (nhanh & ổn định)

  app.get('/api/rooms/suggest', authenticateToken, async (req: any, res) => {
    const { capacity = '1', start, end, keyword = '', dept = '' } = req.query as any;
    if (!start || !end) return res.status(400).json({ message: 'Cần cung cấp start và end' });

    const userDept: string = dept || req.user.department || '';

    // Gọi trực tiếp Heuristic C# (Không dùng LLM để đảm bảo tốc độ tức thời)
    const result = await dotnet(`/api/Phong/goi-y-ai?capacity=${capacity}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&keyword=${encodeURIComponent(keyword)}&userDept=${encodeURIComponent(userDept)}`);
    if (!result.ok) return res.status(result.status).json(result.data);

    const d = result.data;
    const suggestions = (Array.isArray(d.Suggestions ?? d.suggestions) ? (d.Suggestions ?? d.suggestions) : []).map((s: any) => ({
      room: mapRoom(s.Room ?? s.room),
      score: s.Score ?? s.score,
      reasons: s.Reasons ?? s.reasons ?? []
    }));

    res.json({ suggestions });
  });

  // ==================== USER QUOTA (NFR) ====================
  // Tính số giờ user đã đặt trong tuần hiện tại (quota max 10 tiếng/tuần)

  app.get('/api/users/me/quota', authenticateToken, async (req: any, res) => {
    const result = await dotnet(`/api/Phong/user/quota/${req.user.dotnet_user_id}`);
    if (!result.ok) return res.status(result.status).json(result.data);
    res.json({
      usedHours: result.data.UsedHours ?? result.data.usedHours ?? 0,
      maxHours: result.data.MaxHours ?? result.data.maxHours ?? 10,
      remainingHours: result.data.RemainingHours ?? result.data.remainingHours ?? 0
    });
  });

  // ==================== ROOM AVAILABILITY SEARCH (PI 1.3 UC3) ====================

  app.get('/api/rooms/available', async (req, res) => {
    const { start, end, minCapacity = '1', keyword = '' } = req.query as any;
    if (!start || !end) return res.status(400).json({ message: 'Cần cung cấp start và end' });

    const result = await dotnet(`/api/Phong/tim-kiem-nang-cao?minCapacity=${minCapacity}&keyword=${encodeURIComponent(keyword)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);

    // Lấy thêm danh sách lịch để xem phòng nào đang được sử dụng ngay lúc này
    const bkRes = await dotnet('/api/Phong/lich-dat');
    const bks = bkRes.ok && Array.isArray(bkRes.data) ? bkRes.data : [];
    const now = new Date();

    if (!result.ok) {
      // fallback: lấy tất cả phòng
      const all = await dotnet('/api/Phong');
      const rooms = (Array.isArray(all.data) ? all.data : []).map((r: any) => {
        const room = mapRoom(r);
        const active = bks.some((b: any) => mapStatus(b.TrangThai ?? b.trangThai) === 'Approved' && new Date(b.StartTime ?? b.startTime) <= now && new Date(b.EndTime ?? b.endTime) >= now && (b.PhongId ?? b.phongId) == room.id);
        return { ...room, is_in_use: active };
      });
      return res.json(rooms);
    }

    const rooms = (Array.isArray(result.data) ? result.data : []).map((r: any) => {
      const room = mapRoom(r);
      const active = bks.some((b: any) => mapStatus(b.TrangThai ?? b.trangThai) === 'Approved' && new Date(b.StartTime ?? b.startTime) <= now && new Date(b.EndTime ?? b.endTime) >= now && (b.PhongId ?? b.phongId) == room.id);
      return { ...room, is_in_use: active };
    });
    res.json(rooms);
  });

  // ==================== HEALTH ====================

  app.get('/api/health', async (_req, res) => {
    const r = await dotnet('/api/Phong/thong-ke');
    res.json({ frontend: 'ok', dotnet_backend: r.ok ? 'ok' : 'unreachable', dotnet_url: DOTNET_API });
  });

  // ==================== VITE DEV OR PROD STATIC ====================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // ======== CẤU HÌNH CSP (Bảo mật + Cho phép Cloudflare) ========
    app.use((_req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://static.cloudflareinsights.com;"
      );
      next();
    });

    // ======== PHỤC VỤ FILE TĨNH FRONTEND ========
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    // Fallback cho React Router (Tránh 404 khi load trực tiếp link con)
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Frontend: http://localhost:${PORT}`);
    console.log(`📡 .NET backend: ${DOTNET_API}`);
    console.log(`📖 Swagger: ${DOTNET_API}/swagger\n`);
  });
}

startServer();
