import React, { useEffect, useState } from "react";
import { User, Mail, Phone, Building2, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { DEPARTMENTS } from "../constants/departments";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: "", email: "", phone: "", department: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [message, setMessage] = useState<{ type: "ok" | "err", text: string } | null>(null);
  const [pwdMessage, setPwdMessage] = useState<{ type: "ok" | "err", text: string } | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json()).then(data => {
        setUser(data);
        setFormData({ full_name: data.full_name ?? "", email: data.email ?? "", phone: data.phone ?? "", department: data.department ?? "" });
      }).catch(console.error);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users/me", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(formData) });
    const data = await res.json();
    setMessage({ type: res.ok ? "ok" : "err", text: data.message ?? (res.ok ? "Lưu thành công" : "Lỗi lưu") });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword) { setPwdMessage({ type: "err", text: "Nhập mật khẩu mới" }); return; }
    const res = await fetch("/api/users/me/password", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(passwordForm) });
    const data = await res.json();
    setPwdMessage({ type: res.ok ? "ok" : "err", text: data.message ?? (res.ok ? "Đổi mật khẩu thành công" : "Mật khẩu cũ không đúng") });
    if (res.ok) setPasswordForm({ oldPassword: "", newPassword: "" });
  };

  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #4F46E5", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
    </div>
  );

  const avatar = (user.full_name ?? user.username ?? "U").charAt(0).toUpperCase();

  return (
    <div className="animate-in" style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header card */}
      <div style={{ background: "linear-gradient(135deg,#1E1B4B,#4F46E5,#7C3AED)", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=40')", backgroundSize: "cover", opacity: 0.08 }} />
        <div style={{ position: "relative", width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#818CF8,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", border: "3px solid rgba(255,255,255,0.3)", flexShrink: 0 }}>
          {avatar}
        </div>
        <div style={{ position: "relative" }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{user.full_name}</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{user.email}</p>
          <span style={{ display: "inline-block", marginTop: 6, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "2px 12px", color: "#fff", fontSize: 12, fontWeight: 600 }}>{user.role}</span>
        </div>
      </div>

      {/* Profile form */}
      <div className="page-card" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={16} color="#4F46E5" /></div>
          <div>
            <p style={{ fontWeight: 700, color: "#0F172A" }}>Thông tin cá nhân</p>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>Cập nhật thông tin profile của bạn</p>
          </div>
        </div>

        {message && <div style={{ background: message.type === "ok" ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${message.type === "ok" ? "#BBF7D0" : "#FECACA"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: message.type === "ok" ? "#15803D" : "#DC2626", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={14} />{message.text}</div>}

        <form onSubmit={handleUpdateProfile} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Họ và tên", icon: <User size={14} />, key: "full_name", type: "text", required: true },
            { label: "Email", icon: <Mail size={14} />, key: "email", type: "email", required: true },
            { label: "Điện thoại", icon: <Phone size={14} />, key: "phone", type: "text", required: false },
          ].map(({ label, icon, key, type, required }) => (
            <div key={key} style={{ gridColumn: key === "full_name" ? "1/-1" : undefined }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>{icon}</div>
                <input className="input-premium" type={type} style={{ paddingLeft: 36 }}
                  value={(formData as any)[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} required={required}
                  {...(key === "phone" ? { pattern: "[0-9]{10}", title: "Số điện thoại phải gồm đúng 10 chữ số", maxLength: 10 } : {})} />
              </div>
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Khoa</label>
            <div style={{ position: "relative" }}>
              <Building2 size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
              <select className="input-premium" style={{ paddingLeft: 36 }} value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <button type="submit" className="btn-primary" style={{ padding: "10px 28px" }}>Lưu thay đổi</button>
          </div>
        </form>
      </div>

      {/* Password form */}
      <div className="page-card" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={16} color="#D97706" /></div>
          <div>
            <p style={{ fontWeight: 700, color: "#0F172A" }}>Đổi mật khẩu</p>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>Dùng mật khẩu mạnh để bảo vệ tài khoản</p>
          </div>
        </div>

        {pwdMessage && <div style={{ background: pwdMessage.type === "ok" ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${pwdMessage.type === "ok" ? "#BBF7D0" : "#FECACA"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: pwdMessage.type === "ok" ? "#15803D" : "#DC2626" }}>{pwdMessage.text}</div>}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
          {[
            { label: "Mật khẩu cũ", key: "oldPassword", show: showOld, toggle: () => setShowOld(!showOld) },
            { label: "Mật khẩu mới", key: "newPassword", show: showNew, toggle: () => setShowNew(!showNew) },
          ].map(({ label, key, show, toggle }) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input className="input-premium" type={show ? "text" : "password"} style={{ paddingLeft: 36, paddingRight: 40 }}
                  value={(passwordForm as any)[key]} onChange={e => setPasswordForm({ ...passwordForm, [key]: e.target.value })} required />
                <button type="button" onClick={toggle} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary" style={{ padding: "10px 28px", width: "fit-content" }}>Đổi mật khẩu</button>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
