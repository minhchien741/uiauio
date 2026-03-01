import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, User, Lock, Eye, EyeOff } from "lucide-react";

export default function Login({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { onLogin(data.user, data.token); navigate("/"); }
      else setError(data.message ?? "Tài khoản hoặc mật khẩu không đúng");
    } catch { setError("Lỗi kết nối máy chủ. Kiểm tra backend đang chạy."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter',sans-serif" }}>
      {/* Left — Hero */}
      <div style={{
        flex: 1, display: "none", background: "linear-gradient(135deg,#1E1B4B 0%,#312E81 40%,#4C1D95 100%)",
        alignItems: "center", justifyContent: "center", padding: "60px", position: "relative", overflow: "hidden"
      }} className="hero-side">
        {/* Background image overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80')",
          backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18
        }} />
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

        <div style={{ position: "relative", textAlign: "center", color: "#fff", maxWidth: 440 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24 }}>🏛️</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 11, opacity: 0.6, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>ICTU</p>
              <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Room Scheduling</p>
            </div>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Hệ thống quản lý<br />
            <span style={{ background: "linear-gradient(90deg,#A5B4FC,#C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Lịch Phòng Học
            </span>
          </h1>
          <p style={{ opacity: 0.7, fontSize: 15, lineHeight: 1.7 }}>
            Đặt lịch, quản lý và theo dõi việc sử dụng phòng họp & phòng học của Đại học CNTT&TT một cách thông minh và hiệu quả.
          </p>

          <div style={{ marginTop: 40, display: "flex", gap: 24, justifyContent: "center" }}>
            {[["20+", "Phòng học"], ["4", "Khoa"], ["100+", "Lượt đặt"]].map(([n, l]) => (
              <div key={l}>
                <p style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{n}</p>
                <p style={{ fontSize: 12, opacity: 0.6 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ flex: 1, minWidth: 380, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#F8FAFC" }}>
        <div style={{ width: "100%", maxWidth: 420 }} className="animate-in">
          {/* Mobile Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              🏛️
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>ICTU • RoomScheduler</p>
            </div>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>Chào mừng trở lại</h2>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>Đăng nhập để quản lý lịch phòng của bạn</p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#DC2626" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Tên đăng nhập</label>
              <div style={{ position: "relative" }}>
                <User style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF" }} />
                <input className="input-base" type="text" placeholder="Nhập tên đăng nhập"
                  style={{ paddingLeft: 40 }} value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF" }} />
                <input className="input-base" type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu"
                  style={{ paddingLeft: 40, paddingRight: 40 }} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, justifyContent: "center", padding: "13px" }}>
              <LogIn style={{ width: 16, height: 16 }} />
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748B" }}>
            Chưa có tài khoản?{" "}
            <Link to="/register" style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>Đăng ký ngay</Link>
          </p>
        </div>
      </div>

      <style>{`.hero-side { display: flex !important; } @media (max-width:768px) { .hero-side { display: none !important; } }`}</style>
    </div>
  );
}
