import { getConnection } from "../db/pool.js";
import { query, queryOne, uuid } from "../db/queryHelper.js";

export async function findUserByEmail(connection, email) {
  return queryOne(
    connection,
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
}

export async function findUserById(connection, userId) {
  return queryOne(
    connection,
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
}

export async function createUser(connection, { email, fullName, role, passwordHash }) {
  const id = uuid();
  await connection.query(
    `INSERT INTO users (id, email, full_name, role, password_hash, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, email, fullName, role, passwordHash]
  );
  const row = await queryOne(connection, "SELECT * FROM users WHERE id = ?", [id]);
  return row;
}

export async function ensureAdminUser(seedPasswordHash) {
  const connection = await getConnection();
  try {
    const existing = await queryOne(connection, "SELECT * FROM users WHERE email = ?", [
      "hr@nexware-global.com"
    ]);

    if (existing) {
      return existing;
    }

    const id = uuid();
    await connection.query(
      `INSERT INTO users (id, email, full_name, role, password_hash, is_active)
       VALUES (?, ?, ?, 'ADMIN', ?, 1)`,
      [id, "hr@nexware-global.com", "HR Admin", seedPasswordHash]
    );
    const row = await queryOne(connection, "SELECT * FROM users WHERE id = ?", [id]);
    return row;
  } finally {
    connection.release();
  }
}
