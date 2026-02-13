import { Router } from "express";
import { authenticateJwt, requireHrAdmin } from "../middlewares/auth.js";
import {
  getAllBookings,
  getBookingsForEmployee,
  findBookingById,
  createBooking,
  updateBookingStatus,
  hasRescheduleConflict,
  rescheduleBooking as storeRescheduleBooking
} from "../stores/bookingStore.js";
import { addAuditEntry } from "../stores/auditLogStore.js";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendBookingRescheduledEmail
} from "../services/emailService.js";

export const bookingRouter = Router();

// GET /api/bookings — HR: all bookings; Employee: availability (approved/rescheduled/BLOCK/EMERGENCY) + own requests
bookingRouter.get("/", authenticateJwt, async (req, res, next) => {
  try {
    const list =
      req.user.role === "EMPLOYEE"
        ? await getBookingsForEmployee(req.user.dbUserId ?? req.user.id)
        : await getAllBookings();
    res.json({ bookings: list });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings — create booking (employee request, HR emergency, or HR manual block)
bookingRouter.post("/", authenticateJwt, async (req, res, next) => {
  try {
    const { roomId, title, purpose, startTime, endTime, isEmergency, type, notes } =
      req.body;
    const user = req.user;
    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime are required."
      });
    }

    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return res.status(400).json({
        message: "startTime must be before endTime and both must be valid datetimes."
      });
    }

    // Manual block: HR only, treated as an approved booking with type BLOCK.
    const isBlock = user.role === "ADMIN" && type === "BLOCK";

    if (user.role === "EMPLOYEE") {
      // Prevent employees from booking over APPROVED bookings or manual blocks.
      const existing = await getAllBookings();
      const hasConflict = existing.some((b) => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        const overlaps = bStart < endMs && bEnd > startMs;
        return (
          overlaps &&
          (b.status === "APPROVED" || b.type === "BLOCK")
        );
      });
      if (hasConflict) {
        return res.status(409).json({
          message: "This time range is blocked by HR or already booked."
        });
      }
    }

    const emergency = user.role === "ADMIN" && Boolean(isEmergency) && !isBlock;
    const booking = await createBooking({
      roomId,
      requesterId: user.id,
      requesterEmail: user.email ?? "",
      requesterName: user.fullName ?? user.email ?? "Unknown",
      title: title ?? (isBlock ? "Manual block" : "Booking"),
      purpose: purpose ?? "",
      startTime,
      endTime,
      isEmergency: emergency,
      type: isBlock ? "BLOCK" : emergency ? "EMERGENCY" : "REQUEST",
      status: isBlock ? "APPROVED" : "PENDING",
      notes
    });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id — update status (approve / reject); HR only
bookingRouter.patch("/:id", authenticateJwt, requireHrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const existing = await findBookingById(id);
    if (!existing) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "status must be APPROVED or REJECTED."
      });
    }
    const updated = await updateBookingStatus(id, {
      status,
      approverId: req.user.id,
      rejectionReason: status === "REJECTED" ? reason ?? "" : undefined
    });

    if (updated) {
      const start = new Date(updated.startTime);
      const end = new Date(updated.endTime);
      const dateStr = start.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")} – ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      await addAuditEntry({
        type: status === "APPROVED" ? "APPROVED" : "REJECTED",
        message:
          status === "APPROVED"
            ? `Booking approved for ${dateStr} ${timeStr} by HR`
            : `Booking rejected (reason: ${(reason ?? "").slice(0, 80)}${(reason ?? "").length > 80 ? "…" : ""}) by HR`,
        bookingId: id,
        meta: { performedBy: req.user.dbUserId } // Use INT ID for database
      });
    }

    // Do not send emails for BLOCK-type bookings.
    if (updated && updated.type !== "BLOCK") {
      const toEmail = updated.requesterEmail;
      const employeeName = updated.requesterName || updated.requesterEmail;
      const start = new Date(updated.startTime);
      const end = new Date(updated.endTime);
      const pad = (n) => String(n).padStart(2, "0");
      const bookingDate = start.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      const timeSlot = `${pad(start.getHours())}:${pad(
        start.getMinutes()
      )} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
      const title = updated.title || "Conference room booking";

      if (toEmail) {
        (async () => {
          try {
            if (status === "APPROVED") {
              await sendBookingApprovedEmail(toEmail, {
                employeeName,
                bookingDate,
                timeSlot,
                roomName: title
              });
            } else if (status === "REJECTED") {
              await sendBookingRejectedEmail(toEmail, {
                employeeName,
                bookingDate,
                timeSlot,
                roomName: title,
                reason
              });
            }
          } catch (emailError) {
            // eslint-disable-next-line no-console
            console.error(
              "[Bookings] Failed to send status email:",
              emailError?.message ?? emailError
            );
          }
        })();
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/reschedule — HR only; body: { bookingId, newDate, newStartTime, newEndTime, reason }
// Must be before /:id so "reschedule" is not matched as id
bookingRouter.post(
  "/reschedule",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { bookingId, newDate, newStartTime, newEndTime, reason } = req.body;

      if (!bookingId || !newDate || !newStartTime || !newEndTime) {
        return res.status(400).json({
          message: "bookingId, newDate, newStartTime and newEndTime are required."
        });
      }

      const reasonStr = reason != null ? String(reason).trim() : "";
      if (!reasonStr) {
        return res.status(400).json({
          message: "Reason for reschedule is required."
        });
      }

      // Build full ISO datetimes (accept HH:mm or HH:mm:ss)
      const startTimeStr = newStartTime.length <= 5 ? `${newStartTime}:00` : newStartTime;
      const endTimeStr = newEndTime.length <= 5 ? `${newEndTime}:00` : newEndTime;
      const newStartTimeISO = `${newDate}T${startTimeStr}`;
      const newEndTimeISO = `${newDate}T${endTimeStr}`;

      const startMs = new Date(newStartTimeISO).getTime();
      const endMs = new Date(newEndTimeISO).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return res.status(400).json({
          message: "Invalid new date or time format."
        });
      }
      if (endMs <= startMs) {
        return res.status(400).json({
          message: "New start time must be before new end time."
        });
      }

      const existing = await findBookingById(bookingId);
      if (!existing) {
        return res.status(404).json({ message: "Booking not found." });
      }

      if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
        return res.status(400).json({
          message: "Cannot reschedule a rejected or cancelled booking."
        });
      }

      if (existing.type === "BLOCK") {
        return res.status(400).json({
          message: "Manual blocks are not rescheduled via this flow."
        });
      }

      const conflict = await hasRescheduleConflict(bookingId, newStartTimeISO, newEndTimeISO);
      if (conflict) {
        return res.status(400).json({
          message: "Selected slot is not available."
        });
      }

      const updated = await storeRescheduleBooking(bookingId, {
        newStartTime: newStartTimeISO,
        newEndTime: newEndTimeISO,
        rescheduleReason: reasonStr,
        rescheduledBy: req.user.email ?? req.user.id ?? "HR"
      });

      if (!updated) {
        return res.status(500).json({ message: "Failed to update booking." });
      }

      const oldStart = new Date(existing.startTime);
      const oldEnd = new Date(existing.endTime);
      const pad = (n) => String(n).padStart(2, "0");
      const oldDateStr = oldStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      const oldTimeStr = `${pad(oldStart.getHours())}:${pad(oldStart.getMinutes())} - ${pad(oldEnd.getHours())}:${pad(oldEnd.getMinutes())}`;
      const newStart = new Date(updated.startTime);
      const newEnd = new Date(updated.endTime);
      const newDateStr = newStart.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      const newTimeStr = `${pad(newStart.getHours())}:${pad(newStart.getMinutes())} - ${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`;

      await addAuditEntry({
        type: "RESCHEDULED",
        message: `Booking rescheduled from ${oldDateStr} ${oldTimeStr} to ${newDateStr} ${newTimeStr} by HR`,
        bookingId,
        meta: { performedBy: req.user.dbUserId } // Use INT ID for database
      });

      const toEmail = updated.requesterEmail;
      const employeeName = updated.requesterName || updated.requesterEmail;
      if (toEmail) {
        try {
          await sendBookingRescheduledEmail(toEmail, {
            employeeName,
            oldDate: oldDateStr,
            oldTime: oldTimeStr,
            newDate: newDateStr,
            newTime: newTimeStr,
            reason: reasonStr
          });
        } catch (emailError) {
          // eslint-disable-next-line no-console
          console.error(
            "[Bookings] Failed to send reschedule email:",
            emailError?.message ?? emailError
          );
          // Do not block; still return success
        }
      }

      return res.json({
        success: true,
        updatedBooking: updated
      });
    } catch (err) {
      next(err);
    }
  }
);

bookingRouter.get("/health", (req, res) => {
  res.json({ status: "ok", scope: "bookings" });
});
