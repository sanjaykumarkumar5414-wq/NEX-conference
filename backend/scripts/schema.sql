-- MySQL schema for conference room booking app.
-- Run once: mysql -u your_user -p your_database < backend/scripts/schema.sql
-- Or create DB first: CREATE DATABASE conference_room; USE conference_room;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- users
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36) PRIMARY KEY,
  email           VARCHAR(255) NOT NULL,
  password_hash   TEXT NOT NULL DEFAULT '',
  full_name       VARCHAR(255) NOT NULL,
  role            ENUM('EMPLOYEE', 'ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- rooms
CREATE TABLE IF NOT EXISTS rooms (
  id              CHAR(36) PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  location        VARCHAR(255) DEFAULT NULL,
  capacity        INT DEFAULT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id                  CHAR(36) PRIMARY KEY,
  room_id             CHAR(36) NOT NULL,
  requester_id        CHAR(36) NOT NULL,
  approver_id         CHAR(36) DEFAULT NULL,
  status              ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'OVERRIDDEN') NOT NULL DEFAULT 'PENDING',
  title               VARCHAR(255) DEFAULT NULL,
  purpose             TEXT DEFAULT NULL,
  start_time          DATETIME(3) NOT NULL,
  end_time            DATETIME(3) NOT NULL,
  is_emergency        TINYINT(1) NOT NULL DEFAULT 0,
  is_override         TINYINT(1) NOT NULL DEFAULT 0,
  parent_booking_id   CHAR(36) DEFAULT NULL,
  rejection_reason    TEXT DEFAULT NULL,
  notes               TEXT DEFAULT NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_bookings_time CHECK (end_time > start_time),
  KEY idx_bookings_room_time (room_id, start_time, end_time),
  KEY idx_bookings_status (status),
  KEY fk_bookings_room (room_id),
  KEY fk_bookings_requester (requester_id),
  KEY fk_bookings_approver (approver_id),
  KEY fk_bookings_parent (parent_booking_id),
  CONSTRAINT fk_bookings_room_id FOREIGN KEY (room_id) REFERENCES rooms (id),
  CONSTRAINT fk_bookings_requester_id FOREIGN KEY (requester_id) REFERENCES users (id),
  CONSTRAINT fk_bookings_approver_id FOREIGN KEY (approver_id) REFERENCES users (id),
  CONSTRAINT fk_bookings_parent_id FOREIGN KEY (parent_booking_id) REFERENCES bookings (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- booking_history (audit)
CREATE TABLE IF NOT EXISTS booking_history (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id        CHAR(36) NOT NULL,
  action            VARCHAR(50) NOT NULL,
  actor_id          CHAR(36) DEFAULT NULL,
  from_status       VARCHAR(20) DEFAULT NULL,
  to_status         VARCHAR(20) DEFAULT NULL,
  from_start_time   DATETIME(3) DEFAULT NULL,
  to_start_time     DATETIME(3) DEFAULT NULL,
  from_end_time     DATETIME(3) DEFAULT NULL,
  to_end_time       DATETIME(3) DEFAULT NULL,
  was_emergency     TINYINT(1) DEFAULT NULL,
  was_override      TINYINT(1) DEFAULT NULL,
  metadata          JSON DEFAULT NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_booking_history_booking (booking_id, created_at),
  CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_history_actor FOREIGN KEY (actor_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- otp_verifications (employee OTP login)
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  DATETIME(3) NOT NULL,
  consumed    TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_otp_user_expires (user_id, expires_at),
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  booking_id  CHAR(36) DEFAULT NULL,
  type        VARCHAR(80) NOT NULL,
  payload     JSON DEFAULT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default single conference room (required for bookings FK)
INSERT IGNORE INTO rooms (id, name, location, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Main Conference Room', 'Building A', 1);

SET FOREIGN_KEY_CHECKS = 1;
