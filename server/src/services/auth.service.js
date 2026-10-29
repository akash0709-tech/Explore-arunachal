// Business logic for sign-up, login, sessions and password reset.
// Controllers call these functions and then set or clear cookies.
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { sendOtp, verifyOtp, RESEND_COOLDOWN_SECONDS } from "./otp.service.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  tokenMatchesHash,
  signVerificationToken,
  VERIFICATION_TOKEN_MINUTES
} from "./token.service.js";
import { OTP_TTL_MINUTES } from "../utils/constants.js";

const PASSWORD_SALT_ROUNDS = 12;

// Used when a login identifier does not exist, so the response takes the same time
// as a real password check (otherwise timing would reveal which accounts exist)
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password-1", PASSWORD_SALT_ROUNDS);

const SUSPENDED_MESSAGE = "Your account has been suspended. Please contact the Explore Arunachal team.";

// Same reply whether or not the account exists (prevents finding out who is registered)
const RESET_REPLY = { expiresInMinutes: OTP_TTL_MINUTES, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };

// Issue a new access + refresh token pair and remember the refresh token's hash.
// Storing one hash per user means one active session: logging in elsewhere ends the old one.
async function createSession(user, { isLogin }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const update = { refreshTokenHash: hashToken(refreshToken) };
  if (isLogin) update.lastLoginAt = new Date();
  await User.updateOne({ _id: user._id }, update);
  if (isLogin) user.lastLoginAt = update.lastLoginAt;

  return { user, accessToken, refreshToken };
}

// ----- OTP -----

export async function requestOtp({ channel, target, purpose }) {
  if (purpose === "reset") {
    await requestPasswordReset({ channel, target });
    return RESET_REPLY;
  }

  // Sign-up: no point verifying an email/phone that already has an account
  const taken = await User.exists(channel === "email" ? { email: target } : { phone: target });
  if (taken) {
    throw ApiError.conflict(
      channel === "email"
        ? "This email is already registered. Please log in instead."
        : "This mobile number is already registered. Please log in instead."
    );
  }
  return sendOtp({ channel, target, purpose });
}

export async function confirmOtp({ channel, target, purpose, code }) {
  // Reset codes are only checked here; they are used up by POST /password/reset
  if (purpose === "reset") {
    await verifyOtp({ channel, target, purpose, code, consume: false });
    return { verified: true };
  }

  await verifyOtp({ channel, target, purpose, code });
  return {
    verified: true,
    verificationToken: signVerificationToken({ channel, target }),
    expiresInMinutes: VERIFICATION_TOKEN_MINUTES
  };
}

// ----- Sign-up and login -----

export async function signup({ name, email, phone, password, role }) {
  const existing = await User.exists({ $or: [{ email }, { phone }] });
  if (existing) throw ApiError.conflict("An account with this email or mobile number already exists");

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role, // only "traveller" or "host"; the validator rejects "admin"
    emailVerified: false,
    phoneVerified: false
  });

  return createSession(user, { isLogin: true });
}

export async function login({ identifier, password }) {
  const query = identifier.includes("@") ? { email: identifier } : { phone: identifier };
  const user = await User.findOne(query).select("+passwordHash");

  const passwordOk = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) throw ApiError.unauthorized("Incorrect email/mobile number or password");

  // Checked after the password, so suspension is never revealed to someone guessing
  if (user.status === "suspended") throw ApiError.forbidden(SUSPENDED_MESSAGE);

  return createSession(user, { isLogin: true });
}

// ----- Sessions -----

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized("Please log in to continue");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Session expired, please log in again");
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user) throw ApiError.unauthorized("Session expired, please log in again");

  // A correctly signed token that is not the latest one has already been used.
  // That can mean it was stolen, so we end the session completely.
  if (!tokenMatchesHash(refreshToken, user.refreshTokenHash)) {
    await User.updateOne({ _id: user._id }, { $unset: { refreshTokenHash: 1 } });
    throw ApiError.unauthorized("Session expired, please log in again");
  }

  if (user.status === "suspended") {
    await User.updateOne({ _id: user._id }, { $unset: { refreshTokenHash: 1 } });
    throw ApiError.forbidden(SUSPENDED_MESSAGE);
  }

  return createSession(user, { isLogin: false }); // rotation: a brand-new refresh token
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const { sub } = verifyRefreshToken(refreshToken);
    // Only clear it if this is the current token
    await User.updateOne(
      { _id: sub, refreshTokenHash: hashToken(refreshToken) },
      { $unset: { refreshTokenHash: 1 } }
    );
  } catch {
    // Token already invalid or expired: nothing to revoke
  }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized("Please log in to continue");
  if (user.status === "suspended") throw ApiError.forbidden(SUSPENDED_MESSAGE);
  return user;
}

// ----- Password reset -----

export async function requestPasswordReset({ channel = "email", target }) {
  const user = await User.findOne(channel === "email" ? { email: target } : { phone: target }).lean();
  if (!user || user.status === "suspended") return; // silently do nothing

  try {
    await sendOtp({ channel, target, purpose: "reset" });
  } catch (err) {
    // A "wait 30s" error would reveal that the account exists, so hide it
    if (err instanceof ApiError && err.statusCode === 429) return;
    throw err;
  }
}

export async function resetPassword({ email, code, newPassword }) {
  await verifyOtp({ channel: "email", target: email, purpose: "reset", code });

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  // Also end any existing session, in case someone else was logged in
  const result = await User.updateOne(
    { email },
    { $set: { passwordHash, emailVerified: true }, $unset: { refreshTokenHash: 1 } }
  );
  if (result.matchedCount === 0) throw ApiError.badRequest("Invalid or expired code");
}
