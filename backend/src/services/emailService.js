import nodemailer from "nodemailer";

let transporter;

function assertSmtpConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw Object.assign(
      new Error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS."),
      { status: 500, code: "SmtpConfigError" }
    );
  }

  if (!SMTP_FROM) {
    // We allow a default, but log a warning once at startup.
    // eslint-disable-next-line no-console
    console.warn(
      "[SMTP] SMTP_FROM is not set. Falling back to noreply@nexware-global.com."
    );
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM || "noreply@nexware-global.com",
    noreplyFrom: process.env.SMTP_NOREPLY_FROM || "noreply@nexware-global.com"
  };
}

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = assertSmtpConfig();

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

export async function verifySmtpTransport() {
  try {
    const t = getTransporter();
    await t.verify();
    // eslint-disable-next-line no-console
    console.log("[SMTP] Transport verified successfully.");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[SMTP] Transport verification failed:", error);
    throw Object.assign(
      new Error("Failed to verify SMTP transport."),
      { status: 500, code: "SmtpVerificationError" }
    );
  }
}

export async function sendOtpEmail(toEmail, otpCode) {
  const transporterInstance = getTransporter();
  const { from } = assertSmtpConfig();

  const mailOptions = {
    from,
    to: toEmail,
    subject: "Your Nexware conference room OTP",
    text: `Your one-time login code is: ${otpCode}\n\nThis code is valid for a limited time. If you did not request this, you can safely ignore this email.`,
    html: `<p>Your one-time login code is:</p>
           <p style="font-size: 20px; font-weight: bold; letter-spacing: 4px;">${otpCode}</p>
           <p>This code is valid for a limited time. If you did not request this, you can safely ignore this email.</p>`
  };

  await transporterInstance.sendMail(mailOptions);
}

/**
 * Send booking approved email to the employee. Uses noreply address.
 * Does not throw; caller should catch and log.
 */
export async function sendBookingApprovedEmail(
  toEmail,
  { bookingDate, timeSlot, roomName, employeeName }
) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();

  const subject = "Conference Room Booking Approved";
  const text =
    `Dear ${employeeName || "Colleague"},\n\n` +
    `Your booking request for:\n` +
    `Date: ${bookingDate}\n` +
    `Time: ${timeSlot}\n` +
    `Title: ${roomName}\n\n` +
    `has been APPROVED by HR.\n\n` +
    `Thank you.\n`;

  const html =
    `<p>Dear ${escapeHtml(employeeName || "Colleague")},</p>` +
    `<p>Your booking request for:</p>` +
    `<ul><li>Date: ${escapeHtml(bookingDate)}</li><li>Time: ${escapeHtml(
      timeSlot
    )}</li><li>Title: ${escapeHtml(roomName)}</li></ul>` +
    `<p>has been <strong>APPROVED</strong> by HR.</p>` +
    `<p>Thank you.</p>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: toEmail,
    subject,
    text,
    html
  });
}

/**
 * Send booking rejected email to the employee. Uses noreply address.
 * Does not throw; caller should catch and log.
 */
export async function sendBookingRejectedEmail(
  toEmail,
  { bookingDate, timeSlot, roomName, reason, employeeName }
) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();

  const subject = "Conference Room Booking Rejected";
  const displayReason = reason && String(reason).trim() ? String(reason).trim() : "No reason was provided.";
  const text =
    `Dear ${employeeName || "Colleague"},\n\n` +
    `Your booking request for:\n` +
    `Date: ${bookingDate}\n` +
    `Time: ${timeSlot}\n` +
    `Title: ${roomName}\n\n` +
    `has been REJECTED by HR.\n\n` +
    `Please contact HR if needed.\n`;

  const html =
    `<p>Dear ${escapeHtml(employeeName || "Colleague")},</p>` +
    `<p>Your booking request for:</p>` +
    `<ul><li>Date: ${escapeHtml(bookingDate)}</li><li>Time: ${escapeHtml(
      timeSlot
    )}</li><li>Title: ${escapeHtml(roomName)}</li></ul>` +
    `<p>has been <strong>REJECTED</strong> by HR.</p>` +
    `<p><strong>Reason:</strong> ${escapeHtml(displayReason)}</p>` +
    `<p>Please contact HR if needed.</p>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: toEmail,
    subject,
    text,
    html
  });
}

/**
 * Send reschedule notification to the employee. Uses noreply address.
 */
