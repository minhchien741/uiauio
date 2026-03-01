using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Net.Mail;

namespace RoomScheduling.Application.Services
{
    public class EmailService
    {
        public async Task GuiEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                // Cấu hình Mailtrap (Thay thông số của bạn vào đây)
                var client = new SmtpClient("sandbox.smtp.mailtrap.io", 2525)
                {
                    Credentials = new NetworkCredential("id_cua_ban", "pass_cua_ban"),
                    EnableSsl = true
                };
                var mailMessage = new MailMessage("noreply@roomsystem.com", toEmail, subject, body);
                await client.SendMailAsync(mailMessage);
            }
            catch { /* Ghi log lỗi nếu không gửi được */ }
        }
    }
}
