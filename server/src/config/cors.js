// CORS: only our frontend (CLIENT_URL) may call the API, and it may send cookies.
import { env } from "./env.js";

export const corsOptions = {
  origin(origin, callback) {
    // Requests with no Origin header (curl, Postman, server-to-server) are allowed;
    // browsers always send Origin on cross-site requests, so they are still checked.
    if (!origin || origin === env.clientUrl) return callback(null, true);
    return callback(null, false);
  },
  credentials: true, // allow the httpOnly auth cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
