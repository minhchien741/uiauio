import {
  BrowserRouter as Router, Routes, Route, Navigate, NavLink,
} from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Calendar, DoorOpen, Bell, User, LogOut,
  Settings, Search, CalendarDays, ChevronRight,
} from "lucide-react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Bookings from "./pages/Bookings";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AdminRooms from "./pages/AdminRooms";
import RoomSearch from "./pages/RoomSearch";
import CalendarView from "./pages/CalendarView";
import Chatbot from "./components/Chatbot";
import { Toaster } from "react-hot-toast";

const NAV_ALL = [
  { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/rooms", icon: <DoorOpen size={18} />, label: "Phòng họp" },
  { to: "/search-rooms", icon: <Search size={18} />, label: "Tìm phòng trống" },
  { to: "/bookings", icon: <Calendar size={18} />, label: "Lịch đặt phòng" },
  { to: "/calendar", icon: <CalendarDays size={18} />, label: "Lịch phòng" },
  { to: "/notifications", icon: <Bell size={18} />, label: "Thông báo" },
  { to: "/profile", icon: <User size={18} />, label: "Cá nhân" },
];
const NAV_ADMIN = { to: "/admin/rooms", icon: <Settings size={18} />, label: "Quản lý phòng" };

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) setUser(JSON.parse(userData));
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      const token = localStorage.getItem("token");
      const userId = user?.id;
      if (!token || !userId) return;
      fetch(`/api/Phong/user/thong-bao/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (!Array.isArray(d)) return;
          const unread = d.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }).catch(() => { });
    };
    fetchUnread();

    // Auto-poll every 15s
    const interval = setInterval(fetchUnread, 15000);
    window.addEventListener("notifications_read", fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_read", fetchUnread);
    };
  }, [user]);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null);
  };

  if (!user) return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );

  const navItems = user.role === "Admin" ? [...NAV_ALL, NAV_ADMIN] : NAV_ALL;

  return (
    <Router>
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }}>
        <Toaster position="bottom-right" />


        {/* ── Sidebar ─────────────────────────────── */}
        <aside style={{
          width: 256, flexShrink: 0,
          background: "linear-gradient(180deg,#1E1B4B 0%,#312E81 60%,#3730A3 100%)",
          display: "flex", flexDirection: "column", position: "relative", overflow: "hidden"
        }}>
          {/* Decorative blur balls */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 60, left: -50, width: 140, height: 140, borderRadius: "50%", background: "rgba(124,58,237,0.18)", pointerEvents: "none" }} />

          {/* Logo */}
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#818CF8,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                🏛️
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>RoomScheduler</p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>ICTU • Quản lý lịch phòng</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10,
                  textDecoration: "none", fontSize: 13.5, fontWeight: 500,
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                  backdropFilter: isActive ? "blur(8px)" : "none",
                  transition: "all .18s",
                })}>
                {item.icon}
                <span>{item.label}</span>
                {item.to === "/search-rooms" && (
                  <span style={{ marginLeft: "auto", background: "linear-gradient(135deg,#818CF8,#A78BFA)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>AI</span>
                )}
                {item.to === "/notifications" && unreadCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{unreadCount} mới</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User card at bottom */}
          <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#818CF8,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {(user.full_name ?? user.username ?? "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name ?? user.username}
                </p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{user.role}</p>
              </div>
              <button onClick={handleLogout} title="Đăng xuất"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", padding: 4, borderRadius: 6, display: "flex" }}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          <header style={{
            height: 60, background: "#fff",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 28px", flexShrink: 0, gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 12 }}>
              <span>ICTU</span><ChevronRight size={12} /><span style={{ color: "#374151", fontWeight: 500 }}>RoomScheduler</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: "linear-gradient(135deg,#EEF2FF,#F5F3FF)", border: "1px solid #E0E7FF",
                borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 500, color: "#4F46E5"
              }}>
                Xin chào, {user.full_name?.split(" ").pop()}! 👋
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: user.role === "Admin" ? "linear-gradient(135deg,#FEF3C7,#FDE68A)" : "linear-gradient(135deg,#D1FAE5,#A7F3D0)",
                color: user.role === "Admin" ? "#92400E" : "#065F46",
              }}>{user.role}</span>
            </div>
          </header>

          {/* Page Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/rooms" element={<Rooms user={user} />} />
              <Route path="/search-rooms" element={<RoomSearch user={user} />} />
              <Route path="/bookings" element={<Bookings user={user} />} />
              <Route path="/calendar" element={<CalendarView user={user} />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              {user.role === "Admin" && <Route path="/admin/rooms" element={<AdminRooms />} />}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
      {user && <Chatbot user={user} />}
    </Router>
  );
}
