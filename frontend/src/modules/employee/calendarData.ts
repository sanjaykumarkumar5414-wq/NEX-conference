/**
 * Derive calendar, timeline, and heatmap from API bookings.
 * No mock data — all state from GET /api/bookings.
 */

import type { Booking } from "../../api/bookings";

const HOURS = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30"
];
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

export type DayStatus = "FREE" | "PENDING" | "BOOKED" | "EMERGENCY" | "BLOCKED";

function bookingToDateStr(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStartMonday(date: Date): Date {
  const d = startOfDay(date);
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  return startOfDay(d);
}

export function isDateBookable(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = startOfDay(new Date(y, m - 1, d));
  const today = startOfDay(new Date());

  if (date < today) return false;

  const dayOfWeek = date.getDay();
  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const weekStartToday = getWeekStartMonday(today);
  const weekStartDate = getWeekStartMonday(date);
  const diffDays = (weekStartDate.getTime() - weekStartToday.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) {
    // Current week (Mon–Fri), non-weekend, non-past
    return true;
  }

  if (diffDays === 7) {
    // Next week: opens on Thursday of the current week and stays open through Sunday
    const todayRawDow = today.getDay(); // 0 = Sun
    const effectiveDow = todayRawDow === 0 ? 7 : todayRawDow; // Treat Sunday as 7
    return effectiveDow >= 4; // Thu (4), Fri (5), Sat (6), Sun (7)
  }

  // More than one week ahead (or before current week)
  return false;
}

function isDayFullyBooked(bookingsOnDay: Booking[], dateStr: string): boolean {
  if (!bookingsOnDay.length) return false;

  const relevant = bookingsOnDay.filter((b) => {
    if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
    const isBlock = b.type === "BLOCK";
    const isEmergency = b.isEmergency || b.type === "EMERGENCY";
    const isApproved = b.status === "APPROVED" || b.status === "RESCHEDULED";
    return isBlock || isEmergency || isApproved;
  });

  if (!relevant.length) return false;

  const workStart = new Date(`${dateStr}T${String(WORK_START_HOUR).padStart(2, "0")}:00:00`);
  const workEnd = new Date(`${dateStr}T${String(WORK_END_HOUR).padStart(2, "0")}:00:00`);
  const workStartMs = workStart.getTime();
  const workEndMs = workEnd.getTime();

  const intervals: Array<[number, number]> = relevant
    .map((b) => {
      const start = Math.max(new Date(b.startTime).getTime(), workStartMs);
      const end = Math.min(new Date(b.endTime).getTime(), workEndMs);
      return [start, end] as [number, number];
    })
    .filter(([start, end]) => end > start);

  if (!intervals.length) return false;

  intervals.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let [currentStart, currentEnd] = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    const [s, e] = intervals[i];
    if (s <= currentEnd) {
      currentEnd = Math.max(currentEnd, e);
    } else {
      covered += currentEnd - currentStart;
      currentStart = s;
      currentEnd = e;
    }
  }
  covered += currentEnd - currentStart;

  const fullSpan = workEndMs - workStartMs;
  return covered >= fullSpan;
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
): { dateStr: string; day: number; status: DayStatus; isPast: boolean; isBookable: boolean; isFullyBooked: boolean }[] {
  const forAvailability = bookingsForAvailability(bookings, userId, role);
  const last = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: {
    dateStr: string;
    day: number;
    status: DayStatus;
    isPast: boolean;
    isBookable: boolean;
    isFullyBooked: boolean;
  }[] = [];
  for (let d = 1; d <= last; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const onDay = forAvailability.filter((b) => bookingToDateStr(b.startTime) === dateStr);
    const isPast = new Date(year, month - 1, d) < today;
    const isBookable = !isPast && isDateBookable(dateStr);
    days.push({
      dateStr,
      day: d,
      status: statusForBookings(onDay),
      isPast,
      isBookable,
      isFullyBooked: isDayFullyBooked(onDay, dateStr)
    });
  }
  return days;
}

export function getSlotsForDate(
  bookings: Booking[],
  dateStr: string,
  userId?: string,
  role?: string
): { label: string; status: DayStatus; endLabel?: string }[] {
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
    const status = statusForBookings(overlapping);

    let endLabel: string | undefined;
    if (status !== "FREE" && overlapping.length > 0) {
      const latestEndMs = Math.max(
        ...overlapping.map((b) => new Date(b.endTime).getTime())
      );
      const latestEnd = new Date(latestEndMs);
      const hh = String(latestEnd.getHours()).padStart(2, "0");
      const mm = String(latestEnd.getMinutes()).padStart(2, "0");
      endLabel = `${hh}:${mm}`;
    }

    return { label, status, endLabel };
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
