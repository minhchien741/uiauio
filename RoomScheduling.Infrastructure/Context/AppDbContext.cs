using Microsoft.EntityFrameworkCore;
using RoomScheduling.Application.Interfaces;
using RoomScheduling.Domain;
using RoomScheduling.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace RoomScheduling.Infrastructure.Context;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Phong> Phongs { get; set; }
    public DbSet<YeuCauDatPhong> YeuCauDatPhongs { get; set; }
    public DbSet<NguoiDung> NguoiDungs { get; set; }
    public DbSet<ThietBi> ThietBis { get; set; }
    public DbSet<ThongBao> ThongBaos { get; set; }
    public DbSet<ThamGiaCuocHop> ThamGiaCuocHops { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        var d0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<ThamGiaCuocHop>().HasKey(x => x.Id);

        modelBuilder.Entity<Phong>(e => {
            e.HasKey(x => x.Id);
            e.Property(x => x.Ten).IsRequired().HasMaxLength(100);
        });
        modelBuilder.Entity<ThietBi>(e => {
            e.HasKey(x => x.Id);
            e.HasOne(t => t.Phong).WithMany(p => p.ThietBis).HasForeignKey(t => t.PhongId);
        });
        modelBuilder.Entity<YeuCauDatPhong>(e => {
            e.HasKey(x => x.Id);
            e.HasOne(d => d.Phong).WithMany(p => p.DanhSachYeuCau).HasForeignKey(d => d.PhongId);
            e.HasIndex(p => new { p.StartTime, p.EndTime, p.PhongId, p.TrangThai });
        });

        // ── Passwords ─────────────────────────────────────────────────────────
        // admin / Admin@123   (bcryptjs workFactor 10)
        const string adminPw = "$2b$10$RZf9vvbDMOv5FdB0HJArF.vSg..5xx5GwWCSxjy7Sp5EuikjIaj.G";
        // (other users) / User@123
        const string userPw  = "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.";

        // ── Seed: 10 users ────────────────────────────────────────────────────
        modelBuilder.Entity<NguoiDung>().HasData(
            new NguoiDung { Id=1,  Username="admin",   Password=adminPw, Email="admin@ictu.edu.vn",    Role="Admin", HoTen="Trần Quản Trị",        Khoa="CNTT",  NgayTao=d0 },
            new NguoiDung { Id=2,  Username="chien",   Password=userPw,  Email="chien@ictu.edu.vn",   Role="User",  HoTen="Nguyễn Văn Chiến",     Khoa="CNTT",  NgayTao=d0 },
            new NguoiDung { Id=3,  Username="huong",   Password=userPw,  Email="huong@ictu.edu.vn",   Role="User",  HoTen="Lê Thị Hương",          Khoa="CNTT",  NgayTao=d0 },
            new NguoiDung { Id=4,  Username="minh",    Password=userPw,  Email="minh@ictu.edu.vn",    Role="User",  HoTen="Phạm Tuấn Minh",        Khoa="KTCNS", NgayTao=d0 },
            new NguoiDung { Id=5,  Username="lan",     Password=userPw,  Email="lan@ictu.edu.vn",     Role="User",  HoTen="Ngô Thị Lan",           Khoa="KTCNS", NgayTao=d0 },
            new NguoiDung { Id=6,  Username="thanh",   Password=userPw,  Email="thanh@ictu.edu.vn",   Role="User",  HoTen="Vũ Đức Thành",          Khoa="MTTB",  NgayTao=d0 },
            new NguoiDung { Id=7,  Username="giang",   Password=userPw,  Email="giang@ictu.edu.vn",   Role="User",  HoTen="Đinh Thị Giang",        Khoa="MTTB",  NgayTao=d0 },
            new NguoiDung { Id=8,  Username="hung",    Password=userPw,  Email="hung@ictu.edu.vn",    Role="User",  HoTen="Bùi Văn Hùng",          Khoa="KTQTS", NgayTao=d0 },
            new NguoiDung { Id=9,  Username="phuong",  Password=userPw,  Email="phuong@ictu.edu.vn",  Role="User",  HoTen="Hoàng Minh Phương",     Khoa="KTQTS", NgayTao=d0 },
            new NguoiDung { Id=10, Username="quang",   Password=userPw,  Email="quang@ictu.edu.vn",   Role="User",  HoTen="Trịnh Quang Khải",      Khoa="CNTT",  NgayTao=d0 }
        );

        // ── Seed: 20 phòng ────────────────────────────────────────────────────
        modelBuilder.Entity<Phong>().HasData(
            new Phong { Id=1,  Ten="Phòng Lab IT-01",       SucChua=30, MoTaThietBi="30 máy tính, máy chiếu, điều hòa",              KhoaQuanLy="CNTT"  },
            new Phong { Id=2,  Ten="Phòng Seminar IT-02",   SucChua=20, MoTaThietBi="Màn hình LED, bảng trắng, điều hòa",            KhoaQuanLy="CNTT"  },
            new Phong { Id=3,  Ten="Phòng Thực hành IT-03", SucChua=25, MoTaThietBi="Máy tính, server thực hành, switch mạng",       KhoaQuanLy="CNTT"  },
            new Phong { Id=4,  Ten="Phòng Hội thảo IT-04",  SucChua=50, MoTaThietBi="Máy chiếu 4K, âm thanh, mic không dây",        KhoaQuanLy="CNTT"  },
            new Phong { Id=5,  Ten="Phòng Họp nhỏ IT-05",   SucChua=10, MoTaThietBi="TV 65 inch, webcam, bảng flip chart",          KhoaQuanLy="CNTT"  },
            new Phong { Id=6,  Ten="Phòng Lab KTS-01",      SucChua=25, MoTaThietBi="Bàn thực hành điện tử, máy chiếu, điều hòa",   KhoaQuanLy="KTCNS" },
            new Phong { Id=7,  Ten="Phòng Seminar KTS-02",  SucChua=20, MoTaThietBi="Màn hình tương tác, webcam hội nghị",          KhoaQuanLy="KTCNS" },
            new Phong { Id=8,  Ten="Phòng IoT KTS-03",      SucChua=15, MoTaThietBi="Kit Arduino, Raspberry Pi, sensor",            KhoaQuanLy="KTCNS" },
            new Phong { Id=9,  Ten="Phòng Hội thảo KTS-04", SucChua=40, MoTaThietBi="Âm thanh hội trường, máy chiếu, mic không dây",KhoaQuanLy="KTCNS" },
            new Phong { Id=10, Ten="Phòng Họp KTS-05",      SucChua=12, MoTaThietBi="TV, webcam, bảng trắng",                       KhoaQuanLy="KTCNS" },
            new Phong { Id=11, Ten="Phòng Studio MT-01",    SucChua=20, MoTaThietBi="Phông xanh, đèn studio, máy ảnh DSLR",         KhoaQuanLy="MTTB"  },
            new Phong { Id=12, Ten="Phòng Thiết kế MT-02",  SucChua=20, MoTaThietBi="20 PC đồ họa, bảng vẽ Wacom, máy in màu",     KhoaQuanLy="MTTB"  },
            new Phong { Id=13, Ten="Phòng Dựng phim MT-03", SucChua=15, MoTaThietBi="Workstation video, Premiere, After Effects",   KhoaQuanLy="MTTB"  },
            new Phong { Id=14, Ten="Phòng Báo chí MT-04",   SucChua=30, MoTaThietBi="Máy chiếu, bảng trắng, hệ thống trình chiếu", KhoaQuanLy="MTTB"  },
            new Phong { Id=15, Ten="Phòng Thảo luận MT-05", SucChua=10, MoTaThietBi="TV, bảng brainstorm, ghế sáng tạo",           KhoaQuanLy="MTTB"  },
            new Phong { Id=16, Ten="Phòng Hội thảo KT-01",  SucChua=80, MoTaThietBi="Âm thanh hội trường, máy chiếu 6000lm",       KhoaQuanLy="KTQTS" },
            new Phong { Id=17, Ten="Phòng Họp KT-02",        SucChua=20, MoTaThietBi="Màn hình TV, webcam 4K, bảng flip chart",     KhoaQuanLy="KTQTS" },
            new Phong { Id=18, Ten="Phòng Lab KT-03",         SucChua=30, MoTaThietBi="30 máy tính, phần mềm kế toán, Excel",       KhoaQuanLy="KTQTS" },
            new Phong { Id=19, Ten="Phòng Thảo luận KT-04",  SucChua=15, MoTaThietBi="Bảng trắng, màn chiếu, wifi tốc độ cao",     KhoaQuanLy="KTQTS" },
            new Phong { Id=20, Ten="Phòng VIP KT-05",         SucChua=8,  MoTaThietBi="Bàn họp executive, TV 85 inch, hội nghị xa", KhoaQuanLy="KTQTS" }
        );

        // ── Seed: 60 YeuCauDatPhong (10 users × 6 lịch) ─────────────────────
        var B = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<YeuCauDatPhong>().HasData(
            // Chiến (Id=2) / CNTT
            new YeuCauDatPhong { Id=1,  PhongId=1,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(1).AddHours(8),   EndTime=B.AddDays(1).AddHours(10),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=2,  PhongId=3,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(2).AddHours(13),  EndTime=B.AddDays(2).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=3,  PhongId=5,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(5).AddHours(9),   EndTime=B.AddDays(5).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=4,  PhongId=2,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(8).AddHours(14),  EndTime=B.AddDays(8).AddHours(16),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=5,  PhongId=1,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(10).AddHours(7),  EndTime=B.AddDays(10).AddHours(9),  TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=6,  PhongId=4,  NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(14).AddHours(9),  EndTime=B.AddDays(14).AddHours(11), TrangThai=TrangThaiYeuCau.ChoDuyet },
            // Hương (Id=3) / CNTT
            new YeuCauDatPhong { Id=7,  PhongId=2,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(1).AddHours(10),  EndTime=B.AddDays(1).AddHours(12),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=8,  PhongId=4,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(3).AddHours(8),   EndTime=B.AddDays(3).AddHours(10),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=9,  PhongId=5,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(6).AddHours(14),  EndTime=B.AddDays(6).AddHours(16),  TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=10, PhongId=1,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(9).AddHours(8),   EndTime=B.AddDays(9).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=11, PhongId=3,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(12).AddHours(13), EndTime=B.AddDays(12).AddHours(15), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=12, PhongId=2,  NguoiDat="Lê Thị Hương",      StartTime=B.AddDays(15).AddHours(9),  EndTime=B.AddDays(15).AddHours(11), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Minh (Id=4) / KTCNS
            new YeuCauDatPhong { Id=13, PhongId=6,  NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(2).AddHours(8),   EndTime=B.AddDays(2).AddHours(10),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=14, PhongId=8,  NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(4).AddHours(13),  EndTime=B.AddDays(4).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=15, PhongId=9,  NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(6).AddHours(8),   EndTime=B.AddDays(6).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=16, PhongId=7,  NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(8).AddHours(14),  EndTime=B.AddDays(8).AddHours(16),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=17, PhongId=6,  NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(11).AddHours(8),  EndTime=B.AddDays(11).AddHours(10), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=18, PhongId=10, NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(13).AddHours(9),  EndTime=B.AddDays(13).AddHours(10), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Lan (Id=5) / KTCNS
            new YeuCauDatPhong { Id=19, PhongId=7,  NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(1).AddHours(13),  EndTime=B.AddDays(1).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=20, PhongId=8,  NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(3).AddHours(8),   EndTime=B.AddDays(3).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=21, PhongId=9,  NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(7).AddHours(9),   EndTime=B.AddDays(7).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=22, PhongId=6,  NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(10).AddHours(13), EndTime=B.AddDays(10).AddHours(15), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=23, PhongId=9,  NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(12).AddHours(8),  EndTime=B.AddDays(12).AddHours(10), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=24, PhongId=10, NguoiDat="Ngô Thị Lan",      StartTime=B.AddDays(15).AddHours(14), EndTime=B.AddDays(15).AddHours(16), TrangThai=TrangThaiYeuCau.ChoDuyet },
            // Thành (Id=6) / MTTB
            new YeuCauDatPhong { Id=25, PhongId=11, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(2).AddHours(9),   EndTime=B.AddDays(2).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=26, PhongId=12, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(4).AddHours(8),   EndTime=B.AddDays(4).AddHours(10),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=27, PhongId=13, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(5).AddHours(13),  EndTime=B.AddDays(5).AddHours(15),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=28, PhongId=14, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(8).AddHours(9),   EndTime=B.AddDays(8).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=29, PhongId=11, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(11).AddHours(14), EndTime=B.AddDays(11).AddHours(16), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=30, PhongId=12, NguoiDat="Vũ Đức Thành",    StartTime=B.AddDays(14).AddHours(8),  EndTime=B.AddDays(14).AddHours(10), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Giang (Id=7) / MTTB
            new YeuCauDatPhong { Id=31, PhongId=13, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(1).AddHours(14),  EndTime=B.AddDays(1).AddHours(16),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=32, PhongId=11, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(3).AddHours(13),  EndTime=B.AddDays(3).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=33, PhongId=15, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(6).AddHours(9),   EndTime=B.AddDays(6).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=34, PhongId=12, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(9).AddHours(13),  EndTime=B.AddDays(9).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=35, PhongId=14, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(12).AddHours(9),  EndTime=B.AddDays(12).AddHours(11), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=36, PhongId=13, NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(15).AddHours(13), EndTime=B.AddDays(15).AddHours(15), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Hùng (Id=8) / KTQTS
            new YeuCauDatPhong { Id=37, PhongId=17, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(2).AddHours(14),  EndTime=B.AddDays(2).AddHours(16),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=38, PhongId=18, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(4).AddHours(13),  EndTime=B.AddDays(4).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=39, PhongId=16, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(7).AddHours(8),   EndTime=B.AddDays(7).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=40, PhongId=20, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(9).AddHours(9),   EndTime=B.AddDays(9).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=41, PhongId=19, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(11).AddHours(13), EndTime=B.AddDays(11).AddHours(15), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=42, PhongId=18, NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(14).AddHours(13), EndTime=B.AddDays(14).AddHours(15), TrangThai=TrangThaiYeuCau.TuChoi   },
            // Phương (Id=9) / KTQTS
            new YeuCauDatPhong { Id=43, PhongId=16, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(1).AddHours(8),   EndTime=B.AddDays(1).AddHours(10),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=44, PhongId=17, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(4).AddHours(9),   EndTime=B.AddDays(4).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=45, PhongId=19, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(6).AddHours(13),  EndTime=B.AddDays(6).AddHours(15),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=46, PhongId=18, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(10).AddHours(8),  EndTime=B.AddDays(10).AddHours(10), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=47, PhongId=20, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(13).AddHours(14), EndTime=B.AddDays(13).AddHours(16), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=48, PhongId=17, NguoiDat="Hoàng Minh Phương",StartTime=B.AddDays(15).AddHours(9),  EndTime=B.AddDays(15).AddHours(11), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Quang (Id=10) / CNTT
            new YeuCauDatPhong { Id=49, PhongId=1,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(2).AddHours(13),  EndTime=B.AddDays(2).AddHours(15),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=50, PhongId=4,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(5).AddHours(9),   EndTime=B.AddDays(5).AddHours(11),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=51, PhongId=3,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(7).AddHours(8),   EndTime=B.AddDays(7).AddHours(10),  TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=52, PhongId=2,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(9).AddHours(14),  EndTime=B.AddDays(9).AddHours(16),  TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=53, PhongId=5,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(12).AddHours(9),  EndTime=B.AddDays(12).AddHours(10), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=54, PhongId=4,  NguoiDat="Trịnh Quang Khải", StartTime=B.AddDays(15).AddHours(13), EndTime=B.AddDays(15).AddHours(15), TrangThai=TrangThaiYeuCau.DaDuyet  },
            // Cross-department bookings — 6 thêm
            new YeuCauDatPhong { Id=55, PhongId=16, NguoiDat="Nguyễn Văn Chiến", StartTime=B.AddDays(16).AddHours(9),  EndTime=B.AddDays(16).AddHours(11), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=56, PhongId=12, NguoiDat="Phạm Tuấn Minh",   StartTime=B.AddDays(17).AddHours(13), EndTime=B.AddDays(17).AddHours(15), TrangThai=TrangThaiYeuCau.ChoDuyet },
            new YeuCauDatPhong { Id=57, PhongId=1,  NguoiDat="Bùi Văn Hùng",    StartTime=B.AddDays(18).AddHours(8),  EndTime=B.AddDays(18).AddHours(10), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=58, PhongId=9,  NguoiDat="Đinh Thị Giang",  StartTime=B.AddDays(19).AddHours(13), EndTime=B.AddDays(19).AddHours(15), TrangThai=TrangThaiYeuCau.TuChoi   },
            new YeuCauDatPhong { Id=59, PhongId=4,  NguoiDat="Ngô Thị Lan",     StartTime=B.AddDays(20).AddHours(9),  EndTime=B.AddDays(20).AddHours(11), TrangThai=TrangThaiYeuCau.DaDuyet  },
            new YeuCauDatPhong { Id=60, PhongId=20, NguoiDat="Lê Thị Hương",     StartTime=B.AddDays(21).AddHours(14), EndTime=B.AddDays(21).AddHours(16), TrangThai=TrangThaiYeuCau.ChoDuyet }
        );
    }

    public async Task SeedDataAsync() { await Task.CompletedTask; }
}