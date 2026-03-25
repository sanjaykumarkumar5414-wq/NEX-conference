/**
 * WhatsApp notification service using whatsapp-web.js
 * Sends booking notifications as an additional channel alongside email.
 * Session is stored outside Jenkins workspace for persistence across deployments.
 */

import fs from "fs";
import path from "path";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
const { Client, LocalAuth } = pkg;

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || "/home/ubuntu/whatsapp-session";
const DEFAULT_COUNTRY_CODE = "91";
/** HR WhatsApp for new booking alerts (10-digit India number; formatted as 91…@c.us). Override via WHATSAPP_HR_NUMBER. */
const DEFAULT_HR_WHATSAPP_NUMBER = "8870957458";
const REINIT_DELAY_MS = 2000;
const RETRY_WAIT_MS = 5000;

let client = null;
let clientReady = false;
let reinitializing = false;
let reinitTimeoutId = null;

const SESSION_ERROR_PATTERNS = [
  "detached Frame",
  "detached",
  "Target closed",
  "Protocol error",
  "Session closed",
  "Browser closed",
  "Connection closed"
];

function isSessionError(err) {
  const msg = String(err?.message ?? err).toLowerCase();
  return SESSION_ERROR_PATTERNS.some((p) => msg.includes(p.toLowerCase()));
}

/**
 * Format phone number for WhatsApp API.
 * Converts 6379073500 → 916379073500@c.us
 * Appends +91 (India) if no country code is present.
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone || typeof phone !== "string") return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // If 10 digits, assume India and prepend 91
  if (digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }
  // If starts with 0, remove leading 0 and add country code
  if (digits.startsWith("0")) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }
  if (digits.length < 10) return null;
  return `${digits}@c.us`;
}

async function destroyClientSafely() {
  if (reinitTimeoutId) {
    clearTimeout(reinitTimeoutId);
    reinitTimeoutId = null;
  }
  const c = client;
  client = null;
  clientReady = false;
  if (c && typeof c.destroy === "function") {
    try {
      await c.destroy();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[WhatsApp] Error during destroy:", e?.message ?? e);
    }
  }
}

/**
 * Reinitialize the WhatsApp client (e.g. after disconnection or detached frame).
 */
async function reinitializeClient() {
  if (reinitializing) return;
  reinitializing = true;
  try {
    await destroyClientSafely();
    await new Promise((r) => setTimeout(r, 500));
    initializeWhatsAppClient();
  } finally {
    reinitializing = false;
  }
}

/**
 * Send a WhatsApp message to a phone number.
 * Retries once if the send fails due to session/frame issues.
 * @param {string} phone - Phone number (e.g. 6379073500 or 916379073500)
 * @param {string} message - Message text to send
 * @returns {Promise<boolean>} - true if sent, false if client not ready or error
 */
export async function sendWhatsAppMessage(phone, message) {
  const chatId = formatPhoneForWhatsApp(phone);
  if (!chatId) {
    // eslint-disable-next-line no-console
    console.warn("[WhatsApp] Invalid phone number:", phone);
    return false;
  }

  const doSend = async () => {
    if (!clientReady || !client) {
      return false;
    }
    await client.sendMessage(chatId, message);
    return true;
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (!clientReady || !client) {
      // eslint-disable-next-line no-console
      console.warn("[WhatsApp] Client not ready. Skipping message.");
      return false;
    }
    try {
      const sent = await doSend();
      if (sent) {
        // eslint-disable-next-line no-console
        console.log("[WhatsApp] Message sent to", chatId);
        return true;
      }
    } catch (err) {
      const errMsg = err?.message ?? String(err);
      // eslint-disable-next-line no-console
      console.error("[WhatsApp] Failed to send message:", errMsg);

      if (isSessionError(err) && attempt === 1) {
        // eslint-disable-next-line no-console
        console.warn("[WhatsApp] Session/frame error detected. Reinitializing and retrying once...");
        await reinitializeClient();
        await new Promise((r) => setTimeout(r, RETRY_WAIT_MS));
        continue;
      }
      return false;
    }
  }
  return false;
}

/**
 * Clear the WhatsApp session so a new QR scan is required.
 * Deletes stored session data and resets client state.
 * Call before restarting the server to link a different WhatsApp number.
 */
