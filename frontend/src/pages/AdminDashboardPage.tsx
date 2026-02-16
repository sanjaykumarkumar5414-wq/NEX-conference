import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getBookings } from "../api/bookings";
import type { Booking } from "../api/bookings";
import { AdminDashboardSkeleton } from "../modules/admin/AdminDashboardSkeleton";
import { BookingRequestsTable } from "../modules/admin/BookingRequestsTable";
import { AdminCalendarView } from "../modules/admin/AdminCalendarView";
import { BookingActionModal } from "../modules/admin/BookingActionModal";
import { ManualBlockPanel } from "../modules/admin/ManualBlockPanel";
import { AuditLogTimeline } from "../modules/admin/AuditLogTimeline";
import { AvailabilityHeatmap } from "../components/AvailabilityHeatmap";

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [viewMode, setViewMode] = useState<"TABLE" | "CALENDAR">("TABLE");
  const [calendarDate, setCalendarDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | undefined>();
  const [selectedBookingStatus, setSelectedBookingStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | undefined
  >();
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const list = await getBookings(token);
      setBookings(list);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchBookings();
    } else {
      setLoading(false);
      setBookings([]);
    }
  }, [token, fetchBookings]);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <>
      <div className="flex w-full flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-sm font-semibold text-slate-100">
                HR admin dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Oversee all requests for the conference room and keep the
                schedule aligned with company priorities.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Role: HR Admin</span>
            </div>
          </header>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-[11px] md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-300">Filter by status</span>
                <div className="flex flex-wrap gap-1.5">
                  {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilterStatus(status as FilterStatus)}
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          filterStatus === status
                            ? "bg-brand text-white"
                            : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-1 py-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  className={`rounded-full px-3 py-1 ${
                    viewMode === "TABLE"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Table View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("CALENDAR")}
                  className={`rounded-full px-3 py-1 ${
                    viewMode === "CALENDAR"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Calendar View
                </button>
              </div>
            </div>

            <div className="relative min-h-[260px]">
              <div
                className={`transition-opacity duration-300 ${
                  viewMode === "TABLE"
                    ? "opacity-100"
                    : "pointer-events-none absolute inset-0 opacity-0"
                }`}
              >
                <BookingRequestsTable
                  bookings={bookings}
                  selectedStatus={filterStatus === "ALL" ? "ALL" : filterStatus}
                  onSelectBooking={(booking) => {
                    setSelectedBookingId(booking.id);
                    setSelectedBookingStatus(booking.status);
                    setActionModalOpen(true);
                  }}
                />
              </div>

              <div
                className={`transition-opacity duration-300 ${
                  viewMode === "CALENDAR"
                    ? "opacity-100"
                    : "pointer-events-none absolute inset-0 opacity-0"
                }`}
              >
                <AdminCalendarView
                  bookings={bookings}
                  selectedDate={calendarDate}
                  onDateChange={setCalendarDate}
                  onSelectBooking={(booking) => {
                    setSelectedBookingId(booking.id);
                    setSelectedBookingStatus(booking.status);
                    setActionModalOpen(true);
                  }}
                />
              </div>
            </div>

            <AvailabilityHeatmap bookings={bookings} />
          </div>
        </div>

        <div className="mt-4 w-full space-y-4 lg:mt-0 lg:w-[320px] lg:shrink-0">
          <ManualBlockPanel token={token} onCreated={fetchBookings} />
          <AuditLogTimeline token={token} refreshKey={auditRefreshKey} />
        </div>
      </div>

      <BookingActionModal
        open={actionModalOpen}
        bookingId={selectedBookingId}
        booking={bookings.find((b) => b.id === selectedBookingId) ?? null}
        currentStatus={selectedBookingStatus}
        allBookings={bookings}
        onClose={() => setActionModalOpen(false)}
        token={token}
        onSuccess={() => {
          fetchBookings();
          setAuditRefreshKey((k) => k + 1);
        }}
        onRescheduleSuccess={() => {
          setToastMessage("Booking successfully rescheduled and employee notified.");
        }}
      />

      {toastMessage && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/50 bg-slate-900 px-4 py-3 text-sm font-medium text-emerald-100 shadow-lg shadow-black/40"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
