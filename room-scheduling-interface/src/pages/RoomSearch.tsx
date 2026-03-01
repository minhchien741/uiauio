import React, { useState } from "react";
import { Search, Sparkles, Users, DoorOpen, Clock, CheckCircle, AlertTriangle, X, Star, Zap, Calendar } from "lucide-react";
import { getDepartmentLabel } from "../constants/departments";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import toast from "react-hot-toast";

interface Room { id: number; name: string; capacity: number; description: string; department: string; is_in_use?: boolean; }
interface Suggestion { room: Room; score: number; reasons: string[]; }

const ROOM_PHOTO = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70";

function getRuleViolation(start: string, end: string, userRole: string): string | null {
    if (!start || !end) return null;
    const s = new Date(start), e = new Date(end);
    if (e <= s) return "Thời gian kết thúc phải sau thời gian bắt đầu";

    // Admin bypasses these time rules
    if (userRole !== "Admin") {
        if (s < new Date(Date.now() + 2 * 3600000)) return "Phải đặt trước ít nhất 2 tiếng";
        if ((e.getTime() - s.getTime()) > 4 * 3600000) return "Mỗi lần đặt không được quá 4 tiếng";
    }

    return null;
}

export default function RoomSearch({ user }: { user: any }) {
    const [form, setForm] = useState({ start: "", end: "", capacity: "1", keyword: "" });
    const [rooms, setRooms] = useState<Room[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState("");
    const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurEnd, setRecurEnd] = useState("");
    const [bookErr, setBookErr] = useState("");
    const [searched, setSearched] = useState(false);
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
        setForm(f => ({ ...f, start: val.startISO, end: val.endISO }));
    };

    const ruleErr = getRuleViolation(form.start, form.end, user?.role || "");
    const token = () => localStorage.getItem("token") ?? "";

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ruleErr) return;
        setError(""); setLoading(true); setSuggestions([]); setSearched(true);
        try {
            const p = new URLSearchParams({ start: form.start, end: form.end, minCapacity: form.capacity, keyword: form.keyword });
            const res = await fetch(`/api/rooms/available?${p}`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            setRooms(Array.isArray(data) ? data : []);
        } catch { setError("Lỗi kết nối server. Kiểm tra backend đang chạy."); }
        setLoading(false);
    };

    const handleAI = async () => {
        if (ruleErr || !form.start || !form.end) return;
        setError(""); setAiLoading(true);
        try {
            const p = new URLSearchParams({ start: form.start, end: form.end, capacity: form.capacity, keyword: form.keyword, dept: user?.department ?? "" });
            const res = await fetch(`/api/rooms/suggest?${p}`, { headers: { Authorization: `Bearer ${token()}` } });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? `Lỗi từ server: ${res.status}`);
                setAiLoading(false);
                return;
            }
            setSuggestions(data.suggestions ?? []);
            if ((data.suggestions ?? []).length === 0) setError("Không tìm thấy phòng phù hợp trong khung giờ này.");
        } catch (err: any) {
            setError(`Lỗi kết nối: ${err?.message ?? "Kiểm tra backend đang chạy"} `);
        }
        setAiLoading(false);
    };

    const handleBook = async () => {
        if (!bookingRoom) return;
        setBookErr("");
        const body: any = { room_id: bookingRoom.id, start_time: form.start, end_time: form.end };
        if (isRecurring && recurEnd) { body.is_recurring = true; body.recurring_end_date = recurEnd; }
        const res = await fetch("/api/bookings", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) { toast.success("Đặt phòng thành công! Chờ duyệt ✅"); setBookingRoom(null); }
        else setBookErr(data.message ?? "Lỗi đặt phòng");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header */}
            <div className="animate-in">
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Tìm phòng trống</h1>
                <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Tìm phòng còn trống theo thời gian. AI sẽ gợi ý phòng phù hợp nhất cho bạn.</p>
            </div>

            {/* Search form card */}
            <form onSubmit={handleSearch} className="animate-in-2" style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                    <SmartDateTimePicker
                        value={{ startISO: form.start, endISO: form.end }}
                        onChange={handleDateTimeChange}
                    />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>👥 Sức chứa tối thiểu</label>
                        <input className="input-base" type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>🔧 Từ khóa thiết bị</label>
                        <input className="input-base" type="text" placeholder="máy chiếu, webcam, máy tính…" value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} />
                    </div>
                </div>

                {ruleErr && (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E" }}>
                        <AlertTriangle size={14} /> {ruleErr}
                    </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <button type="submit" className="btn-primary" disabled={!!ruleErr} style={{ flex: 1, justifyContent: "center", padding: "11px" }}>
                        <Search size={15} /> {loading ? "Đang tìm…" : "Tìm phòng trống"}
                    </button>
                    <button type="button" onClick={handleAI} disabled={!!ruleErr || !form.start || !form.end}
                        style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "11px 20px", background: "linear-gradient(135deg,#7C3AED,#A855F7)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: (ruleErr || !form.start || !form.end) ? 0.5 : 1, transition: "opacity .2s", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
                        <Sparkles size={15} /> {aiLoading ? "Đang phân tích…" : "AI Gợi ý"}
                    </button>
                </div>
            </form>

            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#DC2626" }}>{error}</div>}

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
                <div className="animate-in" style={{ background: "linear-gradient(135deg,#1E1B4B,#4F46E5,#7C3AED)", borderRadius: 20, padding: 24, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${ROOM_PHOTO}')`, backgroundSize: "cover", opacity: 0.08 }} />
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Sparkles size={18} color="#fff" />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>AI Gợi ý thông minh</p>
                                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Xếp hạng theo khoa, sức chứa và thiết bị</p>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                            {suggestions.map(({ room, score, reasons }, i) => (
                                <div key={room.id} style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: `1px solid ${i === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: 16, padding: 18 }}>
                                    {i === 0 && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                                            <Star size={12} color="#FCD34D" fill="#FCD34D" />
                                            <span style={{ color: "#FCD34D", fontSize: 11, fontWeight: 700 }}>TỐT NHẤT CHO BẠN</span>
                                        </div>
                                    )}
                                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>{room.name}</p>
                                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 12 }}>{getDepartmentLabel(room.department)}</p>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                                        <Users size={11} color="rgba(255,255,255,0.7)" />
                                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{room.capacity} người</span>
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                        {reasons.map((r, j) => (
                                            <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                                                <CheckCircle size={11} color="#34D399" />
                                                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>{r}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Score bar */}
                                    <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99, marginBottom: 12 }}>
                                        <div style={{ height: "100%", borderRadius: 99, width: `${score}%`, background: "linear-gradient(90deg,#34D399,#10B981)" }} />
                                    </div>
                                    <button onClick={() => {
                                        setBookingRoom(room); setBookErr("");
                                        fetchSchedule(room.id, form.start ? form.start.slice(0, 10) : new Date().toISOString().slice(0, 10));
                                    }}
                                        style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>
                                        Đặt phòng này
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {rooms.length > 0 && (
                <div className="animate-in">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <Zap size={16} color="#059669" />
                        <h2 style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Phòng trống ({rooms.length})</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
                        {rooms.map((r) => (
                            <div key={r.id} className="card-hover" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
                                <div style={{ height: 120, background: r.is_in_use ? "linear-gradient(135deg,#EF4444,#DC2626)" : "linear-gradient(135deg,#10B981,#059669)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <DoorOpen size={32} color="rgba(255,255,255,0.5)" />
                                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "3px 8px" }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                                        <span style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>{r.is_in_use ? "Đang sử dụng" : "Còn trống"}</span>
                                    </div>
                                </div>
                                <div style={{ padding: "14px 16px" }}>
                                    <p style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{r.name}</p>
                                    <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{getDepartmentLabel(r.department)}</p>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, marginBottom: 12 }}>
                                        <Users size={12} color="#94A3B8" /> <span style={{ fontSize: 12, color: "#94A3B8" }}>{r.capacity} người</span>
                                        <Clock size={12} color={r.is_in_use ? "#EF4444" : "#94A3B8"} style={{ marginLeft: 8 }} /> <span style={{ fontSize: 12, color: r.is_in_use ? "#EF4444" : "#59A3B8", fontWeight: r.is_in_use ? 600 : 400 }}>{r.is_in_use ? "Đang bận" : "Trống"}</span>
                                    </div>
                                    <button className="btn-primary" onClick={() => {
                                        setBookingRoom(r); setBookErr("");
                                        fetchSchedule(r.id, form.start ? form.start.slice(0, 10) : new Date().toISOString().slice(0, 10));
                                    }} style={{ width: "100%", justifyContent: "center", padding: "8px" }}>
                                        Đặt phòng
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {searched && !loading && rooms.length === 0 && !error && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                    <DoorOpen size={48} style={{ margin: "0 auto 12px", display: "block", opacity: .3 }} />
                    <p style={{ fontWeight: 600 }}>Không tìm thấy phòng trống</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Hãy thử khung giờ khác hoặc giảm sức chứa</p>
                </div>
            )}

            {/* Booking Modal */}
            {bookingRoom && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
                    <div style={{ background: "#fff", borderRadius: 22, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }} className="animate-in">
                        <div style={{ background: "linear-gradient(135deg,#1E1B4B,#4F46E5)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{getDepartmentLabel(bookingRoom.department)}</p>
                                <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{bookingRoom.name}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                                    <Users size={12} color="rgba(255,255,255,0.7)" /><span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{bookingRoom.capacity} người</span>
                                </div>
                            </div>
                            <button onClick={() => setBookingRoom(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ padding: 24 }}>
                            {bookErr && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#DC2626", display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} />{bookErr}</div>}

                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#64748B" }}>
                                    📅 <strong>Thời gian đặt:</strong> {form.start?.replace("T", " ")} → {form.end?.replace("T", " ")}
                                </div>

                                {/* Timeline hiển thị lịch */}
                                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                        <Calendar size={14} /> Lịch phòng ngày {form.start ? form.start.slice(0, 10) : new Date().toISOString().slice(0, 10)}
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

                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#4F46E5" }} />
                                    Đặt lặp lại hàng tuần
                                </label>
                                {isRecurring && (
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Kết thúc lặp lại</label>
                                        <input className="input-base" type="date" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} />
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => setBookingRoom(null)} className="btn-outline" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
                                    <button onClick={handleBook} className="btn-primary" style={{ flex: 2, justifyContent: "center" }}>
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
