import type { Booking } from "../../api/bookings";
import type { BookingRow } from "./BookingRequestsTable";
import { bookingToRow } from "./BookingRequestsTable";

interface AdminCalendarViewProps {
  bookings: Booking[];
  selectedDate: string;
  onDateChange: (next: string) => void;
  onSelectBooking: (row: BookingRow) => void;
}

const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00–18:00

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function classForBooking(b: Booking): string {
  if (b.type === "BLOCK") {
    return "bg-slate-600/70 border-slate-500 text-slate-50";
  }
  if (b.type === "EMERGENCY" || b.isEmergency) {
    return "bg-sky-500/70 border-sky-400 text-slate-50";
  }
  switch (b.status) {
    case "APPROVED":
      return "bg-emerald-500/70 border-emerald-400 text-slate-50";
    case "PENDING":
      return "bg-yellow-400/80 border-yellow-300 text-slate-900";
    case "REJECTED":
      return "bg-red-500/80 border-red-400 text-slate-50";
    case "CANCELLED":
    default:
      return "bg-slate-500/70 border-slate-400 text-slate-50";
  }
}

export function AdminCalendarView({
  bookings,
  selectedDate,
  onDateChange,
  onSelectBooking
}: AdminCalendarViewProps) {
  const dateObj = new Date(selectedDate);
  const todayStr = toDateStr(new Date());
  const headingLabel =
    selectedDate === todayStr
      ? "Today"
      : dateObj.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        });

  const forDay = bookings.filter((b) => b.startTime.startsWith(selectedDate));

  return (
    <section className="mt-3 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Calendar view
          </h2>
          <p className="text-[11px] text-slate-400">
            Daily time-based view for {headingLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-400">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/80">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] text-[11px]">
          {HOURS.map((hour) => {
            const slotStart = new Date(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`);
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(slotEnd.getHours() + 1);

            const inSlot = forDay.filter((b) => {
              const start = new Date(b.startTime).getTime();
              const end = new Date(b.endTime).getTime();
              return start < slotEnd.getTime() && end > slotStart.getTime();
            });

            return (
              <div
                key={hour}
                className="contents border-t border-slate-800/60 first:border-t-0"
              >
                <div className="flex items-start justify-end px-2 py-1 text-[11px] text-slate-500">
                  {formatHourLabel(hour)}
                </div>
                <div className="border-l border-slate-800/60 px-2 py-1">
                  <div className="flex flex-wrap gap-1.5">
                    {inSlot.length === 0 && (
                      <span className="text-[10px] text-slate-600">
                        —
                      </span>
                    )}
                    {inSlot.map((b) => {
                      const row = bookingToRow(b);
                      const label =
                        b.type === "BLOCK"
                          ? "Blocked"
                          : b.type === "EMERGENCY" || b.isEmergency
                            ? "Emergency"
                            : b.status === "APPROVED"
                              ? "Approved"
                              : b.status === "PENDING"
                                ? "Pending"
                                : b.status === "REJECTED"
                                  ? "Rejected"
                                  : b.status;
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => onSelectBooking(row)}
                          className={`inline-flex max-w-full flex-1 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] shadow-sm transition hover:-translate-y-0.5 hover:shadow ${classForBooking(
                            b
                          )}`}
                        >
                          <span className="truncate">
                            {row.title}
                          </span>
                          <span className="rounded-full bg-slate-950/40 px-1 py-px text-[9px] font-medium uppercase tracking-wide">
                            {label}
                          </span>
                          {b.rescheduled && (
                            <span className="shrink-0 rounded bg-amber-500/30 px-1 py-px text-[9px] text-amber-200">
                              Rescheduled
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

