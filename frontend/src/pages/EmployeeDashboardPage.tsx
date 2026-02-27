import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getBookings } from "../api/bookings";
import type { Booking } from "../api/bookings";
import {
  getCalendarDays,
  getSlotsForDate
} from "../modules/employee/calendarData";
import { EmployeeCalendar } from "../modules/employee/EmployeeCalendar";
import { EmployeeTimeline } from "../modules/employee/EmployeeTimeline";
import { AvailabilityHeatmap } from "../components/AvailabilityHeatmap";
import { BookingRequestModal } from "../modules/employee/BookingRequestModal";
import { EmployeeDashboardSkeleton } from "../modules/employee/EmployeeDashboardSkeleton";
import { SmartSuggestionsPanel } from "../modules/employee/SmartSuggestionsPanel";
import { MyBookingsPanel } from "../modules/employee/MyBookingsPanel";

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const other = new Date(date);
  other.setHours(0, 0, 0, 0);
  if (other.getTime() === today.getTime()) return "Today's schedule";
  return `Schedule for ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function EmployeeDashboardPage() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const list = await getBookings(token);
      setBookings(list);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchBookings();
    } else {
      setLoading(false);
      setBookings([]);
    }
  }, [token, fetchBookings]);

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    todayDateStr()
  );

  const userId = user?.id;
  const role = user?.role;

  const days = useMemo(
    () =>
      getCalendarDays(
        bookings,
        calendarMonth.year,
        calendarMonth.month,
        userId,
        role
      ),
    [bookings, calendarMonth.year, calendarMonth.month, userId, role]
  );

  const timelineDate = selectedDate ?? todayDateStr();
  const timelineSlots = useMemo(
    () => getSlotsForDate(bookings, timelineDate, userId, role),
    [bookings, timelineDate, userId, role]
  );
  const timelineDateLabel = formatDateLabel(timelineDate);

  const goPrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 1)
        return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 12)
        return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const initialModalDate = (() => {
    const d = selectedDate ?? todayDateStr();
    const [y, m, day] = d.split("-").map(Number);
    const sel = new Date(y, m - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sel.setHours(0, 0, 0, 0);
    return sel < today ? todayDateStr() : d;
  })();

  if (loading) {
    return <EmployeeDashboardSkeleton />;
  }

  return (
    <>
      <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <EmployeeCalendar
            year={calendarMonth.year}
            month={calendarMonth.month}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            days={days}
            selectedDate={selectedDate}
            onSelectDay={handleSelectDay}
          />
          <AvailabilityHeatmap bookings={bookings} />
          <MyBookingsPanel
            bookings={bookings}
            userId={userId}
            token={token}
            onChanged={fetchBookings}
          />
        </div>
        <div className="mt-4 w-full space-y-4 lg:mt-0 lg:w-[360px] lg:shrink-0">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-sm font-semibold text-slate-100">
                Employee dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Request time in the conference room and review the day at a
                glance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-brand/40 hover:bg-brand-soft sm:w-auto"
            >
              Request booking
            </button>
          </div>
          {bookings.some(
            (b) => b.requesterId === userId && b.rescheduled
          ) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-100">
              <p className="font-medium text-amber-200">
                This booking has been rescheduled by HR.
              </p>
              <p className="mt-1 text-amber-100/90">
                Check your email for the new date and time. Contact HR if you have questions.
              </p>
            </div>
          )}
          <EmployeeTimeline slots={timelineSlots} dateLabel={timelineDateLabel} />
          <SmartSuggestionsPanel bookings={bookings} />
        </div>
      </div>

      <BookingRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={initialModalDate}
        token={token}
        onCreated={fetchBookings}
        bookings={bookings}
        userId={userId}
      />
    </>
  );
}
