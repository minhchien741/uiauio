namespace RoomScheduling.API
{
    public static class PasswordHasher
    {
        // Hàm băm mật khẩu (Dùng khi Đăng ký)
        public static string Hash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        // Hàm kiểm tra mật khẩu (Dùng khi Đăng nhập)
        public static bool Verify(string password, string hashedPassword)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }
    }
}
