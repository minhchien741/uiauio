using Microsoft.EntityFrameworkCore;
using RoomScheduling.Application.Interfaces; // Dùng Interface
using RoomScheduling.Domain.Entities;

namespace RoomScheduling.Application.Services
{
    public class RoomCleanupService
    {
        private readonly IAppDbContext _context; // Đổi từ AppDbContext sang IAppDbContext

        public RoomCleanupService(IAppDbContext context) // Inject Interface
        {
            _context = context;
        }

        public async Task AutoCancelNoShow()
        {
            var now = DateTime.Now;

            var lateBookings = await _context.YeuCauDatPhongs
                .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet
                       && !x.IsCheckedIn
                       && now > x.StartTime.AddMinutes(15)
                       && now < x.EndTime)
                .ToListAsync();

            if (lateBookings.Any())
            {
                foreach (var item in lateBookings)
                {
                    item.TrangThai = TrangThaiYeuCau.TuChoi;
                    item.GhiChuAdmin = "Hệ thống tự động hủy do người dùng không có mặt (No-show) quá 15 phút.";
                }
                await _context.SaveChangesAsync(default); // Thêm default cho đúng signature
                Console.WriteLine($"[Hangfire] Đã tự động hủy {lateBookings.Count} lịch vắng mặt.");
            }
        }
    }
}