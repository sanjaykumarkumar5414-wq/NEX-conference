import type { Booking } from "../../api/bookings";

export type BookingRow = {
  id: string;
  requester: string;
  title: string;
  date: string;
  timeRange: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  isEmergency?: boolean;
  rescheduled?: boolean;
};

export function bookingToRow(b: Booking): BookingRow {
  const start = new Date(b.startTime);
  const end = new Date(b.endTime);
  const dateStr = b.startTime.slice(0, 10);
  const timeRange = `${formatTime(start)} – ${formatTime(end)}`;
  return {
    id: b.id,
    requester: b.requesterName || b.requesterEmail || "Unknown",
    title: b.title,
    date: dateStr,
    timeRange,
    status: b.status,
    isEmergency: b.isEmergency,
    rescheduled: b.rescheduled
  };
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface BookingRequestsTableProps {
  bookings: Booking[];
  selectedStatus: "ALL" | BookingRow["status"];
  onSelectBooking: (booking: BookingRow) => void;
}

function statusBadgeClasses(status: BookingRow["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/50";
    case "REJECTED":
      return "bg-red-500/10 text-red-300 border-red-500/50";
    case "CANCELLED":
      return "bg-slate-500/10 text-slate-300 border-slate-500/50";
    default:
      return "bg-yellow-400/10 text-yellow-200 border-yellow-400/60";
  }
}

export function BookingRequestsTable({
  bookings,
  selectedStatus,
  onSelectBooking
}: BookingRequestsTableProps) {
  const rows = bookings.map(bookingToRow);
  const filtered =
    selectedStatus === "ALL"
      ? rows
      : rows.filter((row) => row.status === selectedStatus);

  return (
    <section className="flex flex-1 flex-col space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.55)] p-4 text-xs">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Booking requests
          </h2>
          <p className="text-[11px] text-slate-400">
            Review and manage all employee requests for the conference room.
          </p>
        </div>
      </div>

      <div className="mt-1 -mx-2 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/90">
        <div className="max-h-80 overflow-y-auto">
          <table className="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-[1] bg-slate-950/95">
              <tr className="text-slate-400">
                <th className="py-2 pl-4 pr-2 text-left font-medium">Date</th>
                <th className="px-2 py-2 text-left font-medium">Time</th>
                <th className="px-2 py-2 text-left font-medium">Title</th>
                <th className="px-2 py-2 text-left font-medium">Requester</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={row.id}
                  className={
                    index % 2 === 0
                      ? "bg-slate-950/0"
                      : "bg-slate-900/40"
                  }
                >
                  <td className="py-2 pl-4 pr-2 text-slate-200">
                    {row.date}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {row.timeRange}
                  </td>
                  <td className="px-2 py-2 text-slate-200">
                    {row.title}
                    {row.isEmergency && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-[1px] text-[10px] font-medium text-sky-300">
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-sky-400/70 bg-slate-950 text-[9px] leading-none">
                          !
                        </span>
                        Emergency
                      </span>
                    )}
                    {row.rescheduled && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-[1px] text-[10px] font-medium text-amber-200">
                        Rescheduled
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {row.requester}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] transition-transform duration-150 hover:-translate-y-0.5 ${statusBadgeClasses(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectBooking(row)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-slate-100 transition-transform transition-colors duration-150 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-[11px] text-slate-500"
                  >
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      <span>No bookings match the selected filter.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
