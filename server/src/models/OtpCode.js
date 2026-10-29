// A one-time code sent by email or SMS for sign-up verification or password reset.
// We store only a hash of the code; MongoDB deletes the document automatically after it expires.
import mongoose from "mongoose";
import { OTP_CHANNELS, OTP_PURPOSES, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "../utils/constants.js";

const otpCodeSchema = new mongoose.Schema(
  {
    target: { type: String, required: true, lowercase: true, trim: true }, // email address or phone number
    channel: { type: String, enum: OTP_CHANNELS, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0, max: OTP_MAX_ATTEMPTS }, // wrong guesses so far
    consumed: { type: Boolean, default: false }, // true once used, so it cannot be reused
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)
    }
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// TTL index: MongoDB removes the document once expiresAt has passed (checked about once a minute)
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Find the latest code for this email/phone and purpose
otpCodeSchema.index({ target: 1, purpose: 1, createdAt: -1 });

export const OtpCode = mongoose.model("OtpCode", otpCodeSchema);
