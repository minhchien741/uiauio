import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, DoorOpen, Users, Search, CheckCircle } from "lucide-react";
import { DEPARTMENTS, getDepartmentLabel } from "../constants/departments";
import toast from "react-hot-toast";

interface Room { id: number; name: string; capacity: number; description: string; department: string; }
interface FormState { name: string; capacity: string; description: string; department: string; }
const emptyForm: FormState = { name: "", capacity: "10", description: "", department: DEPARTMENTS[0].value };

const DEPT_COLORS: Record<string, string> = { CNTT: "#4F46E5", KTCNS: "#0284C7", MTTB: "#7C3AED", KTQTS: "#059669" };

export default function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Room | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [search, setSearch] = useState("");

    const token = () => localStorage.getItem("token") ?? "";

    const fetchRooms = () => {
        setLoading(true);
        fetch("/api/rooms", { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.json()).then(data => { setRooms(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => { setError("Lỗi tải danh sách phòng"); setLoading(false); });
    };

    useEffect(() => { fetchRooms(); }, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); setError(""); };
    const openEdit = (r: Room) => { setEditing(r); setForm({ name: r.name, capacity: String(r.capacity), description: r.description, department: r.department }); setShowModal(true); setError(""); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setError("");
        const body = { name: form.name, capacity: Number(form.capacity), description: form.description, department: form.department };
        const res = await fetch(editing ? `/api/rooms/${editing.id}` : "/api/rooms", {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message ?? "Lỗi lưu phòng"); return; }
        toast.success(editing ? "Cập nhật thành công!" : "Thêm phòng thành công!"); setShowModal(false);
        fetchRooms();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bạn có chắc muốn xóa phòng này?")) return;
        const res = await fetch(`/api/rooms/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) { toast.success("Đã xóa phòng"); fetchRooms(); }
        else { const d = await res.json(); setError(d.message ?? "Lỗi xóa"); }
    };

    const q = search.toLowerCase();
    const filtered = rooms.filter(r => r.name.toLowerCase().includes(q) || getDepartmentLabel(r.department).toLowerCase().includes(q));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div className="animate-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Quản lý phòng</h1>
                    <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{rooms.length} phòng trong hệ thống</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                        <input className="input-premium" type="text" placeholder="Tìm phòng…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, width: 200 }} />
                    </div>
                    <button onClick={openCreate} className="btn-gradient" style={{ padding: "10px 20px" }}>
                        <Plus size={15} /> Thêm phòng
                    </button>
                </div>
            </div>
            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>{error}</div>}

            {/* Room grid */}
            {loading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#94A3B8" }}>Đang tải…</div>
            ) : (
                <div className="animate-in-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                    {filtered.map((r) => {
                        const color = DEPT_COLORS[r.department] ?? "#64748B";
                        return (
                            <div key={r.id} className="card-hover page-card" style={{ overflow: "hidden" }}>
                                {/* Color ribbon */}
                                <div style={{ height: 4, background: `linear-gradient(90deg,${color},${color}88)` }} />
                                <div style={{ padding: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 700, color: "#0F172A", fontSize: 14, marginBottom: 4 }}>{r.name}</p>
                                            <span style={{ display: "inline-block", background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>{getDepartmentLabel(r.department)}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => openEdit(r)} style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", border: "none", color: "#4F46E5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF2F2", border: "none", color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                        <Users size={13} color="#94A3B8" /> <span style={{ fontSize: 13, color: "#64748B" }}>{r.capacity} người</span>
                                        <DoorOpen size={13} color="#94A3B8" style={{ marginLeft: 8 }} /> <span style={{ fontSize: 12, color: "#94A3B8" }}>ID #{r.id}</span>
                                    </div>
                                    {r.description && <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.description}</p>}
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>Không tìm thấy phòng nào</div>}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
                    <div style={{ background: "#fff", borderRadius: 22, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }} className="animate-in">
                        <div style={{ background: "linear-gradient(135deg,#1E1B4B,#4F46E5)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Admin</p>
                                <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{editing ? "Chỉnh sửa phòng" : "Thêm phòng mới"}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>{error}</div>}
                            {[
                                { label: "Tên phòng *", key: "name", type: "text" },
                                { label: "Sức chứa (người) *", key: "capacity", type: "number" },
                            ].map(({ label, key, type }) => (
                                <div key={key}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                                    <input className="input-premium" type={type} min={type === "number" ? "1" : undefined} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Khoa quản lý *</label>
                                <select className="input-premium" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mô tả thiết bị</label>
                                <textarea className="input-premium" rows={3} style={{ resize: "none" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: 30 máy tính, máy chiếu, điều hòa…" />
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Hủy</button>
                                <button type="submit" className="btn-gradient" style={{ flex: 2 }}>{editing ? "Lưu thay đổi" : "Thêm phòng"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
