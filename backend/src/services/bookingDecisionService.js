import {
  findBookingById,
  updateBookingTimeRange,
  insertBookingHistory,
  withTransaction
} from "../repositories/bookingRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { findUserById } from "../repositories/userRepository.js";
import { findRoomById } from "../repositories/roomRepository.js";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail
} from "./emailService.js";

// Handles approve / reject decisions made by HR.
// Emits in-app notifications for employees, records booking_history entries,
// and sends email to the employee (approval/rejection). Email failure does not block the decision.

export async function decideOnBooking({
  hrUserId,
  bookingId,
  decision, // 'APPROVE' | 'REJECT'
  reason
}) {
  if (!bookingId || !decision) {
    const error = new Error("bookingId and decision are required.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  if (!["APPROVE", "REJECT"].includes(decision)) {
    const error = new Error("Decision must be APPROVE or REJECT.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  const targetStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

  return withTransaction(async (client) => {
    const existing = await findBookingById(client, bookingId);
    if (!existing) {
      const error = new Error("Booking not found.");
      error.status = 404;
      error.code = "BookingNotFound";
      throw error;
    }

    if (["CANCELLED", "REJECTED", "COMPLETED", "OVERRIDDEN"].includes(existing.status)) {
      const error = new Error(
        `Bookings with status ${existing.status} cannot be updated via this decision endpoint.`
      );
      error.status = 409;
      error.code = "InvalidBookingStatus";
      throw error;
    }

    const fromStatus = existing.status;

    // Simple status update; time range is unchanged here.
    const updated = await updateBookingTimeRange(client, bookingId, {
      newStartTime: existing.start_time,
      newEndTime: existing.end_time,
      newStatus: targetStatus
    });

    await insertBookingHistory(client, {
      bookingId: existing.id,
      action: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      actorId: hrUserId,
      fromStatus,
      toStatus: targetStatus,
      fromStartTime: existing.start_time,
      toStartTime: updated.start_time,
      fromEndTime: existing.end_time,
      toEndTime: updated.end_time,
      wasEmergency: updated.is_emergency,
      wasOverride: updated.is_override,
      metadata: reason
        ? {
            reason
          }
        : null
    });

    const notificationType =
      decision === "APPROVE" ? "BOOKING_APPROVED" : "BOOKING_REJECTED";

    const notificationPayload =
      decision === "APPROVE"
        ? {
            timeRange: {
              start: updated.start_time,
              end: updated.end_time
            }
          }
        : {
            timeRange: {
              start: updated.start_time,
              end: updated.end_time
            },
            reason: reason || null
          };

    const notification = await createNotification(client, {
      userId: existing.requester_id,
      bookingId: existing.id,
      type: notificationType,
      payload: notificationPayload
    });

    const requester = await findUserById(client, existing.requester_id);
    const room = await findRoomById(client, existing.room_id);
    const bookingDate = formatBookingDate(updated.start_time);
    const timeSlot = formatTimeSlot(updated.start_time, updated.end_time);
    const roomName = room?.name || "Conference Room";

    return {
      booking: updated,
      notification,
      emailPayload: {
        toEmail: requester?.email,
        employeeName: requester?.full_name || requester?.email || null,
        bookingDate,
        timeSlot,
        roomName,
        reason: decision === "REJECT" ? (reason || null) : undefined
      },
      decision
    };
  });

  // Send email after transaction succeeded. Failure must not affect the response.
  if (result.emailPayload?.toEmail) {
    try {
      if (result.decision === "APPROVE") {
        await sendBookingApprovedEmail(result.emailPayload.toEmail, {
          employeeName: result.emailPayload.employeeName,
          bookingDate: result.emailPayload.bookingDate,
          timeSlot: result.emailPayload.timeSlot,
          roomName: result.emailPayload.roomName
        });
      } else {
        await sendBookingRejectedEmail(result.emailPayload.toEmail, {
          employeeName: result.emailPayload.employeeName,
          bookingDate: result.emailPayload.bookingDate,
          timeSlot: result.emailPayload.timeSlot,
          roomName: result.emailPayload.roomName,
          reason: result.emailPayload.reason ?? "No reason was provided."
        });
      }
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error("[Booking decision] Failed to send notification email to employee:", {
        bookingId: result.booking?.id,
        toEmail: result.emailPayload.toEmail,
        decision: result.decision,
        error: emailError?.message ?? emailError
      });
    }
  }

  return {
    booking: result.booking,
    notification: result.notification
  };
}

function formatBookingDate(dateTimeStr) {
  if (!dateTimeStr) return "";
  const d = new Date(dateTimeStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimeSlot(startStr, endStr) {
  if (!startStr || !endStr) return "";
  const start = new Date(startStr);
  const end = new Date(endStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