export async function sendBookingRescheduledEmail(
  toEmail,
  { employeeName, oldDate, oldTime, newDate, newTime, reason }
) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();

  const subject = "Your Conference Room Booking Has Been Rescheduled";
  const displayReason =
    reason && String(reason).trim() ? String(reason).trim() : "No reason provided.";

  const text =
    `Hello ${employeeName || "Colleague"},\n\n` +
    `Your booking for the conference room has been rescheduled by HR.\n\n` +
    `Previous Schedule:\nDate: ${oldDate}\nTime: ${oldTime}\n\n` +
    `New Schedule:\nDate: ${newDate}\nTime: ${newTime}\n\n` +
    `Reason:\n${displayReason}\n\n` +
    `If you have any questions, please contact HR.\n\n` +
    `Regards,\nHR Team\nNexware Global`;

  const html =
    `<p>Hello ${escapeHtml(employeeName || "Colleague")},</p>` +
    `<p>Your booking for the conference room has been rescheduled by HR.</p>` +
    `<p><strong>Previous Schedule:</strong><br/>Date: ${escapeHtml(oldDate)}<br/>Time: ${escapeHtml(oldTime)}</p>` +
    `<p><strong>New Schedule:</strong><br/>Date: ${escapeHtml(newDate)}<br/>Time: ${escapeHtml(newTime)}</p>` +
    `<p><strong>Reason:</strong><br/>${escapeHtml(displayReason)}</p>` +
    `<p>If you have any questions, please contact HR.</p>` +
    `<p>Regards,<br/>HR Team<br/>Nexware Global</p>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: toEmail,
    subject,
    text,
    html
  });
}

export async function sendBookingRequestNotificationToHr({
  employeeName,
  employeeId,
  date,
  slotTime,
  project
}) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();
  const hrEmail = "hr@nexware-global.com";

  const subject = "New conference room booking request";
  const text =
    `Employee ${employeeName || "Unknown"} (ID: ${employeeId ?? "N/A"}) has requested a conference room slot.\n\n` +
    `Date: ${date}\n` +
    `Time: ${slotTime}\n` +
    (project ? `Project: ${project}\n` : "") +
    `\nPlease review this request in the HR dashboard.`;

  const html =
    `<p>Employee <strong>${escapeHtml(employeeName || "Unknown")}</strong> (ID: ${escapeHtml(
      employeeId ?? "N/A"
    )}) has requested a conference room slot.</p>` +
    `<ul>` +
    `<li>Date: ${escapeHtml(date)}</li>` +
    `<li>Time: ${escapeHtml(slotTime)}</li>` +
    (project ? `<li>Project: ${escapeHtml(project)}</li>` : "") +
    `</ul>` +
    `<p>Please review this request in the HR dashboard.</p>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: hrEmail,
    subject,
    text,
    html
  });
}

export async function sendBookingCancelledNotificationToHr({
  employeeName,
  employeeId,
  date,
  slotTime,
  project,
  purpose,
  status
}) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();
  const hrEmail = "hr@nexware-global.com";

  const subject = "Conference room booking cancelled by employee";
  const text =
    `Employee ${employeeName || "Unknown"} (ID: ${employeeId ?? "N/A"}) has cancelled a booking.\n\n` +
    `Date: ${date}\n` +
    `Time: ${slotTime}\n` +
    (project ? `Project: ${project}\n` : "") +
    `Purpose: ${purpose || "N/A"}\n` +
    `Status: ${status}\n`;

  const html =
    `<p>Employee <strong>${escapeHtml(employeeName || "Unknown")}</strong> (ID: ${escapeHtml(
      employeeId ?? "N/A"
    )}) has <strong>cancelled</strong> a conference room booking.</p>` +
    `<ul>` +
    `<li>Date: ${escapeHtml(date)}</li>` +
    `<li>Time: ${escapeHtml(slotTime)}</li>` +
    (project ? `<li>Project: ${escapeHtml(project)}</li>` : "") +
    `<li>Purpose: ${escapeHtml(purpose || "N/A")}</li>` +
    `<li>Status: ${escapeHtml(status)}</li>` +
    `</ul>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: hrEmail,
    subject,
    text,
    html
  });
}

/**
 * Send HR warning message to an employee. Uses noreply address.
 */
export async function sendWarningEmail(toEmail, message) {
  const transporterInstance = getTransporter();
  const { noreplyFrom } = assertSmtpConfig();

  const subject = "Conference Room – Message from HR";
  const body = message && String(message).trim() ? String(message).trim() : "Please contact HR regarding your conference room usage.";

  const text =
    `Dear Colleague,\n\n${body}\n\nRegards,\nHR Team\nNexware Global`;

  const html =
    `<p>Dear Colleague,</p><p>${escapeHtml(body.replace(/\n/g, "<br/>"))}</p><p>Regards,<br/>HR Team<br/>Nexware Global</p>`;

  await transporterInstance.sendMail({
    from: noreplyFrom,
    to: toEmail,
    subject,
    text,
    html
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

