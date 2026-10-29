// Routes mounted at /api/maps. The ORS key never leaves the server.
import { Router } from "express";
import * as mapsController from "../controllers/maps.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { geocodeLimiter } from "../middleware/rateLimiters.js";
import {
  routeQuery,
  planGeometryBody,
  tripGeometryParams,
  geocodeQuery
} from "../validators/maps.validator.js";

const router = Router();

// Public: used by destination pages and the live plan preview
router.get("/route", validate({ query: routeQuery }), mapsController.route);
router.post("/plan-geometry", validate({ body: planGeometryBody }), mapsController.planGeometry);

// Logged in
router.get(
  "/trip/:tripId",
  requireAuth,
  validate({ params: tripGeometryParams }),
  mapsController.tripGeometry
);
router.get(
  "/geocode",
  requireAuth,
  geocodeLimiter,
  validate({ query: geocodeQuery }),
  mapsController.geocode
);

export default router;
