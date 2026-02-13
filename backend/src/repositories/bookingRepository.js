import { getConnection } from "../db/pool.js";
import { query, queryOne, uuid } from "../db/queryHelper.js";

export async function findBookingById(connection, bookingId) {
  return queryOne(connection, "SELECT * FROM bookings WHERE id = ?", [bookingId]);
}

export async function findOverlappingApprovedBookings(
  connection,
  roomId,
  startTime,
  endTime
) {
  const rows = await query(
    connection,
    `SELECT * FROM bookings
     WHERE room_id = ? AND status = 'APPROVED'
       AND start_time < ? AND end_time > ?`,
    [roomId, endTime, startTime]
  );
  return Array.isArray(rows) ? rows : [];
}

export async function createEmergencyBooking(
  connection,
  { roomId, requesterId, title, purpose, startTime, endTime }
) {
  const id = uuid();
  await connection.query(
    `INSERT INTO bookings (
        id, room_id, requester_id, status, title, purpose,
        start_time, end_time, is_emergency, is_override
      ) VALUES (?, ?, ?, 'APPROVED', ?, ?, ?, ?, 1, 1)`,
    [id, roomId, requesterId, title, purpose, startTime, endTime]
  );
  return queryOne(connection, "SELECT * FROM bookings WHERE id = ?", [id]);
}

export async function updateBookingTimeRange(
  connection,
  bookingId,
  { newStartTime, newEndTime, newStatus }
) {
  if (newStatus != null) {
    await connection.query(
      `UPDATE bookings
       SET start_time = ?, end_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [newStartTime, newEndTime, newStatus, bookingId]
    );
  } else {
    await connection.query(
      `UPDATE bookings
       SET start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [newStartTime, newEndTime, bookingId]
    );
  }
  return queryOne(connection, "SELECT * FROM bookings WHERE id = ?", [bookingId]);
}

export async function overrideAndRescheduleBooking(
  connection,
  { bookingId, hrUserId, reason, newStartTime, newEndTime }
) {
  const note = reason || "Overridden due to emergency booking.";
  await connection.query(
    `UPDATE bookings
     SET status = 'OVERRIDDEN', updated_at = CURRENT_TIMESTAMP(3),
         notes = CONCAT(COALESCE(notes, ''), '\n[OVERRIDDEN] ', ?)
     WHERE id = ?`,
    [note, bookingId]
  );
  const overriddenBooking = await queryOne(
    connection,
    "SELECT * FROM bookings WHERE id = ?",
    [bookingId]
  );
  if (!overriddenBooking) throw new Error("Override update failed");

  const rescheduledId = uuid();
  await connection.query(
    `INSERT INTO bookings (
        id, room_id, requester_id, status, title, purpose,
        start_time, end_time, is_emergency, is_override, parent_booking_id
      ) VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, 0, 0, ?)`,
    [
      rescheduledId,
      overriddenBooking.room_id,
      overriddenBooking.requester_id,
      overriddenBooking.title,
      overriddenBooking.purpose,
      newStartTime,
      newEndTime,
      overriddenBooking.id
    ]
  );
  const rescheduledBooking = await queryOne(
    connection,
    "SELECT * FROM bookings WHERE id = ?",
    [rescheduledId]
  );

  return {
    overriddenBooking,
    rescheduledBooking
  };
}

export async function insertBookingHistory(connection, history) {
  const {
    bookingId,
    action,
    actorId,
    fromStatus,
    toStatus,
    fromStartTime,
    toStartTime,
    fromEndTime,
    toEndTime,
    wasEmergency,
    wasOverride,
    metadata
  } = history;

  const metaJson =
    metadata != null && typeof metadata === "object"
      ? JSON.stringify(metadata)
      : metadata;

  await connection.query(
    `INSERT INTO booking_history (
        booking_id, action, actor_id, from_status, to_status,
        from_start_time, to_start_time, from_end_time, to_end_time,
        was_emergency, was_override, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      action,
      actorId || null,
      fromStatus || null,
      toStatus || null,
      fromStartTime || null,
      toStartTime || null,
      fromEndTime || null,
      toEndTime || null,
      wasEmergency === true ? 1 : wasEmergency === false ? 0 : null,
      wasOverride === true ? 1 : wasOverride === false ? 0 : null,
      metaJson
    ]
  );
  const [rows] = await connection.query(
    "SELECT * FROM booking_history WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1",
    [bookingId]
  );
  return rows && rows[0] ? rows[0] : null;
}

export async function withTransaction(callback) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
