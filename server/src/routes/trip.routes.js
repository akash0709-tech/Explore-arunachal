// Routes mounted at /api/trips
import { Router } from "express";
import * as tripController from "../controllers/trip.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import {
  planTripSchema,
  createTripSchema,
  updateTripSchema,
  tripIdParams,
  listTripsQuery
} from "../validators/trip.validator.js";

const router = Router();

// Public live preview: anyone can try the planner before signing up
router.post("/plan", optionalAuth, validate({ body: planTripSchema }), tripController.preview);

// Everything below needs a logged-in user, and only the owner can touch a trip
router.use(requireAuth);

router.get("/", validate({ query: listTripsQuery }), tripController.list);
router.post("/", validate({ body: createTripSchema }), tripController.create);
router.get("/:id", validate({ params: tripIdParams }), tripController.getOne);
router.patch("/:id", validate({ params: tripIdParams, body: updateTripSchema }), tripController.update);
router.delete("/:id", validate({ params: tripIdParams }), tripController.remove);

export default router;
