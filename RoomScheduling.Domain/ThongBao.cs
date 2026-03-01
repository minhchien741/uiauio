using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Domain
{
    public class ThongBao
    {
        public int Id { get; set; }
        public string NoiDung { get; set; } = string.Empty;
        public DateTime NgayGui { get; set; } = DateTime.Now;
        public bool DaXem { get; set; } = false;
        public int NguoiNhanId { get; set; }

        // Thêm lại dòng này để fix lỗi NguoiNhan
        public string NguoiNhan { get; set; } = string.Empty;
    }

}
