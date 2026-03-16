import { useRef, useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { updateBookingStatus, rescheduleBooking } from "../../api/bookings";
import type { Booking } from "../../api/bookings";

type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type Action = "APPROVE" | "REJECT" | "RESCHEDULE";

function hasOverlap(
  excludeId: string,
  newStart: string,
  newEnd: string,
  bookings: Booking[]
): boolean {
  const startMs = new Date(newStart).getTime();
  const endMs = new Date(newEnd).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
    return true;
  return bookings.some((b) => {
    if (b.id === excludeId) return false;
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    const overlaps = bStart < endMs && bEnd > startMs;
    const blocks =
      b.status === "APPROVED" ||
      b.status === "PENDING" ||
      b.type === "BLOCK";
    return overlaps && blocks;
  });
}

interface BookingActionModalProps {
  open: boolean;
  bookingId?: string;
  booking?: Booking | null;
  currentStatus?: BookingStatus;
  allBookings?: Booking[];
  onClose: () => void;
  token: string | null;
  onSuccess?: () => void;
  /** Called after successful reschedule (e.g. to show success toast) */
  onRescheduleSuccess?: () => void;
}

export function BookingActionModal({
  open,
  bookingId,
  booking,
  currentStatus,
  allBookings = [],
  onClose,
  token,
  onSuccess,
  onRescheduleSuccess
}: BookingActionModalProps) {
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [action, setAction] = useState<Action>("APPROVE");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [timeSlotError, setTimeSlotError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    const d = booking.startTime.slice(0, 10);
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    setNewDate(d);
    setNewStartTime(
      `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
    );
    setNewEndTime(
      `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
    );
    setRescheduleReason("");
    setAction("APPROVE");
    setSubmitError(null);
    setTimeSlotError(false);
  }, [open, booking]);

  useEffect(() => {
    if (open) {
      window.scrollTo(0, 0);
    }
  }, [open]);

  if (!open || !bookingId) return null;

  const isReschedule = action === "RESCHEDULE";
  const isReject = action === "REJECT";
  const canReschedule =
    booking &&
    booking.type !== "BLOCK" &&
    booking.status !== "REJECTED" &&
    booking.status !== "CANCELLED";

  const newStartISO =
    newDate && newStartTime
      ? `${newDate}T${newStartTime}:00`
      : "";
  const newEndISO =
    newDate && newEndTime
      ? `${newDate}T${newEndTime}:00`
      : "";
  const hasConflict =
    isReschedule &&
    newStartISO &&
    newEndISO &&
    hasOverlap(bookingId, newStartISO, newEndISO, allBookings);
  const startBeforeEnd =
    newStartTime && newEndTime ? newStartTime < newEndTime : true;
  const canSaveReschedule =
    isReschedule &&
    newDate &&
    newStartTime &&
    newEndTime &&
    rescheduleReason.trim().length > 0 &&
    startBeforeEnd &&
    !hasConflict;

  const runShake = () => {
    setShake(true);
    setTimeSlotError(true);
    const t = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(t);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setTimeSlotError(false);

    if (!token) {
      setSubmitError("You must be signed in.");
      return;
    }

    if (action === "RESCHEDULE") {
      const reasonText = rescheduleReason.trim();
      if (!newDate || !newStartTime || !newEndTime) {
        setSubmitError("Please set new date and times.");
        return;
      }
      if (newStartTime >= newEndTime) {
        setSubmitError("New start time must be before new end time.");
        return;
      }
      if (!reasonText) {
        setSubmitError("Reason for reschedule is required.");
        return;
      }
      if (hasConflict) {
        runShake();
        setSubmitError("Selected slot is not available.");
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        await rescheduleBooking(token, {
          bookingId,
          newDate,
          newStartTime,
          newEndTime,
          reason: reasonText
        });
        onSuccess?.();
        onRescheduleSuccess?.();
        onClose();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to reschedule booking."
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action !== "APPROVE" && action !== "REJECT") return;
    const reason = reasonRef.current?.value?.trim() ?? "";
    if (action === "REJECT" && !reason) {
      setSubmitError("A reason is required for rejections.");
      return;
    }
    setSubmitting(true);
    try {
      await updateBookingStatus(token, bookingId, {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        reason: action === "REJECT" ? reason : undefined
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to update booking."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputTransition =
    "transition-all duration-200 ease-out";
  const timeInputClass = timeSlotError
    ? `rounded-lg border-2 border-red-500/80 bg-red-500/10 px-2 py-1.5 text-[11px] text-slate-50 ${inputTransition}`
    : `rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${inputTransition}`;

  const modalContent = (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 text-xs shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Manage booking
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Approve, reject, or reschedule this booking.
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

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div
            className={`grid grid-cols-3 gap-2 text-[11px] ${inputTransition}`}
          >
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 transition-all duration-200 ${
                action === "APPROVE"
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-100"
                  : "border-slate-700/80 bg-slate-900/50 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="action"
                value="APPROVE"
                checked={action === "APPROVE"}
                onChange={() => setAction("APPROVE")}
                className="h-3 w-3 border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
              />
              <span className="font-medium">Approve</span>
              <span className="text-[10px] opacity-80">Confirm as scheduled.</span>
            </label>

            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 transition-all duration-200 ${
                action === "REJECT"
                  ? "border-red-500/40 bg-red-500/5 text-red-100"
                  : "border-slate-700/80 bg-slate-900/50 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="action"
                value="REJECT"
                checked={action === "REJECT"}
                onChange={() => setAction("REJECT")}
                className="h-3 w-3 border-slate-600 bg-slate-900 text-red-400 focus:ring-red-400"
              />
              <span className="font-medium">Reject</span>
              <span className="text-[10px] opacity-80">Decline this request.</span>
            </label>

            <label
              className={`flex flex-col gap-1 rounded-lg border px-3 py-2 transition-all duration-200 ${
                !canReschedule
                  ? "cursor-not-allowed border-slate-700/60 bg-slate-900/30 text-slate-500"
                  : action === "RESCHEDULE"
                    ? "cursor-pointer border-amber-500/40 bg-amber-500/5 text-amber-100"
                    : "cursor-pointer border-slate-700/80 bg-slate-900/50 text-slate-400"
              }`}
            >
              <input
                type="radio"
                name="action"
                value="RESCHEDULE"
                checked={action === "RESCHEDULE"}
                onChange={() => canReschedule && setAction("RESCHEDULE")}
                disabled={!canReschedule}
                className="h-3 w-3 border-slate-600 bg-slate-900 text-amber-400 focus:ring-amber-400 disabled:opacity-50"
              />
              <span className="font-medium">Reschedule</span>
              <span className="text-[10px] opacity-80">
                {canReschedule ? "Move to new date/time." : "Not available for this booking."}
              </span>
            </label>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] text-slate-300">Booking ID</p>
              <p className="truncate text-[11px] text-slate-500">{bookingId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-slate-300">Current status</p>
              <p className="text-[11px] text-slate-500">
                {currentStatus ?? "PENDING"}
              </p>
            </div>
          </div>

          {isReschedule && (
            <div
              className={`space-y-3 ${inputTransition}`}
              style={{ opacity: isReschedule ? 1 : 0 }}
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-200">
                    New Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={timeInputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-200">
                    New Start Time
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => {
                      setNewStartTime(e.target.value);
                      setTimeSlotError(false);
                    }}
                    className={timeInputClass}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-200">
                  New End Time
                </label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => {
                    setNewEndTime(e.target.value);
                    setTimeSlotError(false);
                  }}
                  className={timeInputClass}
                />
              </div>
              {hasConflict && (
                <p className="text-[11px] text-red-300">
                  Selected time slot is not available.
                </p>
              )}
              <div className={`space-y-1 ${shake ? "animate-shake" : ""}`}>
                <label className="text-[11px] text-slate-200">
                  Reason for reschedule <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Explain why this booking is being rescheduled (required)."
                />
              </div>
            </div>
          )}

          {isReject && (
            <div
              className={`space-y-1 ${inputTransition}`}
              style={{ opacity: isReject ? 1 : 0 }}
            >
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200">Rejection reason</span>
                <span className="text-[10px] text-slate-500">Required</span>
              </label>
              <textarea
                ref={reasonRef}
                id="reason"
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Explain why this booking is rejected (required)."
              />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-slate-500">
              {isReschedule
                ? "Reschedule will update the booking and notify the employee."
                : "Submitting will update the booking status."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isReschedule && !canSaveReschedule)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-brand/40 hover:bg-brand-soft disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : isReschedule ? (
                  "Save reschedule"
                ) : (
                  "Save decision"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
