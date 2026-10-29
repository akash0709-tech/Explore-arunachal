// Routes mounted at /api/stays (public pages for travellers)
import { Router } from "express";
import * as stayController from "../controllers/stay.controller.js";
import { validate } from "../middleware/validate.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { listStaysQuery, stayIdParams, contactTapBody, reportBody } from "../validators/stay.validator.js";

const router = Router();

router.get("/", validate({ query: listStaysQuery }), stayController.list);
// optionalAuth: logged-in viewers are counted by user id, guests by a hash of their IP
router.get("/:id", optionalAuth, validate({ params: stayIdParams }), stayController.getOne);
router.post(
  "/:id/contact-tap",
  optionalAuth,
  validate({ params: stayIdParams, body: contactTapBody }),
  stayController.contactTap
);
router.post(
  "/:id/report",
  requireAuth,
  validate({ params: stayIdParams, body: reportBody }),
  stayController.report
);

export default router;
