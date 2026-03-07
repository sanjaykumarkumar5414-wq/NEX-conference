import { Router } from "express";
import { authenticateJwt, requireHrAdmin } from "../middlewares/auth.js";
import { createEmergencyBookingFlow } from "../services/emergencyBookingService.js";
import { rescheduleBooking } from "../services/rescheduleBookingService.js";
import { decideOnBooking } from "../services/bookingDecisionService.js";
import { autoExpirePendingBookings } from "../services/autoExpirePendingService.js";
import { getAuditEntries } from "../stores/auditLogStore.js";
import { getAllBookings } from "../stores/bookingStore.js";
import {
  listEmployeesWithBookingCount,
  getEmployeeById,
  setEmployeeBlocked,
  deleteEmployee
} from "../stores/employeeStore.js";
import { sendWarningEmail } from "../services/emailService.js";

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

// GET /api/admin/employees — HR only; list registered employees from employees table (optional ?search=)
adminRouter.get(
  "/employees",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const search = req.query.search != null ? String(req.query.search).trim() : "";
      const list = await listEmployeesWithBookingCount(search || undefined);
      res.json({
        employees: list.map((e) => ({
          id: String(e.id),
          employeeId: e.employee_id,
          name: e.name,
          email: e.email,
          project: e.project,
          phoneNumber: e.phone_number,
          managerName: e.manager_name,
          totalBookings: e.total_bookings,
          isBlocked: e.is_blocked
        }))
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/employees/:id — permanently delete employee (must be before /employees/:id/* routes)
adminRouter.delete(
  "/employees/:id",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const employee = await getEmployeeById(id);
      if (!employee) {
        const err = new Error("Employee not found.");
        err.status = 404;
        err.code = "NotFound";
        throw err;
      }
      await deleteEmployee(id);
      res.json({ success: true, message: "Employee deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/employees/:id/warn — send warning email to employee
adminRouter.post(
  "/employees/:id/warn",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { message } = req.body || {};
      const employee = await getEmployeeById(id);
      if (!employee) {
        const err = new Error("Employee not found.");
        err.status = 404;
        err.code = "NotFound";
        throw err;
      }
      const msg = message && String(message).trim() ? String(message).trim() : "Your recent booking activity has violated the conference room policy. Please contact HR.";
      await sendWarningEmail(employee.email, msg);
      res.json({ message: "Warning email sent." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/employees/:id/block — set is_blocked = true
adminRouter.post(
  "/employees/:id/block",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const employee = await getEmployeeById(id);
      if (!employee) {
        const err = new Error("Employee not found.");
        err.status = 404;
        err.code = "NotFound";
        throw err;
      }
      await setEmployeeBlocked(id, true);
      res.json({ message: "User blocked." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/employees/:id/unblock — set is_blocked = false
adminRouter.post(
  "/employees/:id/unblock",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const employee = await getEmployeeById(id);
      if (!employee) {
        const err = new Error("Employee not found.");
        err.status = 404;
        err.code = "NotFound";
        throw err;
      }
      await setEmployeeBlocked(id, false);
      res.json({ message: "User unblocked." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/employees/:id/delete — permanently delete employee (POST for production proxy compatibility)
adminRouter.post(
  "/employees/:id/delete",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const employee = await getEmployeeById(id);
      if (!employee) {
        const err = new Error("Employee not found.");
        err.status = 404;
        err.code = "NotFound";
        throw err;
      }
      await deleteEmployee(id);
      res.json({ success: true, message: "Employee deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

function computePeriodFromQuery(query) {
  const type = String(query.type || "").toLowerCase();
  const today = new Date();

  if (type === "date-wise") {
    const startDateStr = query.startDate ? String(query.startDate).trim() : null;
    const endDateStr = query.endDate ? String(query.endDate).trim() : null;
    const baseStart = startDateStr ? new Date(startDateStr) : today;
    const baseEnd = endDateStr ? new Date(endDateStr) : today;
    const start = new Date(baseStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseEnd);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    const label =
      startDateStr && endDateStr
        ? `${startDateStr}_to_${endDateStr}`
        : start.toISOString().slice(0, 10);
    return { start, end, label };
  }

  if (type === "weekly") {
    const base = query.date ? new Date(String(query.date)) : today;
    const dow = base.getDay(); // 0 = Sun
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((dow + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const end = new Date(monday);
    end.setDate(monday.getDate() + 7);
    return { start: monday, end, label: monday.toISOString().slice(0, 10) };
  }

  if (type === "monthly") {
    const year = Number(query.year || today.getFullYear());
    const month = Number(query.month || today.getMonth() + 1); // 1–12
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const label = `${year}-${String(month).padStart(2, "0")}`;
    return { start, end, label };
  }

  if (type === "yearly") {
    const year = Number(query.year || today.getFullYear());
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start, end, label: String(year) };
  }

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end, label: `${year}-${String(month).padStart(2, "0")}` };
}

adminRouter.get(
  "/reports",
  authenticateJwt,
  requireHrAdmin,
  async (req, res, next) => {
    try {
      const { format } = req.query;
      const { start, end, label } = computePeriodFromQuery(req.query);

      const all = await getAllBookings();
      const filtered = all.filter((b) => {
        const d = new Date(b.startTime);
        return d >= start && d < end;
      });

      const rows = filtered.map((b) => {
        const date = new Date(b.startTime);
        const startTime = new Date(b.startTime);
        const endTime = new Date(b.endTime);
        const createdAt = new Date(b.createdAt);
        const project =
          typeof b.notes === "string"
            ? (b.notes.match(/Project:\s*([^|]+)/i)?.[1] || "").trim()
            : "";
        return {
          employeeName: b.requesterName,
          employeeEmail: b.requesterEmail,
          project,
          purpose: b.purpose,
          date,
          startTime,
          endTime,
          status: b.status,
          createdAt
        };
      });

      const type = String((format || "excel")).toLowerCase();

      if (type === "excel") {
        const { default: ExcelJS } = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Bookings");
        sheet.columns = [
          { header: "Employee Name", key: "employeeName", width: 24 },
          { header: "Employee Email", key: "employeeEmail", width: 28 },
          { header: "Project", key: "project", width: 18 },
          { header: "Purpose", key: "purpose", width: 30 },
          { header: "Date", key: "date", width: 14 },
          { header: "Start Time", key: "startTime", width: 12 },
          { header: "End Time", key: "endTime", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "Booking Created", key: "createdAt", width: 20 }
        ];

        rows.forEach((r) =>
          sheet.addRow({
            employeeName: r.employeeName,
            employeeEmail: r.employeeEmail,
            project: r.project || "",
            purpose: r.purpose || "",
            date: r.date.toLocaleDateString("en-GB"),
            startTime: r.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit"
            }),
            endTime: r.endTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit"
            }),
            status: r.status,
            createdAt: r.createdAt.toLocaleString("en-GB")
          })
        );

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="bookings-report-${label}.xlsx"`
        );
        await workbook.xlsx.write(res);
        res.end();
      } else if (type === "pdf") {
        const { default: PDFDocument } = await import("pdfkit");
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="bookings-report-${label}.pdf"`
        );
        doc.pipe(res);
        doc.fontSize(14).text(`Bookings report – ${label}`, { underline: true });
        doc.moveDown();
        doc.fontSize(9);
        rows.forEach((r) => {
          doc.text(
            `${r.employeeName} | ${r.employeeEmail} | ${r.project || "-"} | ${r.purpose || "-"}`
          );
          doc.text(
            `Date: ${r.date.toLocaleDateString("en-GB")}  Time: ${r.startTime.toLocaleTimeString(
              "en-GB",
              { hour: "2-digit", minute: "2-digit" }
            )} – ${r.endTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit"
            })}  Status: ${r.status}  Created: ${r.createdAt.toLocaleString(
              "en-GB"
            )}`,
            { indent: 12 }
          );
          doc.moveDown(0.5);
        });
        doc.end();
      } else {
        res.status(400).json({ message: "Unsupported format." });
      }
    } catch (error) {
      next(error);
    }
  }
);


