using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Application.Services;
using RoomScheduling.Domain;
using RoomScheduling.Domain.Entities;
using RoomScheduling.Infrastructure.Context;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RoomScheduling.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PhongController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly LichService _lichService;
    private readonly EmailService _emailService;
    private readonly IConfiguration _config;

    public PhongController(IAppDbContext context, LichService lichService, EmailService emailService, IConfiguration config)
    {
        _context = context;
        _lichService = lichService;
        _emailService = emailService;
        _config = config;
    }

    // ==================== AUTH ====================

    [HttpPost("login")]
    public async Task<IActionResult> Login(string username, string password)
    {
        var user = await _context.NguoiDungs
            .FirstOrDefaultAsync(u => u.Username == username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.Password))
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu." });

        // Tạo JWT token
        var secret = _config["JwtSettings:Secret"] ?? "RoomSchedulingSystemSuperSecretKey2026!!";
        var issuer = _config["JwtSettings:Issuer"] ?? "RoomSchedulingAPI";
        var audience = _config["JwtSettings:Audience"] ?? "RoomSchedulingFrontend";
        var expires = int.TryParse(_config["JwtSettings:ExpiresInHours"], out int h) ? h : 24;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Role, user.Role ?? "User"),
            new Claim("department", user.Khoa ?? ""),
            new Claim("dotnet_user_id", user.Id.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expires),
            signingCredentials: creds
        );

        return Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            user = new
            {
                id = user.Id,
                username = user.Username,
                role = user.Role,
                full_name = user.HoTen,
                department = user.Khoa
            }
        });
    }

    // ==================== ROOMS ====================

    // 1. Lấy danh sách tất cả phòng (bao gồm trạng thái đang dùng)
    [HttpGet]
    public async Task<IActionResult> GetAllPhong()
    {
        var now = DateTime.Now;

        // Lấy IDs các phòng đang có booking được duyệt và trong khung giờ hiện tại
        var activeRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet
                     && x.StartTime <= now && x.EndTime >= now)
            .Select(x => x.PhongId)
            .ToHashSetAsync();

        var phongs = await _context.Phongs.ToListAsync();

        var result = phongs.Select(p => new
        {
            id = p.Id,
            name = p.Ten,
            capacity = p.SucChua,
            description = p.MoTaThietBi,
            department = p.KhoaQuanLy,
            isCurrentlyInUse = activeRoomIds.Contains(p.Id)
        });

        return Ok(result);
    }

    // 1b. Thêm phòng mới (Admin)
    [HttpPost]
    [Authorize(Roles = "Admin")]
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
        return Ok(new { message = "Thêm phòng thành công", roomId = phong.Id });
    }

    // 1c. Cập nhật phòng (Admin)
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CapNhatPhong(int id, string ten, int sucChua, string? moTa, string? khoaQuanLy)
    {
        var phong = await _context.Phongs.FindAsync(id);
        if (phong == null) return NotFound(new { message = "Phòng không tồn tại." });
        phong.Ten = ten;
        phong.SucChua = sucChua;
        phong.MoTaThietBi = moTa ?? string.Empty;
        phong.KhoaQuanLy = khoaQuanLy;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Cập nhật phòng thành công" });
    }

    // 1d. Xoá phòng (Admin)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> XoaPhong(int id)
    {
        var phong = await _context.Phongs.FindAsync(id);
        if (phong == null) return NotFound(new { message = "Phòng không tồn tại." });
        _context.Phongs.Remove(phong);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Xoá phòng thành công" });
    }

    // 2. Tìm kiếm nâng cao (PI 1.2, 1.3 UC3)
    [HttpGet("tim-kiem-nang-cao")]
    public async Task<IActionResult> AdvancedSearch(int minCapacity, string? keyword, DateTime start, DateTime end)
    {
        var now = DateTime.Now;

        var busyRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet && start < x.EndTime && end > x.StartTime)
            .Select(x => x.PhongId).ToListAsync();

        var activeRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet && x.StartTime <= now && x.EndTime >= now)
            .Select(x => x.PhongId)
            .ToHashSetAsync();

        var results = await _context.Phongs
            .Where(p => !busyRoomIds.Contains(p.Id) && p.SucChua >= minCapacity)
            .ToListAsync();

        if (!string.IsNullOrEmpty(keyword))
        {
            string kw = keyword.ToLower();
            results = results.Where(p =>
                (p.Ten != null && p.Ten.ToLower().Contains(kw)) ||
                (p.MoTaThietBi != null && p.MoTaThietBi.ToLower().Contains(kw))
            ).ToList();
        }

        var mapped = results.Select(p => new
        {
            id = p.Id,
            name = p.Ten,
            capacity = p.SucChua,
            description = p.MoTaThietBi,
            department = p.KhoaQuanLy,
            isCurrentlyInUse = activeRoomIds.Contains(p.Id)
        });

        return Ok(mapped);
    }

    // 3. Lấy lịch đặt theo phòng và ngày (thay thế việc filter bằng JS ở Node)
    [HttpGet("{id}/lich-dat")]
    public async Task<IActionResult> GetLichDatByPhong(int id, [FromQuery] string? date)
    {
        DateOnly targetDate = string.IsNullOrEmpty(date)
            ? DateOnly.FromDateTime(DateTime.Now)
            : DateOnly.Parse(date);

        var startOfDay = targetDate.ToDateTime(TimeOnly.MinValue);
        var endOfDay = targetDate.ToDateTime(TimeOnly.MaxValue);

        var bookings = await _context.YeuCauDatPhongs
            .Include(x => x.Phong)
            .Where(x => x.PhongId == id
                     && x.TrangThai != TrangThaiYeuCau.TuChoi
                     && x.StartTime < endOfDay
                     && x.EndTime > startOfDay)
            .OrderBy(x => x.StartTime)
            .Select(x => new
            {
                id = x.Id,
                roomId = x.PhongId,
                roomName = x.Phong != null ? x.Phong.Ten : "",
                startTime = x.StartTime,
                endTime = x.EndTime,
                status = x.TrangThai.ToString(),
                bookedBy = x.NguoiDat,
                reason = x.GhiChuAdmin,
                checkInTime = x.ActualStartTime,
                checkOutTime = x.ActualEndTime,
                isRecurring = x.IsRecurring
            })
            .ToListAsync();

        return Ok(bookings);
    }

    // 4. Xem danh sách thiết bị của phòng (PI 2.1)
    [HttpGet("{phongId}/thiet-bi")]
    public async Task<IActionResult> GetThietBi(int phongId)
    {
        var dsThietBi = await _context.ThietBis
            .Where(t => t.PhongId == phongId)
            .Select(t => new { id = t.Id, name = t.Ten, type = t.Loai, roomId = t.PhongId })
            .ToListAsync();

        return Ok(dsThietBi);
    }

    // ==================== BOOKINGS ====================

    // 5. Xem toàn bộ lịch đặt (Admin)
    [HttpGet("lich-dat")]
    [Authorize]
    public async Task<IActionResult> GetLichDat()
    {
        var lich = await _context.YeuCauDatPhongs
            .Include(x => x.Phong)
            .Select(x => new
            {
                id = x.Id,
                phongId = x.PhongId,
                tenPhong = x.Phong != null ? x.Phong.Ten : "",
                startTime = x.StartTime,
                endTime = x.EndTime,
                nguoiDat = x.NguoiDat,
                trangThai = x.TrangThai,
                ghiChuAdmin = x.GhiChuAdmin,
                actualStartTime = x.ActualStartTime,
                actualEndTime = x.ActualEndTime,
                isRecurring = x.IsRecurring
            }).ToListAsync();
        return Ok(lich);
    }

    // 6. Đặt phòng
    [HttpPost("dat-phong")]
    [Authorize]
    public async Task<IActionResult> DatPhong(int phongId, int userId, DateTime start, DateTime end, [FromBody] List<int>? invitedUserIds)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        var phong = await _context.Phongs.FindAsync(phongId);
        if (user == null || phong == null) return NotFound(new { message = "Thông tin không hợp lệ." });

        if (user.Role != "Admin")
        {
            if (!string.IsNullOrEmpty(phong.KhoaQuanLy) && phong.KhoaQuanLy != user.Khoa)
                return BadRequest(new { message = $"Phòng thuộc khoa {phong.KhoaQuanLy}. Bạn thuộc khoa {user.Khoa} không có quyền đặt." });

            if (start < DateTime.Now.AddHours(2))
                return BadRequest(new { message = "Phải đặt phòng trước ít nhất 2 tiếng." });

            DateTime startOfWeek = DateTime.Now.Date.AddDays(-(int)DateTime.Now.DayOfWeek);
            DateTime endOfWeek = startOfWeek.AddDays(7);

            var userBookings = await _context.YeuCauDatPhongs
                .Where(x => x.NguoiDat == user.Username && x.StartTime >= startOfWeek && x.TrangThai != TrangThaiYeuCau.TuChoi)
                .ToListAsync();

            double totalMinutes = userBookings.Sum(x => (x.EndTime - x.StartTime).TotalMinutes);
            if ((totalMinutes + (end - start).TotalMinutes) > 600)
                return BadRequest(new { message = "Bạn đã vượt quá giới hạn 10 giờ đặt phòng/tuần." });
        }

        if (await _lichService.KiemTraTrungLich(phongId, start, end))
        {
            var goiY = await _lichService.TimPhongTrongGoiY(phong.SucChua, start, end);
            return Conflict(new { message = "Phòng đã có lịch!", alternatives = goiY.Select(p => p.Ten) });
        }

        var yc = new YeuCauDatPhong
        {
            PhongId = phongId,
            NguoiDat = user.Username,
            StartTime = start,
            EndTime = end,
            TrangThai = TrangThaiYeuCau.ChoDuyet,
            IsCheckedIn = false
        };
        _context.YeuCauDatPhongs.Add(yc);
        await _context.SaveChangesAsync();

        var participants = new List<ThamGiaCuocHop>
        {
            new ThamGiaCuocHop { YeuCauDatPhongId = yc.Id, NguoiDungId = user.Id, LaChuTri = true }
        };

        if (invitedUserIds != null && invitedUserIds.Any())
        {
            foreach (var guestId in invitedUserIds.Distinct())
            {
                if (guestId == user.Id) continue;
                participants.Add(new ThamGiaCuocHop { YeuCauDatPhongId = yc.Id, NguoiDungId = guestId, LaChuTri = false });
            }
        }
        _context.ThamGiaCuocHops.AddRange(participants);

        _context.ThongBaos.Add(new ThongBao
        {
            NguoiNhanId = 1,
            NoiDung = $"🔔 [YÊU CẦU MỚI] {user.HoTen} vừa đặt phòng {phong.Ten} (từ {start:HH:mm dd/MM/yyyy} đến {end:HH:mm dd/MM/yyyy}). Đang chờ duyệt."
        });
        _context.ThongBaos.Add(new ThongBao
        {
            NguoiNhanId = user.Id,
            NoiDung = $"⏳ Bạn đã gửi yêu cầu đặt phòng {phong.Ten} (từ {start:HH:mm dd/MM/yyyy} đến {end:HH:mm dd/MM/yyyy}). Vui lòng chờ Admin phê duyệt."
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã gửi yêu cầu đặt phòng và mời thành viên.", bookingId = yc.Id });
    }

    // 7. Lịch sử đặt phòng của user
    [HttpGet("user/lich-su/{userId}")]
    [Authorize]
    public async Task<IActionResult> GetLichSu(int userId)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        var lichSu = await _context.YeuCauDatPhongs
            .Include(x => x.Phong)
            .Where(x => x.NguoiDat == user.Username)
            .OrderByDescending(x => x.StartTime)
            .Select(x => new
            {
                id = x.Id,
                phongId = x.PhongId,
                tenPhong = x.Phong != null ? x.Phong.Ten : "",
                startTime = x.StartTime,
                endTime = x.EndTime,
                nguoiDat = x.NguoiDat,
                trangThai = x.TrangThai,
                ghiChuAdmin = x.GhiChuAdmin,
                actualStartTime = x.ActualStartTime,
                actualEndTime = x.ActualEndTime,
                isRecurring = x.IsRecurring
            })
            .ToListAsync();

        return Ok(lichSu);
    }

    // 8. Duyệt / từ chối booking (Admin)
    [HttpPatch("admin/phe-duyet/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> PheDuyet(int id, bool dongY, string? ghiChu, int adminId)
    {
        var yc = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == id);
        if (yc == null) return NotFound();

        yc.TrangThai = dongY ? TrangThaiYeuCau.DaDuyet : TrangThaiYeuCau.TuChoi;
        yc.GhiChuAdmin = ghiChu;
        await _context.SaveChangesAsync();

        var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == yc.NguoiDat);
        if (user != null)
        {
            string noiDung = dongY
                ? $"✅ Yêu cầu đặt phòng {yc.Phong!.Ten} (từ {yc.StartTime:HH:mm dd/MM/yyyy} đến {yc.EndTime:HH:mm dd/MM/yyyy}) của bạn đã được DUYỆT thành công!"
                : $"❌ Yêu cầu đặt phòng {yc.Phong!.Ten} (từ {yc.StartTime:HH:mm dd/MM/yyyy} đến {yc.EndTime:HH:mm dd/MM/yyyy}) đã bị TỪ CHỐI. Lý do: {(string.IsNullOrEmpty(ghiChu) ? "Không có" : ghiChu)}";

            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = user.Id, NoiDung = noiDung });
            await _emailService.GuiEmailAsync(user.Email, "Kết quả đặt phòng", noiDung);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Đã xử lý và gửi thông báo." });
    }

    // 9. Hủy lịch
    [HttpDelete("huy-lich/{bookingId}/{userId}")]
    [Authorize]
    public async Task<IActionResult> HuyLich(int bookingId, int userId)
    {
        var booking = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == bookingId);
        var user = await _context.NguoiDungs.FindAsync(userId);

        if (booking == null || user == null) return NotFound();

        if (user.Role != "Admin" && booking.NguoiDat != user.Username)
            return Forbid();

        booking.TrangThai = TrangThaiYeuCau.TuChoi;
        booking.GhiChuAdmin = user.Role == "Admin" ? "Bị hủy bởi Admin." : "Người dùng tự hủy.";

        string thongBaoUser = $"🗑️ Lịch đặt phòng {booking.Phong?.Ten ?? "số " + booking.PhongId} (từ {booking.StartTime:HH:mm dd/MM/yyyy} đến {booking.EndTime:HH:mm dd/MM/yyyy}) đã bị hủy.";
        int targetUserId = booking.NguoiDat == user.Username
            ? user.Id
            : (await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == booking.NguoiDat))?.Id ?? 0;

        if (targetUserId > 0)
            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = targetUserId, NoiDung = thongBaoUser });

        if (user.Role != "Admin")
            _context.ThongBaos.Add(new ThongBao { NguoiNhanId = 1, NoiDung = $"🗑️ Người dùng {user.HoTen} đã tự hủy lịch phòng {booking.Phong?.Ten ?? "số " + booking.PhongId} ({booking.StartTime:HH:mm dd/MM/yyyy} - {booking.EndTime:HH:mm dd/MM/yyyy})." });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã hủy lịch." });
    }

    // 10. Trả phòng sớm (Check-out)
    [HttpPost("tra-phong/{id}")]
    [Authorize]
    public async Task<IActionResult> TraPhong(int id)
    {
        var yc = await _context.YeuCauDatPhongs.Include(x => x.Phong).FirstOrDefaultAsync(x => x.Id == id);
        if (yc == null) return NotFound();

        yc.ActualEndTime = DateTime.Now;

        var user = await _context.NguoiDungs.FirstOrDefaultAsync(u => u.Username == yc.NguoiDat);
        if (user != null)
        {
            _context.ThongBaos.Add(new ThongBao
            {
                NguoiNhanId = user.Id,
                NoiDung = $"🏁 Bạn đã trả phòng {yc.Phong!.Ten} lúc {yc.ActualEndTime:HH:mm dd/MM/yyyy}. Cảm ơn bạn!"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Đã trả phòng lúc {yc.ActualEndTime}." });
    }

    // ==================== NOTIFICATIONS ====================

    // 11. Lấy thông báo của user
    [HttpGet("user/thong-bao/{userId}")]
    [Authorize]
    public async Task<IActionResult> GetThongBao(int userId)
    {
        var tbs = await _context.ThongBaos
            .Where(x => x.NguoiNhanId == userId)
            .OrderByDescending(x => x.NgayGui)
            .Select(x => new
            {
                id = x.Id,
                userId = x.NguoiNhanId,
                message = x.NoiDung,
                isRead = x.DaXem,
                createdAt = x.NgayGui
            })
            .ToListAsync();
        return Ok(tbs);
    }

    // 12. MỚI: Mark thông báo đã đọc (ghi thật vào DB)
    [HttpPatch("user/thong-bao/{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkNotificationRead(int id)
    {
        var tb = await _context.ThongBaos.FindAsync(id);
        if (tb == null) return NotFound(new { message = "Thông báo không tồn tại." });
        tb.DaXem = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã đánh dấu đã đọc." });
    }

    // ==================== STATS ====================

    // 13. Thống kê báo cáo (PI 4.2)
    [HttpGet("thong-ke")]
    [Authorize]
    public async Task<IActionResult> GetThongKe()
    {
        var tongSoPhong = await _context.Phongs.CountAsync();
        var tongYeuCau = await _context.YeuCauDatPhongs.CountAsync();
        var chiTiet = await _context.YeuCauDatPhongs.GroupBy(x => x.TrangThai)
            .Select(g => new { trangThai = g.Key.ToString(), soLuong = g.Count() }).ToListAsync();

        return Ok(new { tongSoPhong, tongSoYeuCau = tongYeuCau, chiTietTrangThai = chiTiet });
    }

    // ==================== USER QUOTA ====================

    // 14. Hạn mức sử dụng phòng trong tuần (PI NFR)
    [HttpGet("user/quota/{userId}")]
    [Authorize]
    public async Task<IActionResult> GetUserQuota(int userId)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        if (user == null) return NotFound(new { message = "User not found" });

        var now = DateTime.Now;
        int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
        var startOfWeek = now.Date.AddDays(-diff);
        var endOfWeek = startOfWeek.AddDays(7);

        var bookings = await _context.YeuCauDatPhongs
            .Where(x => x.NguoiDat == user.Username && x.StartTime >= startOfWeek && x.EndTime <= endOfWeek && x.TrangThai != TrangThaiYeuCau.TuChoi)
            .ToListAsync();

        double usedHours = Math.Round(bookings.Sum(b => (b.EndTime - b.StartTime).TotalMinutes) / 60.0, 1);
        double maxHours = 10.0;

        return Ok(new { usedHours, maxHours, remainingHours = Math.Max(0, maxHours - usedHours) });
    }

    // ==================== AI SUGGESTION ====================

    // 15. Gợi ý phòng thông minh (Heuristic)
    [HttpGet("goi-y-ai")]
    [Authorize]
    public async Task<IActionResult> SuggestRooms(int capacity, string start, string end, string? keyword, string? userDept)
    {
        if (!DateTime.TryParse(start, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime startDt) ||
            !DateTime.TryParse(end, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime endDt))
        {
            return BadRequest(new { message = "Thời gian không hợp lệ. Định dạng cần: ISO 8601 (ví dụ: 2026-02-28T08:00:00)" });
        }

        var busyRoomIds = await _context.YeuCauDatPhongs
            .Where(x => x.TrangThai != TrangThaiYeuCau.TuChoi && startDt < x.EndTime && endDt > x.StartTime)
            .Select(x => x.PhongId).ToListAsync();

        var emptyRooms = await _context.Phongs
            .Where(p => !busyRoomIds.Contains(p.Id))
            .ToListAsync();

        string kw = keyword?.ToLower() ?? "";

        var scoredRooms = emptyRooms.Select(r =>
        {
            int score = 0;
            var reasons = new List<string>();

            if (!string.IsNullOrEmpty(r.KhoaQuanLy) && r.KhoaQuanLy == userDept) { score += 40; reasons.Add("Thuộc khoa của bạn"); }
            if (r.SucChua >= capacity)
            {
                double ratio = (double)capacity / r.SucChua;
                score += (int)Math.Round(30 * ratio);
                reasons.Add(r.SucChua <= capacity * 1.5 ? $"Sức chứa vừa khớp ({r.SucChua} người)" : $"Đủ sức chứa ({r.SucChua} người)");
            }
            if (!string.IsNullOrEmpty(kw) && ((r.Ten != null && r.Ten.ToLower().Contains(kw)) || (r.MoTaThietBi != null && r.MoTaThietBi.ToLower().Contains(kw))))
            { score += 20; reasons.Add($"Có khả năng chứa '{keyword}'"); }
            if (r.SucChua > 0 && r.SucChua <= capacity * 2) score += 10;
            if (score >= 70 && !reasons.Contains("Phù hợp nhất")) reasons.Add("Phù hợp nhất");
            if (reasons.Count == 0) reasons.Add("Phòng còn trống trong khung giờ này");

            return new
            {
                room = new { id = r.Id, name = r.Ten, capacity = r.SucChua, description = r.MoTaThietBi, department = r.KhoaQuanLy },
                score,
                reasons
            };
        })
        .OrderByDescending(x => x.score)
        .Take(3)
        .ToList();

        return Ok(new { suggestions = scoredRooms });
    }

    // ==================== HEALTH ====================

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok" });

    // ==================== KÉO DÀI LEGACY ENDPOINTS ====================

    // Tra cứu phòng trống theo thời gian (PI 1.3)
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

        return Ok(new { thoiGian = $"{start} - {end}", soLuongTrong = phongTrong.Count, danhSachPhong = phongTrong });
    }

    // Lịch định kỳ
    [HttpPost("dat-lich-dinh-ky")]
    [Authorize]
    public async Task<IActionResult> DatLichDinhKy(int phongId, int userId, DateTime start, DateTime end, int soTuan)
    {
        var user = await _context.NguoiDungs.FindAsync(userId);
        var phong = await _context.Phongs.FindAsync(phongId);
        if (user == null || phong == null) return NotFound();

        if (!string.IsNullOrEmpty(phong.KhoaQuanLy) && phong.KhoaQuanLy != user.Khoa)
            return Forbid();

        string groupId = Guid.NewGuid().ToString();
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

            if (!await _lichService.KiemTraTrungLich(phongId, yc.StartTime, yc.EndTime))
                danhSachYeuCau.Add(yc);
        }

        _context.YeuCauDatPhongs.AddRange(danhSachYeuCau);
        await _context.SaveChangesAsync();
        return Ok(new { message = $"Đã tạo chuỗi {danhSachYeuCau.Count} lịch họp định kỳ." });
    }
}
