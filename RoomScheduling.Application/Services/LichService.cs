using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Domain.Entities;

namespace RoomScheduling.Application.Services
{
    public class LichService
    {
        private readonly IAppDbContext _context;

        public LichService(IAppDbContext context)
        {
            _context = context;
        }

        // 1. Thuật toán kiểm tra trùng (PI 3.3)
        public async Task<bool> KiemTraTrungLich(int phongId, DateTime start, DateTime end)
        {
            return await _context.YeuCauDatPhongs.AnyAsync(x =>
                x.PhongId == phongId &&
                x.TrangThai != TrangThaiYeuCau.TuChoi &&
                start < x.EndTime &&
                end > x.StartTime);
        }

        // 2. Thuật toán Gợi ý phòng thông minh (PI 3.4)
        public async Task<List<Phong>> TimPhongTrongGoiY(int sucChuaYeuCau, DateTime start, DateTime end)
        {
            // Tìm ID các phòng đã bị kẹt lịch trong khoảng thời gian này
            var phongBiTrungIds = await _context.YeuCauDatPhongs
                .Where(x => x.TrangThai != TrangThaiYeuCau.TuChoi && start < x.EndTime && end > x.StartTime)
                .Select(x => x.PhongId)
                .ToListAsync();

            // Tìm phòng còn trống và có sức chứa đủ lớn
            return await _context.Phongs
                .Where(p => !phongBiTrungIds.Contains(p.Id) && p.SucChua >= sucChuaYeuCau)
                .OrderBy(p => p.SucChua) // Ưu tiên phòng có quy mô gần nhất
                .Take(3) // Chỉ lấy 3 gợi ý tốt nhất
                .ToListAsync();
        }
        public async Task GuiThongBao(string emailNguoiDat, string tieuDe, string noiDung)
        {
            // Trong thực tế sẽ dùng SMTP hoặc SendGrid ở đây
            // Ở mức độ đồ án, chúng ta sẽ giả lập bằng cách ghi Log hoặc Console
            await Task.Delay(100);
            Console.WriteLine($"[EMAIL SENT TO {emailNguoiDat}]: {tieuDe} - {noiDung}");
        }
    }
}