import { randomUUID } from "crypto";

/**
 * MySQL connection/queries use ? placeholders and return [rows, fields].
 * These helpers normalize to a single return value for compatibility with existing repo code.
 */

export function uuid() {
  return randomUUID();
}

/**
 * Run query on connection (mysql2 promise). Returns rows array for SELECT, result for INSERT/UPDATE.
 * connection.query(sql, params) -> [rows, fields]. For INSERT, rows is ResultSetHeader.
 */
export async function query(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

/** First row or null (SELECT single row). */
export async function queryOne(connection, sql, params = []) {
  const rows = await query(connection, sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** For INSERT: pass id (uuid), then return the row as object (no RETURNING in MySQL). */
export function rowFromInsert(table, id, insertFields) {
  return { id, ...insertFields };
}
