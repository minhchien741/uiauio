using Hangfire;
using Microsoft.EntityFrameworkCore;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Application.Services;
using RoomScheduling.Infrastructure.Context;

var builder = WebApplication.CreateBuilder(args);

// 1. Đăng ký Controllers và Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Dòng này giúp bỏ qua các vòng lặp khi chuyển dữ liệu sang JSON
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHangfire(x => x.UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHangfireServer();
// 2. Đăng ký Database (SQL Server)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString,
    b => b.MigrationsAssembly("RoomScheduling.Infrastructure")));

// 3. KẾT NỐI INTERFACE VỚI CONTEXT (Dòng cực kỳ quan trọng để sửa lỗi của bạn)
builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<EmailService>();
// 4. Đăng ký Service xử lý logic đặt phòng
builder.Services.AddScoped<LichService>();
builder.Services.AddScoped<RoomCleanupService>();
builder.Services.AddHostedService<RoomScheduling.API.Services.RoomReminderService>();


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Không dùng HttpsRedirection bên trong Docker vì Nginx đã xử lý SSL
// app.UseHttpsRedirection();
app.UseAuthorization();
// 1. Sau dòng app.UseAuthorization();
app.UseHangfireDashboard(); // Đường dẫn /hangfire để bạn theo dõi các job ngầm
app.MapControllers();

// 6. Tự động Migration và nạp 20 phòng, 100 yêu cầu mẫu (PI 4.2)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        await context.Database.MigrateAsync();
        await context.SeedDataAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi khi Migration hoặc Seed dữ liệu.");
    }
}

// 7. Đăng ký Hangfire recurring job SAU khi migration xong (database đã tồn tại)
// Retry vì Hangfire schema có thể chưa cài xong
using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetService<IRecurringJobManager>();
    if (recurringJobManager != null)
    {
        for (int attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                recurringJobManager.AddOrUpdate<RoomCleanupService>(
                    "auto-cancel-no-show",
                    service => service.AutoCancelNoShow(),
                    "*/10 * * * *" // Chạy mỗi 10 phút
                );
                break; // Thành công → thoát vòng lặp
            }
            catch (Exception ex) when (attempt < 3)
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                logger.LogWarning(ex, "Hangfire chưa sẵn sàng, thử lại sau 3 giây... (lần {Attempt}/3)", attempt);
                await Task.Delay(3000);
            }
        }
    }
}

app.Run();