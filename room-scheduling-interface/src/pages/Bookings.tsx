import { useEffect, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar, Filter, CheckCircle, XCircle, Clock, Trash2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

function safeFormat(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, fmt) : "—"; }
  catch { return "—"; }
}

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  Approved: { bg: "#D1FAE5", color: "#065F46", label: "Đã duyệt" },
  Pending: { bg: "#FEF3C7", color: "#92400E", label: "Chờ duyệt" },
  Rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Từ chối" },
};

export default function Bookings({ user }: { user: any }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchBookings = () => {
    setLoading(true);
    const url = user.role === "Admin" ? "/api/bookings" : "/api/bookings/me";
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError("Không tải được dữ liệu"); setLoading(false); });
  };

  useEffect(() => { fetchBookings(); }, [user.role]);

  const filterOptions = [
    { v: "all", label: "Tất cả" },
    { v: "Pending", label: "Chờ duyệt" },
    { v: "Approved", label: "Đã duyệt" },
    { v: "Rejected", label: "Từ chối" },
  ];

  // Lọc theo trạng thái và ngày, sau đó sắp xếp mới nhất lên đầu
  let displayed = filter === "all" ? [...bookings] : bookings.filter(b => b.status === filter);
  if (dateFilter) {
    displayed = displayed.filter(b => b.start_time?.startsWith(dateFilter));
  }
  // Chuẩn các app quản lý thông thường: Yêu cầu vừa được đặt xong (Mới tạo/ID lớn nhất) sẽ nằm trên cùng
  // Điều này giúp Admin ưu tiên duyệt các lịch mới gửi tới, và User thấy ngay thao tác mình vừa đặt.
  displayed.sort((a, b) => b.id - a.id);

  // Phân trang
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE) || 1;
  const paginated = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { fetchBookings(); toast.success(status === "Approved" ? "Đã duyệt" : "Đã từ chối"); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Hủy lịch này?")) return;
    const res = await fetch(`/api/bookings/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) { fetchBookings(); toast.success("Đã hủy lịch"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
            {user.role === "Admin" ? "Quản lý lịch đặt phòng" : "Lịch đặt phòng của tôi"}
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
            {displayed.length} lịch {filter !== "all" ? `• ${filterOptions.find(f => f.v === filter)?.label}` : ""}
          </p>
        </div>
      </div>

      {/* Filter tabs & Date picker */}
      <div className="animate-in-2" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 5, boxShadow: "var(--shadow)" }}>
          {filterOptions.map(({ v, label }) => (
            <button key={v} onClick={() => { setFilter(v); setPage(1); }}
              style={{
                padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s",
                background: filter === v ? "linear-gradient(135deg,#4F46E5,#7C3AED)" : "transparent",
                color: filter === v ? "#fff" : "#64748B",
                boxShadow: filter === v ? "0 4px 12px rgba(79,70,229,0.3)" : "none",
              }}>
              {label}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>({v === "all" ? bookings.length : bookings.filter(b => b.status === v).length})</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>Tra cứu ngày:</span>
          <input type="date" className="input-premium" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} />
          {dateFilter && (
            <button onClick={() => { setDateFilter(""); setPage(1); }} className="btn-secondary" style={{ padding: "8px 14px" }}>
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#DC2626" }}>{error}</div>}

      {/* Table */}
      <div className="animate-in-3" style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94A3B8" }}>Đang tải…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Calendar size={48} style={{ margin: "0 auto 12px", display: "block", color: "#CBD5E1" }} />
            <p style={{ fontWeight: 600, color: "#94A3B8" }}>Không có lịch nào</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid var(--border)" }}>
                {["Phòng", user.role === "Admin" ? "Người đặt" : "", "Thời gian", "Trạng thái", "Thao tác"].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: "14px 20px", fontSize: 12, fontWeight: 700, color: "#64748B", textAlign: "left", textTransform: "uppercase", letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((b, i) => {
                const chip = STATUS_CHIP[b.status] ?? STATUS_CHIP["Pending"];
                const canAct = user.role !== "Admin" ? b.user_name === user.username && b.status === "Pending" : b.status === "Pending";
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background .15s" }}
                    onMouseOver={e => (e.currentTarget.style.background = "#FAFAFE")}
                    onMouseOut={e => (e.currentTarget.style.background = "")}>
                    {/* Room */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${i % 2 === 0 ? "#EEF2FF,#E0E7FF" : "#F5F3FF,#EDE9FE"})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Calendar size={16} color="#4F46E5" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>{b.room_name ?? "—"}</p>
                          <p style={{ fontSize: 11, color: "#94A3B8" }}>ID #{b.id}</p>
                        </div>
                      </div>
                    </td>
                    {/* User (admin only) */}
                    {user.role === "Admin" && (
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#818CF8,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                            {(b.user_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, color: "#374151" }}>{b.user_name ?? "—"}</span>
                        </div>
                      </td>
                    )}
                    {/* Time */}
                    <td style={{ padding: "16px 20px" }}>
                      <p style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                        {safeFormat(b.start_time, "dd/MM/yyyy")}
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                        {safeFormat(b.start_time, "HH:mm")} → {safeFormat(b.end_time, "HH:mm")}
                      </p>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: chip.bg, color: chip.color, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>
                        {b.status === "Approved" ? <CheckCircle size={12} /> : b.status === "Rejected" ? <XCircle size={12} /> : <Clock size={12} />}
                        {chip.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {user.role === "Admin" && b.status === "Pending" && <>
                          <button onClick={() => handleStatus(b.id, "Approved")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <CheckCircle size={12} /> Duyệt
                          </button>
                          <button onClick={() => handleStatus(b.id, "Rejected")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <XCircle size={12} /> Từ chối
                          </button>
                        </>}
                        {canAct && user.role !== "Admin" && (
                          <button onClick={() => handleCancel(b.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <Trash2 size={12} /> Hủy
                          </button>
                        )}
                        {user.role === "Admin" && b.status === "Approved" && (
                          <button onClick={() => handleStatus(b.id, "CheckedOut")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#F0FDF4", color: "#059669", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <ChevronDown size={12} /> Checkout
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {displayed.length > PAGE_SIZE && (
        <div className="animate-in-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "12px 20px", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          <p style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
            Hiển thị {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, displayed.length)} trong tổng số {displayed.length} lịch
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: page === 1 ? "#F8FAFC" : "#fff", color: page === 1 ? "#94A3B8" : "#0F172A", fontSize: 13, fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer", transition: "all .15s" }}>
              Trước
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 32, fontSize: 13, fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", borderRadius: 8 }}>
              {page}
            </div>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: page === totalPages ? "#F8FAFC" : "#fff", color: page === totalPages ? "#94A3B8" : "#0F172A", fontSize: 13, fontWeight: 600, cursor: page === totalPages ? "not-allowed" : "pointer", transition: "all .15s" }}>
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
