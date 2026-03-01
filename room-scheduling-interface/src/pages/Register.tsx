import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, Mail, Phone, Building2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { DEPARTMENTS } from "../constants/departments";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "", email: "", full_name: "", phone: "", department: DEPARTMENTS[0].value });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setTimeout(() => navigate("/login"), 1500); }
      else setError(data.message ?? "Lỗi đăng ký");
    } catch { setError("Lỗi kết nối máy chủ"); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter',sans-serif" }}>
      {/* Left hero */}
      <div style={{ flex: 1, background: "linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4C1D95 100%)", display: "none", alignItems: "center", justifyContent: "center", padding: 60, position: "relative", overflow: "hidden" }} className="hero-pane">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=1000&q=60')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.15 }} />
        <div style={{ position: "relative", textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏛️</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
            Tham gia<br />
            <span style={{ background: "linear-gradient(90deg,#A5B4FC,#C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RoomScheduler</span>
          </h1>
          <p style={{ opacity: .7, fontSize: 14, lineHeight: 1.7 }}>Đặt lịch phòng họp và phòng học nhanh chóng, minh bạch cho toàn trường ICTU.</p>
          <div style={{ marginTop: 32, display: "flex", gap: 20, justifyContent: "center" }}>
            {[["20+", "Phòng"], ["4", "Khoa"], ["∞", "Lịch hẹn"]].map(([n, l]) => (
              <div key={l}><p style={{ fontSize: 22, fontWeight: 800 }}>{n}</p><p style={{ fontSize: 12, opacity: .6 }}>{l}</p></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, minWidth: 360, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 480 }} className="animate-in">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏛️</div>
            <p style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>ICTU • RoomScheduler</p>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Tạo tài khoản mới</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>Điền đầy đủ thông tin để đăng ký</p>

          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626" }}>{error}</div>}
          {success && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#15803D", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={14} />Đăng ký thành công! Đang chuyển đến đăng nhập…</div>}

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Full name */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Họ và tên *</label>
              <div style={{ position: "relative" }}>
                <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" style={{ paddingLeft: 36 }} type="text" placeholder="Nhập họ và tên đầy đủ" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Tên đăng nhập *</label>
              <div style={{ position: "relative" }}>
                <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" style={{ paddingLeft: 36 }} type="text" placeholder="vd: nguyenvana" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mật khẩu *</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" style={{ paddingLeft: 36, paddingRight: 38 }} type={showPw ? "text" : "password"} placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email *</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" style={{ paddingLeft: 36 }} type="email" placeholder="example@ictu.edu.vn" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Số điện thoại</label>
              <div style={{ position: "relative" }}>
                <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" style={{ paddingLeft: 36 }} type="tel" pattern="[0-9]{10}" title="Số điện thoại phải gồm đúng 10 chữ số" maxLength={10} placeholder="0xxx xxx xxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            {/* Department */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Khoa *</label>
              <div style={{ position: "relative" }}>
                <Building2 size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <select className="input-premium" style={{ paddingLeft: 36 }} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>

            {/* Submit */}
            <div style={{ gridColumn: "1/-1" }}>
              <button type="submit" className="btn-primary" style={{ width: "100%", padding: "12px" }}>Tạo tài khoản</button>
            </div>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#64748B" }}>
            Đã có tài khoản?{" "}<Link to="/login" style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>Đăng nhập</Link>
          </p>
        </div>
      </div>
      <style>{`.hero-pane { display: flex !important; } @media(max-width:768px){.hero-pane{display:none!important}}`}</style>
    </div>
  );
}
