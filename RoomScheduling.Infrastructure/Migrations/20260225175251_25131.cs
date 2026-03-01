using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RoomScheduling.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class _25131 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NguoiDungs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HoTen = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SoDienThoai = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Khoa = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NgayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguoiDungs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Phongs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ten = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SucChua = table.Column<int>(type: "int", nullable: false),
                    MoTaThietBi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KhoaQuanLy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Phongs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ThamGiaCuocHops",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    YeuCauDatPhongId = table.Column<int>(type: "int", nullable: false),
                    NguoiDungId = table.Column<int>(type: "int", nullable: false),
                    LaChuTri = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThamGiaCuocHops", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ThongBaos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NoiDung = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NgayGui = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DaXem = table.Column<bool>(type: "bit", nullable: false),
                    NguoiNhanId = table.Column<int>(type: "int", nullable: false),
                    NguoiNhan = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThongBaos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ThietBis",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ten = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Loai = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhongId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThietBis", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ThietBis_Phongs_PhongId",
                        column: x => x.PhongId,
                        principalTable: "Phongs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "YeuCauDatPhongs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PhongId = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NguoiDat = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrangThai = table.Column<int>(type: "int", nullable: false),
                    IsRecurring = table.Column<bool>(type: "bit", nullable: false),
                    RecurringGroupId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCheckedIn = table.Column<bool>(type: "bit", nullable: false),
                    ActualStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    GhiChuAdmin = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_YeuCauDatPhongs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_YeuCauDatPhongs_Phongs_PhongId",
                        column: x => x.PhongId,
                        principalTable: "Phongs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "NguoiDungs",
                columns: new[] { "Id", "Email", "HoTen", "Khoa", "NgayTao", "Password", "Role", "SoDienThoai", "Username" },
                values: new object[,]
                {
                    { 1, "admin@ictu.edu.vn", "Trần Quản Trị", "CNTT", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$RZf9vvbDMOv5FdB0HJArF.vSg..5xx5GwWCSxjy7Sp5EuikjIaj.G", "Admin", "", "admin" },
                    { 2, "chien@ictu.edu.vn", "Nguyễn Văn Chiến", "CNTT", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "chien" },
                    { 3, "huong@ictu.edu.vn", "Lê Thị Hương", "CNTT", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "huong" },
                    { 4, "minh@ictu.edu.vn", "Phạm Tuấn Minh", "KTCNS", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "minh" },
                    { 5, "lan@ictu.edu.vn", "Ngô Thị Lan", "KTCNS", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "lan" },
                    { 6, "thanh@ictu.edu.vn", "Vũ Đức Thành", "MTTB", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "thanh" },
                    { 7, "giang@ictu.edu.vn", "Đinh Thị Giang", "MTTB", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "giang" },
                    { 8, "hung@ictu.edu.vn", "Bùi Văn Hùng", "KTQTS", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "hung" },
                    { 9, "phuong@ictu.edu.vn", "Hoàng Minh Phương", "KTQTS", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "phuong" },
                    { 10, "quang@ictu.edu.vn", "Trịnh Quang Khải", "CNTT", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2b$10$Xg1o3NUrrVa99TBpgtoqhu4HCQezo.qzJh2opo/RBaCH6z7n4xbV.", "User", "", "quang" }
                });

            migrationBuilder.InsertData(
                table: "Phongs",
                columns: new[] { "Id", "KhoaQuanLy", "MoTaThietBi", "SucChua", "Ten" },
                values: new object[,]
                {
                    { 1, "CNTT", "30 máy tính, máy chiếu, điều hòa", 30, "Phòng Lab IT-01" },
                    { 2, "CNTT", "Màn hình LED, bảng trắng, điều hòa", 20, "Phòng Seminar IT-02" },
                    { 3, "CNTT", "Máy tính, server thực hành, switch mạng", 25, "Phòng Thực hành IT-03" },
                    { 4, "CNTT", "Máy chiếu 4K, âm thanh, mic không dây", 50, "Phòng Hội thảo IT-04" },
                    { 5, "CNTT", "TV 65 inch, webcam, bảng flip chart", 10, "Phòng Họp nhỏ IT-05" },
                    { 6, "KTCNS", "Bàn thực hành điện tử, máy chiếu, điều hòa", 25, "Phòng Lab KTS-01" },
                    { 7, "KTCNS", "Màn hình tương tác, webcam hội nghị", 20, "Phòng Seminar KTS-02" },
                    { 8, "KTCNS", "Kit Arduino, Raspberry Pi, sensor", 15, "Phòng IoT KTS-03" },
                    { 9, "KTCNS", "Âm thanh hội trường, máy chiếu, mic không dây", 40, "Phòng Hội thảo KTS-04" },
                    { 10, "KTCNS", "TV, webcam, bảng trắng", 12, "Phòng Họp KTS-05" },
                    { 11, "MTTB", "Phông xanh, đèn studio, máy ảnh DSLR", 20, "Phòng Studio MT-01" },
                    { 12, "MTTB", "20 PC đồ họa, bảng vẽ Wacom, máy in màu", 20, "Phòng Thiết kế MT-02" },
                    { 13, "MTTB", "Workstation video, Premiere, After Effects", 15, "Phòng Dựng phim MT-03" },
                    { 14, "MTTB", "Máy chiếu, bảng trắng, hệ thống trình chiếu", 30, "Phòng Báo chí MT-04" },
                    { 15, "MTTB", "TV, bảng brainstorm, ghế sáng tạo", 10, "Phòng Thảo luận MT-05" },
                    { 16, "KTQTS", "Âm thanh hội trường, máy chiếu 6000lm", 80, "Phòng Hội thảo KT-01" },
                    { 17, "KTQTS", "Màn hình TV, webcam 4K, bảng flip chart", 20, "Phòng Họp KT-02" },
                    { 18, "KTQTS", "30 máy tính, phần mềm kế toán, Excel", 30, "Phòng Lab KT-03" },
                    { 19, "KTQTS", "Bảng trắng, màn chiếu, wifi tốc độ cao", 15, "Phòng Thảo luận KT-04" },
                    { 20, "KTQTS", "Bàn họp executive, TV 85 inch, hội nghị xa", 8, "Phòng VIP KT-05" }
                });

            migrationBuilder.InsertData(
                table: "YeuCauDatPhongs",
                columns: new[] { "Id", "ActualEndTime", "ActualStartTime", "EndTime", "GhiChuAdmin", "IsCheckedIn", "IsRecurring", "NguoiDat", "PhongId", "RecurringGroupId", "StartTime", "TrangThai" },
                values: new object[,]
                {
                    { 1, null, null, new DateTime(2026, 2, 11, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 1, null, new DateTime(2026, 2, 11, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 2, null, null, new DateTime(2026, 2, 12, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 3, null, new DateTime(2026, 2, 12, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 3, null, null, new DateTime(2026, 2, 15, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 5, null, new DateTime(2026, 2, 15, 9, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 4, null, null, new DateTime(2026, 2, 18, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 2, null, new DateTime(2026, 2, 18, 14, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 5, null, null, new DateTime(2026, 2, 20, 9, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 1, null, new DateTime(2026, 2, 20, 7, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 6, null, null, new DateTime(2026, 2, 24, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 4, null, new DateTime(2026, 2, 24, 9, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 7, null, null, new DateTime(2026, 2, 11, 12, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 2, null, new DateTime(2026, 2, 11, 10, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 8, null, null, new DateTime(2026, 2, 13, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 4, null, new DateTime(2026, 2, 13, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 9, null, null, new DateTime(2026, 2, 16, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 5, null, new DateTime(2026, 2, 16, 14, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 10, null, null, new DateTime(2026, 2, 19, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 1, null, new DateTime(2026, 2, 19, 8, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 11, null, null, new DateTime(2026, 2, 22, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 3, null, new DateTime(2026, 2, 22, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 12, null, null, new DateTime(2026, 2, 25, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 2, null, new DateTime(2026, 2, 25, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 13, null, null, new DateTime(2026, 2, 12, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 6, null, new DateTime(2026, 2, 12, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 14, null, null, new DateTime(2026, 2, 14, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 8, null, new DateTime(2026, 2, 14, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 15, null, null, new DateTime(2026, 2, 16, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 9, null, new DateTime(2026, 2, 16, 8, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 16, null, null, new DateTime(2026, 2, 18, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 7, null, new DateTime(2026, 2, 18, 14, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 17, null, null, new DateTime(2026, 2, 21, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 6, null, new DateTime(2026, 2, 21, 8, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 18, null, null, new DateTime(2026, 2, 23, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 10, null, new DateTime(2026, 2, 23, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 19, null, null, new DateTime(2026, 2, 11, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 7, null, new DateTime(2026, 2, 11, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 20, null, null, new DateTime(2026, 2, 13, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 8, null, new DateTime(2026, 2, 13, 8, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 21, null, null, new DateTime(2026, 2, 17, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 9, null, new DateTime(2026, 2, 17, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 22, null, null, new DateTime(2026, 2, 20, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 6, null, new DateTime(2026, 2, 20, 13, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 23, null, null, new DateTime(2026, 2, 22, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 9, null, new DateTime(2026, 2, 22, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 24, null, null, new DateTime(2026, 2, 25, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 10, null, new DateTime(2026, 2, 25, 14, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 25, null, null, new DateTime(2026, 2, 12, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 11, null, new DateTime(2026, 2, 12, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 26, null, null, new DateTime(2026, 2, 14, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 12, null, new DateTime(2026, 2, 14, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 27, null, null, new DateTime(2026, 2, 15, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 13, null, new DateTime(2026, 2, 15, 13, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 28, null, null, new DateTime(2026, 2, 18, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 14, null, new DateTime(2026, 2, 18, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 29, null, null, new DateTime(2026, 2, 21, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 11, null, new DateTime(2026, 2, 21, 14, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 30, null, null, new DateTime(2026, 2, 24, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Vũ Đức Thành", 12, null, new DateTime(2026, 2, 24, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 31, null, null, new DateTime(2026, 2, 11, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 13, null, new DateTime(2026, 2, 11, 14, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 32, null, null, new DateTime(2026, 2, 13, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 11, null, new DateTime(2026, 2, 13, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 33, null, null, new DateTime(2026, 2, 16, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 15, null, new DateTime(2026, 2, 16, 9, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 34, null, null, new DateTime(2026, 2, 19, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 12, null, new DateTime(2026, 2, 19, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 35, null, null, new DateTime(2026, 2, 22, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 14, null, new DateTime(2026, 2, 22, 9, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 36, null, null, new DateTime(2026, 2, 25, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 13, null, new DateTime(2026, 2, 25, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 37, null, null, new DateTime(2026, 2, 12, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 17, null, new DateTime(2026, 2, 12, 14, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 38, null, null, new DateTime(2026, 2, 14, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 18, null, new DateTime(2026, 2, 14, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 39, null, null, new DateTime(2026, 2, 17, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 16, null, new DateTime(2026, 2, 17, 8, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 40, null, null, new DateTime(2026, 2, 19, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 20, null, new DateTime(2026, 2, 19, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 41, null, null, new DateTime(2026, 2, 21, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 19, null, new DateTime(2026, 2, 21, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 42, null, null, new DateTime(2026, 2, 24, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 18, null, new DateTime(2026, 2, 24, 13, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 43, null, null, new DateTime(2026, 2, 11, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 16, null, new DateTime(2026, 2, 11, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 44, null, null, new DateTime(2026, 2, 14, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 17, null, new DateTime(2026, 2, 14, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 45, null, null, new DateTime(2026, 2, 16, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 19, null, new DateTime(2026, 2, 16, 13, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 46, null, null, new DateTime(2026, 2, 20, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 18, null, new DateTime(2026, 2, 20, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 47, null, null, new DateTime(2026, 2, 23, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 20, null, new DateTime(2026, 2, 23, 14, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 48, null, null, new DateTime(2026, 2, 25, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Hoàng Minh Phương", 17, null, new DateTime(2026, 2, 25, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 49, null, null, new DateTime(2026, 2, 12, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 1, null, new DateTime(2026, 2, 12, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 50, null, null, new DateTime(2026, 2, 15, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 4, null, new DateTime(2026, 2, 15, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 51, null, null, new DateTime(2026, 2, 17, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 3, null, new DateTime(2026, 2, 17, 8, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 52, null, null, new DateTime(2026, 2, 19, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 2, null, new DateTime(2026, 2, 19, 14, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 53, null, null, new DateTime(2026, 2, 22, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 5, null, new DateTime(2026, 2, 22, 9, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 54, null, null, new DateTime(2026, 2, 25, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Trịnh Quang Khải", 4, null, new DateTime(2026, 2, 25, 13, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 55, null, null, new DateTime(2026, 2, 26, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Nguyễn Văn Chiến", 16, null, new DateTime(2026, 2, 26, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 56, null, null, new DateTime(2026, 2, 27, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Phạm Tuấn Minh", 12, null, new DateTime(2026, 2, 27, 13, 0, 0, 0, DateTimeKind.Utc), 0 },
                    { 57, null, null, new DateTime(2026, 2, 28, 10, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Bùi Văn Hùng", 1, null, new DateTime(2026, 2, 28, 8, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 58, null, null, new DateTime(2026, 3, 1, 15, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Đinh Thị Giang", 9, null, new DateTime(2026, 3, 1, 13, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 59, null, null, new DateTime(2026, 3, 2, 11, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Ngô Thị Lan", 4, null, new DateTime(2026, 3, 2, 9, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { 60, null, null, new DateTime(2026, 3, 3, 16, 0, 0, 0, DateTimeKind.Utc), null, false, false, "Lê Thị Hương", 20, null, new DateTime(2026, 3, 3, 14, 0, 0, 0, DateTimeKind.Utc), 0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ThietBis_PhongId",
                table: "ThietBis",
                column: "PhongId");

            migrationBuilder.CreateIndex(
                name: "IX_YeuCauDatPhongs_PhongId",
                table: "YeuCauDatPhongs",
                column: "PhongId");

            migrationBuilder.CreateIndex(
                name: "IX_YeuCauDatPhongs_StartTime_EndTime_PhongId_TrangThai",
                table: "YeuCauDatPhongs",
                columns: new[] { "StartTime", "EndTime", "PhongId", "TrangThai" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NguoiDungs");

            migrationBuilder.DropTable(
                name: "ThamGiaCuocHops");

            migrationBuilder.DropTable(
                name: "ThietBis");

            migrationBuilder.DropTable(
                name: "ThongBaos");

            migrationBuilder.DropTable(
                name: "YeuCauDatPhongs");

            migrationBuilder.DropTable(
                name: "Phongs");
        }
    }
}
