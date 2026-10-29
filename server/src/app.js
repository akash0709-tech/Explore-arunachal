// Builds the Express app: security middleware, parsers, routes, then error handling.
// server.js imports this and starts listening; tests import it directly.
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { getDbState } from "./config/db.js";
import { httpLogger } from "./utils/logger.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { originCheck } from "./middleware/originCheck.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRouter from "./routes/index.js";
import "./models/index.js"; // registers every model so Mongoose builds their indexes on startup

const app = express();

// Behind a hosting proxy (Render, Railway...) this makes req.ip the real client IP for rate limiting
if (env.isProduction) app.set("trust proxy", 1);

// 1. Security headers, CORS and request logging
app.use(helmet());
app.use(cors(corsOptions));
app.use(httpLogger(env.nodeEnv));

// 2. Body and cookie parsers (1mb is plenty for JSON; files go through multer later).
// No urlencoded parser: the API only accepts JSON, which plain HTML forms from other sites cannot send.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(originCheck); // block POST/PUT/PATCH/DELETE coming from other websites (CSRF)

// 3. Clean the input: remove "$" and "." keys (NoSQL injection) and duplicate query params
app.use(mongoSanitize());
app.use(hpp());

// 4. Health check (outside the rate limiter so uptime monitors never get blocked)
app.get("/api/health", (_req, res) => {
  const database = getDbState();
  sendSuccess(res, {
    message: database === "connected" ? "API is healthy" : "API is running, database is not connected",
    data: {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      database,
      environment: env.nodeEnv,
      timestamp: new Date().toISOString()
    }
  });
});

// 5. All other API routes
app.use("/api", apiLimiter, apiRouter);

// 6. Unknown routes, then the central error handler (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
