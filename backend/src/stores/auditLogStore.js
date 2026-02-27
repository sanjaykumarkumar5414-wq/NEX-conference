/**
 * MySQL-based audit log store - replaces in-memory arrays
 */

import { pool } from "../../config/db.js";
import { query } from "../db/queryHelper.js";

/**
 * Add audit log entry
 */
export async function addAuditEntry({ type, message, bookingId, meta }) {
  const connection = await pool.getConnection();
  try {
    // Convert performedBy to INT if it's a string (for backward compatibility)
    let performedBy = meta?.performedBy || null;
    if (performedBy && typeof performedBy === "string") {
      // Try to parse as INT, if it fails, set to null
      const parsed = Number.parseInt(performedBy, 10);
      performedBy = Number.isNaN(parsed) ? null : parsed;
    }

    await connection.query(
      `INSERT INTO audit_logs (booking_id, action, message, performed_by)
       VALUES (?, ?, ?, ?)`,
      [
        bookingId || null,
        type || "EVENT",
        message || "",
        performedBy
      ]
    );
  } finally {
    connection.release();
  }
}

/**
 * Get all audit log entries (most recent first)
 */
export async function getAuditEntries() {
  const connection = await pool.getConnection();
  try {
    const rows = await query(
      connection,
      `SELECT 
        id,
        booking_id as bookingId,
        action as type,
        message,
        performed_by as performedBy,
        created_at as at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 7`
    );

    return rows.map((row) => ({
      id: `audit-${row.id}`,
      type: row.type || "EVENT",
      message: row.message || "",
      bookingId: row.bookingId || null,
      at: row.at ? new Date(row.at).toISOString() : new Date().toISOString()
    }));
  } finally {
    connection.release();
  }
}
