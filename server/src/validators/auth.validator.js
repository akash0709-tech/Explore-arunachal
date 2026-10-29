// Zod schemas for every /api/auth endpoint. They also clean the input:
// emails are lowercased, phone numbers lose spaces, dashes and a +91 / 0 prefix.
import { z } from "zod";
import { OTP_CHANNELS, OTP_PURPOSES } from "../utils/constants.js";

// "+91 98765-43210" -> "9876543210"
export const normalizePhone = (value) =>
  String(value)
    .replace(/[\s-]/g, "")
    .replace(/^(\+91|91|0)(?=\d{10}$)/, "");

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const phoneSchema = z
  .string({ required_error: "Mobile number is required" })
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"));

// bcrypt ignores anything after 72 bytes, so we cap the length there
const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/\d/, "Password must contain at least one number");

const codeSchema = z
  .string({ required_error: "Code is required" })
  .trim()
  .regex(/^\d{6}$/, "Code must be 6 digits");

// For OTP requests, "target" is an email or a phone depending on "channel".
// This checks it with the right rule and replaces it with the cleaned value.
const withValidTarget = (schema) =>
  schema.transform((data, ctx) => {
    const rule = data.channel === "email" ? emailSchema : phoneSchema;
    const result = rule.safeParse(data.target);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target"],
        message: result.error.issues[0].message
      });
      return z.NEVER;
    }
    return { ...data, target: result.data };
  });

const otpBase = {
  channel: z.enum(OTP_CHANNELS, { message: "channel must be email or mobile" }),
  target: z.string({ required_error: "Email or mobile number is required" }),
  purpose: z.enum(OTP_PURPOSES, { message: "purpose must be signup or reset" })
};

// POST /otp/send
export const sendOtpSchema = withValidTarget(z.object(otpBase));

// POST /otp/verify
export const verifyOtpSchema = withValidTarget(z.object({ ...otpBase, code: codeSchema }));

// POST /signup. Email and phone are required but are not OTP-verified. Role "admin"
// is not in the list, so it can never be chosen here.
export const signupSchema = z.object({
  name: z.string({ required_error: "Name is required" }).trim().min(2, "Name is too short").max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["traveller", "host"], { message: "role must be traveller or host" }).default("traveller"),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to continue" }) })
});

// POST /login. identifier is an email (contains "@") or a phone number.
export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Enter your email or mobile number" })
    .trim()
    .min(3, "Enter your email or mobile number")
    .transform((value) => (value.includes("@") ? value.toLowerCase() : normalizePhone(value))),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required").max(72)
});

// POST /password/forgot
export const forgotPasswordSchema = z.object({ email: emailSchema });

// POST /password/reset
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  newPassword: passwordSchema
});
