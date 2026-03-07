export type SlotStatus = "FREE" | "PENDING" | "BOOKED" | "EMERGENCY" | "BLOCKED";

export interface TimelineSlot {
  label: string;
  status: SlotStatus;
  endLabel?: string;
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

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs sm:p-4">
        <div className="relative max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
          {slots.map((slot) => (
            <div
              key={slot.label}
              className="flex items-center gap-2"
            >
              <div className="w-10 shrink-0 text-[10px] text-slate-400 sm:w-12 sm:text-[11px]">
                {slot.endLabel && slot.status !== "FREE"
                  ? `${slot.label} – ${slot.endLabel}`
                  : slot.label}
              </div>
              <div className="relative flex-1">
                <div className="h-6 rounded-full bg-slate-900/80 sm:h-7">
                  <div
                    className={`h-6 w-2/3 rounded-full transition-all duration-200 sm:h-7 ${statusToClasses(
                      slot.status
                    )}`}
                  />
                </div>
              </div>
              <div className="w-20 shrink-0 text-right text-[10px] text-slate-400 sm:w-28 sm:text-[11px]">
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

