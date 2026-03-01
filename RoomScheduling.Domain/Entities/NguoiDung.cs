using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Domain.Entities;

public class NguoiDung
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public string SoDienThoai { get; set; } = string.Empty; // Thông tin cá nhân
    public string Role { get; set; } = "User"; // Admin, Manager, User
    public string? Khoa { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.Now;
}