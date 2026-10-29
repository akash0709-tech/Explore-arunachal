// /api/auth: sign-up, login, session and password reset.
// Tokens are httpOnly cookies; these functions never see or store them.
import { api, unwrap } from "./axios.js";

/**
 * @typedef {{ _id: string, name: string, email: string, phone?: string,
 *   role: "traveller"|"host"|"admin", emailVerified: boolean, phoneVerified: boolean,
 *   status: "active"|"suspended", lastLoginAt?: string }} User
 */

/**
 * Sends a 6-digit code by email or SMS.
 * @param {{ channel: "email"|"mobile", target: string, purpose: "signup"|"reset" }} body
 * @returns {Promise<{ expiresInMinutes: number, resendAfterSeconds: number }>}
 */
export const sendOtp = (body) => api.post("/auth/otp/send", body).then(unwrap);

/**
 * Checks a code. For sign-up it returns a short-lived verificationToken
 * (keep it in React state only, never in storage).
 * @param {{ channel: "email"|"mobile", target: string, purpose: "signup"|"reset", code: string }} body
 * @returns {Promise<{ verified: true, verificationToken?: string, expiresInMinutes?: number }>}
 */
export const verifyOtp = (body) => api.post("/auth/otp/verify", body).then(unwrap);

/**
 * @param {{ name: string, email: string, phone: string, password: string, role: "traveller"|"host",
 *   acceptedTerms: true }} body
 * @returns {Promise<User>}
 */
export const signup = (body) => api.post("/auth/signup", body).then((r) => unwrap(r).user);

/**
 * @param {{ identifier: string, password: string }} body  identifier = email or 10-digit phone
 * @returns {Promise<User>}
 */
export const login = (body) => api.post("/auth/login", body).then((r) => unwrap(r).user);

/** @returns {Promise<void>} */
export const logout = () => api.post("/auth/logout").then(() => undefined);

/**
 * The logged-in user, or null for guests. authOptional: a guest is not "expired",
 * so a failed refresh here never redirects to /login.
 * @returns {Promise<User|null>}
 */
export const me = () =>
  api
    .get("/auth/me", { authOptional: true })
    .then((r) => unwrap(r).user)
    .catch((error) => {
      if (error.response?.status === 401) return null;
      throw error;
    });

/** @param {{ email: string }} body */
export const forgotPassword = (body) => api.post("/auth/password/forgot", body).then((r) => r.data);

/** @param {{ email: string, code: string, newPassword: string }} body */
export const resetPassword = (body) => api.post("/auth/password/reset", body).then((r) => r.data);

/**
 * Which login options to show (e.g. Google). Public, no secrets.
 * @returns {Promise<{ googleAuthEnabled: boolean }>}
 */
export const getAuthConfig = () => api.get("/auth/config").then(unwrap);
