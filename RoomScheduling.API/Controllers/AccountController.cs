using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomScheduling.Domain.Entities;
using RoomScheduling.Infrastructure.Context;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
            if (await _context.NguoiDungs.AnyAsync(u => u.Username == username))
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            var newUser = new NguoiDung
            {
                Username = username,
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Email = email,
                HoTen = hoTen,
                SoDienThoai = soDienThoai,
                Khoa = khoa,
                Role = "User",
                NgayTao = DateTime.Now
            };

            _context.NguoiDungs.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đăng ký thành công!",
                userId = newUser.Id,
                username = newUser.Username
            });
        }

        [HttpGet("profile/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var user = await _context.NguoiDungs.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = $"Không tìm thấy người dùng có ID = {userId}" });

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                hoTen = user.HoTen,
                soDienThoai = user.SoDienThoai,
                khoa = user.Khoa,
                role = user.Role
            });
        }

        [HttpPut("update-profile/{userId}")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(int userId, [FromBody] UpdateProfileRequest request)
        {
            var user = await _context.NguoiDungs.FindAsync(userId);
            if (user == null) return NotFound(new { message = "Người dùng không tồn tại." });

            user.HoTen = request.HoTen;
            user.Email = request.Email;
            user.SoDienThoai = request.SoDienThoai;
            user.Khoa = request.Khoa;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Cập nhật thông tin thành công!" });
            }
            catch (Exception)
            {
                return BadRequest(new { message = "Có lỗi xảy ra trong quá trình cập nhật." });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(int userId, string oldPassword, string newPassword)
        {
            var user = await _context.NguoiDungs.FindAsync(userId);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(oldPassword, user.Password))
                return BadRequest(new { message = "Mật khẩu cũ không chính xác." });

            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập sau." });
        }

        public class UpdateProfileRequest
        {
            public string HoTen { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string SoDienThoai { get; set; } = string.Empty;
            public string? Khoa { get; set; }
        }
    }
}
