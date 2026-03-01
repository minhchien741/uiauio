import React, { useEffect, useState } from "react";
import { Search, Users, DoorOpen, ChevronDown, ChevronRight, Sparkles, Clock, CheckCircle, AlertTriangle, X, Calendar } from "lucide-react";
import { DEPARTMENTS, getDepartmentLabel } from "../constants/departments";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import toast from "react-hot-toast";

// Unsplash photos per department
const DEPT_IMAGES: Record<string, string[]> = {
  CNTT: [
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&q=70",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&q=70",
    "https://images.unsplash.com/photo-1587612049655-c1030366a74a?w=500&q=70",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&q=70",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=70",
  ],
  KTCNS: [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&q=70",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=70",
    "https://images.unsplash.com/photo-1563207153-f403bf289096?w=500&q=70",
    "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=500&q=70",
    "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=500&q=70",
  ],
  MTTB: [
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=70",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&q=70",
    "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=500&q=70",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&q=70",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500&q=70",
  ],
  KTQTS: [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&q=70",
    "https://images.unsplash.com/photo-1549924231-f129b911e442?w=500&q=70",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&q=70",
    "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=500&q=70",
    "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=500&q=70",
  ],
};

const DEPT_COLORS: Record<string, { from: string; to: string; accent: string }> = {
  CNTT: { from: "#1E1B4B", to: "#4F46E5", accent: "#818CF8" },
  KTCNS: { from: "#0C4A6E", to: "#0284C7", accent: "#38BDF8" },
  MTTB: { from: "#4A1D96", to: "#7C3AED", accent: "#A78BFA" },
  KTQTS: { from: "#0F3460", to: "#059669", accent: "#34D399" },
};

interface Room { id: number; name: string; capacity: number; description: string; department: string; is_in_use?: boolean; }

function getRuleViolation(start: string, end: string, userRole: string): string | null {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  if (e <= s) return "Thời gian kết thúc phải sau thời gian bắt đầu";

  if (userRole !== "Admin") {
    if (s < new Date(Date.now() + 2 * 3600000)) return "Phải đặt trước ít nhất 2 tiếng";
    if ((e.getTime() - s.getTime()) > 4 * 3600000) return "Mỗi lần đặt không được quá 4 tiếng";
  }

  return null;
}

