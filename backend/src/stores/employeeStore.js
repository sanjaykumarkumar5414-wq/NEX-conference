/**
 * Employee and login history store - used for registration and login checks
 */

import { pool } from "../../config/db.js";
import { query, queryOne } from "../db/queryHelper.js";

/**
 * Get employee by email (lowercase)
 */
export async function getEmployeeByEmail(email) {
  const connection = await pool.getConnection();
  try {
    return await queryOne(
      connection,
      "SELECT id, email, employee_id, name, is_blocked FROM employees WHERE email = ?",
      [email.toLowerCase()]
    );
  } finally {
    connection.release();
  }
}

/**
 * Get employee by primary key id
 */
export async function getEmployeeById(id) {
  const connection = await pool.getConnection();
  try {
    return await queryOne(
      connection,
      "SELECT id, employee_id, name, email, project, phone_number, manager_name, is_blocked FROM employees WHERE id = ?",
      [Number(id)]
    );
  } finally {
    connection.release();
  }
}

/**
 * List all employees with total booking count (from bookings.requester_email).
 * Optional search filters by employee_id, name, email, project (LIKE %keyword%).
 */
export async function listEmployeesWithBookingCount(search) {
  const connection = await pool.getConnection();
  try {
    const term = search && String(search).trim();
    const likeArg = term ? `%${term}%` : null;
    let sql = `
      SELECT e.id, e.employee_id, e.name, e.email, e.project, e.phone_number, e.manager_name, e.is_blocked,
             (SELECT COUNT(*) FROM bookings b WHERE b.requester_email = e.email) AS total_bookings
      FROM employees e
    `;
    const params = [];
    if (likeArg) {
      sql += ` WHERE (e.employee_id LIKE ? OR e.name LIKE ? OR e.email LIKE ? OR e.project LIKE ?)`;
      params.push(likeArg, likeArg, likeArg, likeArg);
    }
    sql += ` ORDER BY e.name ASC`;
    const rows = await query(connection, sql, params);
    return rows.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      name: r.name,
      email: r.email,
      project: r.project,
      phone_number: r.phone_number,
      manager_name: r.manager_name,
      is_blocked: Boolean(r.is_blocked),
      total_bookings: Number(r.total_bookings) || 0
    }));
  } finally {
    connection.release();
  }
}

/**
 * Set employee is_blocked flag
 */
export async function setEmployeeBlocked(id, isBlocked) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      "UPDATE employees SET is_blocked = ? WHERE id = ?",
      [Boolean(isBlocked), Number(id)]
    );
  } finally {
    connection.release();
  }
}

/**
 * Register new employee. Throws if employee_id or email already exists.
 */
export async function registerEmployee({
  employee_id,
  name,
  email,
  project,
  phone_number,
  manager_name
}) {
  const connection = await pool.getConnection();
  try {
    const key = email.toLowerCase().trim();
    const [result] = await connection.query(
      `INSERT INTO employees (employee_id, name, email, project, phone_number, manager_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(employee_id).trim(),
        String(name).trim(),
        key,
        String(project).trim(),
        String(phone_number).trim(),
        String(manager_name).trim()
      ]
    );
    return { id: result.insertId };
  } finally {
    connection.release();
  }
}

/**
 * Check if employee_id is already taken
 */
export async function existsEmployeeId(employee_id) {
  const connection = await pool.getConnection();
  try {
    const row = await queryOne(
      connection,
      "SELECT 1 FROM employees WHERE employee_id = ?",
      [String(employee_id).trim()]
    );
    return Boolean(row);
  } finally {
    connection.release();
  }
}

/**
 * Check if email is already taken
 */
export async function existsEmployeeEmail(email) {
  const connection = await pool.getConnection();
  try {
    const row = await queryOne(
      connection,
      "SELECT 1 FROM employees WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    return Boolean(row);
  } finally {
    connection.release();
  }
}

/**
 * Insert login_history record
 */
export async function insertLoginHistory({ email, ip_address, status, otp_verified }) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO login_history (email, ip_address, status, otp_verified)
       VALUES (?, ?, ?, ?)`,
      [email.toLowerCase(), ip_address || null, status, Boolean(otp_verified)]
    );
  } finally {
    connection.release();
  }
}
