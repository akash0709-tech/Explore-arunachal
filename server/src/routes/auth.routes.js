// Routes mounted at /api/auth
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter, loginLimiter } from "../middleware/rateLimiters.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../validators/auth.validator.js";

const router = Router();

// Sensitive routes use the strict authLimiter. /refresh, /logout and /me do not,
// because the app calls them during normal use (every page load, every 15 minutes).
router.post("/otp/send", authLimiter, validate({ body: sendOtpSchema }), authController.sendOtp);
router.post("/otp/verify", authLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post("/signup", authLimiter, validate({ body: signupSchema }), authController.signup);
router.post("/login", loginLimiter, authLimiter, validate({ body: loginSchema }), authController.login);

router.get("/config", authController.config); // public: which login options the frontend should show
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

router.post(
  "/password/forgot",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.post(
  "/password/reset",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

// TODO (optional): Google login behind GOOGLE_AUTH_ENABLED

export default router;