export default function Rooms({ user }: { user: any }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookForm, setBookForm] = useState({ start: "", end: "" });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurEnd, setRecurEnd] = useState("");
  const [bookErr, setBookErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [roomSchedule, setRoomSchedule] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchSchedule = async (roomId: number, dateStr: string) => {
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/bookings?date=${dateStr}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      setRoomSchedule(Array.isArray(data) ? data : []);
    } catch {
      setRoomSchedule([]);
    }
    setLoadingSchedule(false);
  };

  const handleDateTimeChange = (val: { startISO: string, endISO: string }) => {
    setBookForm({ start: val.startISO, end: val.endISO });
    if (val.startISO && selectedRoom) {
      fetchSchedule(selectedRoom.id, val.startISO.slice(0, 10));
    }
  };


  useEffect(() => {
    fetch("/api/rooms", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(r => r.json()).then(data => {
        const list: Room[] = Array.isArray(data) ? data : [];
        setRooms(list);
        const init: Record<string, boolean> = {};
        DEPARTMENTS.forEach(d => { init[d.value] = d.value === user?.department; });
        init["OTHER"] = true;
        setExpanded(init);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = rooms.filter(r => r.name.toLowerCase().includes(q) || getDepartmentLabel(r.department).toLowerCase().includes(q) || r.description.toLowerCase().includes(q));

  const grouped: Record<string, Room[]> = {};
  DEPARTMENTS.forEach(d => { grouped[d.value] = filtered.filter(r => r.department === d.value); });
  grouped["OTHER"] = filtered.filter(r => !DEPARTMENTS.some(d => d.value === r.department));

  const deptEntries = [...DEPARTMENTS.map(d => ({ key: d.value, label: d.label })),
  ...(grouped["OTHER"]?.length > 0 ? [{ key: "OTHER", label: "Phòng dùng chung" }] : [])];

  const handleBook = async () => {
    const ruleErr = getRuleViolation(bookForm.start, bookForm.end, user?.role || "");
    if (ruleErr) { setBookErr(ruleErr); return; }
    setBookErr("");
    const body: any = { room_id: selectedRoom!.id, start_time: bookForm.start, end_time: bookForm.end };
    if (isRecurring && recurEnd) { body.is_recurring = true; body.recurring_end_date = recurEnd; }
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Đặt phòng thành công! Đang chờ duyệt ✅"); setSelectedRoom(null); }
    else setBookErr(data.message ?? "Lỗi đặt phòng");
  };

  const ruleErr = getRuleViolation(bookForm.start, bookForm.end, user?.role || "");
  const isCrossDept = selectedRoom && selectedRoom.department !== user?.department && selectedRoom.department !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Danh sách phòng họp</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Nhấn vào phòng để xem chi tiết và đặt lịch sử dụng</p>
        </div>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#94A3B8" }} />
          <input className="input-base" type="text" placeholder="Tìm kiếm phòng, thiết bị…"
            style={{ paddingLeft: 38, width: 260 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>Đang tải danh sách phòng…</div>
      ) : (
        <div className="animate-in-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {deptEntries.map(({ key, label }) => {
            const deptRooms = grouped[key] ?? [];
            const isOpen = expanded[key] ?? (deptRooms.length > 0);
            const col = DEPT_COLORS[key];
            return (
              <div key={key} style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", background: "#fff", boxShadow: "var(--shadow)" }}>
                {/* Dept header */}
                <button onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 24px", border: "none", cursor: "pointer", textAlign: "left",
                    background: col ? `linear-gradient(90deg,${col.from} 0%,${col.to} 60%,transparent 100%)` : "#F8FAFC"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DoorOpen size={20} color={col ? "#fff" : "#475569"} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: col ? "#fff" : "#0F172A" }}>{label}</p>
                      <p style={{ fontSize: 12, color: col ? "rgba(255,255,255,0.65)" : "#94A3B8" }}>{deptRooms.length} phòng</p>
                    </div>
                  </div>
                  <div style={{ color: col ? "rgba(255,255,255,0.7)" : "#94A3B8" }}>
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {/* Room grid */}
                {isOpen && deptRooms.length > 0 && (
                  <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
                    {deptRooms.map((room, idx) => {
                      const img = (DEPT_IMAGES[room.department] ?? DEPT_IMAGES["CNTT"])[idx % 5];
                      return (
                        <div key={room.id} className="card-hover" style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", cursor: "pointer", background: "#fff" }}
                          onClick={() => {
                            setSelectedRoom(room); setBookErr(""); setBookForm({ start: "", end: "" });
                            fetchSchedule(room.id, new Date().toISOString().slice(0, 10)); // Mặc định lấy lịch hôm nay
                          }}>
                          {/* Room photo */}
                          <div style={{ height: 140, overflow: "hidden", position: "relative" }}>
                            <img src={img} alt={room.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }}
                              onMouseOver={e => (e.currentTarget.style.transform = "scale(1.05)")}
                              onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.45),transparent)" }} />
                            <div style={{ position: "absolute", bottom: 8, left: 10, right: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", borderRadius: 8, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.2)" }}>
                                <Users size={11} color="#fff" />
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{room.capacity} người</span>
                              </div>
                              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "3px 8px" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: room.is_in_use ? "#EF4444" : "#10B981" }} />
                                <span style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>{room.is_in_use ? "Đang sử dụng" : "Còn trống"}</span>
                              </div>
                            </div>
                          </div>
                          {/* Info */}
                          <div style={{ padding: "12px 14px" }}>
                            <p style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 4, lineHeight: 1.3 }}>{room.name}</p>
                            {room.description && <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{room.description}</p>}
                            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                              <button style={{ flex: 1, padding: "7px 0", background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                Đặt phòng
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isOpen && deptRooms.length === 0 && (
                  <p style={{ textAlign: "center", color: "#94A3B8", padding: "20px 0", fontSize: 13 }}>Không có phòng nào.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {selectedRoom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.24)" }} className="animate-in">
            {/* Modal header with room image */}
            <div style={{ position: "relative", height: 160 }}>
              <img src={(DEPT_IMAGES[selectedRoom.department] ?? DEPT_IMAGES["CNTT"])[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.7),rgba(0,0,0,0.1))" }} />
              <button onClick={() => setSelectedRoom(null)} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
              <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginBottom: 2 }}>{getDepartmentLabel(selectedRoom.department)}</p>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{selectedRoom.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <Users size={12} color="rgba(255,255,255,0.8)" />
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Sức chứa {selectedRoom.capacity} người</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div style={{ padding: 24 }}>
              {bookErr && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#DC2626", display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} />{bookErr}</div>}

              {isCrossDept && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400E" }}>
                  ⚠️ Đây là phòng thuộc khoa khác. Yêu cầu sẽ cần được phê duyệt bổ sung.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <SmartDateTimePicker
                  value={{ startISO: bookForm.start, endISO: bookForm.end }}
                  onChange={handleDateTimeChange}
                />

                {/* Timeline hiển thị lịch */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} /> Lịch phòng ngày {bookForm.start ? bookForm.start.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  </p>

                  {loadingSchedule ? (
                    <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "10px 0" }}>Đang tải lịch...</div>
                  ) : roomSchedule.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#10B981", display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", padding: "8px 12px", borderRadius: 8 }}>
                      <CheckCircle size={14} /> Hôm nay phòng trống cả ngày!
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {roomSchedule.map(b => (
                        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "8px 10px", background: b.status === "Approved" ? "#FEE2E2" : "#FFFBEB", borderRadius: 8, border: `1px solid ${b.status === "Approved" ? "#FECACA" : "#FDE68A"}` }}>
                          <Clock size={12} color={b.status === "Approved" ? "#EF4444" : "#D97706"} />
                          <span style={{ fontWeight: 600, color: b.status === "Approved" ? "#991B1B" : "#92400E" }}>
                            {b.start_time.slice(11, 16)} - {b.end_time.slice(11, 16)}
                          </span>
                          <span style={{ color: b.status === "Approved" ? "#B91C1C" : "#B45309", marginLeft: "auto", fontSize: 11 }}>
                            {b.status === "Approved" ? "Đã đặt" : "Đang duyệt"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {ruleErr && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#D97706", background: "#FFFBEB", borderRadius: 8, padding: "8px 12px" }}><AlertTriangle size={13} />{ruleErr}</div>}

                {/* Recurring */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#4F46E5" }} />
                  Đặt lặp lại hàng tuần
                  <span style={{ marginLeft: "auto", background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)", color: "#4F46E5", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>NEW</span>
                </label>
                {isRecurring && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Kết thúc lặp lại</label>
                    <input className="input-base" type="date" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} />
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => setSelectedRoom(null)} className="btn-outline" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
                  <button onClick={handleBook} className="btn-primary" disabled={!!ruleErr || !bookForm.start || !bookForm.end} style={{ flex: 2, justifyContent: "center" }}>
                    <Clock size={15} /> Xác nhận đặt phòng
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
