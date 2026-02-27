import { useEffect, useRef, useState, type FormEvent } from "react";
import { createBooking, type Booking } from "../../api/bookings";
import { isDateBookable } from "./calendarData";

interface BookingRequestModalProps {
  open: boolean;
  onClose: () => void;
  /** Default date (YYYY-MM-DD); must be today or future. */
  initialDate?: string;
  token: string | null;
  onCreated?: () => void;
  bookings: Booking[];
  userId: string | null | undefined;
}

const PROJECT_OPTIONS = ["Fuso", "Infra", "Testing", "HR", "Rakuten", "other"];

const PURPOSE_GROUPS: { label: string; options: string[] }[] = [
  { label: "Client Related", options: ["Client Interview", "Client Discussion", "Client Meeting", "Client Presentation"] },
  { label: "Internal", options: ["Internal Meeting", "Team Sync", "Workshop"] },
  { label: "Executive", options: ["CEO Meeting", "Board Meeting"] },
  { label: "General", options: ["Interview", "Others"] }
];

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function BookingRequestModal({
  open,
  onClose,
  initialDate,
  token,
  onCreated,
  bookings,
  userId
}: BookingRequestModalProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeStartRef = useRef<HTMLInputElement>(null);
  const timeEndRef = useRef<HTMLInputElement>(null);
  const purposeRef = useRef<HTMLSelectElement>(null);
  const othersTextRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState("");
  const [project, setProject] = useState("");
  const [specifyProject, setSpecifyProject] = useState("");
  const defaultDate = initialDate && initialDate >= todayDateStr() ? initialDate : todayDateStr();

  useEffect(() => {
    if (open) {
      setSelectedPurpose("");
      setProject("");
      setSpecifyProject("");
    }
  }, [open]);

  if (!open) return null;

  const isOthers = selectedPurpose === "Others";
  const isProjectOther = project === "other";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const dateValue = dateInputRef.current?.value;
    if (!dateValue || dateValue < todayDateStr()) {
      setSubmitError("Please select today or a future date.");
      return;
    }
    const startTimeValue = timeStartRef.current?.value;
    const endTimeValue = timeEndRef.current?.value;
    if (!startTimeValue || !endTimeValue) {
      setSubmitError("Please select start and end time.");
      return;
    }
    const startTime = `${dateValue}T${startTimeValue}:00`;
    const endTime = `${dateValue}T${endTimeValue}:00`;
    if (new Date(endTime) <= new Date(startTime)) {
      setSubmitError("End time must be after start time.");
      return;
    }

    if (!isDateBookable(dateValue)) {
      setSubmitError(
        "Selected date is not bookable. You can book weekdays in the current week only; next week opens on Thursday."
      );
      return;
    }
    const projectValue = project.trim();
    if (!projectValue) {
      setSubmitError("Please select a project.");
      return;
    }
    if (isProjectOther) {
      const customProject = specifyProject.trim();
      if (!customProject) {
        setSubmitError("Please specify the project.");
        return;
      }
    }
    const purposeValue = purposeRef.current?.value ?? "";
    if (!purposeValue) {
      setSubmitError("Please select a purpose.");
      return;
    }
    if (purposeValue === "Others") {
      const customText = othersTextRef.current?.value?.trim() ?? "";
      if (!customText) {
        setSubmitError("Please specify the meeting purpose.");
        return;
      }
    }
    if (!token) {
      setSubmitError("You must be signed in to request a booking.");
      return;
    }
    const title = purposeValue === "Others"
      ? (othersTextRef.current?.value?.trim() ?? "Other")
      : purposeValue;
    if (userId) {
      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);
      const newStartMs = newStart.getTime();
      const newEndMs = newEnd.getTime();

      const sameDayUserBookings = bookings.filter((b) => {
        if (b.requesterId !== userId) return false;
        if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
        const existingDate = b.startTime.slice(0, 10);
        return existingDate === dateValue;
      });

      const intervals: Array<[number, number]> = sameDayUserBookings.map((b) => [
        new Date(b.startTime).getTime(),
        new Date(b.endTime).getTime()
      ]);
      intervals.push([newStartMs, newEndMs]);

      intervals.sort((a, b) => a[0] - b[0]);
      let totalMs = 0;
      if (intervals.length > 0) {
        let [currentStart, currentEnd] = intervals[0];
        for (let i = 1; i < intervals.length; i++) {
          const [s, e] = intervals[i];
          if (s <= currentEnd) {
            currentEnd = Math.max(currentEnd, e);
          } else {
            totalMs += currentEnd - currentStart;
            currentStart = s;
            currentEnd = e;
          }
        }
        totalMs += currentEnd - currentStart;
      }
      const totalHours = totalMs / (1000 * 60 * 60);
      if (totalHours > 2) {
        setSubmitError("You can book a maximum of 2 hours per day.");
        return;
      }

      const startOfWeek = (iso: string): string => {
        const [y, m, d] = iso.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        date.setDate(date.getDate() + mondayOffset);
        const yy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      };

      const newWeekStart = startOfWeek(dateValue);
      const userActiveBookings = bookings.filter((b) => {
        if (b.requesterId !== userId) return false;
        if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
        const existingDate = b.startTime.slice(0, 10);
        return startOfWeek(existingDate) === newWeekStart;
      });

      const uniqueDays = new Set<string>(
        userActiveBookings.map((b) => b.startTime.slice(0, 10))
      );
      uniqueDays.add(dateValue);

      if (uniqueDays.size > 3) {
        setSubmitError("You can book a maximum of 3 slots per week.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const projectToSave = isProjectOther ? specifyProject.trim() : projectValue;
      await createBooking(token, {
        title,
        purpose: title,
        startTime,
        endTime,
        project: projectToSave
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-3 py-4 sm:px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-black/50 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Request a booking
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Submit a request for the conference room. HR will review and approve
              based on availability and internal rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
          >
            Esc
          </button>
        </div>

        <form
          className="mt-4 space-y-4 text-xs"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="booking-date"
                className="block text-slate-200"
              >
                Date
              </label>
              <input
                key={open ? defaultDate : "closed"}
                ref={dateInputRef}
                id="booking-date"
                type="date"
                defaultValue={defaultDate}
                min={todayDateStr()}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-200">Time</label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                <input
                  ref={timeStartRef}
                  type="time"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <span className="text-[10px] text-slate-500 text-center">
                  to
                </span>
                <input
                  ref={timeEndRef}
                  type="time"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="project"
              className="block text-slate-200"
            >
              Project <span className="text-red-400">*</span>
            </label>
            <select
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="" disabled>
                Select project
              </option>
              {PROJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {isProjectOther && (
            <div className="space-y-1">
              <label
                htmlFor="specify-project"
                className="block text-slate-200"
              >
                Specify Project <span className="text-red-400">*</span>
              </label>
              <input
                id="specify-project"
                type="text"
                value={specifyProject}
                onChange={(e) => setSpecifyProject(e.target.value)}
                placeholder="Enter project name"
                className="w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="purpose"
              className="block text-slate-200"
            >
              Purpose
            </label>
            <select
              ref={purposeRef}
              id="purpose"
              className="w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              defaultValue=""
              onChange={(e) => setSelectedPurpose(e.target.value)}
            >
              <option value="" disabled>
                Select purpose
              </option>
              {PURPOSE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {isOthers && (
            <div className="space-y-1">
              <label
                htmlFor="purpose-others"
                className="block text-slate-200"
              >
                Specify purpose <span className="text-red-400">*</span>
              </label>
              <input
                ref={othersTextRef}
                id="purpose-others"
                type="text"
                required={isOthers}
                placeholder="Enter meeting purpose"
                className="w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="notes"
              className="block text-slate-200"
            >
              Additional notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Context, attendees, or any special requirements."
            />
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
              {submitError}
            </div>
          )}

          {/* Conflict preview warning – non-blocking */}
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-200">
            <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-yellow-400" />
            <div>
              <p className="font-medium">Potential conflict detected</p>
              <p className="text-[11px] text-yellow-100/80">
                This time window overlaps an existing booking in the visual
                schedule. You can still submit your request; HR will resolve any
                conflicts during approval.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-500">
              Submitting does not guarantee a booking. You&apos;ll receive an
              update once HR reviews your request.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-brand/40 hover:bg-brand-soft disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
