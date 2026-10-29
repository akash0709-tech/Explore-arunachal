// Routes mounted at /api/destinations (public, read-only)
import { Router } from "express";
import * as destinationController from "../controllers/destination.controller.js";
import { validate } from "../middleware/validate.js";
import { listDestinationsQuery, destinationSlugParams } from "../validators/destination.validator.js";

const router = Router();

router.get("/", validate({ query: listDestinationsQuery }), destinationController.list);
router.get("/:slug", validate({ params: destinationSlugParams }), destinationController.getBySlug);

export default router;
