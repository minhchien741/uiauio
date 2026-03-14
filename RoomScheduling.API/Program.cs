using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Application.Services;
using RoomScheduling.Infrastructure.Context;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Đọc JwtSettings từ appsettings.json
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "RoomSchedulingSystemSuperSecretKey2026!!";
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "RoomSchedulingAPI";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "RoomSchedulingFrontend";

// 2. Đăng ký JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// 3. Đăng ký Controllers và Swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        // Trả về camelCase chuẩn để Node.js không cần transform nữa
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();

// Cấu hình Swagger hỗ trợ JWT Bearer
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "Nhập: Bearer {token}",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHangfire(x => x.UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHangfireServer();

// 4. Đăng ký Database (SQL Server)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString,
    b => b.MigrationsAssembly("RoomScheduling.Infrastructure")));

// 5. Kết nối Interface với Context
builder.Services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
builder.Services.AddScoped<EmailService>();

// 6. Đăng ký Services
builder.Services.AddScoped<LichService>();
builder.Services.AddScoped<RoomCleanupService>();
builder.Services.AddHostedService<RoomScheduling.API.Services.RoomReminderService>();

// 7. CORS: cho phép Node.js BFF (port 3000) gọi vào
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Không dùng HttpsRedirection bên trong Docker vì Nginx đã xử lý SSL
// app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

// QUAN TRỌNG: UseAuthentication phải đứng TRƯỚC UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard();
app.MapControllers();

// 8. Tự động Migration và nạp dữ liệu mẫu
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

// 9. Đăng ký Hangfire recurring job SAU khi migration xong
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
                    "*/10 * * * *"
                );
                break;
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