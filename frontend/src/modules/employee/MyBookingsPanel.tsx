import type { Booking } from "../../api/bookings";
import { cancelBooking } from "../../api/bookings";

interface MyBookingsPanelProps {
  bookings: Booking[];
  userId: string | null | undefined;
  token: string | null;
  onChanged?: () => void;
}

function formatDate(dateIso: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTimeRange(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return "";
  const start = new Date(startIso);
  const end = new Date(endIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${startStr} – ${endStr}`;
}

function extractProject(notes?: string, purpose?: string): string {
  if (notes) {
    const match = /Project:\s*([^|]+)/i.exec(notes);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return purpose || "-";
}

export function MyBookingsPanel({ bookings, userId, token, onChanged }: MyBookingsPanelProps) {
  const mine = bookings.filter((b) => b.requesterId === (userId ?? ""));

  const handleCancel = async (bookingId: string) => {
    if (!token) return;
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirmed) return;
    try {
      await cancelBooking(token, bookingId);
      onChanged?.();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "Failed to cancel booking.");
    }
  };

  if (!mine.length) {
    return (
      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs sm:p-4">
        <h2 className="text-sm font-semibold text-slate-100">My bookings</h2>
        <p className="text-[11px] text-slate-400">
          You have not requested any bookings yet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs sm:p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">My bookings</h2>
          <p className="text-[11px] text-slate-400">
            Requests you have created, with their current status.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="px-2 py-1 font-medium">Date</th>
              <th className="px-2 py-1 font-medium">Time</th>
              <th className="px-2 py-1 font-medium">Project</th>
              <th className="px-2 py-1 font-medium">Purpose</th>
              <th className="px-2 py-1 font-medium">Status</th>
              <th className="px-2 py-1 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((b) => {
              const showCancel =
                (b.status === "PENDING" || b.status === "APPROVED") && b.type === "REQUEST";
              const project = extractProject(b.notes, b.purpose);
              return (
                <tr key={b.id} className="align-middle">
                  <td className="px-2 py-1">
                    <span className="rounded-md bg-slate-900/80 px-2 py-1 text-slate-100">
                      {formatDate(b.startTime)}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-slate-200">
                    {formatTimeRange(b.startTime, b.endTime)}
                  </td>
                  <td className="px-2 py-1 text-slate-200">{project}</td>
                  <td className="px-2 py-1 text-slate-200 truncate max-w-[120px]" title={b.purpose}>
                    {b.purpose || "-"}
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        b.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                          : b.status === "PENDING"
                            ? "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/40"
                            : b.status === "REJECTED"
                              ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/40"
                              : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/40"
                      }`}
                    >
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right">
                    {showCancel ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(b.id)}
                        className="inline-flex items-center rounded-full border border-red-500/70 bg-red-500/10 px-3 py-0.5 text-[10px] font-medium text-red-200 hover:bg-red-500/20"
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

