// Everything about tokens and auth cookies.
//
// - Access token (15m): proves who you are on every request. Payload: { sub: userId, role }.
// - Refresh token (7d): only used by POST /api/auth/refresh to get a new pair.
//   A new one is issued every time (rotation) and only its hash is stored on the user.
// - Verification token (15m): proves an email/phone passed OTP verification, needed by /signup.
//
// Each kind has its own "audience", so one kind can never be used in place of another.
// Access and refresh tokens live ONLY in httpOnly cookies, which JavaScript cannot read.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "ea_access";
export const REFRESH_COOKIE = "ea_refresh";
export const VERIFICATION_TOKEN_MINUTES = 15;

// "15m" -> 900000 milliseconds (for the cookie's maxAge)
export function durationToMs(value) {
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(value, 10) * units[value.slice(-1)];
}

// ----- Access token -----
export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
    audience: "access"
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret, { audience: "access" });

// ----- Refresh token -----
// jwtid makes every refresh token unique, even two issued in the same second
export const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id) }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
    audience: "refresh",
    jwtid: crypto.randomUUID()
  });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.jwt.refreshSecret, { audience: "refresh" });

// We store a SHA-256 hash of the refresh token, not the token itself.
// (bcrypt is not used here: it only reads the first 72 bytes, and a JWT is longer.)
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export function tokenMatchesHash(token, storedHash) {
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b); // constant-time comparison
}

// ----- Verification token (after OTP) -----
export const signVerificationToken = ({ channel, target }) =>
  jwt.sign({ channel, target }, env.jwt.accessSecret, {
    expiresIn: `${VERIFICATION_TOKEN_MINUTES}m`,
    audience: "otp-verification"
  });

// True only if the token is valid, not expired, and was issued for exactly this email/phone
export function isVerificationTokenFor(token, { channel, target }) {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret, { audience: "otp-verification" });
    return payload.channel === channel && payload.target === target;
  } catch {
    return false;
  }
}

// ----- Cookies -----
// Production: frontend and API are on different sites, so cookies need sameSite "none" + secure (HTTPS).
// Development: both run on localhost, so "lax" works over plain http.
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/"
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const base = baseCookieOptions();
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: durationToMs(env.jwt.accessExpires) });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: durationToMs(env.jwt.refreshExpires) });
}

export function clearAuthCookies(res) {
  const base = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
