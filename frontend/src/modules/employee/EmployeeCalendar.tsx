import { getMonthStartWeekday, type DayStatus } from "./calendarData";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface CalendarDay {
  dateStr: string;
  day: number;
  status: DayStatus;
  isPast: boolean;
   isBookable: boolean;
   isFullyBooked: boolean;
}

interface EmployeeCalendarProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  days: CalendarDay[];
  selectedDate: string | null;
  onSelectDay: (dateStr: string) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function statusColor(status: DayStatus, isFullyBooked: boolean): string {
  switch (status) {
    case "BOOKED":
      return isFullyBooked ? "bg-red-500/80" : "bg-amber-700/80";
    case "BLOCKED":
      return "bg-red-500/80";
    case "PENDING":
      return "bg-yellow-400/80";
    case "EMERGENCY":
      return "bg-sky-500/80";
    default:
      return "bg-emerald-500/80";
  }
}

export function EmployeeCalendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  days,
  selectedDate,
  onSelectDay
}: EmployeeCalendarProps) {
  const startWeekday = getMonthStartWeekday(year, month);
  const leadingBlanks = Array.from({ length: startWeekday }, (_, i) => i);

  return (
    <section className="space-y-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Conference room calendar
          </h2>
          <p className="text-xs text-slate-400">
            High-level view of the room&apos;s usage. Past dates are read-only.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-slate-500"
          >
            Previous
          </button>
          <span className="min-w-[120px] text-center font-medium text-slate-200">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-slate-500"
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.55)] p-3 text-xs sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 text-[10px] text-slate-400 sm:gap-2 sm:text-[11px]">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-[10px] sm:gap-2 sm:text-[11px]">
          {leadingBlanks.map((i) => (
            <div key={`blank-${i}`} className="rounded-xl bg-slate-950/40 p-2" />
          ))}
          {days.map(({ dateStr, day, status, isPast, isBookable, isFullyBooked }) => {
            const isSelected = selectedDate === dateStr;
            const isDisabled = isPast || !isBookable;
            const colorClass = statusColor(status, isFullyBooked);
            const dayOfWeek = new Date(dateStr).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDay(dateStr)}
                disabled={isDisabled}
                className={`group flex flex-col items-center gap-1 rounded-xl border px-1.5 py-1.5 transition sm:px-2 sm:py-2 ${
                  isDisabled
                    ? "cursor-default border-slate-800/50 bg-slate-900/40 opacity-80"
                    : "border-slate-800/70 bg-slate-900/60 hover:border-slate-600/80"
                } ${isSelected ? "ring-2 ring-brand/60" : ""}`}
              >
                <span className="text-[10px] text-slate-200 sm:text-[11px]">{day}</span>
                <span
                  className={`h-1.5 w-6 rounded-full ${colorClass} ${!isDisabled ? "group-hover:scale-105" : ""}`}
                />
                {isPast && (
                  <span className="text-[9px] text-slate-500">Read-only</span>
                )}
                {!isPast && isWeekend && (
                  <span className="text-[9px] text-slate-500">Weekend</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
