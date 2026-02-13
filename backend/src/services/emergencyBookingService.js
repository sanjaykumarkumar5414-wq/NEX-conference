import {
  findBookingById,
  findOverlappingApprovedBookings,
  createEmergencyBooking,
  overrideAndRescheduleBooking,
  withTransaction
} from "../repositories/bookingRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";

// Core domain logic for emergency bookings.
// Rules:
// - Only HR (ADMIN) can create emergency bookings (enforced at middleware).
// - Emergency booking can override approved bookings.
// - Overridden booking must be rescheduled, not deleted.
// - HR selects new slot for affected booking.
// - Mark overridden booking status as OVERRIDDEN.
// - Mark emergency booking with emergency flags.

export async function createEmergencyBookingFlow({
  hrUserId,
  roomId,
  title,
  purpose,
  emergencyStartTime,
  emergencyEndTime,
  affectedBookingId,
  rescheduleStartTime,
  rescheduleEndTime,
  reason
}) {
  if (!roomId || !emergencyStartTime || !emergencyEndTime) {
    const error = new Error("roomId, emergencyStartTime, and emergencyEndTime are required.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  if (affectedBookingId && (!rescheduleStartTime || !rescheduleEndTime)) {
    const error = new Error(
      "Reschedule start and end times are required when overriding an existing booking."
    );
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  return withTransaction(async (client) => {
    // 1) Optionally validate the affected booking if provided.
    let affectedBooking = null;
    if (affectedBookingId) {
      affectedBooking = await findBookingById(client, affectedBookingId);
      if (!affectedBooking) {
        const error = new Error("Affected booking not found.");
        error.status = 404;
        error.code = "BookingNotFound";
        throw error;
      }

      if (affectedBooking.status !== "APPROVED") {
        const error = new Error(
          "Only approved bookings can be overridden by an emergency booking."
        );
        error.status = 409;
        error.code = "InvalidBookingStatus";
        throw error;
      }
    }

    // 2) Create the emergency booking as an approved override.
    const emergencyBooking = await createEmergencyBooking(client, {
      roomId,
      requesterId: hrUserId,
      title,
      purpose,
      startTime: emergencyStartTime,
      endTime: emergencyEndTime
    });

    // 3) If an affected booking was explicitly provided, override and reschedule it.
    let rescheduleResult = null;
    if (affectedBooking) {
      rescheduleResult = await overrideAndRescheduleBooking(client, {
        bookingId: affectedBooking.id,
        hrUserId,
        reason,
        newStartTime: rescheduleStartTime,
        newEndTime: rescheduleEndTime
      });

      // Notify the affected employee that their booking was overridden
      // by an emergency and rescheduled.
      const { overriddenBooking, rescheduledBooking } = rescheduleResult;

      await createNotification(client, {
        userId: overriddenBooking.requester_id,
        bookingId: overriddenBooking.id,
        type: "BOOKING_OVERRIDDEN_EMERGENCY",
        payload: {
          emergencyBookingId: emergencyBooking.id,
          previousTimeRange: {
            start: overriddenBooking.start_time,
            end: overriddenBooking.end_time
          },
          rescheduledBookingId: rescheduledBooking.id,
          newTimeRange: {
            start: rescheduledBooking.start_time,
            end: rescheduledBooking.end_time
          }
        }
      });
    } else {
      // Otherwise, detect overlapping approved bookings and (for now) just surface them.
      // Full bulk rescheduling logic can be added later.
      const overlapping = await findOverlappingApprovedBookings(
        client,
        roomId,
        emergencyStartTime,
        emergencyEndTime
      );

      if (overlapping.length > 0) {
        // NOTE: In a full implementation, we might:
        // - mark each as OVERRIDDEN
        // - create reschedule bookings
        // For now, we simply return the list so the caller can decide.
        rescheduleResult = { overlappingApproved: overlapping };
      }
    }

    return {
      emergencyBooking,
      rescheduleResult
    };
  });
}

