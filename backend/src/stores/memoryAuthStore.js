/**
 * MySQL-based auth store - replaces in-memory OTPs and users
 */

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";
import { query, queryOne } from "../db/queryHelper.js";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Set OTP for email
 */
export async function setOtp(email, { codeHash, expiresAt }) {
  const connection = await pool.getConnection();
  try {
    // Delete old OTPs for this email
    await connection.query(
      "DELETE FROM otps WHERE email = ?",
      [email.toLowerCase()]
    );

    // Insert new OTP
    await connection.query(
      `INSERT INTO otps (email, code_hash, expires_at)
       VALUES (?, ?, ?)`,
      [
        email.toLowerCase(),
        codeHash,
        expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
      ]
    );
  } finally {
    connection.release();
  }
}

/**
 * Get valid OTP for email
 */
export async function getValidOtp(email) {
  const connection = await pool.getConnection();
  try {
    const row = await queryOne(
      connection,
      `SELECT code_hash, expires_at, consumed
       FROM otps
       WHERE email = ?
         AND consumed = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toLowerCase()]
    );

    if (!row) return null;

    return {
      codeHash: row.code_hash,
      expiresAt: new Date(row.expires_at),
      consumed: Boolean(row.consumed)
    };
  } finally {
    connection.release();
  }
}

/**
 * Mark OTP as consumed
 */
export async function markOtpConsumed(email) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      "UPDATE otps SET consumed = TRUE WHERE email = ?",
      [email.toLowerCase()]
    );
  } finally {
    connection.release();
  }
}

/**
 * Create or get employee user
 */
export async function createOrGetEmployee(email) {
  const connection = await pool.getConnection();
  try {
    const key = email.toLowerCase();
    let user = await queryOne(
      connection,
      "SELECT id, email, full_name, role FROM users WHERE email = ?",
      [key]
    );

    if (user) {
      return {
        id: String(user.id),
        email: user.email,
        fullName: user.full_name || user.email.split("@")[0],
        role: user.role === "hr" ? "ADMIN" : "EMPLOYEE"
      };
    }

    // Create new user
    const [result] = await connection.query(
      `INSERT INTO users (email, password, role, full_name)
       VALUES (?, ?, 'employee', ?)`,
      [key, "", key.split("@")[0]]
    );

    return {
      id: String(result.insertId),
      email: key,
      fullName: key.split("@")[0],
      role: "EMPLOYEE"
    };
  } finally {
    connection.release();
  }
}

/**
 * Create or get admin user (HR)
 */
export async function createOrGetAdmin(email) {
  const connection = await pool.getConnection();
  try {
    const key = email.toLowerCase();
    let user = await queryOne(
      connection,
      "SELECT id, email, full_name, role FROM users WHERE email = ?",
      [key]
    );

    if (user) {
      return {
        id: String(user.id),
        dbUserId: user.id, // INT ID for database operations
        email: user.email,
        fullName: user.full_name || "HR Admin",
        role: "ADMIN"
      };
    }

    // Create admin user
    const [result] = await connection.query(
      `INSERT INTO users (email, password, role, full_name)
       VALUES (?, ?, 'hr', ?)`,
      [key, "", "HR Admin"]
    );

    return {
      id: String(result.insertId),
      dbUserId: result.insertId, // INT ID for database operations
      email: key,
      fullName: "HR Admin",
      role: "ADMIN"
    };
  } finally {
    connection.release();
  }
}
