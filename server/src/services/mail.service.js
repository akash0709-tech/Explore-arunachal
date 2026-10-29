// Sends emails through SMTP with nodemailer.
// With OTP_DEV_MODE=true no real email is sent: SMTP is not configured in that mode,
// so emails are printed in the server console instead.
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { OTP_TTL_MINUTES } from "../utils/constants.js";

// Created on first use, so the app starts even when SMTP is not configured
let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 465 = SSL; 587 upgrades with STARTTLS
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  if (env.otpDevMode) {
    logger.info(`[DEV EMAIL] to ${to} | ${subject}\n${text}`);
    return;
  }
  try {
    await getTransporter().sendMail({ from: env.mailFrom, to, subject, text, html });
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    throw new ApiError(503, "We could not send the email right now. Please try again in a moment.");
  }
}

export function sendOtpEmail(to, code, purpose) {
  const action = purpose === "reset" ? "reset your password" : "verify your email";
  const text =
    `Your Explore Arunachal code is ${code}.\n\n` +
    `Use it to ${action}. It expires in ${OTP_TTL_MINUTES} minutes.\n` +
    `If you did not ask for this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#13303A;max-width:420px">
      <h2 style="margin:0 0 12px">Explore Arunachal</h2>
      <p>Use this code to ${action}:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
      <p style="color:#62767D">It expires in ${OTP_TTL_MINUTES} minutes. If you did not ask for this, ignore this email.</p>
    </div>`;
  return sendMail({ to, subject: `${code} is your Explore Arunachal code`, text, html });
}

// Text typed by people (admin notes, listing names) must not become HTML inside an email
const escapeHtml = (text = "") =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const wrapHtml = (paragraphs) => `
    <div style="font-family:Arial,sans-serif;color:#13303A;max-width:480px">
      <h2 style="margin:0 0 12px">Explore Arunachal</h2>
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n      ")}
    </div>`;

const DECISION_EMAILS = {
  approve: (name) => ({
    subject: `${name} is now live on Explore Arunachal`,
    lines: [
      `Good news: your homestay "${name}" was approved and travellers can now see it with a Verified badge.`
    ]
  }),
  request_changes: (name) => ({
    subject: `Changes needed for ${name}`,
    lines: [`Our review team needs a few changes to "${name}" before it can go live.`]
  }),
  reject: (name) => ({
    subject: `Update on your listing ${name}`,
    lines: [`We could not approve "${name}".`]
  }),
  suspend: (name) => ({
    subject: `${name} has been suspended`,
    lines: [`Your homestay "${name}" is hidden from travellers for now.`]
  }),
  reinstate: (name) => ({
    subject: `${name} is live again`,
    lines: [`Your homestay "${name}" is visible to travellers again.`]
  }),
  reverify: (name) => ({
    subject: `Please re-verify ${name}`,
    lines: [
      `We need you to re-check the details and documents of "${name}". It stays hidden until it is approved again.`
    ]
  })
};

/** Tells a host about an admin decision on their listing. */
export function sendHostDecisionEmail({ to, homestayName, decision, note }) {
  const { subject, lines } = DECISION_EMAILS[decision](homestayName || "your homestay");
  if (note) lines.push(`Note from the review team: ${note}`);
  lines.push("Log in to your host dashboard to see the details.");
  return sendMail({ to, subject, text: lines.join("\n\n"), html: wrapHtml(lines) });
}

/** Reminds a host which verification documents are still missing. */
export function sendDocumentsReminderEmail({ to, homestayName, missingItems }) {
  const lines = [
    `Your listing "${homestayName || "your homestay"}" is waiting for these documents:`,
    ...missingItems.map((item) => `- ${item}`),
    "Upload them from your host dashboard so our team can review your listing."
  ];
  return sendMail({
    to,
    subject: "Documents needed for your homestay",
    text: lines.join("\n"),
    html: wrapHtml(lines)
  });
}
