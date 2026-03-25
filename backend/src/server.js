// CRITICAL: Load dotenv FIRST before any other imports
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (parent of src/)
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Verify env vars are loaded BEFORE importing db.js
// eslint-disable-next-line no-console
console.log("[ENV CHECK] DB_USER:", process.env.DB_USER || "NOT LOADED");
// eslint-disable-next-line no-console
console.log("[ENV CHECK] DB_NAME:", process.env.DB_NAME || "NOT LOADED");
// eslint-disable-next-line no-console
console.log("[ENV CHECK] DB_PASSWORD:", process.env.DB_PASSWORD ? "SET" : "NOT LOADED");

// Import other modules (they don't read env vars at import time)
import { createApp } from "./app.js";
import { verifySmtpTransport } from "./services/emailService.js";
import { createTablesIfNotExists } from "./db/migrations.js";
import { initializeWhatsAppClient } from "./services/whatsappService.js";

const PORT = Number(process.env.PORT) || 5225;

const app = createApp();

// Initialize database and verify services on startup
void (async () => {
  try {
    // Dynamically import db.js AFTER dotenv has loaded
    const { testConnection } = await import("../config/db.js");
    
    // Test database connection
    const dbConnected = await testConnection();
    if (dbConnected) {
      // Create tables if they don't exist
      await createTablesIfNotExists();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Startup] Database initialization failed:", error.message);
  }

  // Verify SMTP configuration / connectivity on startup.
  try {
    await verifySmtpTransport();
  } catch (error) {
    // Already logged inside verifySmtpTransport; continue start-up so
    // non-email features can still function, but OTP requests will fail
    // with a clear error.
  }
})();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${PORT}`);
  // Initialize WhatsApp client (non-blocking; QR logged to console on first login)
  try {
    initializeWhatsAppClient();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[WhatsApp] Initialization failed:", err?.message ?? err);
  }
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `\n❌ Port ${PORT} is already in use.\n` +
      `   Please stop the process using port ${PORT} or change PORT in .env\n` +
      `   To find the process: netstat -ano | findstr :${PORT}\n` +
      `   To kill it: taskkill /F /PID <process_id>\n`
    );
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.error("Server error:", err);
    process.exit(1);
  }
});
