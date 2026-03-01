using Microsoft.EntityFrameworkCore;
using RoomScheduling.Domain;
using RoomScheduling.Domain.Entities;
using RoomScheduling.Infrastructure.Context;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

namespace RoomScheduling.API.Services;

public class RoomReminderService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<RoomReminderService> _logger;

    public RoomReminderService(IServiceProvider services, ILogger<RoomReminderService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Room Reminder Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var now = DateTime.Now;
                
                // Tìm các lịch đã duyệt, thời điểm bắt đầu <= hiện tại, và chưa kết thúc
                // Tức là phòng bắt đầu đi vào thời gian sử dụng
                var activeBookings = await dbContext.YeuCauDatPhongs
                    .Include(x => x.Phong)
                    .Where(x => x.TrangThai == TrangThaiYeuCau.DaDuyet 
                             && x.StartTime <= now && x.EndTime > now)
                    .ToListAsync(stoppingToken);

                foreach (var booking in activeBookings)
                {
                    // Kiểm tra xem đã có thông báo nhắc nhở cho booking này chưa (dùng mã ẩn)
                    string reminderKey = $"[REMINDER-{booking.Id}]";
                    
                    // Chỉ gửi thông báo 1 lần duy nhất khi đến giờ
                    bool isNotified = await dbContext.ThongBaos
                        .AnyAsync(t => t.NoiDung.Contains(reminderKey), stoppingToken);

                    if (!isNotified)
                    {
                        var user = await dbContext.NguoiDungs
                            .FirstOrDefaultAsync(u => u.Username == booking.NguoiDat, stoppingToken);
                            
                        if (user != null)
                        {
                            dbContext.ThongBaos.Add(new ThongBao
                            {
                                NguoiNhanId = user.Id,
                                NoiDung = $"⏰ Đã đến giờ sử dụng phòng {booking.Phong?.Ten}! Thời gian của bạn là từ {booking.StartTime:HH:mm} đến {booking.EndTime:HH:mm}. {reminderKey}"
                            });
                        }
                    }
                }
                
                if (activeBookings.Any()) 
                {
                    await dbContext.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing Room Reminder Service.");
            }

            // Chờ 1 phút rồi kiểm tra tiếp
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
