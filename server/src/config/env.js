// Loads environment variables from server/.env and validates them with Zod.
// If anything is missing or wrong, the server prints a clear list and exits
// immediately, instead of crashing later with a confusing error.
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

// Reusable rules
const required = (name) =>
  z
    .string({ required_error: `${name} is required` })
    .trim()
    .min(1, `${name} is required`);
const duration = (name) => z.string().regex(/^\d+[smhd]$/, `${name} must look like 30s, 15m, 12h or 7d`);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),

    // Database
    MONGODB_URI: required("MONGODB_URI").regex(
      /^mongodb(\+srv)?:\/\//,
      "MONGODB_URI must start with mongodb:// or mongodb+srv://"
    ),
    // Optional: comma-separated DNS servers (e.g. "1.1.1.1,8.8.8.8") for networks
    // where Atlas "mongodb+srv" lookups fail. Leave empty to use the system DNS.
    DNS_SERVERS: z.string().optional().default(""),

    // Frontend origin allowed by CORS (cookies are sent only to this origin)
    CLIENT_URL: required("CLIENT_URL").url("CLIENT_URL must be a full URL like http://localhost:5173"),

    // Auth tokens
    JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET").min(
      32,
      "JWT_ACCESS_SECRET must be at least 32 characters"
    ),
    JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET").min(
      32,
      "JWT_REFRESH_SECRET must be at least 32 characters"
    ),
    JWT_ACCESS_EXPIRES: duration("JWT_ACCESS_EXPIRES").default("15m"),
    JWT_REFRESH_EXPIRES: duration("JWT_REFRESH_EXPIRES").default("7d"),

    // ImageKit (photos and private verification documents)
    IMAGEKIT_PUBLIC_KEY: required("IMAGEKIT_PUBLIC_KEY"),
    IMAGEKIT_PRIVATE_KEY: required("IMAGEKIT_PRIVATE_KEY"),
    IMAGEKIT_URL_ENDPOINT: required("IMAGEKIT_URL_ENDPOINT").url("IMAGEKIT_URL_ENDPOINT must be a full URL"),

    // OpenRouteService (road routes and geocoding)
    ORS_API_KEY: required("ORS_API_KEY"),

    // Email (only needed when OTP_DEV_MODE is false; checked below)
    SMTP_HOST: z.string().optional().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    MAIL_FROM: z.string().optional().default(""),

    // "true" prints OTP codes in the server console instead of sending them
    OTP_DEV_MODE: z
      .enum(["true", "false"], { message: "OTP_DEV_MODE must be true or false" })
      .default("false")
      .transform((value) => value === "true"),

    // Password for the sample accounts created by `npm run seed` (checked by the seed script only)
    SEED_PASSWORD: z.string().optional().default(""),

    // Optional Google login (not built yet). The frontend shows the Google button only when true.
    GOOGLE_AUTH_ENABLED: z
      .enum(["true", "false"], { message: "GOOGLE_AUTH_ENABLED must be true or false" })
      .default("false")
      .transform((value) => value === "true")
  })
  .superRefine((env, ctx) => {
    // The two JWT secrets must be different, otherwise a refresh token could be used as an access token
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET"
      });
    }

    // Printing OTPs to the console is never allowed in production
    if (env.NODE_ENV === "production" && env.OTP_DEV_MODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTP_DEV_MODE"],
        message: "OTP_DEV_MODE must be false in production"
      });
    }

    // When we really send emails, all SMTP settings are required
    if (!env.OTP_DEV_MODE) {
      for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when OTP_DEV_MODE is false`
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Show only the first problem per variable (an empty value would otherwise fail several rules)
  const seen = new Set();
  const lines = parsed.error.issues
    .filter((issue) => !seen.has(issue.path.join(".")) && seen.add(issue.path.join(".")))
    .map((issue) => `  - ${issue.message}`);
  console.error(
    [
      "",
      "❌ Invalid environment configuration. Fix these in server/.env (see server/.env.example):",
      ...lines,
      ""
    ].join("\n")
  );
  process.exit(1);
}

const e = parsed.data;

// One frozen object used everywhere else in the app, e.g. env.mongodbUri
export const env = Object.freeze({
  nodeEnv: e.NODE_ENV,
  isProduction: e.NODE_ENV === "production",
  isTest: e.NODE_ENV === "test",
  port: e.PORT,
  mongodbUri: e.MONGODB_URI,
  dnsServers: e.DNS_SERVERS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  clientUrl: e.CLIENT_URL,
  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpires: e.JWT_ACCESS_EXPIRES,
    refreshExpires: e.JWT_REFRESH_EXPIRES
  },
  imagekit: {
    publicKey: e.IMAGEKIT_PUBLIC_KEY,
    privateKey: e.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: e.IMAGEKIT_URL_ENDPOINT
  },
  orsApiKey: e.ORS_API_KEY,
  smtp: {
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    user: e.SMTP_USER,
    pass: e.SMTP_PASS
  },
  mailFrom: e.MAIL_FROM,
  otpDevMode: e.OTP_DEV_MODE,
  seedPassword: e.SEED_PASSWORD,
  googleAuthEnabled: e.GOOGLE_AUTH_ENABLED
});
