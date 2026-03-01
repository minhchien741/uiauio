import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, Check, BellOff, CheckCheck, Info } from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getReadIds = (): Set<number> => {
    try { const s = localStorage.getItem("readNotifications"); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  };
  const saveReadIds = (ids: Set<number>) => localStorage.setItem("readNotifications", JSON.stringify([...ids]));

  const fetchNotifications = () => {
    fetch("/api/notifications", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json())
      .then(data => {
        const readIds = getReadIds();
        setNotifications((Array.isArray(data) ? data : []).map((n: any) => ({ ...n, is_read: n.is_read || readIds.has(n.id) })));
        setLoading(false);
      }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    const ids = getReadIds(); ids.add(id); saveReadIds(ids);
    fetchNotifications();
    window.dispatchEvent(new Event("notifications_read"));
  };

  const handleMarkAllRead = () => {
    const ids = getReadIds();
    notifications.forEach(n => ids.add(n.id));
    saveReadIds(ids);
    fetchNotifications();
    window.dispatchEvent(new Event("notifications_read"));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fmtDate = (str: string) => { try { return format(new Date(str), "dd/MM/yyyy HH:mm"); } catch { return str; } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Thông báo</h1>
          {unreadCount > 0 && <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{unreadCount} thông báo chưa đọc</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <CheckCheck size={14} /> Đánh dấu đọc tất cả
          </button>
        )}
      </div>

      {/* Content */}
      <div className="animate-in-2 page-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94A3B8" }}>Đang tải…</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <BellOff size={48} style={{ margin: "0 auto 12px", display: "block", color: "#CBD5E1" }} />
            <p style={{ fontWeight: 600, color: "#94A3B8" }}>Chưa có thông báo nào</p>
            <p style={{ fontSize: 13, color: "#CBD5E1", marginTop: 4 }}>Các thông báo về lịch đặt phòng sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {notifications.map((n, i) => (
              <li key={n.id} style={{
                display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 24px",
                borderBottom: i < notifications.length - 1 ? "1px solid #F1F5F9" : "none",
                background: n.is_read ? "#fff" : "#F5F7FF",
                transition: "background .2s",
              }}>
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: n.is_read ? "#F1F5F9" : "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
                }}>
                  {n.is_read ? <Bell size={18} color="#94A3B8" /> : <Info size={18} color="#4F46E5" />}
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: n.is_read ? "#475569" : "#0F172A", fontWeight: n.is_read ? 400 : 500, lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{fmtDate(n.created_at)}</p>
                </div>

                {/* Unread dot + action */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4F46E5" }} />}
                  {!n.is_read && (
                    <button onClick={() => handleMarkRead(n.id)} title="Đánh dấu đã đọc"
                      style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4F46E5" }}>
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
