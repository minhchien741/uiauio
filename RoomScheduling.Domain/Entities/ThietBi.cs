using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Domain.Entities
{
    public class ThietBi
    {
        public int Id { get; set; }
        public string Ten { get; set; } = string.Empty; // Đổi thành 'Ten' cho giống code Seeding mình viết ở trên
        public string? Loai { get; set; } // Ví dụ: Điện tử, Nội thất

        // Khóa ngoại trỏ về Phòng
        public int PhongId { get; set; }
        public virtual Phong? Phong { get; set; }

        // XÓA DÒNG NÀY: public virtual ICollection<ThietBi> ThietBis... (Sai logic)
    }
}
