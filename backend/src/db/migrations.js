/**
 * Database migration script - auto-creates tables if they don't exist
 * Run on server startup
 */

import { pool } from "../../config/db.js";

export async function createTablesIfNotExists() {
  const connection = await pool.getConnection();
  try {
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('employee', 'hr') NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(36) PRIMARY KEY,
        room_id VARCHAR(36) DEFAULT '11111111-1111-1111-1111-111111111111',
        user_id INT NOT NULL,
        requester_email VARCHAR(255) NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        purpose TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'rescheduled', 'cancelled') DEFAULT 'pending',
        type ENUM('REQUEST', 'EMERGENCY', 'BLOCK') DEFAULT 'REQUEST',
        is_emergency BOOLEAN DEFAULT FALSE,
        notes TEXT,
        approver_id VARCHAR(255),
        rejection_reason TEXT,
        rescheduled BOOLEAN DEFAULT FALSE,
        reschedule_reason TEXT,
        rescheduled_at DATETIME,
        rescheduled_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_start_time (start_time),
        INDEX idx_end_time (end_time),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create manual_blocks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manual_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        reason TEXT NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create audit_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        message TEXT,
        performed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_booking_id (booking_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create OTPs table for employee authentication
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create employees table for registration
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        project VARCHAR(255) NOT NULL,
        phone_number VARCHAR(255) NOT NULL,
        manager_name VARCHAR(255) NOT NULL,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_employee_id (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create login_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        status ENUM('SUCCESS', 'FAILED') NOT NULL,
        otp_verified BOOLEAN NOT NULL,
        INDEX idx_email (email),
        INDEX idx_login_time (login_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // eslint-disable-next-line no-console
    console.log("[DB] All tables created/verified successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[DB] Error creating tables:", error);
    throw error;
  } finally {
    connection.release();
  }
}
