# Danh Sách Yêu Cầu Hệ Thống Đặt Phòng — ICTU
> Tài liệu được trích xuất trực tiếp từ mã nguồn (`PhongController.cs`, `AccountController.cs`, `AppDbContext.cs`, `server.ts`, các trang React).

---

## I. Yêu Cầu Chức Năng (Functional Requirements — FR)

### 1. Phân hệ Quản lý Tài khoản và Xác thực

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-01 | Hệ thống cho phép người dùng **đăng ký** tài khoản mới với các trường: tên đăng nhập, mật khẩu, email, họ tên, số điện thoại, khoa. | `AccountController.Register()` |
| FR-02 | Hệ thống phải **kiểm tra trùng tên đăng nhập** khi đăng ký và từ chối nếu đã tồn tại. | `AnyAsync(u => u.Username == username)` |
| FR-03 | Hệ thống cho phép người dùng **đăng nhập** bằng tên đăng nhập và mật khẩu. Tài khoản mới mặc định là role `User`. | `PhongController.Login()` + `BCrypt.Verify()` |
| FR-04 | Hệ thống cho phép người dùng **xem thông tin cá nhân** theo userId. | `AccountController.GetProfile(userId)` |
| FR-05 | Hệ thống cho phép người dùng **cập nhật thông tin cá nhân**: họ tên, email, số điện thoại, khoa. | `AccountController.UpdateProfile(userId)` |
| FR-06 | Hệ thống cho phép người dùng **đổi mật khẩu** (yêu cầu nhập đúng mật khẩu cũ, xác thực bằng BCrypt). | `AccountController.ChangePassword()` |

---

### 2. Phân hệ Quản lý Phòng & Thiết bị

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-07 | Hệ thống lưu trữ thông tin phòng: tên, sức chứa, mô tả thiết bị, khoa quản lý. | Entity `Phong`, bảng `Phongs` |
| FR-08 | Mỗi phòng thuộc **một khoa quản lý** cụ thể (CNTT, KTCNS, MTTB, KTQTS). | `Phong.KhoaQuanLy` — Seed 20 phòng |
| FR-09 | Hệ thống cho phép **xem danh sách thiết bị** của từng phòng. | `GET /api/Phong/{id}/thiet-bi` |
| FR-10 | Mỗi thiết bị thuộc về một phòng cụ thể (quan hệ 1-N giữa Phòng và Thiết bị). | `ThietBi.PhongId` — FK trong AppDbContext |
| FR-11 | Admin có thể **thêm phòng mới** vào hệ thống. | `POST /api/Phong` — `TaoPhong()` |
| FR-12 | Admin có thể **chỉnh sửa thông tin phòng** hiện có. | `PUT /api/Phong/{id}` — `CapNhatPhong()` |
| FR-13 | Admin có thể **xóa phòng** khỏi hệ thống. | `DELETE /api/Phong/{id}` — `XoaPhong()` |

---

