// Allows the request only for the given roles. Always use after requireAuth.
//   router.get("/queue", requireAuth, requireRole("admin"), ...)
//   router.post("/", requireAuth, requireRole("host", "admin"), ...)
import { ApiError } from "../utils/ApiError.js";

export const requireRole =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
