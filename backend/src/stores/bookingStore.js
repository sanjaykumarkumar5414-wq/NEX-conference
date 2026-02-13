/**
 * MySQL-based booking store - replaces in-memory arrays
 */

import { randomUUID } from "crypto";
import { pool } from "../../config/db.js";
import { query, queryOne } from "../db/queryHelper.js";

const DEFAULT_ROOM_ID = "11111111-1111-1111-1111-111111111111";

/**
 * Convert MySQL booking row to frontend format
 */
function mapBookingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id || DEFAULT_ROOM_ID,
    requesterId: String(row.user_id),
    requesterEmail: row.requester_email || "",
    requesterName: row.requester_name || row.requester_email || "Unknown",
    title: row.title || "Booking",
    purpose: row.purpose || "",
    startTime: row.start_time ? new Date(row.start_time).toISOString() : "",
    endTime: row.end_time ? new Date(row.end_time).toISOString() : "",
    status: row.status?.toUpperCase() || "PENDING",
    type: row.type || "REQUEST",
    isEmergency: Boolean(row.is_emergency),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    notes: row.notes || undefined,
    approverId: row.approver_id || undefined,
    rejectionReason: row.rejection_reason || undefined,
    rescheduled: Boolean(row.rescheduled),
    rescheduleReason: row.reschedule_reason || undefined,
    rescheduledAt: row.rescheduled_at ? new Date(row.rescheduled_at).toISOString() : undefined,
    rescheduledBy: row.rescheduled_by || undefined
  };
}

/**
 * Get all bookings (HR / admin view)
 */
export async function getAllBookings() {
  const connection = await pool.getConnection();
  try {
    const rows = await query(
      connection,
      `SELECT b.*, u.email as user_email, u.full_name as user_full_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );
    return rows.map(mapBookingRow);
  } finally {
    connection.release();
  }
}

/**
 * Get bookings for employee: all that affect availability (approved, rescheduled, BLOCK, EMERGENCY)
 * plus the employee's own bookings (for "My Requests" / pending visibility).
 * Used for calendar, heatmap, and timeline — no user_id filter for availability.
 */
export async function getBookingsForEmployee(userId) {
  const connection = await pool.getConnection();
  try {
    const uid = userId != null ? Number(userId) : NaN;
    const includeOwn = Number.isFinite(uid);
    const sql = `SELECT b.*, u.email as user_email, u.full_name as user_full_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE (
         status IN ('approved', 'rescheduled')
         OR type IN ('BLOCK', 'EMERGENCY')
       )
       ${includeOwn ? "OR b.user_id = ?" : ""}
       ORDER BY b.created_at DESC`;
    const rows = await query(connection, sql, includeOwn ? [uid] : []);
    return rows.map(mapBookingRow);
  } finally {
    connection.release();
  }
}

/**
 * Find booking by ID
 */
export async function findBookingById(id) {
  const connection = await pool.getConnection();
  try {
    const row = await queryOne(
      connection,
      `SELECT b.*, u.email as user_email, u.full_name as user_full_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );
    return mapBookingRow(row);
  } finally {
    connection.release();
  }
}

/**
 * Create a new booking
 */
export async function createBooking({
  roomId = DEFAULT_ROOM_ID,
  requesterId,
  requesterEmail,
  requesterName,
  title,
  purpose,
  startTime,
  endTime,
  isEmergency = false,
  type = "REQUEST",
  status = "PENDING",
  notes
}) {
  const connection = await pool.getConnection();
  try {
    const id = randomUUID();
    const safeStatus = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)
      ? status.toLowerCase()
      : "pending";
    const safeType = ["REQUEST", "EMERGENCY", "BLOCK"].includes(type) ? type : "REQUEST";

    // Get or create user
    let userId = requesterId;
    if (!userId || isNaN(Number(userId))) {
      // Find user by email or create
      const user = await queryOne(
        connection,
        "SELECT id FROM users WHERE email = ?",
        [requesterEmail]
      );
      if (user) {
        userId = user.id;
      } else {
        // Create user if doesn't exist
        const [result] = await connection.query(
          `INSERT INTO users (email, password, role, full_name)
           VALUES (?, ?, 'employee', ?)`,
          [requesterEmail, "", requesterName || requesterEmail.split("@")[0]]
        );
        userId = result.insertId;
      }
    } else {
      userId = Number(userId);
    }

    await connection.query(
      `INSERT INTO bookings (
        id, room_id, user_id, requester_email, requester_name,
        title, purpose, start_time, end_time, status, type,
        is_emergency, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        roomId,
        userId,
        requesterEmail || "",
        requesterName || requesterEmail || "Unknown",
        title || "Booking",
        purpose || "",
        new Date(startTime),
        new Date(endTime),
        safeStatus,
        safeType,
        Boolean(isEmergency),
        notes || null
      ]
    );

    return await findBookingById(id);
  } finally {
    connection.release();
  }
}

/**
 * Update booking status
 */
export async function updateBookingStatus(id, { status, approverId, rejectionReason }) {
  const connection = await pool.getConnection();
  try {
    const safeStatus = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)
      ? status.toLowerCase()
      : null;
    if (!safeStatus) return null;

    const updates = [`status = ?`];
    const params = [safeStatus];

    if (approverId != null) {
      updates.push(`approver_id = ?`);
      params.push(approverId);
    }

    if (rejectionReason != null) {
      updates.push(`rejection_reason = ?`);
      params.push(rejectionReason);
    }

    params.push(id);

    await connection.query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return await findBookingById(id);
  } finally {
    connection.release();
  }
}

/**
 * Check if a time range overlaps any existing booking that blocks the slot
 * (APPROVED, PENDING, or BLOCK). Excludes the booking with excludeBookingId.
 */
export async function hasRescheduleConflict(excludeBookingId, newStartTime, newEndTime) {
  const connection = await pool.getConnection();
  try {
    const startDate = new Date(newStartTime);
    const endDate = new Date(newEndTime);

    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      return true;
    }

    const rows = await query(
      connection,
      `SELECT id FROM bookings
       WHERE id != ?
         AND (
           status IN ('approved', 'pending') OR type = 'BLOCK'
         )
         AND start_time < ? AND end_time > ?`,
      [excludeBookingId || "", endDate, startDate]
    );

    return rows.length > 0;
  } finally {
    connection.release();
  }
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(id, {
  newStartTime,
  newEndTime,
  rescheduleReason,
  rescheduledBy
}) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `UPDATE bookings
       SET start_time = ?,
           end_time = ?,
           rescheduled = TRUE,
           reschedule_reason = ?,
           rescheduled_at = NOW(),
           rescheduled_by = ?,
           status = CASE
             WHEN status = 'approved' THEN 'rescheduled'
             ELSE status
           END
       WHERE id = ?`,
      [
        new Date(newStartTime),
        new Date(newEndTime),
        rescheduleReason || "",
        rescheduledBy || "",
        id
      ]
    );

    return await findBookingById(id);
  } finally {
    connection.release();
  }
}