### 3. Phân hệ Đặt phòng & Kiểm soát xung đột

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-14 | Hệ thống cho phép người dùng **đặt phòng** theo khung giờ (StartTime → EndTime). | `POST /api/Phong/dat-phong` |
| FR-15 | **Phân quyền theo khoa**: chỉ người dùng thuộc khoa quản lý phòng mới được đặt phòng đó. | `if (phong.KhoaQuanLy != user.Khoa) return BadRequest(...)` |
| FR-16 | **Ràng buộc thời gian đặt trước**: yêu cầu phải đặt phòng trước ít nhất 2 tiếng. | `if (start < DateTime.Now.AddHours(2)) return BadRequest(...)` |
| FR-17 | **Hạn mức sử dụng 10 giờ/tuần** mỗi người dùng. Hệ thống từ chối nếu vượt quá 600 phút/tuần. | `if (totalMinutes + newMinutes > 600) return BadRequest(...)` |
| FR-18 | **Kiểm tra trùng lịch** tự động trước khi xác nhận đặt phòng. | `LichService.KiemTraTrungLich(phongId, start, end)` |
| FR-19 | Nếu phòng đã bận, hệ thống **gợi ý tối đa 3 phòng trống** có sức chứa tương đương. | `LichService.TimPhongTrongGoiY(suc, start, end)` |
| FR-20 | Người đặt phòng được tự động gán làm **Chủ trì (Host)** cuộc họp. | `ThamGiaCuocHop { LaChuTri = true }` |
| FR-21 | Người dùng có thể **mời thành viên tham gia** cuộc họp khi đặt phòng. | `invitedUserIds` — thêm vào `ThamGiaCuocHops` |
| FR-22 | Hệ thống hỗ trợ **đặt lịch định kỳ** (recurring): tự động tạo N lịch lặp qua các tuần. | `POST /api/Phong/dat-lich-dinh-ky` — tham số `soTuan` |
| FR-23 | Người dùng/Admin có thể **hủy lịch đặt phòng**. Chỉ Admin hoặc chính người đặt mới được hủy. | `DELETE /api/Phong/huy-lich/{bookingId}/{userId}` |
| FR-24 | Hệ thống cho phép **tìm kiếm nâng cao** phòng trống theo: sức chứa tối thiểu, từ khóa thiết bị, khung thời gian. | `GET /api/Phong/tim-kiem-nang-cao?minCapacity=&keyword=&start=&end=` |
| FR-25 | Hệ thống cho phép **tra cứu phòng trống** đơn giản theo khoảng thời gian. | `GET /api/Phong/tra-cuu-trong?start=&end=` |
| FR-26 | Hệ thống cung cấp **gợi ý AI Heuristic** top 3 phòng phù hợp nhất (chấm điểm theo khoa, sức chứa, từ khóa). | `GET /api/Phong/goi-y-ai` — `SuggestRooms()` |

---

### 4. Phân hệ Phê duyệt & Quản trị (Admin)

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-27 | Admin có quyền **phê duyệt hoặc từ chối** yêu cầu đặt phòng. | `PATCH /api/Phong/admin/phe-duyet/{id}` |
| FR-28 | Admin có thể ghi **lý do từ chối** kèm thông báo cho người dùng. | `GhiChuAdmin` — tham số `ghiChu` |
| FR-29 | Hệ thống kiểm tra vai trò Admin trước khi thực hiện phê duyệt, trả về `403 Forbidden` nếu không hợp lệ. | `if (admin?.Role != "Admin") return Forbid(...)` |
| FR-30 | Hệ thống cho phép **trả phòng sớm (check-out)**: ghi nhận thời điểm `ActualEndTime` thực tế. | `POST /api/Phong/tra-phong/{id}` — `TraPhong()` |
| FR-31 | Hệ thống cung cấp **thống kê báo cáo**: tổng số phòng, tổng yêu cầu, phân loại theo trạng thái (ChoDuyet/DaDuyet/TuChoi). | `GET /api/Phong/thong-ke` — `GetThongKe()` |

---

### 5. Phân hệ Thông báo

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-32 | Hệ thống **gửi thông báo cho Admin** (emoji 🔔) khi có yêu cầu đặt phòng mới. | `ThongBao { NguoiNhanId = 1 }` trong `DatPhong()` |
| FR-33 | Hệ thống **gửi thông báo cho người dùng** khi yêu cầu được duyệt (✅) hoặc từ chối (❌) kèm thông tin thời gian và lý do. | `ThongBao { NguoiNhanId = user.Id }` trong `PheDuyet()` |
| FR-34 | Hệ thống **gửi thông báo khi hủy lịch** (🗑️) cho người đặt và Admin. | `ThongBao` trong `HuyLich()` |
| FR-35 | Hệ thống **gửi thông báo khi trả phòng sớm** (🏁) cho người đặt. | `ThongBao` trong `TraPhong()` |
| FR-36 | Thông báo được lưu trong DB với trạng thái **Đã đọc / Chưa đọc**. | `ThongBao.DaDoc` — localStorage `readNotifications` |
| FR-37 | Người dùng có thể **xem danh sách thông báo** của mình, sắp xếp theo thời gian mới nhất. | `GET /api/Phong/user/thong-bao/{userId}` |
| FR-38 | Hệ thống **gửi email thông báo** kết quả phê duyệt cho người dùng qua SMTP. | `EmailService.GuiEmailAsync(user.Email, ...)` trong `PheDuyet()` |

