// Thin controllers: read the request, call the auth service, set cookies, send the response.
// Tokens are NEVER put in the JSON body; they only travel in httpOnly cookies.
import * as authService from "../services/auth.service.js";
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from "../services/token.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { env } from "../config/env.js";

const RESET_SENT_MESSAGE = "If an account exists for this email, we have sent a code to it.";

// POST /api/auth/otp/send
export const sendOtp = asyncHandler(async (req, res) => {
  const data = await authService.requestOtp(req.body);
  const message = req.body.purpose === "reset" ? RESET_SENT_MESSAGE : "Code sent";
  sendSuccess(res, { data, message });
});

// POST /api/auth/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.confirmOtp(req.body);
  sendSuccess(res, { data, message: "Verified" });
});

// POST /api/auth/signup
export const signup = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.signup(req.body);
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, { statusCode: 201, data: { user }, message: "Account created" });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, { data: { user }, message: "Logged in" });
});

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await authService.refreshSession(req.cookies[REFRESH_COOKIE]);
    setAuthCookies(res, { accessToken, refreshToken });
    sendSuccess(res, { data: { user }, message: "Session refreshed" });
  } catch (err) {
    clearAuthCookies(res); // a failed refresh means the user must log in again
    throw err;
  }
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies[REFRESH_COOKIE]);
  clearAuthCookies(res);
  sendSuccess(res, { message: "Logged out" });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, { data: { user } });
});

// POST /api/auth/password/forgot
export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset({ channel: "email", target: req.body.email });
  sendSuccess(res, { message: RESET_SENT_MESSAGE });
});

// POST /api/auth/password/reset
export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  clearAuthCookies(res);
  sendSuccess(res, { message: "Password updated. Please log in with your new password." });
});

// GET /api/auth/config: login options for the frontend (no secrets here)
export const config = (_req, res) => {
  sendSuccess(res, { data: { googleAuthEnabled: env.googleAuthEnabled } });
};
