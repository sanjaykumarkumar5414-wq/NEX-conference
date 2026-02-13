import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  setOtp,
  getValidOtp,
  markOtpConsumed,
  createOrGetEmployee,
  createOrGetAdmin
} from "../stores/memoryAuthStore.js";
import { sendOtpEmail } from "./emailService.js";

const ADMIN_EMAIL = "hr@nexware-global.com";
const ADMIN_PASSWORD = "Hr@123";
const OTP_TTL_MINUTES = 5;

function signJwt(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw Object.assign(new Error("JWT secret not configured"), {
      status: 500,
      code: "ConfigError"
    });
  }

  return jwt.sign(payload, secret, { expiresIn: "8h" });
}

export async function adminLogin({ email, password }) {
  if (email !== ADMIN_EMAIL) {
    const error = new Error("Invalid admin credentials.");
    error.status = 401;
    error.code = "InvalidCredentials";
    throw error;
  }

  if (password !== ADMIN_PASSWORD) {
    const error = new Error("Invalid admin credentials.");
    error.status = 401;
    error.code = "InvalidCredentials";
    throw error;
  }

  // Get or create admin user in database
  const adminUser = await createOrGetAdmin(ADMIN_EMAIL);

  const token = signJwt({
    id: adminUser.id, // String ID for JWT (backward compatibility)
    dbUserId: adminUser.dbUserId, // INT ID for database operations
    role: "ADMIN",
    email: ADMIN_EMAIL
  });

  return {
    user: {
      id: adminUser.id,
      email: ADMIN_EMAIL,
      fullName: adminUser.fullName,
      role: "ADMIN"
    },
    token
  };
}

export async function requestEmployeeOtp({ email }) {
  if (!email || typeof email !== "string") {
    const error = new Error("Email is required.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  const lower = email.toLowerCase();

  if (!lower.endsWith("@nexware-global.com")) {
    const error = new Error(
      "Only nexware-global.com email addresses are allowed for employee login."
    );
    error.status = 403;
    error.code = "InvalidDomain";
    throw error;
  }

  if (lower.endsWith("@gmail.com")) {
    const error = new Error("gmail.com addresses are not allowed.");
    error.status = 403;
    error.code = "InvalidDomain";
    throw error;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await setOtp(lower, { codeHash, expiresAt });
  await createOrGetEmployee(lower);

  await sendOtpEmail(lower, code);

  return {
    message: "OTP generated and sent to your company email address."
  };
}

export async function verifyEmployeeOtp({ email, otp }) {
  if (!email || !otp) {
    const error = new Error("Email and OTP are required.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  const lower = email.toLowerCase();

  const user = await createOrGetEmployee(lower);

  const entry = await getValidOtp(lower);
  if (!entry) {
    const error = new Error("No valid OTP found or OTP has expired.");
    error.status = 400;
    error.code = "OtpNotFound";
    throw error;
  }

  const isValid = await bcrypt.compare(otp, entry.codeHash);
  if (!isValid) {
    const error = new Error("Invalid OTP.");
    error.status = 401;
    error.code = "InvalidOtp";
    throw error;
  }

  await markOtpConsumed(lower);

  const token = signJwt({
    id: user.id,
    role: "EMPLOYEE",
    email: user.email
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: "EMPLOYEE"
    },
    token
  };
}
