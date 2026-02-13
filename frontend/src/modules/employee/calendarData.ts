/**
 * Derive calendar, timeline, and heatmap from API bookings.
 * No mock data — all state from GET /api/bookings.
 */

import type { Booking } from "../../api/bookings";

const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];

export type DayStatus = "FREE" | "PENDING" | "BOOKED" | "EMERGENCY" | "BLOCKED";

function bookingToDateStr(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * For calendar/timeline/heatmap: use full list.
 * Backend returns for employees: availability (approved/rescheduled/BLOCK/EMERGENCY) + own bookings.
 * Personal filtering (e.g. "My Requests") is done in the dashboard, not here.
 */
function bookingsForAvailability(
  bookings: Booking[],
  _userId?: string,
  role?: string
): Booking[] {
  if (role === "ADMIN") return bookings;
  return bookings;
}

function statusForBookings(bookingsOnDay: Booking[]): DayStatus {
  const hasBlock = bookingsOnDay.some((b) => b.type === "BLOCK");
  const hasEmergency = bookingsOnDay.some((b) => b.isEmergency || b.type === "EMERGENCY");
  const hasApproved = bookingsOnDay.some(
    (b) => b.status === "APPROVED" || b.status === "RESCHEDULED"
  );
  const hasPending = bookingsOnDay.some((b) => b.status === "PENDING");
  if (hasBlock) return "BLOCKED";
  if (hasEmergency) return "EMERGENCY";
  if (hasApproved) return "BOOKED";
  if (hasPending) return "PENDING";
  return "FREE";
}

export function getCalendarDays(
  bookings: Booking[],
  year: number,
  month: number,
  userId?: string,
  role?: string
): { dateStr: string; day: number; status: DayStatus; isPast: boolean }[] {
  const forAvailability = bookingsForAvailability(bookings, userId, role);
  const last = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { dateStr: string; day: number; status: DayStatus; isPast: boolean }[] = [];
  for (let d = 1; d <= last; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const onDay = forAvailability.filter((b) => bookingToDateStr(b.startTime) === dateStr);
    const isPast = new Date(year, month - 1, d) < today;
    days.push({
      dateStr,
      day: d,
      status: statusForBookings(onDay),
      isPast
    });
  }
  return days;
}

export function getSlotsForDate(
  bookings: Booking[],
  dateStr: string,
  userId?: string,
  role?: string
): { label: string; status: DayStatus }[] {
  const forAvailability = bookingsForAvailability(bookings, userId, role);
  const onDay = forAvailability.filter((b) => bookingToDateStr(b.startTime) === dateStr);
  return HOURS.map((label) => {
    const [h, m] = label.split(":").map(Number);
    const slotStart = new Date(dateStr);
    slotStart.setHours(h, m, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);
    const overlapping = onDay.filter((b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      const s = slotStart.getTime();
      const e = slotEnd.getTime();
      return start < e && end > s;
    });
    return { label, status: statusForBookings(overlapping) };
  });
}

export function getMonthStartWeekday(year: number, month: number): number {
  const d = new Date(year, month - 1, 1);
  const w = d.getDay();
  return w === 0 ? 6 : w - 1;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
