export type SlotStatus = "FREE" | "PENDING" | "BOOKED" | "EMERGENCY" | "BLOCKED";

export interface TimelineSlot {
  label: string;
  status: SlotStatus;
}

function statusToClasses(status: string) {
  switch (status) {
    case "BOOKED":
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

interface EmployeeTimelineProps {
  slots: TimelineSlot[];
  dateLabel?: string;
}

export function EmployeeTimeline({ slots, dateLabel = "Today's schedule" }: EmployeeTimelineProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            {dateLabel}
          </h2>
          <p className="text-xs text-slate-400">
            Timeline of requests and confirmed bookings for the room.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
        <div className="relative max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <div
              key={slot.label}
              className="flex items-center gap-3"
            >
              <div className="w-12 shrink-0 text-[11px] text-slate-400">
                {slot.label}
              </div>
              <div className="relative flex-1">
                <div className="h-7 rounded-full bg-slate-900/80">
                  <div
                    className={`h-7 w-2/3 rounded-full transition-all duration-200 ${statusToClasses(
                      slot.status
                    )}`}
                  />
                </div>
              </div>
              <div className="w-28 shrink-0 text-right text-[11px] text-slate-400">
                {slot.status === "FREE"
                  ? "Free"
                  : slot.status === "PENDING"
                    ? "Pending"
                    : slot.status === "EMERGENCY"
                      ? "Emergency"
                      : slot.status === "BLOCKED"
                        ? "Blocked by HR"
                        : "Booked"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

