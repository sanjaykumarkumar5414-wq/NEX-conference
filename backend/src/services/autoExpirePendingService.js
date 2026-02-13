import {
  withTransaction,
  insertBookingHistory
} from "../repositories/bookingRepository.js";
import { createNotification } from "../repositories/notificationRepository.js";
import { getConnection } from "../db/pool.js";
import { query } from "../db/queryHelper.js";

export async function autoExpirePendingBookings() {
  const hours =
    Number.parseInt(process.env.PENDING_EXPIRY_HOURS ?? "", 10) || 48;

  const connection = await getConnection();
  try {
    const expiredBookings = await query(
      connection,
      `SELECT * FROM bookings
       WHERE status = 'PENDING'
         AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hours]
    );
    const list = Array.isArray(expiredBookings) ? expiredBookings : [];

    if (list.length === 0) {
      return { expiredCount: 0 };
    }

    let processed = 0;
    for (const booking of list) {
      await withTransaction(async (txConnection) => {
        const fromStatus = booking.status;

        await txConnection.query(
          `UPDATE bookings
           SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [booking.id]
        );
        const [updatedRows] = await txConnection.query(
          "SELECT * FROM bookings WHERE id = ?",
          [booking.id]
        );
        const updated = updatedRows && updatedRows[0] ? updatedRows[0] : null;
        if (!updated) return;

        await insertBookingHistory(txConnection, {
          bookingId: booking.id,
          action: "CANCELLED",
          actorId: null,
          fromStatus,
          toStatus: "CANCELLED",
          fromStartTime: booking.start_time,
          toStartTime: updated.start_time,
          fromEndTime: booking.end_time,
          toEndTime: updated.end_time,
          wasEmergency: updated.is_emergency,
          wasOverride: updated.is_override,
          metadata: {
            reason: "Automatically cancelled due to pending expiry.",
            expiryHours: hours
          }
        });

        await createNotification(txConnection, {
          userId: booking.requester_id,
          bookingId: booking.id,
          type: "BOOKING_AUTO_CANCELLED",
          payload: {
            timeRange: { start: booking.start_time, end: booking.end_time },
            expiryHours: hours
          }
        });

        processed += 1;
      });
    }

    return { expiredCount: processed };
  } finally {
    connection.release();
  }
}
