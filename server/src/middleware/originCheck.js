// CSRF protection. In production our cookies use sameSite "none" (frontend and API are
// on different sites), so the browser would also attach them to a form that some other
// website submits to our API. Browsers always send an Origin header on such requests,
// so we reject any state-changing request whose Origin is not our frontend.
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export function originCheck(req, _res, next) {
  if (SAFE_METHODS.includes(req.method)) return next();

  const origin = req.get("origin");
  // No Origin: not a browser cross-site request (curl, Postman, server-to-server)
  if (!origin || origin === env.clientUrl) return next();

  return next(ApiError.forbidden("Request blocked: unknown origin"));
}
