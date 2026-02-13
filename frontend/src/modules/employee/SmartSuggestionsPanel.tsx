import type { Booking } from "../../api/bookings";

const DAY_START_MINUTES = 9 * 60; // 09:00
const DAY_END_MINUTES = 17 * 60; // 17:00

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function bookingsToSlotsForDate(bookings: Booking[], dateStr: string): { startMinutes: number; endMinutes: number }[] {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  return bookings
    .filter(
      (b) =>
        b.startTime.startsWith(dateStr) &&
        (b.status === "APPROVED" || b.status === "RESCHEDULED")
    )
    .map((b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return {
        startMinutes: Math.floor((start - dayStart) / 60000) - 9 * 60,
        endMinutes: Math.floor((end - dayStart) / 60000) - 9 * 60
      };
    })
    .filter((s) => s.endMinutes > DAY_START_MINUTES - 9 * 60 && s.startMinutes < DAY_END_MINUTES - 9 * 60);
}

function findNextFreeOneHourSlot(slots: { startMinutes: number; endMinutes: number }[]): { startMinutes: number; endMinutes: number } | null {
  const start = 0;
  const end = DAY_END_MINUTES - DAY_START_MINUTES;
  const sorted = [...slots].sort((a, b) => a.startMinutes - b.startMinutes);
  let cursor = start;
  for (const slot of sorted) {
    if (slot.startMinutes - cursor >= 60) {
      return { startMinutes: cursor, endMinutes: cursor + 60 };
    }
    cursor = Math.max(cursor, slot.endMinutes);
  }
  if (end - cursor >= 60) {
    return { startMinutes: cursor, endMinutes: cursor + 60 };
  }
  return null;
}

function formatTime(minutesFromDayStart: number): string {
  const total = DAY_START_MINUTES + minutesFromDayStart;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function getLeastBusyDay(bookings: Booking[]): { day: string; totalHours: number } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const counts = DAY_NAMES.map((day, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + mondayOffset + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const onDay = bookings.filter(
      (b) =>
        b.startTime.startsWith(dateStr) &&
        (b.status === "APPROVED" || b.status === "RESCHEDULED" || b.status === "PENDING")
    );
    const totalMinutes = onDay.reduce((acc, b) => {
      const s = new Date(b.startTime).getTime();
      const e = new Date(b.endTime).getTime();
      return acc + (e - s) / 60000;
    }, 0);
    return { day, totalHours: totalMinutes / 60 };
  });
  return counts.reduce((least, cur) => (cur.totalHours < least.totalHours ? cur : least));
}

interface SmartSuggestionsPanelProps {
  bookings: Booking[];
}

export function SmartSuggestionsPanel({ bookings }: SmartSuggestionsPanelProps) {
  const today = todayDateStr();
  const slotsToday = bookingsToSlotsForDate(bookings, today);
  const slot = findNextFreeOneHourSlot(slotsToday);
  const leastBusy = getLeastBusyDay(bookings);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Smart booking suggestions
          </h2>
          <p className="text-[11px] text-slate-400">
            Based on current bookings for this room.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-200">
            Next available 1-hour slot today
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            {slot
              ? `${formatTime(slot.startMinutes)}–${formatTime(slot.endMinutes)}`
              : "No 1‑hour slot available today within 09:00–17:00."}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-200">
            Least busy day this week
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            {leastBusy.day} — {leastBusy.totalHours.toFixed(1)} hours booked.
          </p>
        </div>
      </div>
    </section>
  );
}
