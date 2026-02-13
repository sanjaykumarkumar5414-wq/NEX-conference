import { getConnection } from "../db/pool.js";
import { query, queryOne, uuid } from "../db/queryHelper.js";

export async function createNotification(connection, notification) {
  const { userId, bookingId, type, payload } = notification;
  const id = uuid();
  const payloadJson =
    payload != null && typeof payload === "object"
      ? JSON.stringify(payload)
      : payload;

  await connection.query(
    `INSERT INTO notifications (id, user_id, booking_id, type, payload, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [id, userId, bookingId || null, type, payloadJson]
  );
  return queryOne(connection, "SELECT * FROM notifications WHERE id = ?", [id]);
}

export async function listNotificationsForUser(userId, { limit = 20 } = {}) {
  const connection = await getConnection();
  try {
    const rows = await query(
      connection,
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, limit]
    );
    return Array.isArray(rows) ? rows : [];
  } finally {
    connection.release();
  }
}

export async function markNotificationRead(notificationId, userId) {
  const connection = await getConnection();
  try {
    await connection.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [notificationId, userId]
    );
    return queryOne(connection, "SELECT * FROM notifications WHERE id = ? AND user_id = ?", [
      notificationId,
      userId
    ]);
  } finally {
    connection.release();
  }
}
