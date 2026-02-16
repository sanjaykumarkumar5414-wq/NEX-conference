<<<<<<< HEAD
## Conference Room Booking App

Full-stack conference room booking web application.

### Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, GSAP
- **Backend**: Node.js, Express, MySQL
- **Auth**: JWT-based authentication with role-based access (`EMPLOYEE`, `ADMIN/HR`)

### Project Structure

- `frontend/` - React SPA (Vite) UI
- `backend/` - Express API server

### Getting Started

#### Prerequisites

- Node.js (LTS)
- npm or yarn
- **MySQL** (installed and running)

#### Database setup (required for auth / OTP)

1. Create the database (e.g. in MySQL client or phpMyAdmin):
   ```sql
   CREATE DATABASE conference_room;
   USE conference_room;
   ```
2. Run the schema (from project root):
   ```bash
   mysql -u your_user -p conference_room < backend/scripts/schema.sql
   ```
3. In `backend/.env`, set MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=conference_room
   ```
4. Restart the backend (`npm run dev`). Once MySQL is reachable, OTP and login will work.

#### Install Dependencies

From the project root:

```bash
cd frontend
npm install

cd ../backend
npm install
```

#### Run Apps

```bash
cd frontend
npm run dev

cd ../backend
npm run dev
```

> Note: Business logic (auth, booking workflow, DB queries) is intentionally **not implemented yet**. This repository currently contains only the scaffolding and folder structure.

=======
# Nex_conference
Conference room booking application
>>>>>>> a41a4713d870919dc18d1b6dee2f12fe0825de3e