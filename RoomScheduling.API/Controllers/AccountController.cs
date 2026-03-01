using Microsoft.AspNetCore.Mvc;
using RoomScheduling.Domain.Entities;
using RoomScheduling.Infrastructure.Context;
using Microsoft.EntityFrameworkCore; // Thiếu dòng này là không dùng được hàm Async

namespace RoomScheduling.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AccountController(AppDbContext context) => _context = context;

        [HttpPost("register")]
        public async Task<IActionResult> Register(
        string username,
        string password,
        string email,
        string hoTen,
        string soDienThoai,
        string khoa)
        {
            // 1. Kiểm tra trùng tên đăng nhập
            if (await _context.NguoiDungs.AnyAsync(u => u.Username == username))
                return BadRequest("Tên đăng nhập đã tồn tại.");

            // 2. Tạo đối tượng người dùng mới
            var newUser = new NguoiDung
            {
                Username = username,
                // SỬA TẠI ĐÂY: Mã hóa mật khẩu trước khi lưu
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Email = email,
                HoTen = hoTen,
                SoDienThoai = soDienThoai,
                Khoa = khoa,
                Role = "User",
                NgayTao = DateTime.Now
            };

            // 3. Lưu vào database
            _context.NguoiDungs.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Đăng ký thành công!",
                UserId = newUser.Id,
                Username = newUser.Username
            });
        }

        [HttpGet("profile/{userId}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            // Tìm trong DB
            var user = await _context.NguoiDungs.FindAsync(userId);

            // Nếu tìm không thấy thì trả về 404 (Đây chính là lỗi bạn đang gặp)
            if (user == null)
            {
                return NotFound($"Không tìm thấy người dùng có ID = {userId}");
            }

            return Ok(user);
        }

        [HttpPut("update-profile/{userId}")]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UpdateProfileRequest request)
        {
            // 1. Tìm người dùng trong DB
            var user = await _context.NguoiDungs.FindAsync(userId);
            if (user == null) return NotFound("Người dùng không tồn tại.");

            // 2. Cập nhật các thông tin được phép sửa
            user.HoTen = request.HoTen;
            user.Email = request.Email;
            user.SoDienThoai = request.SoDienThoai;
            user.Khoa = request.Khoa; // Nếu muốn cho phép User tự chuyển khoa (thực tế thường admin làm)

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { Message = "Cập nhật thông tin thành công!", User = user });
            }
            catch (Exception)
            {
                return BadRequest("Có lỗi xảy ra trong quá trình cập nhật.");
            }
        }

        // Lớp phụ để hứng dữ liệu từ Body gửi lên
        public class UpdateProfileRequest
        {
            public string HoTen { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string SoDienThoai { get; set; } = string.Empty;
            public string? Khoa { get; set; }
        }
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(int userId, string oldPassword, string newPassword)
        {
            var user = await _context.NguoiDungs.FindAsync(userId);
            if (user == null) return NotFound();

            // Kiểm tra mật khẩu cũ bằng BCrypt
            if (!BCrypt.Net.BCrypt.Verify(oldPassword, user.Password))
                return BadRequest("Mật khẩu cũ không chính xác.");

            // Lưu mật khẩu mới đã mã hóa
            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            return Ok("Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập sau.");
        }
    }
}
