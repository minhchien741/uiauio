using Microsoft.EntityFrameworkCore;
using RoomScheduling.Domain;
using RoomScheduling.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RoomScheduling.Application.Interfaces;

    public interface IAppDbContext
    {
        DbSet<Phong> Phongs { get; set; }
        DbSet<YeuCauDatPhong> YeuCauDatPhongs { get; set; }
        DbSet<NguoiDung> NguoiDungs { get; set; }
        DbSet<ThietBi> ThietBis { get; set; }
        DbSet<ThongBao> ThongBaos { get; set; } // Thêm set vào đây
        DbSet<ThamGiaCuocHop> ThamGiaCuocHops { get; set; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
