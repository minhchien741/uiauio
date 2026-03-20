using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoomScheduling.Infrastructure.Context;
using System.Text.Json;
using System.Text;
using RoomScheduling.Domain.Entities;

namespace RoomScheduling.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public ChatController(AppDbContext context, IConfiguration config, HttpClient httpClient)
        {
            _context = context;
            _config = config;
            _httpClient = httpClient;
        }

        public class ChatRequest
        {
            public string Message { get; set; } = string.Empty;
        }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest req)
        {
            var apiKey = _config["GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, new { reply = "Lỗi hệ thống: Chưa cấu hình GeminiApiKey trong appsettings.json của .NET." });
            }

            try
            {
                var now = DateTime.Now;
                var todayStart = now.Date;
                var todayEnd = todayStart.AddDays(1).AddSeconds(-1);

                // Fetch context: all rooms + today's bookings
                var rooms = await _context.Phongs.ToListAsync();
                var todayBookings = await _context.YeuCauDatPhongs
                    .Where(b => b.StartTime >= todayStart && b.StartTime <= todayEnd && b.TrangThai != TrangThaiYeuCau.TuChoi)
                    .ToListAsync();

                var roomContextBuilder = new StringBuilder();
                roomContextBuilder.AppendLine($"Danh sách phòng và lịch đặt hôm nay ({todayStart:yyyy-MM-dd}):");

                foreach (var r in rooms)
                {
                    var bookingsOfRoom = todayBookings.Where(b => b.PhongId == r.Id).ToList();

                    // Check if bustling right now
                    var isBusyNow = bookingsOfRoom.Any(b => b.StartTime <= now && b.EndTime >= now);
                    var statusNow = isBusyNow ? "🔴 Đang có người dùng" : "🟢 Hiện đang trống";

                    roomContextBuilder.AppendLine($"\n📌 Phòng: {r.Ten} | Sức chứa: {r.SucChua} người | Khoa: {r.KhoaQuanLy ?? "Chung"} | Thiết bị: {r.MoTaThietBi ?? "Không rõ"}");
                    roomContextBuilder.AppendLine($"   Trạng thái hiện tại: {statusNow}");

                    if (bookingsOfRoom.Any())
                    {
                        roomContextBuilder.AppendLine("   Lịch đặt hôm nay:");
                        foreach (var b in bookingsOfRoom.OrderBy(x => x.StartTime))
                        {
                            var statusLabel = b.TrangThai == TrangThaiYeuCau.DaDuyet ? "Đã duyệt" : "Chờ duyệt";
                            roomContextBuilder.AppendLine($"     - {b.StartTime:HH:mm}–{b.EndTime:HH:mm} ({statusLabel})");
                        }
                    }
                    else
                    {
                        roomContextBuilder.AppendLine("   Lịch đặt hôm nay: Chưa có ai đặt");
                    }
                }

                var prompt = $@"Bạn là nhân viên lễ tân/trợ lý tư vấn của Hệ thống Đặt phòng học và phòng họp tại trường Đại học CNTT&TT.
Tên bạn là ""Trợ lý Ảo"". Trả lời ngắn gọn, thân thiện, chuyên nghiệp bằng tiếng Việt.
TUYỆT ĐỐI KHÔNG xưng là chatbot hay AI. Đóng vai như nhân viên thật sự đang quản lý hệ thống.

Thời gian hiện tại: {now:HH:mm} ngày {todayStart:yyyy-MM-dd}

{roomContextBuilder}

Câu hỏi của khách: ""{req.Message}""

Hướng dẫn trả lời:
- Nếu hỏi phòng trống: chỉ đích danh các phòng 🟢 và lịch rảnh còn lại trong ngày
- Nếu hỏi phòng cụ thể: báo trạng thái hiện tại và các khung giờ bận
- Nếu hỏi theo sức chứa/thiết bị: lọc và gợi ý đúng danh sách
- Luôn nhắc khách vào mục ""Tìm phòng trống"" để đặt phòng chính thức";

                // Call Gemini API
                var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
                var payload = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(geminiUrl, content);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode(500, new { reply = $"Lỗi từ Gemini API: {response.StatusCode}" });
                }

                using var doc = JsonDocument.Parse(jsonString);
                var replyText = doc.RootElement
                                   .GetProperty("candidates")[0]
                                   .GetProperty("content")
                                   .GetProperty("parts")[0]
                                   .GetProperty("text").GetString();

                return Ok(new { reply = replyText ?? "Không có câu trả lời." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { reply = "Lỗi internal server.", details = ex.Message });
            }
        }
    }
}
