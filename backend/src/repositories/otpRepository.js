import { getConnection } from "../db/pool.js";
import { query, queryOne, uuid } from "../db/queryHelper.js";

// Table: otp_verifications (id, user_id, code_hash, expires_at, consumed, created_at)

export async function createOtp(connection, { userId, codeHash, expiresAt }) {
  const id = uuid();
  await connection.query(
    `INSERT INTO otp_verifications (id, user_id, code_hash, expires_at, consumed)
     VALUES (?, ?, ?, ?, 0)`,
    [id, userId, codeHash, expiresAt]
  );
  const row = await queryOne(connection, "SELECT * FROM otp_verifications WHERE id = ?", [id]);
  return row;
}

export async function findLatestValidOtpForUser(connection, userId) {
  return queryOne(
    connection,
    `SELECT * FROM otp_verifications
     WHERE user_id = ? AND consumed = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
}

export async function markOtpConsumed(connection, otpId) {
  await connection.query(
    "UPDATE otp_verifications SET consumed = 1 WHERE id = ?",
    [otpId]
  );
}

export async function withOtpTransaction(callback) {
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
