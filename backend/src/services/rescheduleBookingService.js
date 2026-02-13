import {
  findBookingById,
  updateBookingTimeRange,
  insertBookingHistory,
  withTransaction
} from "../repositories/bookingRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";

// Generic rescheduling logic for HR admins.
// Requirements:
// - HR can reschedule any booking (subject to basic status validation).
// - Old and new time must be stored.
// - Status updates accordingly.
// - Affected employee is notified in-app (payload returned for frontend).
// - All changes are recorded in booking_history.

export async function rescheduleBooking({
  hrUserId,
  bookingId,
  newStartTime,
  newEndTime,
  reason
}) {
  if (!bookingId || !newStartTime || !newEndTime) {
    const error = new Error(
      "bookingId, newStartTime and newEndTime are required."
    );
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  return withTransaction(async (client) => {
    const existing = await findBookingById(client, bookingId);
    if (!existing) {
      const error = new Error("Booking not found.");
      error.status = 404;
      error.code = "BookingNotFound";
      throw error;
    }

    if (
      ["CANCELLED", "REJECTED", "COMPLETED", "OVERRIDDEN"].includes(
        existing.status
      )
    ) {
      const error = new Error(
        `Bookings with status ${existing.status} cannot be rescheduled.`
      );
      error.status = 409;
      error.code = "InvalidBookingStatus";
      throw error;
    }

    const fromStatus = existing.status;
    const fromStartTime = existing.start_time;
    const fromEndTime = existing.end_time;

    // When HR reschedules, we treat it as requiring re-confirmation.
    const toStatus = fromStatus === "PENDING" ? "PENDING" : "PENDING";

    const updated = await updateBookingTimeRange(client, bookingId, {
      newStartTime,
      newEndTime,
      newStatus: toStatus
    });

    // Record history entry with old/new times and status.
    await insertBookingHistory(client, {
      bookingId: existing.id,
      action: "RESCHEDULED",
      actorId: hrUserId,
      fromStatus,
      toStatus,
      fromStartTime,
      toStartTime: updated.start_time,
      fromEndTime,
      toEndTime: updated.end_time,
      wasEmergency: updated.is_emergency,
      wasOverride: updated.is_override,
      metadata: reason
        ? {
            reason
          }
        : null
    });

    // Persist in-app notification for the affected employee.
    const notificationPayload = {
      previousTimeRange: {
        start: fromStartTime,
        end: fromEndTime
      },
      newTimeRange: {
        start: updated.start_time,
        end: updated.end_time
      }
    };

    const notification = await createNotification(client, {
      userId: existing.requester_id,
      bookingId: existing.id,
      type: "BOOKING_RESCHEDULED",
      payload: notificationPayload
    });

    return {
      booking: updated,
      notification
    };
  });
}

