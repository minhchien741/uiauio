/**
 * SmartDateTimePicker — Chọn ngày + khung giờ preset cho booking
 * Giúp người dùng không cần nhập datetime-local thủ công
 */
import React, { useState } from "react";
import { format } from "date-fns";

// Khung giờ học/họp chuẩn của trường (theo quy định PI 1.1)
export const TIME_SLOTS = [
    { label: "Ca 1 • 7:30 – 9:00", start: "07:30", end: "09:00", duration: 90 },
    { label: "Ca 2 • 9:15 – 10:45", start: "09:15", end: "10:45", duration: 90 },
    { label: "Ca 3 • 11:00 – 12:30", start: "11:00", end: "12:30", duration: 90 },
    { label: "Ca 4 • 13:00 – 14:30", start: "13:00", end: "14:30", duration: 90 },
    { label: "Ca 5 • 14:45 – 16:15", start: "14:45", end: "16:15", duration: 90 },
    { label: "Ca 6 • 16:30 – 18:00", start: "16:30", end: "18:00", duration: 90 },
];

type DurOpt = { label: string; hours: number; };
const DURATION_OPTS: DurOpt[] = [
    { label: "30 phút", hours: 0.5 },
    { label: "1 tiếng", hours: 1 },
    { label: "1.5 tiếng", hours: 1.5 },
    { label: "2 tiếng", hours: 2 },
    { label: "3 tiếng", hours: 3 },
    { label: "4 tiếng", hours: 4 },
];

export interface BookingTime { startISO: string; endISO: string; }

interface Props {
    value: BookingTime;
    onChange: (val: BookingTime) => void;
    minDate?: string; // YYYY-MM-DD
}

function toISO(date: string, time: string): string {
    // date = YYYY-MM-DD, time = HH:mm → "YYYY-MM-DDTHH:mm"
    return `${date}T${time}`;
}

function addHours(iso: string, h: number): string {
    const d = new Date(iso);
    d.setTime(d.getTime() + h * 3600000);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    const hr = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${yr}-${mo}-${dy}T${hr}:${mn}`;
}

function isoToDate(iso: string): string { return iso ? iso.slice(0, 10) : ""; }
function isoToTime(iso: string): string { return iso ? iso.slice(11, 16) : ""; }

export default function SmartDateTimePicker({ value, onChange, minDate }: Props) {
    const [activeSlot, setActiveSlot] = useState<number | null>(null);
    const [activeDur, setActiveDur] = useState<number | null>(null);

    const selectedDate = isoToDate(value.startISO);
    const selectedStart = isoToTime(value.startISO);

    const today = minDate ?? format(new Date(), "yyyy-MM-dd");
    // Minimum date = tomorrow (đặt trước ít nhất 2 tiếng — xử lý ở validation)
    const minD = today;

    const handleDateChange = (d: string) => {
        if (!d) return;
        // Keep time if set, else empty
        const startT = selectedStart || "07:30";
        const start = toISO(d, startT);
        // Keep duration if end exists
        if (value.endISO) {
            const endT = isoToTime(value.endISO);
            onChange({ startISO: start, endISO: toISO(d, endT) });
        } else {
            onChange({ startISO: start, endISO: "" });
        }
        setActiveSlot(null);
    };

    const handleSlotSelect = (idx: number) => {
        const slot = TIME_SLOTS[idx];
        const d = selectedDate || format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
        onChange({ startISO: toISO(d, slot.start), endISO: toISO(d, slot.end) });
        setActiveSlot(idx); setActiveDur(null);
    };

    const handleDurationSelect = (idx: number, hours: number) => {
        if (!value.startISO) return;
        onChange({ ...value, endISO: addHours(value.startISO, hours) });
        setActiveDur(idx); setActiveSlot(null);
    };

    const handleManualStart = (v: string) => {
        onChange({ startISO: v, endISO: value.endISO });
        setActiveSlot(null); setActiveDur(null);
    };
    const handleManualEnd = (v: string) => {
        onChange({ ...value, endISO: v });
        setActiveSlot(null); setActiveDur(null);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Date */}
            <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                    📅 Chọn ngày
                </label>
                <input className="input-premium" type="date" min={minD}
                    value={selectedDate}
                    onChange={e => handleDateChange(e.target.value)} />
            </div>

            {/* Preset time slots */}
            <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                    ⏰ Chọn ca học / họp nhanh
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {TIME_SLOTS.map((slot, i) => (
                        <button key={i} type="button" className={`time-chip${activeSlot === i ? " active" : ""}`}
                            onClick={() => handleSlotSelect(i)}>
                            {slot.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Duration quick select (if start is set) */}
            {value.startISO && (
                <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                        ⏱️ Hoặc chọn thời lượng
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {DURATION_OPTS.map((d, i) => (
                            <button key={i} type="button" className={`time-chip${activeDur === i ? " active" : ""}`}
                                onClick={() => handleDurationSelect(i, d.hours)}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Result display + manual override */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Bắt đầu</label>
                    <input className="input-premium" type="datetime-local"
                        value={value.startISO} onChange={e => handleManualStart(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Kết thúc</label>
                    <input className="input-premium" type="datetime-local"
                        value={value.endISO} onChange={e => handleManualEnd(e.target.value)} />
                </div>
            </div>
        </div>
    );
}
