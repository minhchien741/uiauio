import React, { useEffect, useState } from "react";
import { DoorOpen, Calendar, Clock, CheckCircle, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props { user: any; }

const ROOM_PHOTOS = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=75",
  "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=600&q=75",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=75",
];

export default function Dashboard({ user }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const token = `Bearer ${localStorage.getItem("token")}`;
    if (user.role === "Admin") {
      fetch("/api/stats", { headers: { Authorization: token } }).then(r => r.json()).then(setStats).catch(() => { });
      fetch("/api/bookings", { headers: { Authorization: token } }).then(r => r.json())
        .then(d => setRecentBookings(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => { });
    } else {
      Promise.all([
        fetch("/api/bookings/me", { headers: { Authorization: token } }).then(r => r.json()),
        fetch("/api/users/me/quota", { headers: { Authorization: token } }).then(r => r.json()),
      ]).then(([bookings, q]) => {
        const list = Array.isArray(bookings) ? bookings : [];
        setStats({
          totalBookings: list.length,
          pendingBookings: list.filter((b: any) => b.status === "Pending").length,
          approvedBookings: list.filter((b: any) => b.status === "Approved").length,
          rejectedBookings: list.filter((b: any) => b.status === "Rejected").length,
        });
        setQuota(q);
        setRecentBookings(list.slice(0, 5));
      }).catch(() => { });
    }
  }, [user.role]);

  const usedPct = quota ? Math.min(100, (quota.usedHours / quota.maxHours) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Hero Banner */}
      <div style={{
        borderRadius: 20, overflow: "hidden", position: "relative",
        background: "linear-gradient(135deg,#1E1B4B 0%,#4F46E5 50%,#7C3AED 100%)",
        minHeight: 180, padding: "36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }} className="animate-in">
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=50')`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.12 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500, marginBottom: 8, letterSpacing: .5 }}>
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
            Xin chào, {user.full_name?.split(" ").pop() ?? user.username}! 👋
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
            {user.role === "Admin" ? "Tổng quan hệ thống RoomScheduler" : "Theo dõi và quản lý lịch đặt phòng của bạn"}
          </p>
          <Link to="/search-rooms" style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10,
            color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600,
            padding: "8px 18px"
          }}>
            <Sparkles size={14} /> AI Gợi ý phòng <ArrowRight size={14} />
          </Link>
        </div>
        {/* Room photos strip */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10, flexShrink: 0 }}>
          {ROOM_PHOTOS.map((src, i) => (
            <div key={i} style={{
              width: 80, height: 80, borderRadius: 14, overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.2)",
              transform: `rotate(${[-3, 0, 3][i]}deg)`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
            }}>
              <img src={src} alt="room" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }} className="animate-in-2">
          {user.role === "Admin" ? <>
            <StatCard icon={<DoorOpen size={20} />} label="Tổng phòng" value={stats.totalRooms ?? 0} color="#4F46E5" bg="#EEF2FF" />
            <StatCard icon={<Calendar size={20} />} label="Tổng yêu cầu" value={stats.totalBookings ?? 0} color="#7C3AED" bg="#F5F3FF" />
            <StatCard icon={<Clock size={20} />} label="Chờ duyệt" value={stats.pendingBookings ?? 0} color="#D97706" bg="#FFFBEB" />
            <StatCard icon={<CheckCircle size={20} />} label="Đã duyệt" value={stats.approvedBookings ?? 0} color="#059669" bg="#ECFDF5" />
          </> : <>
            <StatCard icon={<Calendar size={20} />} label="Lịch của tôi" value={stats.totalBookings} color="#4F46E5" bg="#EEF2FF" />
            <StatCard icon={<Clock size={20} />} label="Chờ duyệt" value={stats.pendingBookings} color="#D97706" bg="#FFFBEB" />
            <StatCard icon={<CheckCircle size={20} />} label="Đã duyệt" value={stats.approvedBookings} color="#059669" bg="#ECFDF5" />
            <StatCard icon={<DoorOpen size={20} />} label="Bị từ chối" value={stats.rejectedBookings} color="#DC2626" bg="#FEF2F2" />
          </>}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="animate-in-3">

        {/* Quota */}
        {quota && (
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={16} color="#4F46E5" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>Quota tuần này</p>
                <p style={{ fontSize: 12, color: "#94A3B8" }}>Giới hạn 10 tiếng / tuần</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 10 }}>
              <span>Đã dùng: <strong>{quota.usedHours}h</strong></span>
              <span style={{ color: quota.remainingHours === 0 ? "#DC2626" : "#059669", fontWeight: 600 }}>
                Còn lại: {quota.remainingHours}h
              </span>
            </div>
            <div style={{ height: 10, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, transition: "width .5s",
                width: `${usedPct}%`,
                background: usedPct >= 90 ? "linear-gradient(90deg,#EF4444,#DC2626)"
                  : usedPct >= 70 ? "linear-gradient(90deg,#F59E0B,#D97706)"
                    : "linear-gradient(90deg,#10B981,#059669)"
              }} />
            </div>
            {quota.remainingHours === 0 && (
              <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>⚠️ Đã dùng hết quota 10 tiếng tuần này</p>
            )}
          </div>
        )}

        {/* Recent bookings */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>Lịch đặt gần đây</p>
            <Link to="/bookings" style={{ fontSize: 12, color: "#4F46E5", textDecoration: "none", fontWeight: 600 }}>Xem tất cả →</Link>
          </div>
          {recentBookings.length === 0
            ? <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Chưa có lịch đặt nào</p>
            : recentBookings.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: b.status === "Approved" ? "#10B981" : b.status === "Rejected" ? "#EF4444" : "#F59E0B" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.room_name}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8" }}>{b.user_name ?? user.full_name}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: b.status === "Approved" ? "#D1FAE5" : b.status === "Rejected" ? "#FEE2E2" : "#FEF3C7",
                  color: b.status === "Approved" ? "#065F46" : b.status === "Rejected" ? "#991B1B" : "#92400E"
                }}>
                  {b.status === "Approved" ? "Đã duyệt" : b.status === "Rejected" ? "Từ chối" : "Chờ"}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="card-hover" style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid var(--border)", boxShadow: "var(--shadow)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}
