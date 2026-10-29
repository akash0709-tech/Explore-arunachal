// Central error handler. Every error in the app ends up here and is turned into
// { success: false, message, errors } with the right HTTP status code.
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// Convert known library errors into an ApiError
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Zod: request body/query/params failed validation
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    return new ApiError(400, "Validation failed", errors);
  }

  // Mongoose: schema validation failed (e.g. required field missing)
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, "Validation failed", errors);
  }

  // Mongoose: invalid ObjectId such as /api/trips/abc
  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid value for ${err.path}`, [
      { field: err.path, message: "Invalid id or value" }
    ]);
  }

  // MongoDB: unique index violated (e.g. email already registered)
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue ?? {});
    const errors = fields.map((field) => ({ field, message: `${field} is already in use` }));
    return new ApiError(409, "Duplicate value", errors);
  }

  // JWT problems
  if (err instanceof jwt.TokenExpiredError) return new ApiError(401, "Session expired, please log in again");
  if (err instanceof jwt.JsonWebTokenError) return new ApiError(401, "Invalid session, please log in again");

  // express.json(): malformed JSON or body too large
  if (err?.type === "entity.parse.failed") return new ApiError(400, "Request body is not valid JSON");
  if (err?.type === "entity.too.large") return new ApiError(413, "Request body is too large");

  // Anything else is an unexpected bug
  return new ApiError(err?.statusCode || 500, err?.statusCode ? err.message : "Something went wrong");
}

// Express recognises an error handler by its 4 arguments, so `next` must stay
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err?.stack || err}`);
  }

  const body = {
    success: false,
    message: apiError.message,
    errors: apiError.errors ?? []
  };

  // For unexpected (500) errors, include the stack trace while developing; never in production
  if (!env.isProduction && apiError.statusCode >= 500 && err?.stack) body.stack = err.stack;

  res.status(apiError.statusCode).json(body);
}