export function clearWhatsAppSession() {
  if (reinitTimeoutId) {
    clearTimeout(reinitTimeoutId);
    reinitTimeoutId = null;
  }
  const resolvedPath = path.resolve(SESSION_PATH);
  if (fs.existsSync(resolvedPath)) {
    fs.rmSync(resolvedPath, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log("[WhatsApp] Session cleared at", resolvedPath);
  }
  client = null;
  clientReady = false;
}

/**
 * Initialize WhatsApp client with LocalAuth and persistent session.
 * Logs QR code to console when first-time login is required.
 * Set CLEAR_WHATSAPP_SESSION=true to clear existing session and prompt for new QR on next start.
 */
export function initializeWhatsAppClient() {
  if (process.env.CLEAR_WHATSAPP_SESSION === "true") {
    clearWhatsAppSession();
    // eslint-disable-next-line no-console
    console.log("[WhatsApp] Fresh init requested. Remove CLEAR_WHATSAPP_SESSION from .env after scanning new QR.");
  }

  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: SESSION_PATH
    }),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  client.on("qr", (qr) => {
    // eslint-disable-next-line no-console
    console.log("[WhatsApp] QR code received. Scan with WhatsApp on your phone:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    clientReady = true;
    // eslint-disable-next-line no-console
    console.log("[WhatsApp] Client is ready.");
  });

  client.on("auth_failure", (msg) => {
    clientReady = false;
    // eslint-disable-next-line no-console
    console.error("[WhatsApp] Auth failure:", msg);
  });

  client.on("disconnected", (reason) => {
    clientReady = false;
    // eslint-disable-next-line no-console
    console.warn("[WhatsApp] Client disconnected:", reason);

    if (reinitTimeoutId) clearTimeout(reinitTimeoutId);
    reinitTimeoutId = setTimeout(() => {
      reinitTimeoutId = null;
      if (!clientReady && !reinitializing) {
        // eslint-disable-next-line no-console
        console.log("[WhatsApp] Scheduling reinitialize after disconnect...");
        reinitializeClient().catch((e) => {
          // eslint-disable-next-line no-console
          console.error("[WhatsApp] Reinitialize failed:", e?.message ?? e);
        });
      }
    }, REINIT_DELAY_MS);
  });

  client.initialize();

  return client;
}

/**
 * Notify HR on WhatsApp when an employee submits a new booking request.
 */
export async function sendNewBookingRequestToHrWhatsApp({ employeeName, title, date, time }) {
  const hrPhone = process.env.WHATSAPP_HR_NUMBER || DEFAULT_HR_WHATSAPP_NUMBER;
  const message =
    `📋 *New Conference Room Booking Request*\n\n` +
    `*Employee Name:* ${employeeName || "Unknown"}\n` +
    `*Title:* ${title || "Conference room"}\n` +
    `*Date:* ${date}\n` +
    `*Time:* ${time}`;
  return sendWhatsAppMessage(hrPhone, message);
}

/**
 * Send booking approved notification via WhatsApp.
 */
export async function sendBookingApprovedWhatsApp(phone, { title, date, time }) {
  const message =
    `📋 *Conference Room Booking Status*\n\n` +
    `Your booking has been approved.\n\n` +
    `*Title:* ${title || "Conference room"}\n` +
    `*Date:* ${date}\n` +
    `*Time:* ${time}\n\n` +
    `Thank you.`;
  return sendWhatsAppMessage(phone, message);
}

/**
 * Send booking rejected notification via WhatsApp.
 */
export async function sendBookingRejectedWhatsApp(phone, { title, date, time, reason }) {
  const displayReason = reason && String(reason).trim() ? String(reason).trim() : "No reason provided.";
  const message =
    `📋 *Conference Room Booking Status*\n\n` +
    `Your booking request has been rejected.\n\n` +
    `*Title:* ${title || "Conference room"}\n` +
    `*Date:* ${date}\n` +
    `*Time:* ${time}\n` +
    `*Reason:* ${displayReason}\n\n` +
    `Please contact HR if needed.`;
  return sendWhatsAppMessage(phone, message);
}

/**
 * Send booking rescheduled notification via WhatsApp.
 */
export async function sendBookingRescheduledWhatsApp(
  phone,
  { title, date, time, oldDate, oldTime, reason }
) {
  const displayReason = reason && String(reason).trim() ? String(reason).trim() : "No reason provided.";
  const message =
    `📋 *Conference Room Booking Status*\n\n` +
    `Your booking has been rescheduled by HR.\n\n` +
    `*Title:* ${title || "Conference room"}\n` +
    `*Previous:* ${oldDate} ${oldTime}\n` +
    `*New:* ${date} ${time}\n` +
    `*Reason:* ${displayReason}\n\n` +
    `If you have any questions, please contact HR.`;
  return sendWhatsAppMessage(phone, message);
}
