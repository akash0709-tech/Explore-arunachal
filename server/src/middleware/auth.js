// Reads the access token from its httpOnly cookie and puts the user on req.user.
//
// Note: we trust the token for its 15 minutes and do not hit the database on every
// request. When an admin suspends someone, their refresh token is revoked, so they
// are locked out within 15 minutes at most.
import { verifyAccessToken, ACCESS_COOKIE } from "../services/token.service.js";
import { ApiError } from "../utils/ApiError.js";

// For protected routes: no valid token -> 401 (the frontend then calls /auth/refresh once)
export function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(ApiError.unauthorized());

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(err); // the errorHandler turns JWT errors into a 401
  }
}

// For public routes that show more to logged-in users: never fails
export function optionalAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // invalid or expired: continue as a guest
    }
  }
  next();
}
