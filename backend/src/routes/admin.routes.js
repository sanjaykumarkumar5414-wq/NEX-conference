import { Router } from "express";
import { authenticateJwt, requireHrAdmin } from "../middlewares/auth.js";
import { createEmergencyBookingFlow } from "../services/emergencyBookingService.js";
import { rescheduleBooking } from "../services/rescheduleBookingService.js";
import { decideOnBooking } from "../services/bookingDecisionService.js";
import { autoExpirePendingBookings } from "../services/autoExpirePendingService.js";
import { getAuditEntries } from "../stores/auditLogStore.js";

export const adminRouter = Router();

// POST /api/admin/emergency-bookings
// Body shape (example):
// {
//   "roomId": "uuid",
//   "title": "Emergency incident review",
//   "purpose": "Critical incident",
//   "emergencyStartTime": "2025-09-16T16:00:00.000Z",
//   "emergencyEndTime": "2025-09-16T17:00:00.000Z",
//   "affectedBookingId": "uuid",          // optional
//   "rescheduleStartTime": "2025-09-17T09:00:00.000Z", // required if affectedBookingId provided
//   "rescheduleEndTime": "2025-09-17T10:00:00.000Z",   // required if affectedBookingId provided
//   "reason": "Emergency leadership meeting"
// }

adminRouter.post(
  "/emergency-bookings",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const {
        roomId,
        title,
        purpose,
        emergencyStartTime,
        emergencyEndTime,
        affectedBookingId,
        rescheduleStartTime,
        rescheduleEndTime,
        reason
      } = req.body;

      const result = await createEmergencyBookingFlow({
        hrUserId: req.user.id,
        roomId,
        title,
        purpose,
        emergencyStartTime,
        emergencyEndTime,
        affectedBookingId,
        rescheduleStartTime,
        rescheduleEndTime,
        reason
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/maintenance/expire-pending
// Intended to be triggered by a scheduled job (e.g. cron) to
// automatically cancel stale pending bookings.

adminRouter.post(
  "/maintenance/expire-pending",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const result = await autoExpirePendingBookings();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/bookings/:id/reschedule
// Body:
// {
//   "newStartTime": "2025-09-17T09:00:00.000Z",
//   "newEndTime": "2025-09-17T10:00:00.000Z",
//   "reason": "Shifted to avoid conflict with leadership meeting"
// }

adminRouter.post(
  "/bookings/:id/reschedule",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newStartTime, newEndTime, reason } = req.body;

      const result = await rescheduleBooking({
        hrUserId: req.user.id,
        bookingId: id,
        newStartTime,
        newEndTime,
        reason
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/admin/bookings/:id/decision
// Body:
// {
//   "decision": "APPROVE" | "REJECT",
//   "reason": "optional text, required for reject in the UI"
// }

adminRouter.post(
  "/bookings/:id/decision",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { decision, reason } = req.body;

      const result = await decideOnBooking({
        hrUserId: req.user.id,
        bookingId: id,
        decision,
        reason
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/audit-log — HR only; returns MySQL audit entries
adminRouter.get(
  "/audit-log",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const entries = await getAuditEntries();
      res.json({ entries });
    } catch (err) {
      next(err);
    }
  }
);


