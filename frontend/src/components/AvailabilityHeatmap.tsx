/**
 * Shared Availability Heatmap — real data, current week Mon–Fri, 09:00–18:00.
 * Reads from central booking state; updates when bookings change (approve, reject, block, reschedule).
 */

import { useMemo } from "react";
import type { Booking } from "../api/bookings";

export type HeatmapCellStatus =
  | "FREE"
  | "PENDING"
  | "BOOKED"
  | "EMERGENCY"
  | "BLOCKED";

export interface HeatmapCell {
  dateStr: string;
  dayLabel: string;
  hour: number;
  status: HeatmapCellStatus;
}

/** Get Monday of the current week (local date) as YYYY-MM-DD */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Priority: BLOCK/EMERGENCY > APPROVED/RESCHEDULED > PENDING > FREE */
function statusForOverlapping(bookings: Booking[]): HeatmapCellStatus {
  const hasBlock = bookings.some((b) => b.type === "BLOCK");
  const hasEmergency = bookings.some(
    (b) => b.type === "EMERGENCY" || b.isEmergency
  );
  const hasApproved = bookings.some(
    (b) => b.status === "APPROVED" || b.status === "RESCHEDULED"
  );
  const hasPending = bookings.some((b) => b.status === "PENDING");

  if (hasBlock) return "BLOCKED";
  if (hasEmergency) return "EMERGENCY";
  if (hasApproved) return "BOOKED";
  if (hasPending) return "PENDING";
  return "FREE";
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 09:00–18:00 (9 one-hour slots)

function buildHeatmapMatrix(bookings: Booking[]): HeatmapCell[][] {
  const mondayStr = getCurrentWeekMonday();
  const matrix: HeatmapCell[][] = [];

  for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
    const dateStr = addDays(mondayStr, dayIndex);
    const row: HeatmapCell[] = [];

    for (const hour of HOURS) {
      const cellStart = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00`);
      const cellEnd = new Date(`${dateStr}T${String(hour + 1).padStart(2, "0")}:00:00`);
      const cellStartMs = cellStart.getTime();
      const cellEndMs = cellEnd.getTime();

      const overlapping = bookings.filter((b) => {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        return start < cellEndMs && end > cellStartMs;
      });

      row.push({
        dateStr,
        dayLabel: WEEKDAY_LABELS[dayIndex],
        hour,
        status: statusForOverlapping(overlapping)
      });
    }
    matrix.push(row);
  }
  return matrix;
}

function statusColor(status: HeatmapCellStatus): string {
  switch (status) {
    case "BOOKED":
      return "bg-red-500/90";
    case "PENDING":
      return "bg-yellow-400/90";
    case "EMERGENCY":
    case "BLOCKED":
      return "bg-sky-500/90";
    default:
      return "bg-emerald-500/90";
  }
}

interface AvailabilityHeatmapProps {
  /** All bookings (requests, approved, blocks, emergency) — same state as admin/employee dashboards */
  bookings: Booking[];
}

export function AvailabilityHeatmap({ bookings }: AvailabilityHeatmapProps) {
  const matrix = useMemo(() => buildHeatmapMatrix(bookings), [bookings]);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Availability heatmap
          </h2>
          <p className="text-xs text-slate-400">
            Current week (Mon–Fri), 09:00–18:00. Real-time room availability from bookings and blocks.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <LegendPill color="bg-emerald-500/90" label="Free" />
            <LegendPill color="bg-yellow-400/90" label="Pending" />
            <LegendPill color="bg-red-500/90" label="Approved" />
            <LegendPill color="bg-sky-500/90" label="Block / Emergency" />
          </div>
          <span className="text-slate-500">
            Each cell = 1 hour · Current week only
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div
            className="inline-grid gap-1 text-[11px]"
            style={{
              gridTemplateColumns: `64px repeat(${HOURS.length}, minmax(0, 1fr))`
            }}
          >
            <div />
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="px-1 text-center text-slate-400"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}

            {matrix.map((row, rowIndex) => (
              <div key={row[0]?.dateStr ?? rowIndex} className="contents">
                <div className="flex items-center pr-2 text-right text-slate-400">
                  {row[0]?.dayLabel}
                </div>
                {row.map((cell) => (
                  <div
                    key={`${cell.dateStr}-${cell.hour}`}
                    className={`h-5 min-w-[28px] rounded-sm ${statusColor(
                      cell.status
                    )} shadow-[0_0_0_1px_rgba(15,23,42,0.75)]`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface LegendPillProps {
  color: string;
  label: string;
}

function LegendPill({ color, label }: LegendPillProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-slate-950/70 px-2.5 py-1">
      <span className={`h-2 w-4 rounded-full ${color}`} />
      <span className="text-[11px] text-slate-200">{label}</span>
    </div>
  );
}
