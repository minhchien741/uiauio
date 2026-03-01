using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Domain.Entities;

public class Phong
{
    
        public int Id { get; set; }
        public string Ten { get; set; } = string.Empty;
        public int SucChua { get; set; }

        // Bạn có thể giữ MoTaThietBi làm ghi chú nhanh, 
        // nhưng thực thể ThietBi bên dưới mới là cái quan trọng cho PI 2.1
        public string? MoTaThietBi { get; set; } = "Máy chiếu, Điều hòa, Bảng viết";
        public string? KhoaQuanLy { get; set; } // Ví dụ: "CNTT", "TruyenThong", "CoBan"

    // Quan hệ: Một phòng có nhiều yêu cầu đặt lịch
        public virtual ICollection<YeuCauDatPhong> DanhSachYeuCau { get; set; } = new List<YeuCauDatPhong>();

        // QUAN TRỌNG: Thêm dòng này để kết nối với bảng ThietBi
        public virtual ICollection<ThietBi> ThietBis { get; set; } = new List<ThietBi>();
    

}

