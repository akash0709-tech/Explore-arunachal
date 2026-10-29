// Limits how many requests one IP can make, to slow down abuse and brute force.
import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Same JSON shape as the rest of our errors
const handler = (message) => (_req, res, _next, options) =>
  res.status(options.statusCode).json({ success: false, message, errors: [] });

// Applied to every /api route
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many requests, please try again in a few minutes")
});

// Stricter: OTP, sign-up, login and password-reset routes.
// 30 leaves room for a full sign-up (send + verify twice, then sign up) plus a few mistakes.
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many attempts, please wait 15 minutes and try again")
});

// Login only: 5 FAILED attempts per minute. Successful logins are not counted.
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many failed login attempts. Please wait a minute and try again.")
});

// Place search (each call uses our OpenRouteService quota)
export const geocodeLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler("Too many searches, please wait a few minutes")
});
