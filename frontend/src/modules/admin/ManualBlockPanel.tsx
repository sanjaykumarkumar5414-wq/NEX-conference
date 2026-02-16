import { useRef, useState, type FormEvent } from "react";
import { createBooking } from "../../api/bookings";

interface ManualBlockPanelProps {
  token: string | null;
  onCreated?: () => void;
}

export function ManualBlockPanel({ token, onCreated }: ManualBlockPanelProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const timeStartRef = useRef<HTMLInputElement>(null);
  const timeEndRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const date = dateRef.current?.value;
    const start = timeStartRef.current?.value;
    const end = timeEndRef.current?.value;
    const reason = reasonRef.current?.value ?? "";
    const notes = notesRef.current?.value ?? "";
    if (!date || !start || !end) {
      setError("Please select date and time range for the block.");
      return;
    }
    if (!token) {
      setError("You must be signed in as HR to block a slot.");
      return;
    }
    const startTime = `${date}T${start}:00`;
    const endTime = `${date}T${end}:00`;
    if (new Date(endTime) <= new Date(startTime)) {
      setError("End time must be after start time.");
      return;
    }
    setSubmitting(true);
    try {
      await createBooking(token, {
        title: reason || "Manual block",
        purpose: notes || reason || "Manual block",
        startTime,
        endTime,
        type: "BLOCK"
      } as any);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create manual block.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-full overflow-hidden space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Manual blocks
          </h2>
          <p className="text-[11px] text-slate-400">
            Temporarily reserve the room for maintenance, executive holds, or
            office-wide events.
          </p>
        </div>
      </div>

      <form
        className="space-y-3 max-w-full min-w-0"
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:grid-rows-2 lg:grid-cols-[minmax(0,1.5fr)_1fr_auto_1fr] lg:grid-rows-1 gap-4 items-end min-w-0">
          <div className="space-y-1 min-w-0 md:col-span-3 lg:col-span-1">
            <label
              htmlFor="block-date"
              className="block text-slate-200"
            >
              Date
            </label>
            <input
              ref={dateRef}
              id="block-date"
              type="date"
              className="h-9 w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 pr-8 text-xs text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <label className="block text-slate-200">
              Start Time
            </label>
            <input
              ref={timeStartRef}
              type="time"
              className="h-9 w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center justify-center pb-2 md:pb-0 min-w-0 w-6 shrink-0">
            <span className="text-center text-[10px] text-slate-500">
              to
            </span>
          </div>
          <div className="space-y-1 min-w-0">
            <label className="block text-slate-200">
              End Time
            </label>
            <input
              ref={timeEndRef}
              type="time"
              className="h-9 w-full min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="block-reason"
            className="block text-slate-200"
          >
            Block reason
          </label>
          <select
            ref={reasonRef}
            id="block-reason"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            defaultValue=""
          >
            <option value="" disabled>
              Select a reason
            </option>
            <option value="maintenance">Maintenance</option>
            <option value="company-event">Company event</option>
            <option value="executive-hold">Executive hold</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="block-notes"
            className="block text-slate-200"
          >
            Notes (visible to employees)
          </label>
          <textarea
            ref={notesRef}
            id="block-notes"
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="Short message explaining why the room is unavailable."
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {error}
          </div>
        )}

        <div className="mt-1 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-slate-500">
            Manual blocks will prevent new bookings in the selected window.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-brand/40 transition-transform transition-colors duration-150 hover:-translate-y-0.5 hover:bg-brand-soft disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Blocking…" : "Block slot"}
          </button>
        </div>
      </form>
    </section>
  );
}