---

### 6. Phân hệ Lịch sử & Dashboard

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| FR-39 | Người dùng có thể **xem lịch sử đặt phòng cá nhân**, sắp xếp theo thời gian mới nhất. | `GET /api/Phong/user/lich-su/{userId}` |
| FR-40 | Người dùng có thể **tra cứu lịch sử có thể lọc theo ngày** và phân trang 10 mục/trang. | `Bookings.tsx` — `dateFilter`, `page`, `PAGE_SIZE=10` |
| FR-41 | Hệ thống cung cấp **giao diện Lịch phòng (Calendar)** hiển thị booking dạng lịch tháng theo từng ngày. | `CalendarView.tsx` |
| FR-42 | Hệ thống **tự động nạp dữ liệu mẫu** (Seed Data): 10 tài khoản, 20 phòng và 100 yêu cầu đặt phòng ngẫu nhiên khi khởi chạy lần đầu. | `AppDbContext.OnModelCreating()` — `HasData(...)` |
| FR-43 | Hệ thống cho phép người dùng **xem hạn mức giờ còn lại** trong tuần hiện tại. | `GET /api/Phong/user/quota/{userId}` |

---

## II. Yêu Cầu Phi Chức Năng (Non-Functional Requirements — NFR)

### 1. Bảo mật (Security)

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-01 | Mật khẩu người dùng phải được **mã hóa bằng BCrypt** (workFactor 10) trước khi lưu vào CSDL. | `BCrypt.Net.BCrypt.HashPassword(password)` trong `Register()` |
| NFR-02 | Khi đăng nhập, hệ thống dùng **BCrypt.Verify** để so sánh — không lưu và không so sánh plain-text. | `BCrypt.Net.BCrypt.Verify(password, user.Password)` trong `Login()` |
| NFR-03 | Hệ thống áp dụng **phân quyền theo vai trò (RBAC)**: chỉ Admin được thực hiện phê duyệt, Admin và chủ phòng mới được hủy lịch. | `user.Role == "Admin"` — kiểm tra trong `PheDuyet()`, `HuyLich()` |
| NFR-04 | Mọi API request từ frontend phải kèm **JWT Bearer Token** trong header Authorization. | `authenticateToken` middleware trong `server.ts` |
| NFR-05 | JWT có thời hạn **24 giờ** và chứa payload: `userId, username, role, department, dotnet_user_id`. | `jwt.sign({ ... }, JWT_SECRET, { expiresIn: '24h' })` |

---

### 2. Kiến trúc & Khả năng bảo trì

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-06 | Hệ thống xây dựng theo kiến trúc **Clean Architecture** gồm 4 project riêng biệt: Domain, Application, Infrastructure, API. | Cấu trúc Solution `.sln` |
| NFR-07 | Sử dụng **Dependency Injection (DI)** để inject `IAppDbContext`, `LichService`, `EmailService` vào Controller. | `PhongController(IAppDbContext, LichService, EmailService)` |
| NFR-08 | Sử dụng **Interface** `IAppDbContext` để tách biệt lớp truy cập dữ liệu khỏi Controller. | `RoomScheduling.Application/Interfaces/IAppDbContext.cs` |
| NFR-09 | Tách riêng logic nghiệp vụ vào Service: `LichService` (kiểm tra trùng, gợi ý phòng), `EmailService` (gửi SMTP). | `RoomScheduling.Application/Services/` |
| NFR-10 | Frontend sử dụng mô hình **BFF (Backend-For-Frontend)**: Node.js Express làm proxy layer thuần túy, không chứa business logic. | `server.ts` — toàn bộ logic đã được chuyển về .NET |

---

