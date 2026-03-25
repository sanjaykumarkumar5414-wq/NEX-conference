#!/usr/bin/env node
/**
 * Clears the WhatsApp session so a new QR code scan is required.
 * Run before starting the server to link a different WhatsApp number.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || "/home/ubuntu/whatsapp-session";

import fs from "fs";

const resolvedPath = path.resolve(SESSION_PATH);
if (fs.existsSync(resolvedPath)) {
  try {
    fs.rmSync(resolvedPath, { recursive: true, force: true });
    console.log("[WhatsApp] Session cleared at", resolvedPath);
  } catch (err) {
    console.error(
      "[WhatsApp] Failed to clear session. Ensure the server is stopped and no process is using the session:",
      err.message
    );
    process.exit(1);
  }
} else {
  console.log("[WhatsApp] No session found at", resolvedPath);
}

console.log("Done. Restart the server to scan a new QR code and link a different WhatsApp number.");
