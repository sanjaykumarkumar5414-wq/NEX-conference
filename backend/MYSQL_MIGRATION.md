# MySQL Database Migration - Complete

## ✅ Migration Summary

All in-memory storage has been replaced with MySQL database queries. The system now uses persistent storage.

---

## 📁 New Backend Structure

```
backend/
├── config/
│   └── db.js                    # MySQL connection pool (NEW)
├── src/
│   ├── db/
│   │   ├── migrations.js        # Auto-create tables on startup (NEW)
│   │   ├── pool.js              # (Legacy - can be removed)
│   │   └── queryHelper.js       # Query utilities
│   ├── stores/
│   │   ├── bookingStore.js      # ✅ MySQL-based (replaced in-memory)
│   │   ├── auditLogStore.js     # ✅ MySQL-based (replaced in-memory)
│   │   └── memoryAuthStore.js   # ✅ MySQL-based (replaced in-memory)
│   ├── routes/
│   │   ├── booking.routes.js    # ✅ Updated to async/await
│   │   └── admin.routes.js      # ✅ Updated to async/await
│   ├── services/
│   │   └── authService.js       # ✅ Updated to async/await
│   └── server.js                # ✅ Runs migrations on startup
└── .env                         # ✅ Updated DB_NAME=conference_booking
```

---

## 🗄️ Database Schema

### Tables Created Automatically:

1. **users**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `email` (VARCHAR UNIQUE NOT NULL)
   - `password` (VARCHAR NOT NULL)
   - `role` (ENUM: 'employee', 'hr')
   - `full_name` (VARCHAR)
   - `created_at` (TIMESTAMP)

2. **bookings**
   - `id` (VARCHAR(36) PRIMARY KEY) - UUID format
   - `room_id` (VARCHAR(36))
   - `user_id` (INT FOREIGN KEY → users.id)
   - `requester_email` (VARCHAR)
   - `requester_name` (VARCHAR)
   - `title` (VARCHAR)
   - `purpose` (TEXT)
   - `start_time` (DATETIME)
   - `end_time` (DATETIME)
   - `status` (ENUM: 'pending', 'approved', 'rejected', 'rescheduled', 'cancelled')
   - `type` (ENUM: 'REQUEST', 'EMERGENCY', 'BLOCK')
   - `is_emergency` (BOOLEAN)
   - `notes` (TEXT)
   - `approver_id` (VARCHAR)
   - `rejection_reason` (TEXT)
   - `rescheduled` (BOOLEAN)
   - `reschedule_reason` (TEXT)
   - `rescheduled_at` (DATETIME)
   - `rescheduled_by` (VARCHAR)
   - `created_at` (TIMESTAMP)

3. **manual_blocks**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `date` (DATE)
   - `start_time` (TIME)
   - `end_time` (TIME)
   - `reason` (TEXT)
   - `created_by` (INT FOREIGN KEY → users.id)
   - `created_at` (TIMESTAMP)

4. **audit_logs**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `booking_id` (VARCHAR(36) FOREIGN KEY → bookings.id)
   - `action` (VARCHAR)
   - `message` (TEXT)
   - `performed_by` (INT FOREIGN KEY → users.id)
   - `created_at` (TIMESTAMP)

5. **otps**
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `email` (VARCHAR)
   - `code_hash` (VARCHAR)
   - `expires_at` (TIMESTAMP)
   - `consumed` (BOOLEAN)
   - `created_at` (TIMESTAMP)

---

## 🔧 Configuration

### `backend/config/db.js`
- MySQL connection pool using `mysql2/promise`
- Reads from `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Connection limit: 10
- Auto-reconnect enabled

### `backend/src/db/migrations.js`
- Auto-creates all tables on server startup
- Uses `CREATE TABLE IF NOT EXISTS` (safe to run multiple times)
- Called automatically in `server.js`

### `.env` Configuration
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=conference_booking
```

---

## 🔄 Updated Functions

### `bookingStore.js` (All async now)
- ✅ `getAllBookings()` → MySQL SELECT with JOIN
- ✅ `findBookingById(id)` → MySQL SELECT WHERE
- ✅ `createBooking(...)` → MySQL INSERT (auto-creates user if needed)
- ✅ `updateBookingStatus(...)` → MySQL UPDATE
- ✅ `hasRescheduleConflict(...)` → MySQL SELECT with overlap check
- ✅ `rescheduleBooking(...)` → MySQL UPDATE

### `auditLogStore.js` (All async now)
- ✅ `addAuditEntry(...)` → MySQL INSERT
- ✅ `getAuditEntries()` → MySQL SELECT ORDER BY created_at DESC LIMIT 200

### `memoryAuthStore.js` (All async now)
- ✅ `setOtp(...)` → MySQL INSERT (replaces old OTPs)
- ✅ `getValidOtp(...)` → MySQL SELECT WHERE expires_at > NOW()
- ✅ `markOtpConsumed(...)` → MySQL UPDATE
- ✅ `createOrGetEmployee(...)` → MySQL SELECT/INSERT

---

## 🛣️ Updated Routes

All routes now use `async/await`:

- ✅ `GET /api/bookings` → `await getAllBookings()`
- ✅ `POST /api/bookings` → `await createBooking()`
- ✅ `PATCH /api/bookings/:id` → `await updateBookingStatus()`
- ✅ `POST /api/bookings/reschedule` → `await rescheduleBooking()`
- ✅ `GET /api/admin/audit-log` → `await getAuditEntries()`

---

## ✨ Features Preserved

- ✅ JWT authentication (unchanged)
- ✅ Role-based access control (unchanged)
- ✅ Nodemailer email sending (unchanged)
- ✅ Frontend API routes (unchanged)
- ✅ All UI features (unchanged)
- ✅ Availability heatmap (reads from MySQL bookings)
- ✅ Reschedule functionality (MySQL-backed)
- ✅ Audit logging (MySQL-backed)

---

## 🚀 Startup Flow

1. Server starts (`server.js`)
2. Loads `.env` variables
3. Tests MySQL connection (`testConnection()`)
4. Creates tables if not exist (`createTablesIfNotExists()`)
5. Verifies SMTP transport
6. Starts Express server on port 4000

---

## 📝 Notes

- **User IDs**: Frontend expects string IDs, backend uses INT. Conversion handled in `mapBookingRow()`.
- **Manual Blocks**: Currently stored as bookings with `type='BLOCK'`. The `manual_blocks` table exists for future use.
- **Date Handling**: All dates stored as DATETIME in MySQL, converted to ISO strings for frontend.
- **Auto User Creation**: If a user doesn't exist when creating a booking, they are automatically created in the `users` table.

---

## ✅ Migration Complete

All in-memory arrays have been removed and replaced with MySQL queries. The system is now fully database-backed and ready for production use.