### 3. Hiệu năng & Tự động hóa

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-11 | Sử dụng **Hangfire** để chạy background job tự động hủy lịch No-show **mỗi 10 phút**. | `RecurringJob.AddOrUpdate(..., Cron.MinuteInterval(10))` |
| NFR-12 | Tự động hủy lịch (No-show) nếu người dùng **không Check-in sau 15 phút** kể từ giờ bắt đầu. | `LichService.HuyLichNoShow()` |
| NFR-13 | Sử dụng **xử lý bất đồng bộ** (async/await) cho toàn bộ thao tác truy cập CSDL và gửi email. | Toàn bộ Controller dùng `async Task<IActionResult>` |
| NFR-14 | Giao diện phía Frontend **tự động polling thông báo mới** mỗi 15 giây mà không cần F5. | `setInterval(fetchUnread, 15000)` trong `App.tsx` |

---

### 4. Cơ sở dữ liệu

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-15 | Sử dụng **Entity Framework Core** với tiếp cận **Code-First** và Migrations. | `AppDbContext : DbContext, IAppDbContext` |
| NFR-16 | Cơ sở dữ liệu sử dụng **SQL Server** (tên DB: `RoomScheduling`). | `appsettings.json` — `ConnectionStrings.DefaultConnection` |
| NFR-17 | Hệ thống **tự động chạy Migration** khi khởi động (`app.MigrateDatabase()`). | `Program.cs` — Auto-Migrate on startup |
| NFR-18 | Xử lý **vòng lặp tham chiếu JSON** bằng `ReferenceHandler.IgnoreCycles` khi serialize quan hệ hai chiều. | `Program.cs` — `.AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = ...)` |
| NFR-19 | Đánh **Index phức hợp** trên bảng YeuCauDatPhong (`StartTime`, `EndTime`, `PhongId`, `TrangThai`) để tối ưu truy vấn kiểm tra trùng lịch. | `HasIndex(p => new { p.StartTime, p.EndTime, p.PhongId, p.TrangThai })` |

---

### 5. Giao tiếp & Tích hợp

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-20 | Hệ thống cung cấp **RESTful API** đầy đủ cho tất cả tính năng, sử dụng đúng HTTP method (GET/POST/PUT/PATCH/DELETE). | `PhongController`, `AccountController` |
| NFR-21 | Tích hợp **Swagger/OpenAPI** để tài liệu hóa và test API trong môi trường Development tại `/swagger`. | `builder.Services.AddSwaggerGen()` trong `Program.cs` |
| NFR-22 | Hỗ trợ **gửi email qua SMTP** (cấu hình Mailtrap sandbox cho môi trường dev). | `EmailService` — `appsettings.json` `EmailSettings` |

---

### 6. Khả năng sử dụng (Usability)

| Mã | Yêu cầu | Nguồn trong code |
|----|---------|-----------------|
| NFR-23 | Tất cả phản hồi API trả về **thông báo tiếng Việt** rõ ràng, có emoji để dễ nhận biết ngữ cảnh. | Toàn bộ `NoiDung` của `ThongBao` có emoji 🔔 ⏳ ✅ ❌ 🗑️ 🏁 |
| NFR-24 | Danh sách đặt phòng hỗ trợ **phân trang** (10 mục/trang), lọc theo trạng thái và ngày, sắp xếp mới nhất lên đầu. | `Bookings.tsx` — `page`, `PAGE_SIZE`, `dateFilter`, `.sort((a,b) => b.id - a.id)` |
| NFR-25 | Giao diện sidebar hiển thị **chỉ báo thông báo chưa đọc** (red badge) cập nhật tức thì khi người dùng đánh dấu đã đọc. | `App.tsx` — `unreadCount`, `window.dispatchEvent(new Event("notifications_read"))` |
| NFR-26 | Toàn bộ Frontend sử dụng **TypeScript** để đảm bảo an toàn kiểu dữ liệu tại compile-time. | `.tsx` — toàn bộ file frontend |
| NFR-27 | Font chữ **Be Vietnam Pro** được áp dụng để hiển thị đúng dấu tiếng Việt. | `index.css` — Google Fonts |

---

> **Tổng kết:** Hệ thống có **43 yêu cầu chức năng (FR-01 đến FR-43)** và **27 yêu cầu phi chức năng (NFR-01 đến NFR-27)**, tất cả đều đã được triển khai trong mã nguồn thực tế.
