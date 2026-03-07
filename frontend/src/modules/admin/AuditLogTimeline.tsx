import { useEffect, useState } from "react";
import { getAuditLog, type AuditEntry } from "../../api/bookings";

interface AuditLogTimelineProps {
  token: string | null;
  /** Change to refetch (e.g. after approve/reject/reschedule) */
  refreshKey?: number;
}

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function entryLabel(type: string): string {
  switch (type) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RESCHEDULED":
      return "Rescheduled";
    default:
      return type;
  }
}

export function AuditLogTimeline({ token, refreshKey }: AuditLogTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAuditLog(token)
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  return (
    <section className="space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.55)] p-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Audit log</h2>
          <p className="text-[11px] text-slate-400">
            Timeline of changes made to bookings for this room.
          </p>
        </div>
      </div>

      <div className="relative mt-2">
        <div className="absolute left-[6px] top-0 h-full w-px bg-slate-800" />
        <ul className="space-y-3">
          {loading && entries.length === 0 ? (
            <li className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-4 text-center text-[11px] text-slate-500">
              Loading…
            </li>
          ) : entries.length === 0 ? (
            <li className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-6 text-center text-[11px] text-slate-500">
              No audit events yet. Approve, reject, or reschedule bookings to see activity here.
            </li>
          ) : (
            entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2.5 pl-4"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-[1px] text-[10px] ${
                      entry.type === "APPROVED"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : entry.type === "REJECTED"
                          ? "border-red-500/50 bg-red-500/10 text-red-300"
                          : entry.type === "RESCHEDULED"
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                            : "border-slate-600 bg-slate-800/80 text-slate-400"
                    }`}
                  >
                    {entryLabel(entry.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-200">{entry.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {formatAt(entry.at)}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
