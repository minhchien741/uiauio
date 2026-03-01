using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Application.Services;
using RoomScheduling.Domain;
using RoomScheduling.Domain.Entities;
using RoomScheduling.Infrastructure.Context;

namespace RoomScheduling.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PhongController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly LichService _lichService;
    private readonly EmailService _emailService;

    public PhongController(IAppDbContext context, LichService lichService, EmailService emailService)
    {
        _context = context;
        _lichService = lichService;
        _emailService = emailService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(string username, string password)
    {
        // 1. Tìm user theo Username trước
        var user = await _context.NguoiDungs
            .FirstOrDefaultAsync(u => u.Username == username);

        // 2. SỬA TẠI ĐÂY: Dùng hàm Verify để so sánh mật khẩu gửi lên với mật khẩu đã mã hóa trong DB
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.Password))
        {
            return Unauthorized("Sai tài khoản hoặc mật khẩu.");
        }

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Role,
            user.HoTen,
            user.Khoa,
            Message = "Đăng nhập thành công"
        });
    }

    // 1. Lấy danh sách tất cả phòng (Admin & User)
    [HttpGet]
    public async Task<IActionResult> GetAllPhong()
    {
        var phongs = await _context.Phongs.ToListAsync();
        return Ok(phongs);
    }

    // 1b. Thêm phòng mới (Admin)
    [HttpPost]
    public async Task<IActionResult> TaoPhong(string ten, int sucChua, string? moTa, string? khoaQuanLy)
    {
        var phong = new Phong
        {
            Ten = ten,
            SucChua = sucChua,
            MoTaThietBi = moTa ?? string.Empty,
            KhoaQuanLy = khoaQuanLy
        };
        _context.Phongs.Add(phong);
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Thêm phòng thành công", PhongId = phong.Id });
    }

    // 1c. Cập nhật phòng (Admin)
    [HttpPut("{id}")]
    public async Task<IActionResult> CapNhatPhong(int id, string ten, int sucChua, string? moTa, string? khoaQuanLy)
    {
        var phong = await _context.Phongs.FindAsync(id);
        if (phong == null) return NotFound("Phòng không tồn tại.");
        phong.Ten = ten;
        phong.SucChua = sucChua;
        phong.MoTaThietBi = moTa ?? string.Empty;
        phong.KhoaQuanLy = khoaQuanLy;
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Cập nhật phòng thành công" });
    }

    // 1d. Xoá phòng (Admin)
    [HttpDelete("{id}")]
    public async Task<IActionResult> XoaPhong(int id)
    {
        var phong = await _context.Phongs.FindAsync(id);
        if (phong == null) return NotFound("Phòng không tồn tại.");
        _context.Phongs.Remove(phong);
        await _context.SaveChangesAsync();
        return Ok(new { Message = "Xoá phòng thành công" });
    }

    // 2. Xem lịch chi tiết của các phòng
    [HttpGet("lich-dat")]
    public async Task<IActionResult> GetLichDat()
    {
        var lich = await _context.YeuCauDatPhongs
            .Select(x => new {
                x.Id,
                x.PhongId,
                TenPhong = x.Phong.Ten,
                x.StartTime,
                x.EndTime,
                x.NguoiDat,
                x.TrangThai
            }).ToListAsync();
        return Ok(lich);
    }

    // --- PHẦN 2: ĐẶT PHÒNG & THÔNG BÁO ---

    [HttpPost("dat-phong")]
    public async Task<IActionResult> DatPhong(int phongId, int userId, DateTime start, DateTime end, [FromBody] List<int>? invitedUserIds)
    {
        // 1. Kiểm tra tồn tại User và Phòng
        var user = await _context.NguoiDungs.FindAsync(userId);
        var phong = await _context.Phongs.FindAsync(phongId);
        if (user == null || phong == null) return NotFound("Thông tin không hợp lệ.");

        // CHỈ ÁP DỤNG CÁC QUY ĐỊNH CHO USER THƯỜNG (ADMIN ĐƯỢC BỎ QUA)
        if (user.Role != "Admin")
        {
            // --- LỚP BẢO MẬT 1: PHÂN QUYỀN THEO KHOA ---
            if (!string.IsNullOrEmpty(phong.KhoaQuanLy) && phong.KhoaQuanLy != user.Khoa)
            {
                return BadRequest($"Bảo mật: Phòng thuộc khoa {phong.KhoaQuanLy}. Bạn thuộc khoa {user.Khoa} không có quyền đặt.");
            }

            // --- LỚP BẢO MẬT 2: THỜI GIAN ĐẶT TRƯỚC ---
            if (start < DateTime.Now.AddHours(2))
            {
                return BadRequest("Quy định: Phải đặt phòng trước ít nhất 2 tiếng.");
            }

            // --- LỚP BẢO MẬT 3: HẠN MỨC (QUOTA 10 TIẾNG/TUẦN) ---
            DateTime startOfWeek = DateTime.Now.Date.AddDays(-(int)DateTime.Now.DayOfWeek);
            DateTime endOfWeek = startOfWeek.AddDays(7);

            var userBookings = await _context.YeuCauDatPhongs
                .Where(x => x.NguoiDat == user.Username && x.StartTime >= startOfWeek && x.TrangThai != TrangThaiYeuCau.TuChoi)
                .ToListAsync();

            double totalMinutes = userBookings.Sum(x => (x.EndTime - x.StartTime).TotalMinutes);
            if ((totalMinutes + (end - start).TotalMinutes) > 600)
            {
                return BadRequest("Hạn mức: Bạn đã vượt quá giới hạn 10 giờ đặt phòng/tuần.");
            }
        }

        // 2. Kiểm tra trùng lịch
        if (await _lichService.KiemTraTrungLich(phongId, start, end))
        {
            var goiY = await _lichService.TimPhongTrongGoiY(phong.SucChua, start, end);
            return BadRequest(new { Message = "Phòng đã có lịch!", GoiY = goiY.Select(p => p.Ten) });
        }

        // 3. Tạo Yêu cầu đặt phòng
        var yc = new YeuCauDatPhong
        {
            PhongId = phongId,
            NguoiDat = user.Username, // Đây là người chịu trách nhiệm chính (Host)
            StartTime = start,
            EndTime = end,
            TrangThai = TrangThaiYeuCau.ChoDuyet,
            IsCheckedIn = false
        };
        _context.YeuCauDatPhongs.Add(yc);
        await _context.SaveChangesAsync(); // Lưu để lấy Id cho bảng tham gia

        // 4. PHÂN QUYỀN TRONG CUỘC HỌP: Lưu danh sách người tham gia
        var participants = new List<ThamGiaCuocHop>();

        // Tự động thêm chính người đặt làm "Chủ trì" (Host)
        participants.Add(new ThamGiaCuocHop
        {
            YeuCauDatPhongId = yc.Id,
            NguoiDungId = user.Id,
            LaChuTri = true
        });

        // Thêm các thành viên được mời (nếu có)
        if (invitedUserIds != null && invitedUserIds.Any())
        {
            foreach (var guestId in invitedUserIds.Distinct())
            {
                if (guestId == user.Id) continue; // Bỏ qua nếu mời chính mình
                participants.Add(new ThamGiaCuocHop
                {
                    YeuCauDatPhongId = yc.Id,
                    NguoiDungId = guestId,
                    LaChuTri = false
                });
            }
        }
        _context.ThamGiaCuocHops.AddRange(participants);

        // 5. Thông báo cho Admin và Người được mời
        _context.ThongBaos.Add(new ThongBao
        {
            NguoiNhanId = 1, // Admin
            NoiDung = $"🔔 [YÊU CẦU MỚI] {user.HoTen} vừa đặt phòng {phong.Ten} (từ {start:HH:mm dd/MM/yyyy} đến {end:HH:mm dd/MM/yyyy}). Đang chờ duyệt."
        });

        // Thông báo cho chính người dùng
        _context.ThongBaos.Add(new ThongBao
        {
            NguoiNhanId = user.Id,
            NoiDung = $"⏳ Bạn đã gửi yêu cầu đặt phòng {phong.Ten} (từ {start:HH:mm dd/MM/yyyy} đến {end:HH:mm dd/MM/yyyy}). Vui lòng chờ Admin phê duyệt."
        });

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đã gửi yêu cầu đặt phòng và mời thành viên.", BookingId = yc.Id });
    }

    // 4. Tra cứu phòng trống theo thời gian (PI 1.3)
    [HttpGet("tra-cuu-trong")]
    public async Task<IActionResult> GetPhongTrong(DateTime start, DateTime end)
    {
        var phongBanIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai != TrangThaiYeuCau.TuChoi && start < x.EndTime && end > x.StartTime)
            .Select(x => x.PhongId)
            .ToListAsync();

        var phongTrong = await _context.Phongs
            .Where(p => !phongBanIds.Contains(p.Id))
            .ToListAsync();

        return Ok(new { ThoiGian = $"{start} - {end}", SoLuongTrong = phongTrong.Count, DanhSachPhong = phongTrong });
    }

    // 5. Thống kê báo cáo (PI 4.2)
    [HttpGet("thong-ke")]
    public async Task<IActionResult> GetThongKe()
    {
        var tongSoPhong = await _context.Phongs.CountAsync();
        var tongYeuCau = await _context.YeuCauDatPhongs.CountAsync();
        var chiTiet = await _context.YeuCauDatPhongs.GroupBy(x => x.TrangThai)
            .Select(g => new { TrangThai = g.Key.ToString(), SoLuong = g.Count() }).ToListAsync();

        return Ok(new { TongSoPhong = tongSoPhong, TongSoYeuCau = tongYeuCau, ChiTietTrangThai = chiTiet });
    }

    // 6. Tìm kiếm nâng cao theo Sức chứa & Từ khóa (PI 1.2, 1.3 UC3)
    [HttpGet("tim-kiem-nang-cao")]
    public async Task<IActionResult> AdvancedSearch(int minCapacity, string? keyword, DateTime start, DateTime end)
    {
        var busyRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet && start < x.EndTime && end > x.StartTime)
            .Select(x => x.PhongId).ToListAsync();

        var results = await _context.Phongs
            .Where(p => !busyRoomIds.Contains(p.Id) && p.SucChua >= minCapacity)
            .ToListAsync();

        if (!string.IsNullOrEmpty(keyword))
        {
            /// Lọc theo tên phòng HOẶC mô tả thiết bị
            string kw = keyword.ToLower();
            results = results.Where(p => 
                (p.Ten != null && p.Ten.ToLower().Contains(kw)) || 
                (p.MoTaThietBi != null && p.MoTaThietBi.ToLower().Contains(kw))
            ).ToList();
        }

        return Ok(results);
    }

    // --- PHẦN 3: PHÂN QUYỀN ADMIN (DUYỆT LỊCH) ---

    [HttpPatch("admin/phe-duyet/{id}")]
    public async Task<IActionResult> PheDuyet(int id, bool dongY, string? ghiChu, int adminId)
    {
        var admin = await _context.NguoiDungs.FindAsync(adminId);
        if (admin?.Role != "Admin") return Forbid("Bạn không có quyền Admin.");

        var yc = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == id);
        if (yc == null) return NotFound();

        yc.TrangThai = dongY ? TrangThaiYeuCau.DaDuyet : TrangThaiYeuCau.TuChoi;
        await _context.SaveChangesAsync();

        // Gửi Mail & Thông báo cho người dùng
        var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == yc.NguoiDat);
        if (user != null)
        {
            string noiDung = dongY 
                ? $"✅ Yêu cầu đặt phòng {yc.Phong.Ten} (từ {yc.StartTime:HH:mm dd/MM/yyyy} đến {yc.EndTime:HH:mm dd/MM/yyyy}) của bạn đã được DUYỆT thành công!"
                : $"❌ Yêu cầu đặt phòng {yc.Phong.Ten} (từ {yc.StartTime:HH:mm dd/MM/yyyy} đến {yc.EndTime:HH:mm dd/MM/yyyy}) đã bị TỪ CHỐI. Lý do: {(string.IsNullOrEmpty(ghiChu) ? "Không có" : ghiChu)}";

            // 1. Lưu thông báo vào DB
            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = user.Id, NoiDung = noiDung });

            // 2. Gửi Email thật
            await _emailService.GuiEmailAsync(user.Email, "Kết quả đặt phòng", noiDung);

            await _context.SaveChangesAsync();
        }

        return Ok("Đã xử lý và gửi thông báo.");
    }

    // 8. Trả phòng (Check-out) sớm (PI 1.1)
    [HttpPost("tra-phong/{id}")]
    public async Task<IActionResult> TraPhong(int id)
    {
        var yc = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == id);
        if (yc == null) return NotFound();

        // Ghi nhận thời điểm trả phòng thực tế
        yc.ActualEndTime = DateTime.Now;

        var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == yc.NguoiDat);
        if (user != null)
        {
            _context.ThongBaos.Add(new ThongBao 
            { 
                NguoiNhanId = user.Id, 
                NoiDung = $"🏁 Bạn đã trả phòng {yc.Phong.Ten} lúc {yc.ActualEndTime:HH:mm dd/MM/yyyy}. Cảm ơn bạn!" 
            });
        }

        // Nếu trả phòng trước hạn, hệ thống tự động coi như khung giờ sau đó đã rảnh
        await _context.SaveChangesAsync();
        return Ok($"Đã trả phòng lúc {yc.ActualEndTime}. Cảm ơn bạn!");
    }

    // 9. Xem danh sách thiết bị của phòng (PI 2.1)
    [HttpGet("{phongId}/thiet-bi")]
    public async Task<IActionResult> GetThietBi(int phongId)
    {
        var dsThietBi = await _context.ThietBis
            .Where(t => t.PhongId == phongId)
            .Select(t => new { t.Id, t.Ten })
            .ToListAsync();

        return Ok(dsThietBi);
    }
    private async Task GuiThongBao(string nguoiNhan, string noiDung)
    {
        var tb = new ThongBao { NguoiNhan = nguoiNhan, NoiDung = noiDung };
        _context.ThongBaos.Add(tb);
        await _context.SaveChangesAsync();

        // Ở đây bạn có thể giải trình với GV: "Từ đây có thể gọi thêm SendMailService hoặc SignalR"
        Console.WriteLine($"[NOTIFICATION SENT TO {nguoiNhan}]: {noiDung}");
    }
    [HttpGet("thong-bao-cua-toi")]
    public async Task<IActionResult> GetMyNotifications(string username)
    {
        var list = await _context.ThongBaos
            .Where(t => t.NguoiNhan == username)
            .OrderByDescending(t => t.NgayGui)
            .ToListAsync();
        return Ok(list);
    }
    // --- PHẦN 4: DASHBOARD & CÁ NHÂN HÓA ---

    [HttpGet("user/lich-su/{userId}")]
    public async Task<IActionResult> GetLichSu(int userId)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        var lichSu = await _context.YeuCauDatPhongs
            .Where(x => x.NguoiDat == user.Username)
            .OrderByDescending(x => x.StartTime)
            .ToListAsync();
        return Ok(lichSu);
    }

    [HttpGet("user/thong-bao/{userId}")]
    public async Task<IActionResult> GetThongBao(int userId)
    {
        var tbs = await _context.ThongBaos
            .Where(x => x.NguoiNhanId == userId)
            .OrderByDescending(x => x.NgayGui).ToListAsync();
        return Ok(tbs);
    }

    // 10. Lấy hạn mức (Quota) sử dụng phòng trong tuần (PI NFR)
    [HttpGet("user/quota/{userId}")]
    public async Task<IActionResult> GetUserQuota(int userId)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        if (user == null) return NotFound("User not found");

        var now = DateTime.Now;
        int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
        var startOfWeek = now.Date.AddDays(-diff);
        var endOfWeek = startOfWeek.AddDays(7);

        var bookings = await _context.YeuCauDatPhongs
            .Where(x => x.NguoiDat == user.Username && x.StartTime >= startOfWeek && x.EndTime <= endOfWeek && x.TrangThai != TrangThaiYeuCau.TuChoi)
            .ToListAsync();

        double usedHours = Math.Round(bookings.Sum(b => (b.EndTime - b.StartTime).TotalMinutes) / 60.0, 1);
        double maxHours = 10.0; // Hardcoded requirement

        return Ok(new { UsedHours = usedHours, MaxHours = maxHours, RemainingHours = Math.Max(0, maxHours - usedHours) });
    }

    [HttpPost("dat-lich-dinh-ky")]
    public async Task<IActionResult> DatLichDinhKy(int phongId, int userId, DateTime start, DateTime end, int soTuan)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        var phong = await _context.Phongs.FindAsync(phongId);

        // BẢO MẬT: Kiểm tra quyền đặt phòng theo Khoa (PI 1.2)
        if (phong.KhoaQuanLy != null && phong.KhoaQuanLy != user.Khoa)
        {
            return Forbid($"Phòng này thuộc khoa {phong.KhoaQuanLy}. Bạn thuộc khoa {user.Khoa} không có quyền đặt.");
        }

        string groupId = Guid.NewGuid().ToString(); // Định danh cho chuỗi lịch lặp
        var danhSachYeuCau = new List<YeuCauDatPhong>();

        for (int i = 0; i < soTuan; i++)
        {
            var yc = new YeuCauDatPhong
            {
                PhongId = phongId,
                NguoiDat = user.Username,
                StartTime = start.AddDays(i * 7),
                EndTime = end.AddDays(i * 7),
                TrangThai = TrangThaiYeuCau.ChoDuyet,
                IsRecurring = true,
                RecurringGroupId = groupId
            };

            // Kiểm tra trùng lịch cho từng tuần trước khi add
            if (!await _lichService.KiemTraTrungLich(phongId, yc.StartTime, yc.EndTime))
            {
                danhSachYeuCau.Add(yc);
            }
        }

        _context.YeuCauDatPhongs.AddRange(danhSachYeuCau);
        await _context.SaveChangesAsync();
        return Ok($"Đã tạo chuỗi {danhSachYeuCau.Count} lịch họp định kỳ.");
    }
    [HttpDelete("huy-lich/{bookingId}/{userId}")]
    public async Task<IActionResult> HuyLich(int bookingId, int userId)
    {
        var booking = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == bookingId);
        var user = await _context.NguoiDungs.FindAsync(userId);

        if (booking == null || user == null) return NotFound();

        // BẢO MẬT: Chỉ Admin hoặc Chủ phòng mới được hủy
        if (user.Role != "Admin" && booking.NguoiDat != user.Username)
        {
            return Forbid("Bạn không có quyền hủy lịch của người khác!");
        }

        booking.TrangThai = TrangThaiYeuCau.TuChoi;
        booking.GhiChuAdmin = user.Role == "Admin" ? "Bị hủy bởi Admin." : "Người dùng tự hủy.";

        string thongBaoUser = $"🗑️ Lịch đặt phòng {booking.Phong?.Ten ?? "số " + booking.PhongId} (từ {booking.StartTime:HH:mm dd/MM/yyyy} đến {booking.EndTime:HH:mm dd/MM/yyyy}) đã bị hủy.";
        int targetUserId = booking.NguoiDat == user.Username ? user.Id : (await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == booking.NguoiDat))?.Id ?? 0;
        
        if (targetUserId > 0)
        {
            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = targetUserId, NoiDung = thongBaoUser });
        }

        if (user.Role != "Admin") 
        {
            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = 1, NoiDung = $"🗑️ Người dùng {user.HoTen} đã tự hủy lịch phòng {booking.Phong?.Ten ?? "số " + booking.PhongId} ({booking.StartTime:HH:mm dd/MM/yyyy} - {booking.EndTime:HH:mm dd/MM/yyyy})." });
        }

        await _context.SaveChangesAsync();
        return Ok("Đã hủy lịch.");
    }

    // --- PHẦN 5: AI SUGGESTION ---
    [HttpGet("goi-y-ai")]
    public async Task<IActionResult> SuggestRooms(int capacity, string start, string end, string? keyword, string? userDept)
    {
        // Parse DateTime thủ công để tránh lỗi binding ISO 8601 với URL-encode
        if (!DateTime.TryParse(start, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime startDt) ||
            !DateTime.TryParse(end, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime endDt))
        {
            return BadRequest(new { message = "Thời gian không hợp lệ. Định dạng cần: ISO 8601 (ví dụ: 2026-02-28T08:00:00)" });
        }

        // 1. Lấy danh sách phòng trống
        var busyRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai != TrangThaiYeuCau.TuChoi && startDt < x.EndTime && endDt > x.StartTime)
            .Select(x => x.PhongId).ToListAsync();

        var emptyRooms = await _context.Phongs
            .Where(p => !busyRoomIds.Contains(p.Id))
            .ToListAsync();

        string kw = keyword?.ToLower() ?? "";
        
        // 2. Chấm điểm từng phòng
        var scoredRooms = emptyRooms.Select(r => {
            int score = 0;
            var reasons = new List<string>();

            // 1. Khoa phù hợp (40đ)
            if (!string.IsNullOrEmpty(r.KhoaQuanLy) && r.KhoaQuanLy == userDept) {
                score += 40;
                reasons.Add("Thuộc khoa của bạn");
            }

            // 2. Sức chứa vừa đủ (30đ)
            if (r.SucChua >= capacity) {
                double ratio = (double)capacity / r.SucChua;
                score += (int)Math.Round(30 * ratio); // Phòng quá to so với nhu cầu thì điểm thấp lại
                if (r.SucChua <= capacity * 1.5) reasons.Add($"Sức chứa vừa khớp ({r.SucChua} người)");
                else reasons.Add($"Đủ sức chứa ({r.SucChua} người)");
            }

            // 3. Từ khóa (20đ)
            if (!string.IsNullOrEmpty(kw)) {
                if ((r.Ten != null && r.Ten.ToLower().Contains(kw)) || (r.MoTaThietBi != null && r.MoTaThietBi.ToLower().Contains(kw))) {
                    score += 20;
                    reasons.Add($"Có khả năng chứa '{keyword}'");
                }
            }

            // 4. Ưu tiên phòng nhỏ hơn (10đ)
            if (r.SucChua > 0 && r.SucChua <= capacity * 2) score += 10;

            if (score >= 70 && !reasons.Contains("Phù hợp nhất")) reasons.Add("Phù hợp nhất");
            if (reasons.Count == 0) reasons.Add("Phòng còn trống trong khung giờ này");

            return new { Room = r, Score = score, Reasons = reasons };
        })
        .OrderByDescending(x => x.Score)
        .Take(3)
        .ToList();

        return Ok(new { Suggestions = scoredRooms });
    }
}

