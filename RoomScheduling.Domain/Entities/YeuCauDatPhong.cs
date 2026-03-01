using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Domain.Entities;

public enum TrangThaiYeuCau { ChoDuyet, DaDuyet, TuChoi }

public class YeuCauDatPhong
{
    public int Id { get; set; }
    public int PhongId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string NguoiDat { get; set; } = string.Empty;
    public TrangThaiYeuCau TrangThai { get; set; } = TrangThaiYeuCau.ChoDuyet;
    public bool IsRecurring { get; set; } = false;
    public string? RecurringGroupId { get; set; } // Để xóa cả chuỗi lịch nếu cần
    public bool IsCheckedIn { get; set; } = false;
    public DateTime? ActualStartTime { get; set; } // Ghi nhận lúc họ bấm nút check-in
    // Thuộc tính điều hướng để EF Core hiểu liên kết 
    public Phong? Phong { get; set; }
    public DateTime? ActualEndTime { get; set; } // Thời gian trả phòng thực tế
    public string? GhiChuAdmin { get; set; }      // Lý do từ chối hoặc ghi chú khi duyệt
}

public class ThamGiaCuocHop
{
    public int Id { get; set; }
    public int YeuCauDatPhongId { get; set; }
    public int NguoiDungId { get; set; }
    public bool LaChuTri { get; set; } = false; // Phân quyền trong cuộc họp
}