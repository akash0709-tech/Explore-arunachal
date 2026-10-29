// Creates, sends and checks 6-digit one-time codes (OTPs).
// Only a bcrypt hash of the code is stored; old codes are deleted automatically by a TTL index.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OtpCode } from "../models/index.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "../utils/constants.js";
import { sendOtpEmail } from "./mail.service.js";
import { sendOtpSms } from "./sms.service.js";

export const RESEND_COOLDOWN_SECONDS = 30;

// crypto.randomInt is unpredictable (Math.random is not safe for codes)
const generateCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export async function sendOtp({ channel, target, purpose }) {
  // 1. One code per target every 30 seconds
  const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  const recent = await OtpCode.findOne({ target, purpose, createdAt: { $gt: since } }).sort({
    createdAt: -1
  });
  if (recent) {
    const waitSeconds = Math.ceil((recent.createdAt.getTime() - since.getTime()) / 1000);
    throw new ApiError(429, `Please wait ${waitSeconds} seconds before asking for another code`);
  }

  // 2. Only the newest code is valid: remove older ones, then save the new hash
  await OtpCode.deleteMany({ target, purpose });
  const code = generateCode();
  const otp = await OtpCode.create({ target, channel, purpose, codeHash: await bcrypt.hash(code, 10) });

  // 3. Deliver it. If delivery fails, delete the code so the user can try again immediately.
  try {
    if (env.otpDevMode) {
      logger.info(`[DEV OTP] ${purpose} code for ${target} (${channel}): ${code}`);
    } else if (channel === "email") {
      await sendOtpEmail(target, code, purpose);
    } else {
      await sendOtpSms(target, code, purpose);
    }
  } catch (err) {
    await otp.deleteOne();
    throw err;
  }

  return { expiresInMinutes: OTP_TTL_MINUTES, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

// Throws an ApiError if the code is wrong, expired or out of attempts.
// consume=false checks the code without using it up (for the "check code, then set password" screen).
export async function verifyOtp({ channel, target, purpose, code, consume = true }) {
  const otp = await OtpCode.findOne({ target, channel, purpose, consumed: false }).sort({ createdAt: -1 });

  if (!otp || otp.expiresAt < new Date()) {
    throw ApiError.badRequest("This code has expired or was not found. Please request a new one.");
  }

  // Count this attempt atomically, so many parallel guesses cannot go over the limit
  const counted = await OtpCode.findOneAndUpdate(
    { _id: otp._id, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" }
  );
  if (!counted) {
    throw new ApiError(429, "Too many wrong attempts. Please request a new code.");
  }

  const isCorrect = await bcrypt.compare(code, otp.codeHash);
  if (!isCorrect) {
    const attemptsLeft = OTP_MAX_ATTEMPTS - counted.attempts;
    throw ApiError.badRequest(
      attemptsLeft > 0
        ? `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
        : "Incorrect code. Please request a new one."
    );
  }

  if (consume) await OtpCode.updateOne({ _id: otp._id }, { consumed: true });
}
