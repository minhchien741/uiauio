import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseISO, isValid, format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday } from "date-fns";
import { vi } from "date-fns/locale";

interface Booking {
    id: number; room_name: string; user_name: string;
    start_time: string; end_time: string; status: string;
}

const STATUS_COLOR: Record<string, string> = {
    Approved: "bg-emerald-500",
    Pending: "bg-amber-400",
    Rejected: "bg-red-400",
};
const STATUS_LABEL: Record<string, string> = {
    Approved: "Đã duyệt",
    Pending: "Chờ duyệt",
    Rejected: "Từ chối",
};

export default function CalendarView({ user }: { user: any }) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const url = user.role === "Admin" ? "/api/bookings" : "/api/bookings/me";
        fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
            .then((r) => r.json())
            .then((d) => { setBookings(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [user.role]);

    // tạo lưới calendar
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const bookingsOnDay = (day: Date) =>
        bookings.filter((b) => {
            try { return isSameDay(parseISO(b.start_time), day); } catch { return false; }
        });

    const dayBookings = selectedDay ? bookingsOnDay(selectedDay) : [];

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Lịch phòng</h1>

            {/* Calendar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="font-bold text-slate-900 capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: vi })}
                    </h2>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
                    ))}
                </div>

                {/* Day grid */}
                {loading ? (
                    <div className="py-16 text-center text-slate-400">Đang tải...</div>
                ) : (
                    <div className="grid grid-cols-7">
                        {days.map((day) => {
                            const dayBk = bookingsOnDay(day);
                            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                            const inMonth = isSameMonth(day, currentMonth);
                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                                    className={`min-h-[80px] p-2 border-b border-r border-slate-100 text-left hover:bg-slate-50 transition-colors
                    ${!inMonth ? "bg-slate-50" : ""}
                    ${isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : ""}
                    ${isToday(day) ? "font-bold" : ""}
                  `}
                                >
                                    <span className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full
                    ${isToday(day) ? "bg-indigo-600 text-white" : inMonth ? "text-slate-900" : "text-slate-400"}`}>
                                        {format(day, "d")}
                                    </span>
                                    <div className="mt-1 space-y-0.5">
                                        {dayBk.slice(0, 3).map((b) => (
                                            <div key={b.id}
                                                className={`text-xs text-white px-1 rounded truncate ${STATUS_COLOR[b.status] ?? "bg-slate-400"}`}>
                                                {format(parseISO(b.start_time), "HH:mm")} {b.room_name}
                                            </div>
                                        ))}
                                        {dayBk.length > 3 && (
                                            <div className="text-xs text-slate-400">+{dayBk.length - 3} thêm</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Day detail panel */}
            {selectedDay && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4 capitalize">
                        {format(selectedDay, "EEEE, dd/MM/yyyy", { locale: vi })}
                    </h2>
                    {dayBookings.length === 0 ? (
                        <p className="text-slate-400 text-sm">Không có lịch đặt phòng nào trong ngày này.</p>
                    ) : (
                        <div className="space-y-3">
                            {dayBookings.map((b) => (
                                <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200">
                                    <div className={`w-2 h-full min-h-[40px] rounded-full flex-shrink-0 ${STATUS_COLOR[b.status] ?? "bg-slate-300"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 text-sm truncate">{b.room_name}</p>
                                        {user.role === "Admin" && <p className="text-xs text-slate-500">Người đặt: {b.user_name}</p>}
                                        <p className="text-xs text-slate-400">
                                            {isValid(parseISO(b.start_time)) ? format(parseISO(b.start_time), "HH:mm") : "?"} –{" "}
                                            {isValid(parseISO(b.end_time)) ? format(parseISO(b.end_time), "HH:mm") : "?"}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${b.status === "Approved" ? "bg-emerald-100 text-emerald-700"
                                            : b.status === "Rejected" ? "bg-red-100 text-red-700"
                                                : "bg-amber-100 text-amber-700"}`}>
                                        {STATUS_LABEL[b.status] ?? b.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full ${STATUS_COLOR[key]}`} />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}
