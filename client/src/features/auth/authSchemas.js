// Zod rules for the auth forms. They match the API's rules, so most mistakes are
// caught before a request is sent (the API still checks everything again).
import { z } from "zod";

// "+91 98765-43210" -> "9876543210" (same cleaning as the API)
export const normalizePhone = (value = "") =>
  String(value)
    .replace(/[\s-]/g, "")
    .replace(/^(\+91|91|0)(?=\d{10}$)/, "");

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
export const phoneField = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number"));

export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/\d/, "Add at least one number");

export const signupSchema = z.object({
  role: z.enum(["traveller", "host"]),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailField,
  phone: phoneField,
  password: passwordField,
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) })
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or mobile number"),
  password: z.string().min(1, "Enter your password")
});

export const newPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

/** True when the value is a valid email / 10-digit phone (used to enable "Send OTP") */
export const isValidTarget = (channel, value) =>
  (channel === "email" ? emailField : phoneField).safeParse(value ?? "").success;

/** The cleaned value the API will use */
export const cleanTarget = (channel, value) =>
  channel === "email"
    ? String(value ?? "")
        .trim()
        .toLowerCase()
    : normalizePhone(value);
