import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  setOtp,
  getValidOtp,
  markOtpConsumed,
  getLatestOtpCreatedAt,
  createOrGetEmployee,
  createOrGetAdmin
} from "../stores/memoryAuthStore.js";
import {
  getEmployeeByEmail,
  registerEmployee as insertEmployee,
  existsEmployeeId,
  existsEmployeeEmail,
  insertLoginHistory
} from "../stores/employeeStore.js";
import { sendOtpEmail } from "./emailService.js";

const ADMIN_EMAIL = "hr@nexware-global.com";
const ADMIN_PASSWORD = "Hr@123";
const OTP_TTL_MINUTES = 5;
const OTP_REQUEST_COOLDOWN_MS = 60 * 1000;

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerEmployee({
  employee_id,
  name,
  email,
  project,
  phone_number,
  manager_name
}) {
  const trim = (v) => (v != null ? String(v).trim() : "");
  const eid = trim(employee_id);
  const n = trim(name);
  const em = trim(email);
  const p = trim(project);
  const ph = trim(phone_number);
  const mgr = trim(manager_name);

  if (!eid) {
    const err = new Error("Employee ID is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!n) {
    const err = new Error("Employee Name is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!em) {
    const err = new Error("Email is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!EMAIL_REGEX.test(em)) {
    const err = new Error("Email must be a valid format.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  const allowedDomains = ["@nexware-global.com", "@nexgen-global.com"];
  const emLower = em.toLowerCase();
  if (!allowedDomains.some((d) => emLower.endsWith(d))) {
    const err = new Error(
      "Only nexware-global.com and nexgen-global.com email addresses are allowed for registration."
    );
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!p) {
    const err = new Error("Project is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!ph) {
    const err = new Error("Phone Number is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }
  if (!mgr) {
    const err = new Error("Manager Name is required.");
    err.status = 400;
    err.code = "ValidationError";
    throw err;
  }

  const key = em.toLowerCase();
  const [idTaken, emailTaken] = await Promise.all([
    existsEmployeeId(eid),
    existsEmployeeEmail(key)
  ]);
  if (idTaken) {
    const err = new Error("Employee ID is already registered.");
    err.status = 409;
    err.code = "DuplicateEmployeeId";
    throw err;
  }
  if (emailTaken) {
    const err = new Error("Email is already registered.");
    err.status = 409;
    err.code = "DuplicateEmail";
    throw err;
  }

  await insertEmployee({
    employee_id: eid,
    name: n,
    email: key,
    project: p,
    phone_number: ph,
    manager_name: mgr
  });

  return { message: "Registration successful. Please login using OTP." };
}

export async function requestEmployeeOtp({ email }) {
  if (!email || typeof email !== "string") {
    const error = new Error("Email is required.");
    error.status = 400;
    error.code = "ValidationError";
    throw error;
  }

  const lower = email.toLowerCase();

  const allowedDomains = ["@nexware-global.com", "@nexgen-global.com"];
  if (!allowedDomains.some((d) => lower.endsWith(d))) {
    const error = new Error(
      "Only nexware-global.com and nexgen-global.com email addresses are allowed for employee login."
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

  const employee = await getEmployeeByEmail(lower);
  if (!employee) {
    const error = new Error("You are not registered. Please register first.");
    error.status = 403;
    error.code = "NotRegistered";
    throw error;
  }
  if (employee.is_blocked) {
    const error = new Error(
      "Your account has been restricted. Please contact HR."
    );
    error.status = 403;
    error.code = "AccountBlocked";
    throw error;
  }

  const lastRequestedAt = await getLatestOtpCreatedAt(lower);
  if (lastRequestedAt) {
    const elapsed = Date.now() - lastRequestedAt.getTime();
    if (elapsed >= 0 && elapsed < OTP_REQUEST_COOLDOWN_MS) {
      const error = new Error("Please wait before requesting another OTP.");
      error.status = 429;
      error.code = "OtpRateLimited";
      throw error;
    }
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

export async function verifyEmployeeOtp({ email, otp, ip_address }) {
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
    await insertLoginHistory({
      email: lower,
      ip_address,
      status: "FAILED",
      otp_verified: false
    });
    const error = new Error("No valid OTP found or OTP has expired.");
    error.status = 400;
    error.code = "OtpNotFound";
    throw error;
  }

  const isValid = await bcrypt.compare(otp, entry.codeHash);
  if (!isValid) {
    await insertLoginHistory({
      email: lower,
      ip_address,
      status: "FAILED",
      otp_verified: false
    });
    const error = new Error("Invalid OTP.");
    error.status = 401;
    error.code = "InvalidOtp";
    throw error;
  }

  await markOtpConsumed(lower);
  await insertLoginHistory({
    email: lower,
    ip_address,
    status: "SUCCESS",
    otp_verified: true
  });

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
