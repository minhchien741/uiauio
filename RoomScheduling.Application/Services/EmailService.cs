using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Resend;

namespace RoomScheduling.Application.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        
        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task GuiEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var apiKey = _config["EmailSettings:ApiKey"]; 
                var from = _config["EmailSettings:FromEmail"] ?? "onboarding@resend.dev";

                if (string.IsNullOrEmpty(apiKey))
                {
                    throw new Exception("Thieu Resend API Key trong appsettings.json (EmailSettings:ApiKey)");
                }

                IResend resend = ResendClient.Create(apiKey);

                var message = new EmailMessage()
                {
                    From = from,
                    To = toEmail,
                    Subject = subject,
                    HtmlBody = body
                };

                var resp = await resend.EmailSendAsync(message);
            }
            catch { /* Ghi log lỗi nếu không gửi được */ }
        }
    }
}
